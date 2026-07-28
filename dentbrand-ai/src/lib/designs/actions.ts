"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { validateTemplateJson } from "@/lib/templates/schema";
import { buildInitialDesignJson } from "@/lib/designs/create";
import { validateDesignJson } from "@/lib/designs/schema";
import { getBrandKit } from "@/lib/brand-kit/queries";

export interface DesignActionResult {
  error?: string;
}

const EDIT_ROLES = ["owner", "admin", "editor"];

async function requireDesignEditor(workspaceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null as string | null };

  const { data } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  return { supabase, user, role: data?.role ?? null };
}

const createDesignSchema = z.object({
  workspaceId: z.string().uuid(),
  templateId: z.string().uuid(),
  language: z.enum(["ar", "en"]),
  name: z.string().trim().min(1).max(140),
});

/**
 * Creates a design project from a published template: pins the template's
 * current version, applies the Brand Kit, and pre-fills sample content.
 * Redirects to the editor on success.
 */
export async function createDesign(
  input: unknown
): Promise<DesignActionResult> {
  const parsed = createDesignSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { workspaceId, templateId, language, name } = parsed.data;

  const { supabase, user, role } = await requireDesignEditor(workspaceId);
  if (!user) return { error: "You must be logged in" };
  if (!role || !EDIT_ROLES.includes(role)) {
    return { error: "Viewers cannot create designs" };
  }

  // RLS hides unpublished templates from normal users.
  const { data: template, error: templateError } = await supabase
    .from("templates")
    .select("id, status, current_version, supported_languages")
    .eq("id", templateId)
    .maybeSingle();
  if (templateError || !template) return { error: "Template not found" };
  if (template.status !== "published") {
    return { error: "This template is not available" };
  }
  if (!template.supported_languages.includes(language)) {
    return { error: "This template does not support the selected language" };
  }

  const { data: version } = await supabase
    .from("template_versions")
    .select("template_json, version")
    .eq("template_id", templateId)
    .eq("version", template.current_version)
    .maybeSingle();
  if (!version) return { error: "Template version not found" };

  const validated = validateTemplateJson(version.template_json);
  if (!validated.ok) {
    return { error: "Template is invalid and cannot be used right now" };
  }

  const brandKit = await getBrandKit(workspaceId);
  const designJson = buildInitialDesignJson(
    validated.template,
    brandKit,
    language
  );

  const designValidated = validateDesignJson(designJson);
  if (!designValidated.ok) {
    return { error: `Could not prepare design: ${designValidated.error}` };
  }

  const { data: design, error } = await supabase
    .from("design_projects")
    .insert({
      workspace_id: workspaceId,
      template_id: templateId,
      template_version: version.version,
      name,
      language,
      design_json: designValidated.design,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { error: `Could not create design: ${error.message}` };

  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  redirect(`/editor/${design.id}`);
}

/**
 * Persists the design's working state. The design is only "saved" when
 * this returns without error — callers must surface failures.
 */
export async function saveDesign(
  designIdInput: unknown,
  designJsonInput: unknown
): Promise<DesignActionResult> {
  const idParsed = z.string().uuid().safeParse(designIdInput);
  if (!idParsed.success) return { error: "Invalid design" };

  const validated = validateDesignJson(designJsonInput);
  if (!validated.ok) return { error: `Invalid design data: ${validated.error}` };

  const supabase = await createClient();
  const { data: design } = await supabase
    .from("design_projects")
    .select("workspace_id")
    .eq("id", idParsed.data)
    .maybeSingle();
  if (!design) return { error: "Design not found" };

  const { role } = await requireDesignEditor(design.workspace_id);
  if (!role || !EDIT_ROLES.includes(role)) {
    return { error: "You do not have permission to edit this design" };
  }

  const { error } = await supabase
    .from("design_projects")
    .update({ design_json: validated.design })
    .eq("id", idParsed.data);
  if (error) return { error: `Save failed: ${error.message}` };

  return {};
}

async function loadDesignForEdit(designIdInput: unknown) {
  const idParsed = z.string().uuid().safeParse(designIdInput);
  if (!idParsed.success) return { error: "Invalid design" as const };

  const supabase = await createClient();
  const { data: design } = await supabase
    .from("design_projects")
    .select("id, workspace_id, name, design_json, deleted_at")
    .eq("id", idParsed.data)
    .maybeSingle();
  if (!design) return { error: "Design not found" as const };

  const { user, role } = await requireDesignEditor(design.workspace_id);
  if (!user) return { error: "You must be logged in" as const };
  if (!role || !EDIT_ROLES.includes(role)) {
    return { error: "You do not have permission to edit this design" as const };
  }
  return { supabase, design, user, role };
}

async function nextVersionNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
  designId: string
): Promise<number> {
  const { data } = await supabase
    .from("design_versions")
    .select("version")
    .eq("design_id", designId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.version ?? 0) + 1;
}

/**
 * Snapshots the design's CURRENT server-side state as an immutable
 * version. Server-side by design: a corrupted client can't poison history.
 */
export async function createDesignVersion(
  designIdInput: unknown,
  kindInput: unknown
): Promise<DesignActionResult> {
  const kindParsed = z
    .enum(["checkpoint", "manual"])
    .safeParse(kindInput ?? "checkpoint");
  if (!kindParsed.success) return { error: "Invalid version kind" };

  const loaded = await loadDesignForEdit(designIdInput);
  if ("error" in loaded) return { error: loaded.error };
  const { supabase, design, user } = loaded;

  const version = await nextVersionNumber(supabase, design.id);
  const { error } = await supabase.from("design_versions").insert({
    design_id: design.id,
    version,
    kind: kindParsed.data,
    design_json: design.design_json,
    created_by: user.id,
  });
  if (error) return { error: `Could not save version: ${error.message}` };
  return {};
}

/**
 * Restores a previous version. The current state is snapshotted first
 * (kind 'pre-restore'), so a restore never destroys work.
 */
export async function restoreDesignVersion(
  designIdInput: unknown,
  versionInput: unknown
): Promise<DesignActionResult> {
  const versionParsed = z.number().int().min(1).safeParse(versionInput);
  if (!versionParsed.success) return { error: "Invalid version" };

  const loaded = await loadDesignForEdit(designIdInput);
  if ("error" in loaded) return { error: loaded.error };
  const { supabase, design, user } = loaded;

  const { data: target } = await supabase
    .from("design_versions")
    .select("design_json")
    .eq("design_id", design.id)
    .eq("version", versionParsed.data)
    .maybeSingle();
  if (!target) return { error: "Version not found" };

  const validated = validateDesignJson(target.design_json);
  if (!validated.ok) {
    return { error: `That version is not restorable: ${validated.error}` };
  }

  const preRestoreVersion = await nextVersionNumber(supabase, design.id);
  const { error: snapshotError } = await supabase
    .from("design_versions")
    .insert({
      design_id: design.id,
      version: preRestoreVersion,
      kind: "pre-restore",
      design_json: design.design_json,
      created_by: user.id,
    });
  if (snapshotError) {
    return { error: `Could not snapshot current state: ${snapshotError.message}` };
  }

  const { error } = await supabase
    .from("design_projects")
    .update({ design_json: validated.design })
    .eq("id", design.id);
  if (error) return { error: `Restore failed: ${error.message}` };

  revalidatePath(`/editor/${design.id}`);
  return {};
}

/** Copies a design (name "Copy of …") and returns to the designs list. */
export async function duplicateDesign(
  designIdInput: unknown
): Promise<DesignActionResult> {
  const idParsed = z.string().uuid().safeParse(designIdInput);
  if (!idParsed.success) return { error: "Invalid design" };

  const supabase = await createClient();
  const { data: source } = await supabase
    .from("design_projects")
    .select("*")
    .eq("id", idParsed.data)
    .maybeSingle();
  if (!source) return { error: "Design not found" };

  const { user, role } = await requireDesignEditor(source.workspace_id);
  if (!user) return { error: "You must be logged in" };
  if (!role || !EDIT_ROLES.includes(role)) {
    return { error: "You do not have permission to duplicate designs" };
  }

  const { error } = await supabase.from("design_projects").insert({
    workspace_id: source.workspace_id,
    template_id: source.template_id,
    template_version: source.template_version,
    name: `Copy of ${source.name}`.slice(0, 140),
    language: source.language,
    design_json: source.design_json,
    created_by: user.id,
  });
  if (error) return { error: `Could not duplicate: ${error.message}` };

  revalidatePath(`/dashboard/workspaces/${source.workspace_id}/designs`);
  revalidatePath(`/dashboard/workspaces/${source.workspace_id}`);
  return {};
}

/** Soft delete — the design moves to Trash and stops appearing in lists. */
export async function trashDesign(
  designIdInput: unknown
): Promise<DesignActionResult> {
  const loaded = await loadDesignForEdit(designIdInput);
  if ("error" in loaded) return { error: loaded.error };
  const { supabase, design } = loaded;

  const { error } = await supabase
    .from("design_projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", design.id);
  if (error) return { error: `Could not move to trash: ${error.message}` };

  revalidatePath(`/dashboard/workspaces/${design.workspace_id}/designs`);
  revalidatePath(`/dashboard/workspaces/${design.workspace_id}`);
  return {};
}

export async function restoreDesignFromTrash(
  designIdInput: unknown
): Promise<DesignActionResult> {
  const loaded = await loadDesignForEdit(designIdInput);
  if ("error" in loaded) return { error: loaded.error };
  const { supabase, design } = loaded;

  const { error } = await supabase
    .from("design_projects")
    .update({ deleted_at: null })
    .eq("id", design.id);
  if (error) return { error: `Could not restore: ${error.message}` };

  revalidatePath(`/dashboard/workspaces/${design.workspace_id}/designs`);
  revalidatePath(`/dashboard/workspaces/${design.workspace_id}`);
  return {};
}

/** Permanent delete — owner/admin only (RLS enforces this too). */
export async function deleteDesignForever(
  designIdInput: unknown
): Promise<DesignActionResult> {
  const idParsed = z.string().uuid().safeParse(designIdInput);
  if (!idParsed.success) return { error: "Invalid design" };

  const supabase = await createClient();
  const { data: design } = await supabase
    .from("design_projects")
    .select("id, workspace_id, deleted_at")
    .eq("id", idParsed.data)
    .maybeSingle();
  if (!design) return { error: "Design not found" };
  if (!design.deleted_at) {
    return { error: "Move the design to trash before deleting it forever" };
  }

  const { role } = await requireDesignEditor(design.workspace_id);
  if (role !== "owner" && role !== "admin") {
    return { error: "Only workspace owners and admins can delete forever" };
  }

  const { error } = await supabase
    .from("design_projects")
    .delete()
    .eq("id", design.id);
  if (error) return { error: `Could not delete: ${error.message}` };

  revalidatePath(`/dashboard/workspaces/${design.workspace_id}/designs`);
  return {};
}

const recordExportSchema = z.object({
  designId: z.string().uuid(),
  width: z.number().int().min(1).max(8000),
  height: z.number().int().min(1).max(8000),
  status: z.enum(["completed", "failed"]),
  error: z.string().max(500).optional(),
});

/** Logs an export attempt (success and failure both count — metrics). */
export async function recordExport(
  input: unknown
): Promise<DesignActionResult> {
  const parsed = recordExportSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid export record" };

  const loaded = await loadDesignForEdit(parsed.data.designId);
  if ("error" in loaded) return { error: loaded.error };
  const { supabase, design, user } = loaded;

  const { error } = await supabase.from("design_exports").insert({
    design_id: design.id,
    workspace_id: design.workspace_id,
    format: "png",
    width: parsed.data.width,
    height: parsed.data.height,
    status: parsed.data.status,
    error: parsed.data.error ?? null,
    created_by: user.id,
  });
  if (error) return { error: `Could not record export: ${error.message}` };
  return {};
}

const registerAssetSchema = z.object({
  workspaceId: z.string().uuid(),
  designId: z.string().uuid(),
  storagePath: z.string().min(3).max(500),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
});

/** Records an uploaded design image (after a client-side storage upload). */
export async function registerDesignAsset(
  input: unknown
): Promise<DesignActionResult> {
  const parsed = registerAssetSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid asset" };
  const { workspaceId, designId, storagePath, mimeType } = parsed.data;

  if (!storagePath.startsWith(`${workspaceId}/`)) {
    return { error: "Invalid asset path" };
  }

  const { supabase, user, role } = await requireDesignEditor(workspaceId);
  if (!user) return { error: "You must be logged in" };
  if (!role || !EDIT_ROLES.includes(role)) {
    return { error: "You do not have permission to upload images" };
  }

  const { error } = await supabase.from("design_assets").insert({
    workspace_id: workspaceId,
    design_id: designId,
    storage_path: storagePath,
    mime_type: mimeType,
    created_by: user.id,
  });
  if (error) return { error: `Could not register asset: ${error.message}` };

  return {};
}
