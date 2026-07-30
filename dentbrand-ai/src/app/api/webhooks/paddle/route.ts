import { NextResponse } from "next/server";

import { verifyPaddleSignature } from "@/lib/billing/paddle";
import { processPaddleEvent } from "@/lib/billing/webhook";

/**
 * Paddle webhook endpoint. This — not any browser redirect — is what
 * activates or changes a subscription. Steps: read the RAW body, verify
 * the signature, then process idempotently. A verified-but-transient
 * failure returns 500 so Paddle retries; anything else returns 200 so it
 * doesn't hammer us for events we've handled or can't use.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("paddle-signature");

  if (!verifyPaddleSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: {
    event_id?: string;
    event_type?: string;
    data?: Record<string, unknown>;
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!event.event_id || !event.event_type || !event.data) {
    return NextResponse.json({ error: "Malformed event" }, { status: 400 });
  }

  const result = await processPaddleEvent({
    event_id: event.event_id,
    event_type: event.event_type,
    data: event.data,
  });

  if (!result.ok && result.retry) {
    return NextResponse.json({ error: "Retry later" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
