import "server-only";

import crypto from "node:crypto";

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

/**
 * Verifies a Paddle webhook signature.
 * Header format: `ts=<unix>;h1=<hmac_sha256(ts:rawBody)>`.
 * Constant-time compare; rejects stale timestamps (> 5s skew window is
 * generous here at 5 minutes to tolerate delivery latency).
 */
export function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(";").map((kv) => {
      const [k, v] = kv.split("=");
      return [k, v];
    })
  );
  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  const maxSkewMs = 5 * 60 * 1000;
  const eventTime = Number(ts) * 1000;
  if (!Number.isFinite(eventTime) || Math.abs(Date.now() - eventTime) > maxSkewMs) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${ts}:${rawBody}`)
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(h1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
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
