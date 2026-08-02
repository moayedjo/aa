import { createClient } from "@/lib/supabase/server";

export interface CreditWallet {
  workspace_id: string;
  balance: number;
  monthly_allowance: number;
  allowance_period: string;
}

export interface LedgerEntry {
  id: string;
  entry_type: "allowance" | "reservation" | "refund" | "adjustment";
  amount: number;
  balance_after: number;
  reason: string | null;
  created_at: string;
}

export interface UsageCounter {
  period: string;
  images_generated: number;
  images_failed: number;
  designs_created: number;
}

export async function getWallet(
  workspaceId: string
): Promise<CreditWallet | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("credit_wallets")
    .select("workspace_id, balance, monthly_allowance, allowance_period")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load wallet: ${error.message}`);
  return data;
}

export async function getLedger(
  workspaceId: string,
  limit = 50
): Promise<LedgerEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("credit_ledger")
    .select("id, entry_type, amount, balance_after, reason, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load ledger: ${error.message}`);
  return data ?? [];
}

export async function getCurrentUsage(
  workspaceId: string
): Promise<UsageCounter | null> {
  const supabase = await createClient();
  const period = new Date().toISOString().slice(0, 7);
  const { data, error } = await supabase
    .from("usage_counters")
    .select("period, images_generated, images_failed, designs_created")
    .eq("workspace_id", workspaceId)
    .eq("period", period)
    .maybeSingle();
  if (error) throw new Error(`Failed to load usage: ${error.message}`);
  return data;
}

/** True when the balance is at or below the low-credit warning threshold. */
export function isLowBalance(wallet: CreditWallet | null): boolean {
  if (!wallet) return false;
  const threshold = Math.max(1, Math.ceil(wallet.monthly_allowance * 0.2));
  return wallet.balance <= threshold;
}
