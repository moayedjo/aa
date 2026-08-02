import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Credit safety for AI generations (Phase 08 implementation).
 *
 * Balances change ONLY through the security-definer DB functions
 * (`apply_credit_change`, `ensure_wallet_period`), invoked here via the
 * audited service-role client. The three functions below keep the exact
 * signatures Phase 07 introduced, so the image action's call sites are
 * unchanged (see DECISIONS D-015).
 *
 * Model:
 *  - reserve  → 'reservation' ledger entry of -cost, keyed to the
 *    generation id (unique, so a duplicate cannot deduct twice).
 *  - confirm  → no balance change; the reservation IS the charge. Bumps
 *    the success usage counter.
 *  - refund   → 'refund' ledger entry of +cost, keyed to the generation
 *    id, so a failed generation nets zero.
 */

export const IMAGE_GENERATION_COST = 1;

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

export interface BalanceCheck {
  ok: boolean;
  balance?: number;
  error?: string;
}

/** Read-only pre-flight check (also rolls the monthly period forward). */
export async function checkImageCredit(
  workspaceId: string
): Promise<BalanceCheck> {
  const admin = createAdminClient();
  await admin.rpc("ensure_wallet_period", { p_workspace_id: workspaceId });

  const { data, error } = await admin
    .from("credit_wallets")
    .select("balance")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "Could not read your credit balance" };
  }
  if (data.balance < IMAGE_GENERATION_COST) {
    return {
      ok: false,
      balance: data.balance,
      error: "You are out of image credits for this month",
    };
  }
  return { ok: true, balance: data.balance };
}

export interface ReserveResult {
  ok: boolean;
  balance?: number;
  error?: string;
}

/**
 * Atomically deducts the cost and writes the reservation ledger entry.
 * Called after the pending generation row exists (which is idempotency-
 * guarded), so a reservation is always tied to a real generation.
 */
export async function reserveImageCredit(
  workspaceId: string,
  generationId: string
): Promise<ReserveResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("apply_credit_change", {
    p_workspace_id: workspaceId,
    p_entry_type: "reservation",
    p_amount: -IMAGE_GENERATION_COST,
    p_reference_generation: generationId,
    p_reason: "Image generation",
    p_actor: null,
  });

  if (error) {
    if (error.message?.includes("INSUFFICIENT_CREDITS")) {
      return { ok: false, error: "You are out of image credits" };
    }
    // Duplicate reservation for the same generation (idempotency guard).
    if (error.code === "23505") {
      return { ok: true };
    }
    return { ok: false, error: "Could not reserve a credit" };
  }
  return { ok: true, balance: data as number };
}

/**
 * Success: the reservation stands as the charge; bump the usage counter.
 * `generationId` is part of the stable signature (D-015) though the charge
 * is already the reservation entry, so no further ledger write is needed.
 */
export async function confirmImageCharge(
  workspaceId: string,
  generationId: string
): Promise<void> {
  void generationId;
  const admin = createAdminClient();
  await admin.rpc("increment_usage", {
    p_workspace_id: workspaceId,
    p_period: currentPeriod(),
    p_field: "images_generated",
  });
}

/**
 * Failure: refund the reserved credit (idempotent per generation) and bump
 * the failure counter. A failed generation must never cost a credit.
 */
export async function refundImageReservation(
  workspaceId: string,
  generationId: string,
  reason: string
): Promise<void> {
  const admin = createAdminClient();

  // Only refund if a reservation was actually taken for this generation.
  const { data: reserved } = await admin
    .from("credit_ledger")
    .select("id")
    .eq("reference_generation", generationId)
    .eq("entry_type", "reservation")
    .maybeSingle();

  if (reserved) {
    await admin.rpc("apply_credit_change", {
      p_workspace_id: workspaceId,
      p_entry_type: "refund",
      p_amount: IMAGE_GENERATION_COST,
      p_reference_generation: generationId,
      p_reason: `Refund: ${reason}`.slice(0, 200),
      p_actor: null,
    });
  }

  await admin.rpc("increment_usage", {
    p_workspace_id: workspaceId,
    p_period: currentPeriod(),
    p_field: "images_failed",
  });
}
