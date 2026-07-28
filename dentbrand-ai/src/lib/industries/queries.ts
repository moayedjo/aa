import { createClient } from "@/lib/supabase/server";
import type {
  ContentGoal,
  IndustryVertical,
  Service,
  TemplateCategory,
} from "@/types/database";

/**
 * Database-backed vertical catalog (Phase 03). Replaces the Phase 02
 * interim config as the source of truth; keys are identical.
 */

export async function getVerticals(): Promise<IndustryVertical[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("industry_verticals")
    .select("*")
    .order("sort_order");
  if (error) throw new Error(`Failed to load verticals: ${error.message}`);
  return data ?? [];
}

export async function getVerticalByKey(
  key: string
): Promise<IndustryVertical | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("industry_verticals")
    .select("*")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(`Failed to load vertical: ${error.message}`);
  return data;
}

export async function getServices(verticalId: string): Promise<Service[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("vertical_id", verticalId)
    .order("sort_order");
  if (error) throw new Error(`Failed to load services: ${error.message}`);
  return data ?? [];
}

export async function getContentGoals(
  verticalId: string
): Promise<ContentGoal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_goals")
    .select("*")
    .eq("vertical_id", verticalId)
    .order("sort_order");
  if (error) throw new Error(`Failed to load content goals: ${error.message}`);
  return data ?? [];
}

export async function getTemplateCategories(
  verticalId: string
): Promise<TemplateCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("template_categories")
    .select("*")
    .eq("vertical_id", verticalId)
    .order("sort_order");
  if (error) throw new Error(`Failed to load categories: ${error.message}`);
  return data ?? [];
}
