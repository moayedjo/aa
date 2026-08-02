"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackEvent } from "@/lib/analytics/track";
import {
  cancelSubscription as paddleCancel,
  changeSubscriptionPrice,
  createTransaction,
  isPaddleConfigured,
  reactivateSubscription as paddleReactivate,
} from "@/lib/billing/paddle";

/**
 * Billing actions. They start/modify checkout and subscription changes at
 * Paddle, but the authoritative state change always arrives back through
 * the webhook (spec §16) — these actions never flip our subscription
 * status directly.
 */

export interface CheckoutResult {
  transactionId?: string;
  error?: string;
}

export interface BillingActionResult {
  error?: string;
  success?: string;
}

/** Only owners/admins manage billing. */
async function requireBillingManager(workspaceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null as string | null };
  const { data } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();
  return { supabase, user, role: data?.role ?? null };
}

const checkoutSchema = z.object({
  workspaceId: z.string().uuid(),
  planKey: z.string().min(2).max(40),
  billingPeriod: z.enum(["month", "year"]),
});

export async function createCheckout(input: unknown): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid checkout request" };
  const { workspaceId, planKey, billingPeriod } = parsed.data;

  if (!isPaddleConfigured()) {
    return { error: "Billing is not configured on this server yet." };
  }

  const { user, role } = await requireBillingManager(workspaceId);
  if (!user) return { error: "You must be logged in" };
  if (role !== "owner" && role !== "admin") {
    return { error: "Only owners and admins can manage billing" };
  }

  // Read plan + any existing Paddle customer via the service role.
  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("plans")
    .select("id, paddle_price_id_month, paddle_price_id_year")
    .eq("key", planKey)
    .eq("is_active", true)
    .maybeSingle();
  if (!plan) return { error: "Unknown plan" };

  const priceId =
    billingPeriod === "year"
      ? plan.paddle_price_id_year
      : plan.paddle_price_id_month;
  if (!priceId) {
    return { error: "This plan is not available for checkout yet." };
  }

  const { data: customer } = await admin
    .from("billing_customers")
    .select("paddle_customer_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const txn = await createTransaction({
    priceId,
    customerId: customer?.paddle_customer_id ?? undefined,
    workspaceId,
    planId: plan.id,
    billingPeriod,
  });
  if (!txn.ok || !txn.data) {
    return { error: txn.error ?? "Could not start checkout" };
  }

  trackEvent("checkout_started", {
    workspaceId,
    userId: user.id,
    step: planKey,
  });
  return { transactionId: txn.data.id };
}

const workspaceIdSchema = z.string().uuid();

async function loadManagedSubscription(workspaceIdInput: unknown) {
  const parsed = workspaceIdSchema.safeParse(workspaceIdInput);
  if (!parsed.success) return { error: "Invalid workspace" as const };

  const { user, role } = await requireBillingManager(parsed.data);
  if (!user) return { error: "You must be logged in" as const };
  if (role !== "owner" && role !== "admin") {
    return { error: "Only owners and admins can manage billing" as const };
  }

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("paddle_subscription_id, status, cancel_at_period_end")
    .eq("workspace_id", parsed.data)
    .maybeSingle();
  if (!sub?.paddle_subscription_id) {
    return { error: "No active subscription to manage" as const };
  }
  return { workspaceId: parsed.data, userId: user.id, sub };
}

/** In-app cancellation — schedules cancel at period end (no dark patterns). */
export async function cancelSubscription(
  workspaceIdInput: unknown
): Promise<BillingActionResult> {
  const loaded = await loadManagedSubscription(workspaceIdInput);
  if ("error" in loaded) return { error: loaded.error };

  const result = await paddleCancel(loaded.sub.paddle_subscription_id!);
  if (!result.ok) return { error: result.error ?? "Could not cancel" };

  trackEvent("subscription_canceled", {
    workspaceId: loaded.workspaceId,
    userId: loaded.userId,
  });
  // The webhook will flip cancel_at_period_end / status authoritatively.
  return {
    success:
      "Your subscription will cancel at the end of the current billing period. You keep access until then.",
  };
}

export async function reactivateSubscription(
  workspaceIdInput: unknown
): Promise<BillingActionResult> {
  const loaded = await loadManagedSubscription(workspaceIdInput);
  if ("error" in loaded) return { error: loaded.error };

  const result = await paddleReactivate(loaded.sub.paddle_subscription_id!);
  if (!result.ok) return { error: result.error ?? "Could not reactivate" };

  trackEvent("subscription_reactivated", {
    workspaceId: loaded.workspaceId,
    userId: loaded.userId,
  });
  return { success: "Your subscription will continue — cancellation removed." };
}

const changePlanSchema = z.object({
  workspaceId: z.string().uuid(),
  planKey: z.string().min(2).max(40),
  billingPeriod: z.enum(["month", "year"]),
});

/** Upgrade or downgrade an existing subscription (prorated by Paddle). */
export async function changePlan(
  input: unknown
): Promise<BillingActionResult> {
  const parsed = changePlanSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid request" };

  const loaded = await loadManagedSubscription(parsed.data.workspaceId);
  if ("error" in loaded) return { error: loaded.error };

  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("plans")
    .select("paddle_price_id_month, paddle_price_id_year")
    .eq("key", parsed.data.planKey)
    .maybeSingle();
  const priceId =
    parsed.data.billingPeriod === "year"
      ? plan?.paddle_price_id_year
      : plan?.paddle_price_id_month;
  if (!priceId) return { error: "This plan is not available yet." };

  const result = await changeSubscriptionPrice(
    loaded.sub.paddle_subscription_id!,
    priceId
  );
  if (!result.ok) return { error: result.error ?? "Could not change plan" };

  return {
    success: "Your plan change is being applied — it will update shortly.",
  };
}
