import { createClient } from "@/lib/supabase/server";
import type { BrandKit, WorkspaceIndustrySettings } from "@/types/database";

export async function getBrandKit(
  workspaceId: string
): Promise<BrandKit | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load brand kit: ${error.message}`);
  }
  return data;
}

export async function getIndustrySettings(
  workspaceId: string
): Promise<WorkspaceIndustrySettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_industry_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load industry settings: ${error.message}`);
  }
  return data;
}

/**
 * Short-lived signed URL for a logo in the private brand-assets bucket.
 * Returns null when there is no logo or the URL cannot be created.
 */
export async function getLogoSignedUrl(
  logoPath: string | null
): Promise<string | null> {
  if (!logoPath) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("brand-assets")
    .createSignedUrl(logoPath, 60 * 60);

  if (error) return null;
  return data.signedUrl;
}
