"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/auth/queries";

export interface AdminActionResult {
  error?: string;
  success?: string;
}

async function requireAdmin(): Promise<{ userId: string } | { error: string }> {
  if (!(await isPlatformAdmin())) return { error: "Admin access required" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in" };
  return { userId: user.id };
}

const adjustSchema = z.object({
  workspaceId: z.string().uuid(),
  amount: z.number().int().refine((n) => n !== 0, "Amount must be non-zero").
    refine((n) => Math.abs(n) <= 100000, "Amount is too large"),
  reason: z.string().trim().min(3).max(300),
});

/**
 * Manual credit adjustment. Routes through `admin_adjust_credits`, which
 * writes the ledger entry AND the audit record atomically — so every
 * adjustment is auditable by construction (spec §11).
 */
export async function adjustCredits(
  input: unknown
): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  if ("error" in admin) return { error: admin.error };

  const parsed = adjustSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const db = createAdminClient();
  const { error } = await db.rpc("admin_adjust_credits", {
    p_workspace_id: parsed.data.workspaceId,
    p_amount: parsed.data.amount,
    p_reason: parsed.data.reason,
    p_actor: admin.userId,
  });
  if (error) {
    if (error.message?.includes("INSUFFICIENT_CREDITS")) {
      return { error: "That would take the balance below zero" };
    }
    return { error: `Could not adjust credits: ${error.message}` };
  }

  revalidatePath(`/admin/workspaces/${parsed.data.workspaceId}`);
  revalidatePath("/admin/audit");
  return { success: `Adjusted by ${parsed.data.amount} credits.` };
}

const closeTicketSchema = z.object({ ticketId: z.string().uuid() });

export async function closeSupportTicket(
  input: unknown
): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  if ("error" in admin) return { error: admin.error };

  const parsed = closeTicketSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid ticket" };

  const db = createAdminClient();
  const { data: ticket, error } = await db
    .from("support_requests")
    .update({ status: "closed" })
    .eq("id", parsed.data.ticketId)
    .select("workspace_id")
    .maybeSingle();
  if (error) return { error: `Could not close ticket: ${error.message}` };

  await db.rpc("record_admin_action", {
    p_actor: admin.userId,
    p_action: "support_ticket_closed",
    p_target_type: "support_request",
    p_target_id: parsed.data.ticketId,
    p_workspace_id: ticket?.workspace_id ?? null,
    p_details: {},
  });

  revalidatePath("/admin/support");
  return { success: "Ticket closed." };
}
