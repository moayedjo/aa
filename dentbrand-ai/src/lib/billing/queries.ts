import { createClient } from "@/lib/supabase/server";
import type { Plan, Subscription } from "@/lib/billing/types";

export type { Plan, Subscription } from "@/lib/billing/types";
export { isSubscriptionActive, formatPrice } from "@/lib/billing/types";

export async function getPlans(): Promise<Plan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(`Failed to load plans: ${error.message}`);
  return data ?? [];
}

export async function getSubscription(
  workspaceId: string
): Promise<Subscription | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load subscription: ${error.message}`);
  return data;
}
