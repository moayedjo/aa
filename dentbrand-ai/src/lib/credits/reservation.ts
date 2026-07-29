import "server-only";

/**
 * Credit safety abstraction for AI generations.
 *
 * Phase 07 implements the full reservation lifecycle — validate → check →
 * reserve (pending ai_generations row) → generate → store → confirm, with
 * refund-on-failure and idempotency — while the wallet/ledger tables are
 * Phase 08 scope. Until then `checkBalance` grants every request and
 * confirm/refund only log; Phase 08 replaces these internals with real
 * wallet reads and append-only ledger writes WITHOUT changing callers.
 */

export const IMAGE_GENERATION_COST = 1;

export interface BalanceCheck {
  ok: boolean;
  error?: string;
}

export async function checkImageCredit(
  workspaceId: string
): Promise<BalanceCheck> {
  // Phase 08: read this workspace's wallet and reject when below cost.
  console.log(
    JSON.stringify({
      type: "credits",
      action: "balance_checked",
      workspaceId,
      cost: IMAGE_GENERATION_COST,
      ts: new Date().toISOString(),
    })
  );
  return { ok: true };
}

export function confirmImageCharge(workspaceId: string, generationId: string) {
  // Phase 08: append a 'charge' ledger entry tied to the generation.
  console.log(
    JSON.stringify({
      type: "credits",
      action: "charge_confirmed",
      workspaceId,
      generationId,
      cost: IMAGE_GENERATION_COST,
      ts: new Date().toISOString(),
    })
  );
}

export function refundImageReservation(
  workspaceId: string,
  generationId: string,
  reason: string
) {
  // Phase 08: append a 'refund' ledger entry — the reservation must never
  // become a final charge for a failed generation.
  console.log(
    JSON.stringify({
      type: "credits",
      action: "reservation_refunded",
      workspaceId,
      generationId,
      cost: IMAGE_GENERATION_COST,
      reason,
      ts: new Date().toISOString(),
    })
  );
}
