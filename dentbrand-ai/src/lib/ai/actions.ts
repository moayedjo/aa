"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackEvent } from "@/lib/analytics/track";
import { generateJson, geminiModel, parseJsonOutput } from "@/lib/ai/gemini";
import {
  aiCopySchema,
  fieldSchemas,
  COPY_FIELDS,
  COPY_TONES,
  FIELD_MODES,
  FIELD_MODE_INSTRUCTIONS,
  type AiCopy,
} from "@/lib/ai/copy-schema";
import { validateDesignJson } from "@/lib/designs/schema";

const EDIT_ROLES = ["owner", "admin", "editor"];

export interface GenerateCopyResult {
  copy?: AiCopy;
  generationId?: string;
  error?: string;
}

export interface RegenerateFieldResult {
  value?: unknown;
  error?: string;
}

interface CharLimits {
  headlineLimit: number;
  bodyLimit: number;
  ctaLimit: number;
}

/** Character limits from the design's own layers (template limits travel with the design). */
function charLimitsFromDesign(designJson: unknown): CharLimits {
  const limits: CharLimits = { headlineLimit: 65, bodyLimit: 160, ctaLimit: 24 };
  const validated = validateDesignJson(designJson);
  if (!validated.ok) return limits;
  for (const layer of validated.design.layers) {
    if (layer.type !== "text" || !layer.maxCharacters) continue;
    if (layer.id === "headline") limits.headlineLimit = layer.maxCharacters;
    if (layer.id === "body") limits.bodyLimit = layer.maxCharacters;
    if (layer.id === "cta") limits.ctaLimit = layer.maxCharacters;
  }
  return limits;
}

function fillTemplate(
  template: string,
  values: Record<string, string | number>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    String(values[key] ?? "")
  );
}

/**
 * Loads design + auth context and the prompt (via the audited service-role
 * client — prompts are platform IP hidden from user sessions by RLS).
 */
async function prepareGeneration(designIdInput: unknown, promptKey: string) {
  const idParsed = z.string().uuid().safeParse(designIdInput);
  if (!idParsed.success) return { error: "Invalid design" as const };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in" as const };

  const { data: design } = await supabase
    .from("design_projects")
    .select("id, workspace_id, language, design_json, deleted_at")
    .eq("id", idParsed.data)
    .maybeSingle();
  if (!design || design.deleted_at) {
    return { error: "Design not found" as const };
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", design.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || !EDIT_ROLES.includes(membership.role)) {
    return { error: "You do not have permission to generate content" as const };
  }

  const { data: settings } = await supabase
    .from("workspace_industry_settings")
    .select("industry_key")
    .eq("workspace_id", design.workspace_id)
    .maybeSingle();
  const industryKey = settings?.industry_key ?? "dental";

  const { data: brandKit } = await supabase
    .from("brand_kits")
    .select("business_name")
    .eq("workspace_id", design.workspace_id)
    .maybeSingle();

  // Prompt lookup with the service role (documented in SECURITY.md).
  let prompt:
    | { templateId: string; version: number; system: string; user: string }
    | null = null;
  try {
    const admin = createAdminClient();
    const { data: promptTemplate } = await admin
      .from("prompt_templates")
      .select("id, current_version, industry_verticals!inner(key)")
      .eq("key", promptKey)
      .eq("industry_verticals.key", industryKey)
      .maybeSingle();
    if (promptTemplate) {
      const { data: promptVersion } = await admin
        .from("prompt_versions")
        .select("system_prompt, user_prompt_template")
        .eq("prompt_template_id", promptTemplate.id)
        .eq("version", promptTemplate.current_version)
        .maybeSingle();
      if (promptVersion) {
        prompt = {
          templateId: promptTemplate.id,
          version: promptTemplate.current_version,
          system: promptVersion.system_prompt,
          user: promptVersion.user_prompt_template,
        };
      }
    }
  } catch {
    prompt = null;
  }
  if (!prompt) {
    return { error: "AI prompts are not configured for this industry" as const };
  }

  return {
    supabase,
    user,
    design,
    businessName: brandKit?.business_name ?? "",
    prompt,
  };
}

async function logGeneration(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  workspaceId: string;
  designId: string;
  promptTemplateId: string;
  promptVersion: number;
  language: string;
  requestInput: Record<string, unknown>;
  output: unknown | null;
  status: "completed" | "failed";
  error?: string;
  durationMs: number;
  userId: string;
}): Promise<string | undefined> {
  const { data } = await input.supabase
    .from("ai_generations")
    .insert({
      workspace_id: input.workspaceId,
      design_id: input.designId,
      kind: "copy",
      prompt_template_id: input.promptTemplateId,
      prompt_version: input.promptVersion,
      language: input.language,
      input: input.requestInput,
      output: input.output,
      status: input.status,
      error: input.error ?? null,
      model: geminiModel(),
      duration_ms: input.durationMs,
      created_by: input.userId,
    })
    .select("id")
    .maybeSingle();
  return data?.id;
}

const generateCopySchema = z.object({
  designId: z.string().uuid(),
  service: z.string().trim().min(1).max(120),
  contentGoal: z.string().trim().min(1).max(120),
  tone: z.enum(COPY_TONES),
  targetAudience: z.string().trim().max(200).optional(),
  offerDetails: z.string().trim().max(300).optional(),
  additionalInstructions: z.string().trim().max(300).optional(),
});

export async function generateCopy(
  input: unknown
): Promise<GenerateCopyResult> {
  const parsed = generateCopySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const prepared = await prepareGeneration(parsed.data.designId, "social-copy");
  if ("error" in prepared) return { error: prepared.error };
  const { supabase, user, design, businessName, prompt } = prepared;

  const limits = charLimitsFromDesign(design.design_json);
  const userPrompt = fillTemplate(prompt.user, {
    businessName,
    service: parsed.data.service,
    contentGoal: parsed.data.contentGoal,
    language: design.language,
    tone: parsed.data.tone,
    targetAudience: parsed.data.targetAudience || "General audience",
    offerDetails: parsed.data.offerDetails || "",
    additionalInstructions: parsed.data.additionalInstructions || "",
    ...limits,
  });

  const requestInput = { ...parsed.data, ...limits } as Record<string, unknown>;
  const started = Date.now();

  // One retry on invalid output — models occasionally return bad JSON.
  let copy: AiCopy | null = null;
  let lastError = "AI returned an invalid response";
  for (let attempt = 0; attempt < 2 && !copy; attempt++) {
    const result = await generateJson(prompt.system, userPrompt);
    if (!result.ok || !result.text) {
      lastError = result.error ?? lastError;
      continue;
    }
    const json = parseJsonOutput(result.text);
    const validated = aiCopySchema.safeParse(json);
    if (validated.success) copy = validated.data;
  }

  const durationMs = Date.now() - started;

  if (!copy) {
    await logGeneration({
      supabase,
      workspaceId: design.workspace_id,
      designId: design.id,
      promptTemplateId: prompt.templateId,
      promptVersion: prompt.version,
      language: design.language,
      requestInput,
      output: null,
      status: "failed",
      error: lastError,
      durationMs,
      userId: user.id,
    });
    trackEvent("ai_copy_failed", {
      workspaceId: design.workspace_id,
      userId: user.id,
    });
    return { error: lastError };
  }

  const generationId = await logGeneration({
    supabase,
    workspaceId: design.workspace_id,
    designId: design.id,
    promptTemplateId: prompt.templateId,
    promptVersion: prompt.version,
    language: design.language,
    requestInput,
    output: copy,
    status: "completed",
    durationMs,
    userId: user.id,
  });
  trackEvent("ai_copy_generated", {
    workspaceId: design.workspace_id,
    userId: user.id,
  });

  return { copy, generationId };
}

const regenerateFieldSchema = z.object({
  designId: z.string().uuid(),
  field: z.enum(COPY_FIELDS),
  mode: z.enum(FIELD_MODES),
  currentValue: z.string().max(3000),
  service: z.string().trim().min(1).max(120),
  contentGoal: z.string().trim().min(1).max(120),
});

/**
 * Regenerates ONE field without touching the others. The previous value
 * stays client-side (and in ai_generations history) — nothing is replaced
 * until the user applies the result.
 */
export async function regenerateCopyField(
  input: unknown
): Promise<RegenerateFieldResult> {
  const parsed = regenerateFieldSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const prepared = await prepareGeneration(
    parsed.data.designId,
    "social-copy-field"
  );
  if ("error" in prepared) return { error: prepared.error };
  const { supabase, user, design, businessName, prompt } = prepared;

  const limits = charLimitsFromDesign(design.design_json);
  const charLimit =
    parsed.data.field === "headlineOptions"
      ? limits.headlineLimit
      : parsed.data.field === "bodyText"
        ? limits.bodyLimit
        : parsed.data.field === "ctaOptions"
          ? limits.ctaLimit
          : parsed.data.field === "caption"
            ? 2200
            : 1000;

  const userPrompt = fillTemplate(prompt.user, {
    businessName,
    service: parsed.data.service,
    contentGoal: parsed.data.contentGoal,
    language: design.language,
    field: parsed.data.field,
    instruction: FIELD_MODE_INSTRUCTIONS[parsed.data.mode],
    currentValue: parsed.data.currentValue,
    charLimit,
  });

  const started = Date.now();
  const fieldSchema = fieldSchemas[parsed.data.field];

  let value: unknown = null;
  let lastError = "AI returned an invalid response";
  for (let attempt = 0; attempt < 2 && value === null; attempt++) {
    const result = await generateJson(prompt.system, userPrompt);
    if (!result.ok || !result.text) {
      lastError = result.error ?? lastError;
      continue;
    }
    const json = parseJsonOutput(result.text);
    const validated = fieldSchema.safeParse(json);
    if (validated.success) {
      value = (validated.data as Record<string, unknown>)[parsed.data.field];
    }
  }

  const durationMs = Date.now() - started;
  const status = value === null ? "failed" : "completed";

  await logGeneration({
    supabase,
    workspaceId: design.workspace_id,
    designId: design.id,
    promptTemplateId: prompt.templateId,
    promptVersion: prompt.version,
    language: design.language,
    requestInput: {
      field: parsed.data.field,
      mode: parsed.data.mode,
      service: parsed.data.service,
      contentGoal: parsed.data.contentGoal,
      charLimit,
    },
    output: value === null ? null : { [parsed.data.field]: value },
    status,
    error: value === null ? lastError : undefined,
    durationMs,
    userId: user.id,
  });
  trackEvent(
    value === null ? "ai_copy_failed" : "ai_copy_field_regenerated",
    {
      workspaceId: design.workspace_id,
      userId: user.id,
      step: parsed.data.field,
    }
  );

  if (value === null) return { error: lastError };
  return { value };
}
