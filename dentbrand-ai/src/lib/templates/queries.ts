import { createClient } from "@/lib/supabase/server";
import { validateTemplateJson, type TemplateJson } from "@/lib/templates/schema";
import type { Template, TemplateVersion } from "@/types/database";

export interface TemplateWithJson {
  template: Template;
  /** Validated JSON of the template's current version. */
  json: TemplateJson;
}

/**
 * Published templates for a vertical, with their current-version JSON.
 * RLS already hides non-published templates from normal users; the status
 * filter keeps admin sessions consistent with what users see.
 */
export async function getPublishedTemplates(
  verticalId: string
): Promise<TemplateWithJson[]> {
  const supabase = await createClient();
  const { data: templates, error } = await supabase
    .from("templates")
    .select("*")
    .eq("vertical_id", verticalId)
    .eq("status", "published")
    .order("created_at");
  if (error) throw new Error(`Failed to load templates: ${error.message}`);
  if (!templates || templates.length === 0) return [];

  const { data: versions, error: versionsError } = await supabase
    .from("template_versions")
    .select("*")
    .in(
      "template_id",
      templates.map((t) => t.id)
    );
  if (versionsError) {
    throw new Error(`Failed to load template versions: ${versionsError.message}`);
  }

  const result: TemplateWithJson[] = [];
  for (const template of templates) {
    const version = versions?.find(
      (v) =>
        v.template_id === template.id && v.version === template.current_version
    );
    if (!version) continue;
    const validated = validateTemplateJson(version.template_json);
    // Invalid JSON must never reach rendering; skip and surface via admin.
    if (!validated.ok) continue;
    result.push({ template, json: validated.template });
  }
  return result;
}

export async function getTemplate(id: string): Promise<Template | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load template: ${error.message}`);
  return data;
}

export async function getTemplateVersions(
  templateId: string
): Promise<TemplateVersion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("template_versions")
    .select("*")
    .eq("template_id", templateId)
    .order("version", { ascending: false });
  if (error) throw new Error(`Failed to load versions: ${error.message}`);
  return data ?? [];
}

/** All templates regardless of status — admin listing (RLS enforces admin). */
export async function getAllTemplates(): Promise<Template[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .order("created_at");
  if (error) throw new Error(`Failed to load templates: ${error.message}`);
  return data ?? [];
}

export async function getTemplateServiceIds(
  templateId: string
): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("template_services")
    .select("service_id")
    .eq("template_id", templateId);
  if (error) throw new Error(`Failed to load template services: ${error.message}`);
  return (data ?? []).map((row) => row.service_id);
}
