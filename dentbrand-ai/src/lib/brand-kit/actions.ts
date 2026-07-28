"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/analytics/track";
import {
  logoPathSchema,
  onboardingStepSchema,
} from "@/lib/validation/brand-kit";
import type { BrandKit } from "@/types/database";

export interface BrandKitActionResult {
  error?: string;
}

/** Step order drives saved progress; keep in sync with the wizard. */
const STEP_ORDER = [
  "identity",
  "colors",
  "fonts",
  "contact",
  "language",
  "services",
] as const;

const workspaceIdSchema = z.string().uuid();

/**
 * Verifies the current user may edit the given workspace's brand kit
 * (owner/admin — enforced again by RLS on every write).
 */
async function requireEditor(workspaceId: string) {
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

export async function saveOnboardingStep(
  workspaceIdInput: unknown,
  stepInput: unknown
): Promise<BrandKitActionResult> {
  const wsParsed = workspaceIdSchema.safeParse(workspaceIdInput);
  if (!wsParsed.success) return { error: "Invalid workspace" };
  const workspaceId = wsParsed.data;

  const parsed = onboardingStepSchema.safeParse(stepInput);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  const { supabase, user, role } = await requireEditor(workspaceId);
  if (!user) return { error: "You must be logged in" };
  if (role !== "owner" && role !== "admin") {
    return { error: "Only workspace owners and admins can edit the Brand Kit" };
  }

  // Industry settings live in their own table; selections are validated
  // against the database-backed catalog (Phase 03).
  if (input.step === "language" || input.step === "services") {
    if (input.step === "services") {
      const { data: settings } = await supabase
        .from("workspace_industry_settings")
        .select("industry_key")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      const industryKey = settings?.industry_key ?? "dental";

      const { data: vertical } = await supabase
        .from("industry_verticals")
        .select("id")
        .eq("key", industryKey)
        .maybeSingle();
      if (!vertical) return { error: "Unknown industry" };

      const { data: validServices } = await supabase
        .from("services")
        .select("key")
        .eq("vertical_id", vertical.id);
      const validKeys = new Set((validServices ?? []).map((s) => s.key));
      const invalid = input.services.filter((s) => !validKeys.has(s));
      if (invalid.length > 0) {
        return { error: `Unknown services: ${invalid.join(", ")}` };
      }

      const { error } = await supabase
        .from("workspace_industry_settings")
        .upsert(
          { workspace_id: workspaceId, selected_services: input.services },
          { onConflict: "workspace_id" }
        );
      if (error) return { error: `Could not save services: ${error.message}` };
    } else {
      const { data: vertical } = await supabase
        .from("industry_verticals")
        .select("id, is_available")
        .eq("key", input.industryKey)
        .maybeSingle();
      if (!vertical?.is_available) {
        return { error: "This industry is not available yet" };
      }

      const { error } = await supabase
        .from("workspace_industry_settings")
        .upsert(
          { workspace_id: workspaceId, industry_key: input.industryKey },
          { onConflict: "workspace_id" }
        );
      if (error) return { error: `Could not save industry: ${error.message}` };
    }
  }

  // Brand kit fields for this step (language also stores default_language).
  const brandKitFields: Partial<BrandKit> = {};
  switch (input.step) {
    case "identity":
      brandKitFields.business_name = input.businessName;
      break;
    case "colors":
      brandKitFields.primary_color = input.primaryColor;
      brandKitFields.secondary_color = input.secondaryColor;
      brandKitFields.accent_color = input.accentColor;
      brandKitFields.background_color = input.backgroundColor;
      brandKitFields.text_color = input.textColor;
      break;
    case "fonts":
      brandKitFields.arabic_font = input.arabicFont;
      brandKitFields.english_font = input.englishFont;
      break;
    case "contact":
      brandKitFields.phone = input.phone;
      brandKitFields.website = input.website || null;
      brandKitFields.address = input.address || null;
      break;
    case "language":
      brandKitFields.default_language = input.defaultLanguage;
      break;
    case "services":
      break;
  }

  const stepIndex = STEP_ORDER.indexOf(input.step);
  const nextStep = stepIndex + 1;

  const { data: existing } = await supabase
    .from("brand_kits")
    .select("onboarding_step")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const { error } = await supabase.from("brand_kits").upsert(
    {
      workspace_id: workspaceId,
      ...brandKitFields,
      onboarding_step: Math.max(existing?.onboarding_step ?? 0, nextStep),
    },
    { onConflict: "workspace_id" }
  );
  if (error) return { error: `Could not save: ${error.message}` };

  if (!existing && stepIndex === 0) {
    trackEvent("onboarding_started", { workspaceId, userId: user.id });
  }
  trackEvent("onboarding_step_completed", {
    workspaceId,
    userId: user.id,
    step: input.step,
  });

  revalidatePath(`/onboarding/${workspaceId}`);
  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  return {};
}

/** Persists the storage path after a successful client-side logo upload. */
export async function saveLogoPath(
  workspaceIdInput: unknown,
  logoPathInput: unknown
): Promise<BrandKitActionResult> {
  const wsParsed = workspaceIdSchema.safeParse(workspaceIdInput);
  if (!wsParsed.success) return { error: "Invalid workspace" };
  const workspaceId = wsParsed.data;

  const pathParsed = logoPathSchema.safeParse(logoPathInput);
  if (!pathParsed.success) return { error: "Invalid logo path" };
  // The path must live inside this workspace's folder.
  if (!pathParsed.data.startsWith(`${workspaceId}/`)) {
    return { error: "Invalid logo path" };
  }

  const { supabase, user, role } = await requireEditor(workspaceId);
  if (!user) return { error: "You must be logged in" };
  if (role !== "owner" && role !== "admin") {
    return { error: "Only workspace owners and admins can edit the Brand Kit" };
  }

  const { error } = await supabase.from("brand_kits").upsert(
    { workspace_id: workspaceId, logo_path: pathParsed.data },
    { onConflict: "workspace_id" }
  );
  if (error) return { error: `Could not save logo: ${error.message}` };

  trackEvent("onboarding_logo_uploaded", { workspaceId, userId: user.id });

  revalidatePath(`/onboarding/${workspaceId}`);
  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  return {};
}

export async function completeOnboarding(
  workspaceIdInput: unknown
): Promise<BrandKitActionResult> {
  const wsParsed = workspaceIdSchema.safeParse(workspaceIdInput);
  if (!wsParsed.success) return { error: "Invalid workspace" };
  const workspaceId = wsParsed.data;

  const { supabase, user, role } = await requireEditor(workspaceId);
  if (!user) return { error: "You must be logged in" };
  if (role !== "owner" && role !== "admin") {
    return { error: "Only workspace owners and admins can edit the Brand Kit" };
  }

  const { error } = await supabase
    .from("brand_kits")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId);
  if (error) return { error: `Could not complete onboarding: ${error.message}` };

  trackEvent("onboarding_completed", { workspaceId, userId: user.id });

  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  redirect(`/dashboard/workspaces/${workspaceId}`);
}
