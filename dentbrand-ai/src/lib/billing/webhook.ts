import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { trackEvent } from "@/lib/analytics/track";
import { reportError } from "@/lib/monitoring/sentry";

/**
 * Paddle webhook processing. Webhooks are the subscription source of truth
 * (spec §16): the handler stores the raw event, processes it exactly once
 * (idempotent on Paddle's event id), and mirrors Paddle's state into our
 * subscriptions table — reflecting, never inventing, state.
 */

interface PaddleEvent {
  event_id: string;
  event_type: string;
  data: Record<string, unknown>;
}

const STATUS_MAP: Record<string, string> = {
  trialing: "trialing",
  active: "active",
  past_due: "past_due",
  paused: "paused",
  canceled: "canceled",
};

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * Records the raw event and returns whether it is new. A duplicate delivery
 * (same event_id) short-circuits — that is the idempotency guarantee.
 */
async function recordEvent(
  admin: SupabaseClient,
  event: PaddleEvent
): Promise<{ isNew: boolean }> {
  const { error } = await admin.from("webhook_events").insert({
    paddle_event_id: event.event_id,
    event_type: event.event_type,
    raw: event as unknown as Record<string, unknown>,
    status: "received",
  });
  if (error) {
    // Unique violation → we've already seen this event.
    if (error.code === "23505") return { isNew: false };
    throw new Error(`Could not record webhook: ${error.message}`);
  }
  return { isNew: true };
}

async function markProcessed(
  admin: SupabaseClient,
  eventId: string,
  error?: string
): Promise<void> {
  await admin
    .from("webhook_events")
    .update({
      status: error ? "failed" : "processed",
      error: error ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq("paddle_event_id", eventId);
}

async function upsertSubscription(
  admin: SupabaseClient,
  event: PaddleEvent
): Promise<void> {
  const data = event.data;
  const custom = (data.custom_data ?? {}) as Record<string, unknown>;
  const workspaceId = str(custom.workspace_id);
  if (!workspaceId) {
    throw new Error("Webhook missing workspace_id in custom_data");
  }

  const paddleSubscriptionId = str(data.id);
  const paddleStatus = str(data.status) ?? "active";
  const status = STATUS_MAP[paddleStatus] ?? "active";
  const billingPeriod = str(custom.billing_period) === "year" ? "year" : "month";
  const planId = str(custom.plan_id);

  // Renewal date + scheduled cancellation from Paddle's payload.
  const billing = (data.current_billing_period ?? {}) as Record<string, unknown>;
  const currentPeriodEnd = str(billing.ends_at);
  const scheduledChange = data.scheduled_change as
    | { action?: string }
    | null
    | undefined;
  const cancelAtPeriodEnd = scheduledChange?.action === "cancel";

  const customerId = str(data.customer_id);
  if (customerId) {
    await admin.from("billing_customers").upsert(
      { workspace_id: workspaceId, paddle_customer_id: customerId },
      { onConflict: "workspace_id" }
    );
  }

  await admin.from("subscriptions").upsert(
    {
      workspace_id: workspaceId,
      plan_id: planId,
      paddle_subscription_id: paddleSubscriptionId,
      status,
      billing_period: billingPeriod,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: cancelAtPeriodEnd,
    },
    { onConflict: "workspace_id" }
  );

  // Apply the plan's monthly allowance to the wallet once the subscription
  // is active (Phase 08 integration). Canceled/expired keep whatever the
  // user already has until the period ends.
  if ((status === "active" || status === "trialing") && planId) {
    const { data: plan } = await admin
      .from("plans")
      .select("monthly_image_credits")
      .eq("id", planId)
      .maybeSingle();
    if (plan) {
      await admin.rpc("apply_plan_allowance", {
        p_workspace_id: workspaceId,
        p_allowance: plan.monthly_image_credits,
      });
    }
  }

  trackEvent("subscription_updated", { workspaceId, step: status });
}

/**
 * Processes one verified event. Called by the webhook route; returns
 * { retry } so the route can signal Paddle to retry on transient failure.
 */
export async function processPaddleEvent(
  event: PaddleEvent
): Promise<{ ok: boolean; retry: boolean }> {
  const admin = createAdminClient();

  let isNew: boolean;
  try {
    ({ isNew } = await recordEvent(admin, event));
  } catch {
    // Could not even record the event — ask Paddle to retry.
    return { ok: false, retry: true };
  }
  if (!isNew) {
    // Already handled — acknowledge without reprocessing.
    return { ok: true, retry: false };
  }

  try {
    if (event.event_type.startsWith("subscription.")) {
      await upsertSubscription(admin, event);
    }
    // transaction.* / other events are stored but need no state change here.
    await markProcessed(admin, event.event_id);
    return { ok: true, retry: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    reportError(error, { where: "paddle_webhook", eventType: event.event_type });
    await markProcessed(admin, event.event_id, message);
    // Processing failed after recording — let Paddle retry.
    return { ok: false, retry: true };
  }
}
