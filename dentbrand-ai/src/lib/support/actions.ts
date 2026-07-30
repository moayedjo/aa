"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/analytics/track";

export interface SupportActionResult {
  error?: string;
  success?: string;
}

const supportSchema = z.object({
  workspaceId: z.string().uuid(),
  designId: z.string().uuid().optional(),
  kind: z.enum(["problem", "feedback", "help"]),
  message: z.string().trim().min(3).max(4000),
  // Client-supplied context is sanitized to a small, known shape.
  context: z
    .object({
      path: z.string().max(300).optional(),
      designName: z.string().max(200).optional(),
    })
    .optional(),
});

/**
 * Opens a support request. Design + workspace context are attached so the
 * team can reproduce without asking (spec §10). RLS restricts creation to
 * workspace members acting as themselves.
 */
export async function createSupportRequest(
  input: unknown
): Promise<SupportActionResult> {
  const parsed = supportSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid request" };
  }
  const { workspaceId, designId, kind, message, context } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in" };

  const { error } = await supabase.from("support_requests").insert({
    workspace_id: workspaceId,
    design_id: designId ?? null,
    user_id: user.id,
    kind,
    message,
    context: {
      ...context,
      designId: designId ?? null,
    },
  });
  if (error) return { error: `Could not send: ${error.message}` };

  trackEvent("support_request_created", {
    workspaceId,
    userId: user.id,
    step: kind,
  });

  return {
    success: "Thanks — we got your message and will follow up by email.",
  };
}

const ratingSchema = z.object({
  designId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});

/** Records (or updates) a design satisfaction rating. Never blocks work. */
export async function rateDesign(input: unknown): Promise<SupportActionResult> {
  const parsed = ratingSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid rating" };
  const { designId, workspaceId, rating, comment } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in" };

  const { error } = await supabase.from("design_ratings").upsert(
    {
      design_id: designId,
      workspace_id: workspaceId,
      user_id: user.id,
      rating,
      comment: comment || null,
    },
    { onConflict: "design_id,user_id" }
  );
  if (error) return { error: `Could not save your rating: ${error.message}` };

  trackEvent("design_rated", {
    workspaceId,
    userId: user.id,
    rating,
  });

  return { success: "Thanks for the feedback!" };
}

const regenReasonSchema = z.object({
  workspaceId: z.string().uuid(),
  designId: z.string().uuid(),
  target: z.enum(["copy", "image"]),
  reason: z.string().trim().min(1).max(300),
});

/** Captures why a user regenerated AI output — a product signal, not a block. */
export async function recordRegenerationReason(
  input: unknown
): Promise<SupportActionResult> {
  const parsed = regenReasonSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in" };

  trackEvent("ai_regenerated", {
    workspaceId: parsed.data.workspaceId,
    userId: user.id,
    step: parsed.data.target,
    reason: parsed.data.reason,
  });
  return { success: "Thanks — noted." };
}
