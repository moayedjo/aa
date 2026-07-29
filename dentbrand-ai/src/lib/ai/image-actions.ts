"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/analytics/track";
import { generateImage, geminiImageModel } from "@/lib/ai/gemini";
import {
  buildImagePrompt,
  MAX_IMAGE_PROMPT_CHARS,
} from "@/lib/ai/image-prompt";
import {
  checkImageCredit,
  confirmImageCharge,
  refundImageReservation,
  IMAGE_GENERATION_COST,
} from "@/lib/credits/reservation";

const EDIT_ROLES = ["owner", "admin", "editor"];

export interface GenerateImageResult {
  /** Internal ref for design JSON (`supabase://design-assets/…`). */
  ref?: string;
  /** Short-lived URL for immediate canvas display. */
  signedUrl?: string;
  generationId?: string;
  /** True when an identical (idempotent) request already completed. */
  duplicate?: boolean;
  error?: string;
}

const generateImageSchema = z.object({
  designId: z.string().uuid(),
  prompt: z.string().trim().min(5).max(MAX_IMAGE_PROMPT_CHARS),
  idempotencyKey: z.string().min(8).max(80),
});

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * Full credit-safe generation flow:
 * validate → balance check → reserve (pending row w/ idempotency key) →
 * generate → store in Supabase Storage → confirm.
 * On any failure the reservation is marked failed and refunded — a failed
 * generation never consumes a final credit, and the design is untouched.
 */
export async function generateDesignImage(
  input: unknown
): Promise<GenerateImageResult> {
  const parsed = generateImageSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { designId, prompt, idempotencyKey } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in" };

  const { data: design } = await supabase
    .from("design_projects")
    .select("id, workspace_id, language, deleted_at")
    .eq("id", designId)
    .maybeSingle();
  if (!design || design.deleted_at) return { error: "Design not found" };

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", design.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || !EDIT_ROLES.includes(membership.role)) {
    return { error: "You do not have permission to generate images" };
  }

  // Idempotency: an identical request that already ran returns the prior
  // outcome instead of creating a second charge.
  const { data: existing } = await supabase
    .from("ai_generations")
    .select("id, status, asset_path")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existing) {
    if (existing.status === "completed" && existing.asset_path) {
      const { data: signed } = await supabase.storage
        .from("design-assets")
        .createSignedUrl(existing.asset_path, 60 * 60);
      return {
        ref: `supabase://design-assets/${existing.asset_path}`,
        signedUrl: signed?.signedUrl,
        generationId: existing.id,
        duplicate: true,
      };
    }
    if (existing.status === "pending") {
      return { error: "This generation is already in progress" };
    }
    return { error: "This request already failed — start a new generation" };
  }

  const balance = await checkImageCredit(design.workspace_id);
  if (!balance.ok) {
    return { error: balance.error ?? "Not enough image credits" };
  }

  const finalPrompt = buildImagePrompt(prompt);

  // RESERVE: the pending row is the reservation record.
  const { data: reservation, error: reserveError } = await supabase
    .from("ai_generations")
    .insert({
      workspace_id: design.workspace_id,
      design_id: design.id,
      kind: "image",
      language: design.language,
      input: { prompt, cost: IMAGE_GENERATION_COST },
      status: "pending",
      model: geminiImageModel(),
      idempotency_key: idempotencyKey,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (reserveError || !reservation) {
    // Unique-violation on the key means a concurrent duplicate won the race.
    if (reserveError?.code === "23505") {
      return { error: "This generation is already in progress" };
    }
    return { error: "Could not start the generation. Please try again." };
  }

  const started = Date.now();

  const fail = async (reason: string): Promise<GenerateImageResult> => {
    // REFUND: mark failed; the reservation never becomes a charge.
    await supabase
      .from("ai_generations")
      .update({
        status: "failed",
        error: reason,
        duration_ms: Date.now() - started,
      })
      .eq("id", reservation.id);
    refundImageReservation(design.workspace_id, reservation.id, reason);
    trackEvent("ai_image_failed", {
      workspaceId: design.workspace_id,
      userId: user.id,
    });
    return { error: reason };
  };

  const generated = await generateImage(finalPrompt);
  if (!generated.ok || !generated.base64) {
    return fail(generated.error ?? "Image generation failed");
  }

  const mimeType = EXTENSIONS[generated.mimeType ?? ""]
    ? (generated.mimeType as string)
    : "image/png";

  // STORE BEFORE USE: the image lands in workspace storage before the
  // client ever sees it; the canvas only loads internal refs.
  const assetPath = `${design.workspace_id}/${design.id}/ai-${Date.now()}.${EXTENSIONS[mimeType]}`;
  const bytes = Buffer.from(generated.base64, "base64");
  const { error: uploadError } = await supabase.storage
    .from("design-assets")
    .upload(assetPath, bytes, { contentType: mimeType, upsert: false });
  if (uploadError) {
    return fail(`Could not store the generated image: ${uploadError.message}`);
  }

  await supabase.from("design_assets").insert({
    workspace_id: design.workspace_id,
    design_id: design.id,
    storage_path: assetPath,
    kind: "generated",
    mime_type: mimeType,
    created_by: user.id,
  });

  // CONFIRM: only now does the reservation become a completed charge.
  const { error: confirmError } = await supabase
    .from("ai_generations")
    .update({
      status: "completed",
      asset_path: assetPath,
      output: { assetRef: `supabase://design-assets/${assetPath}` },
      duration_ms: Date.now() - started,
    })
    .eq("id", reservation.id);
  if (confirmError) {
    return fail("Generated, but the result could not be recorded");
  }
  confirmImageCharge(design.workspace_id, reservation.id);
  trackEvent("ai_image_generated", {
    workspaceId: design.workspace_id,
    userId: user.id,
  });

  const { data: signed } = await supabase.storage
    .from("design-assets")
    .createSignedUrl(assetPath, 60 * 60);

  return {
    ref: `supabase://design-assets/${assetPath}`,
    signedUrl: signed?.signedUrl,
    generationId: reservation.id,
  };
}
