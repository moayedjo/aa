import "server-only";

import { verifyPaddleSignature as verifySignature } from "@/lib/billing/signature";

/**
 * Server-only Paddle Billing client. All keys stay server-side; the
 * browser only ever receives a checkout transaction id / client token.
 */

const PADDLE_API_BASE =
  process.env.PADDLE_ENV === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";

export function isPaddleConfigured(): boolean {
  return !!process.env.PADDLE_API_KEY;
}

interface PaddleFetchResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function paddleFetch<T>(
  path: string,
  init: RequestInit
): Promise<PaddleFetchResult<T>> {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) return { ok: false, error: "Billing is not configured" };

  try {
    const response = await fetch(`${PADDLE_API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...init.headers,
      },
    });
    const body = (await response.json()) as { data?: T; error?: unknown };
    if (!response.ok) {
      return { ok: false, error: `Paddle API error (${response.status})` };
    }
    return { ok: true, data: body.data };
  } catch {
    return { ok: false, error: "Could not reach the billing provider" };
  }
}

/** Verifies a Paddle webhook signature using the configured secret. */
export function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  return verifySignature(
    rawBody,
    signatureHeader,
    process.env.PADDLE_WEBHOOK_SECRET
  );
}

// --- Transaction / subscription API -----------------------------------------

export interface CreateTransactionInput {
  priceId: string;
  customerId?: string;
  workspaceId: string;
  planId: string;
  billingPeriod: "month" | "year";
}

export interface CreatedTransaction {
  id: string;
}

/** Creates a checkout transaction; the client opens it with Paddle.js. */
export async function createTransaction(
  input: CreateTransactionInput
): Promise<PaddleFetchResult<CreatedTransaction>> {
  return paddleFetch<CreatedTransaction>("/transactions", {
    method: "POST",
    body: JSON.stringify({
      items: [{ price_id: input.priceId, quantity: 1 }],
      ...(input.customerId ? { customer_id: input.customerId } : {}),
      custom_data: {
        workspace_id: input.workspaceId,
        plan_id: input.planId,
        billing_period: input.billingPeriod,
      },
    }),
  });
}

export async function cancelSubscription(
  paddleSubscriptionId: string,
  effective: "next_billing_period" | "immediately" = "next_billing_period"
): Promise<PaddleFetchResult<unknown>> {
  return paddleFetch(`/subscriptions/${paddleSubscriptionId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ effective_from: effective }),
  });
}

/** Clears a scheduled cancellation (reactivate). */
export async function reactivateSubscription(
  paddleSubscriptionId: string
): Promise<PaddleFetchResult<unknown>> {
  return paddleFetch(`/subscriptions/${paddleSubscriptionId}`, {
    method: "PATCH",
    body: JSON.stringify({ scheduled_change: null }),
  });
}

/** Upgrade/downgrade: swap the subscription's price, prorated immediately. */
export async function changeSubscriptionPrice(
  paddleSubscriptionId: string,
  priceId: string
): Promise<PaddleFetchResult<unknown>> {
  return paddleFetch(`/subscriptions/${paddleSubscriptionId}`, {
    method: "PATCH",
    body: JSON.stringify({
      items: [{ price_id: priceId, quantity: 1 }],
      proration_billing_mode: "prorated_immediately",
    }),
  });
}

export function clientToken(): string | null {
  return process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? null;
}
