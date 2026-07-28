import { createClient } from "@/lib/supabase/server";
import {
  collectAssetRefs,
  parseAssetRef,
  validateDesignJson,
  type DesignJson,
} from "@/lib/designs/schema";

export interface DesignProject {
  id: string;
  workspace_id: string;
  template_id: string;
  template_version: number;
  name: string;
  language: "ar" | "en";
  design_json: unknown;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export async function getDesign(id: string): Promise<DesignProject | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("design_projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load design: ${error.message}`);
  return data;
}

export async function getWorkspaceDesigns(
  workspaceId: string
): Promise<DesignProject[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("design_projects")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Failed to load designs: ${error.message}`);
  return data ?? [];
}

/** Validated design JSON, or a readable error for corrupted rows. */
export function parseDesign(
  design: DesignProject
): { ok: true; json: DesignJson } | { ok: false; error: string } {
  const validated = validateDesignJson(design.design_json);
  if (!validated.ok) return validated;
  return { ok: true, json: validated.design };
}

/**
 * Short-lived signed URLs for every internal asset reference in a design.
 * Returns a map from `supabase://bucket/path` to a fetchable URL.
 */
export async function getAssetUrlMap(
  design: DesignJson
): Promise<Record<string, string>> {
  const supabase = await createClient();
  const map: Record<string, string> = {};

  for (const ref of collectAssetRefs(design)) {
    const parsed = parseAssetRef(ref);
    if (!parsed) continue;
    const { data } = await supabase.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.path, 60 * 60);
    if (data?.signedUrl) map[ref] = data.signedUrl;
  }
  return map;
}
