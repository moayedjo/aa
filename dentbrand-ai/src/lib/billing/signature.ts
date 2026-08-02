import crypto from "node:crypto";

/**
 * Verifies a Paddle webhook signature. Pure (no `server-only`) so it is
 * unit-testable; `paddle.ts` re-exports it.
 *
 * Header format: `ts=<unix>;h1=<hmac_sha256(ts:rawBody)>`. Constant-time
 * compare; rejects timestamps outside a 5-minute skew window.
 */
export function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined,
  now: number = Date.now()
): boolean {
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
  if (!Number.isFinite(eventTime) || Math.abs(now - eventTime) > maxSkewMs) {
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
