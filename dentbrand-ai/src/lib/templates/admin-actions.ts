"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/auth/queries";
import { validateTemplateJson } from "@/lib/templates/schema";
import type { TemplateStatus } from "@/types/database";

export interface AdminActionResult {
  error?: string;
}

const templateMetaSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  categoryId: z.string().uuid().nullable(),
  serviceIds: z.array(z.string().uuid()).max(30),
});

const STATUS_VALUES: TemplateStatus[] = [
  "draft",
  "testing",
  "approved",
  "published",
  "archived",
];

/** Allowed lifecycle moves; anything else is rejected. */
const STATUS_TRANSITIONS: Record<TemplateStatus, TemplateStatus[]> = {
  draft: ["testing"],
  testing: ["draft", "approved"],
  approved: ["testing", "published"],
  published: ["archived"],
  archived: ["draft"],
};

export async function createTemplate(
  input: unknown
): Promise<AdminActionResult> {
  if (!(await isPlatformAdmin())) return { error: "Admin access required" };

  const parsed = z
    .object({
      verticalId: z.string().uuid(),
      name: z.string().trim().min(2).max(120),
      description: z.string().trim().max(500).optional(),
      categoryId: z.string().uuid().nullable(),
      templateJson: z.string().min(2),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(parsed.data.templateJson);
  } catch {
    return { error: "Template JSON is not valid JSON" };
  }
  const validated = validateTemplateJson(rawJson);
  if (!validated.ok) return { error: validated.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: template, error } = await supabase
    .from("templates")
    .insert({
      vertical_id: parsed.data.verticalId,
      category_id: parsed.data.categoryId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      status: "draft",
      current_version: 1,
      supported_languages: validated.template.supportedLanguages,
      canvas_width: validated.template.canvas.width,
      canvas_height: validated.template.canvas.height,
      created_by: user?.id,
    })
    .select("id")
    .single();
  if (error) return { error: `Could not create template: ${error.message}` };

  const { error: versionError } = await supabase
    .from("template_versions")
    .insert({
      template_id: template.id,
      version: 1,
      template_json: validated.template,
      created_by: user?.id,
    });
  if (versionError) {
    return { error: `Template created but version failed: ${versionError.message}` };
  }

  revalidatePath("/admin/templates");
  redirect(`/admin/templates/${template.id}`);
}

/** Saves edited JSON as a NEW immutable version and points current_version at it. */
export async function saveTemplateVersion(
  templateIdInput: unknown,
  templateJsonInput: unknown
): Promise<AdminActionResult> {
  if (!(await isPlatformAdmin())) return { error: "Admin access required" };

  const idParsed = z.string().uuid().safeParse(templateIdInput);
  if (!idParsed.success) return { error: "Invalid template id" };
  const jsonParsed = z.string().min(2).safeParse(templateJsonInput);
  if (!jsonParsed.success) return { error: "Invalid JSON payload" };

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(jsonParsed.data);
  } catch {
    return { error: "Template JSON is not valid JSON" };
  }
  const validated = validateTemplateJson(rawJson);
  if (!validated.ok) return { error: validated.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: template, error: loadError } = await supabase
    .from("templates")
    .select("current_version")
    .eq("id", idParsed.data)
    .single();
  if (loadError) return { error: `Template not found: ${loadError.message}` };

  const nextVersion = template.current_version + 1;

  const { error: versionError } = await supabase
    .from("template_versions")
    .insert({
      template_id: idParsed.data,
      version: nextVersion,
      template_json: validated.template,
      created_by: user?.id,
    });
  if (versionError) {
    return { error: `Could not save version: ${versionError.message}` };
  }

  const { error: updateError } = await supabase
    .from("templates")
    .update({
      current_version: nextVersion,
      supported_languages: validated.template.supportedLanguages,
      canvas_width: validated.template.canvas.width,
      canvas_height: validated.template.canvas.height,
    })
    .eq("id", idParsed.data);
  if (updateError) {
    return { error: `Version saved but template update failed: ${updateError.message}` };
  }

  revalidatePath(`/admin/templates/${idParsed.data}`);
  return {};
}

export async function updateTemplateMeta(
  templateIdInput: unknown,
  metaInput: unknown
): Promise<AdminActionResult> {
  if (!(await isPlatformAdmin())) return { error: "Admin access required" };

  const idParsed = z.string().uuid().safeParse(templateIdInput);
  if (!idParsed.success) return { error: "Invalid template id" };
  const parsed = templateMetaSchema.safeParse(metaInput);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("templates")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      category_id: parsed.data.categoryId,
    })
    .eq("id", idParsed.data);
  if (error) return { error: `Could not update template: ${error.message}` };

  // Replace service links.
  const { error: deleteError } = await supabase
    .from("template_services")
    .delete()
    .eq("template_id", idParsed.data);
  if (deleteError) {
    return { error: `Could not update services: ${deleteError.message}` };
  }
  if (parsed.data.serviceIds.length > 0) {
    const { error: insertError } = await supabase
      .from("template_services")
      .insert(
        parsed.data.serviceIds.map((serviceId) => ({
          template_id: idParsed.data,
          service_id: serviceId,
        }))
      );
    if (insertError) {
      return { error: `Could not link services: ${insertError.message}` };
    }
  }

  revalidatePath(`/admin/templates/${idParsed.data}`);
  return {};
}

export async function updateTemplateStatus(
  templateIdInput: unknown,
  statusInput: unknown
): Promise<AdminActionResult> {
  if (!(await isPlatformAdmin())) return { error: "Admin access required" };

  const idParsed = z.string().uuid().safeParse(templateIdInput);
  if (!idParsed.success) return { error: "Invalid template id" };
  const statusParsed = z
    .enum(STATUS_VALUES as [TemplateStatus, ...TemplateStatus[]])
    .safeParse(statusInput);
  if (!statusParsed.success) return { error: "Invalid status" };

  const supabase = await createClient();
  const { data: template, error: loadError } = await supabase
    .from("templates")
    .select("status, current_version")
    .eq("id", idParsed.data)
    .single();
  if (loadError) return { error: `Template not found: ${loadError.message}` };

  const from = template.status as TemplateStatus;
  const to = statusParsed.data;
  if (!STATUS_TRANSITIONS[from].includes(to)) {
    return { error: `Cannot move a template from "${from}" to "${to}"` };
  }

  // Publishing requires the current version's JSON to validate.
  if (to === "published") {
    const { data: version } = await supabase
      .from("template_versions")
      .select("template_json")
      .eq("template_id", idParsed.data)
      .eq("version", template.current_version)
      .maybeSingle();
    if (!version) return { error: "No current version to publish" };
    const validated = validateTemplateJson(version.template_json);
    if (!validated.ok) {
      return { error: `Cannot publish invalid template: ${validated.error}` };
    }
  }

  const { error } = await supabase
    .from("templates")
    .update({ status: to })
    .eq("id", idParsed.data);
  if (error) return { error: `Could not update status: ${error.message}` };

  revalidatePath("/admin/templates");
  revalidatePath(`/admin/templates/${idParsed.data}`);
  return {};
}
