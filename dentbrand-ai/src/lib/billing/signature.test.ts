import { describe, it, expect } from "vitest";
import crypto from "node:crypto";

import { verifyPaddleSignature } from "@/lib/billing/signature";
import { formatPrice, isSubscriptionActive } from "@/lib/billing/types";

const SECRET = "whsec_test_secret";

function sign(body: string, ts: number): string {
  const h1 = crypto
    .createHmac("sha256", SECRET)
    .update(`${ts}:${body}`)
    .digest("hex");
  return `ts=${ts};h1=${h1}`;
}

describe("verifyPaddleSignature", () => {
  const body = JSON.stringify({ event_id: "evt_1", event_type: "x" });
  const now = 1_700_000_000_000;
  const ts = Math.floor(now / 1000);

  it("accepts a correctly signed, fresh payload", () => {
    expect(verifyPaddleSignature(body, sign(body, ts), SECRET, now)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const sig = sign(body, ts);
    expect(verifyPaddleSignature(body + "x", sig, SECRET, now)).toBe(false);
  });

  it("rejects a wrong secret", () => {
    expect(verifyPaddleSignature(body, sign(body, ts), "other", now)).toBe(false);
  });

  it("rejects a stale timestamp (outside the skew window)", () => {
    const staleTs = ts - 60 * 60; // 1h old
    expect(verifyPaddleSignature(body, sign(body, staleTs), SECRET, now)).toBe(
      false
    );
  });

  it("rejects missing header or secret", () => {
    expect(verifyPaddleSignature(body, null, SECRET, now)).toBe(false);
    expect(verifyPaddleSignature(body, sign(body, ts), undefined, now)).toBe(
      false
    );
  });

  it("rejects a malformed header", () => {
    expect(verifyPaddleSignature(body, "garbage", SECRET, now)).toBe(false);
  });
});

describe("billing helpers", () => {
  it("formats whole-dollar prices without cents", () => {
    expect(formatPrice(1900)).toBe("$19");
    expect(formatPrice(4900)).toBe("$49");
  });

  it("isSubscriptionActive reflects status", () => {
    const base = {
      id: "s",
      workspace_id: "w",
      plan_id: null,
      paddle_subscription_id: null,
      billing_period: "month" as const,
      current_period_end: null,
      cancel_at_period_end: false,
    };
    expect(isSubscriptionActive({ ...base, status: "active" })).toBe(true);
    expect(isSubscriptionActive({ ...base, status: "trialing" })).toBe(true);
    expect(isSubscriptionActive({ ...base, status: "canceled" })).toBe(false);
    expect(isSubscriptionActive(null)).toBe(false);
  });
});
