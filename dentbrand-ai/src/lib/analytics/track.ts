import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Product analytics transport.
 *
 * Emits a structured server-side log AND (Phase 10) persists the event to
 * `product_events` so the activation funnel can be measured. The PostHog
 * transport arrives in Phase 11 and plugs in here without touching call
 * sites. Never log secrets or free-text user content.
 */

export type AnalyticsEvent =
  | "onboarding_started"
  | "onboarding_step_completed"
  | "onboarding_logo_uploaded"
  | "onboarding_completed"
  | "ai_copy_generated"
  | "ai_copy_field_regenerated"
  | "ai_copy_failed"
  | "ai_image_generated"
  | "ai_image_failed"
  | "checkout_started"
  | "subscription_updated"
  | "subscription_canceled"
  | "subscription_reactivated"
  | "design_created"
  | "design_exported"
  | "design_rated"
  | "ai_regenerated"
  | "support_request_created";

export interface AnalyticsProps {
  workspaceId?: string;
  userId?: string;
  step?: string;
  [key: string]: string | number | boolean | undefined;
}

export function trackEvent(event: AnalyticsEvent, props: AnalyticsProps): void {
  console.log(
    JSON.stringify({
      type: "analytics",
      event,
      props,
      ts: new Date().toISOString(),
    })
  );

  // Persist for funnel analysis. Fire-and-forget: analytics must never
  // block or fail a user action.
  const { workspaceId, userId, ...rest } = props;
  void persistEvent(event, workspaceId, userId, rest);
  void sendToPostHog(event, userId, workspaceId, rest);
}

/**
 * PostHog transport (Phase 11). Enabled only when `POSTHOG_KEY` is set;
 * otherwise a no-op. Fire-and-forget, like the DB persistence.
 */
async function sendToPostHog(
  event: string,
  userId: string | undefined,
  workspaceId: string | undefined,
  props: Record<string, string | number | boolean | undefined>
): Promise<void> {
  const apiKey = process.env.POSTHOG_KEY;
  if (!apiKey) return;
  const host = process.env.POSTHOG_HOST || "https://app.posthog.com";
  try {
    await fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event,
        distinct_id: userId ?? workspaceId ?? "anonymous",
        properties: { ...props, workspace_id: workspaceId },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // Swallow — DB + log are the durable records.
  }
}

async function persistEvent(
  event: string,
  workspaceId: string | undefined,
  userId: string | undefined,
  props: Record<string, string | number | boolean | undefined>
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("product_events").insert({
      workspace_id: workspaceId ?? null,
      user_id: userId ?? null,
      event_type: event,
      props,
    });
  } catch {
    // Swallow — the structured log above is the durable fallback.
  }
}
