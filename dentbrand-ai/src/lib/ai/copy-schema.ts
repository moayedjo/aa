import { z } from "zod";

/**
 * Structured AI copy output (spec section 13). Shared by server validation
 * and client typing — contains no secrets.
 */

export const aiCopySchema = z.object({
  headlineOptions: z.array(z.string().trim().min(1).max(200)).min(2).max(5),
  bodyText: z.string().trim().min(1).max(1000),
  caption: z.string().trim().min(1).max(2200),
  ctaOptions: z.array(z.string().trim().min(1).max(80)).min(2).max(5),
  hashtags: z.array(z.string().trim().min(2).max(60)).max(15),
  imagePrompt: z.string().trim().max(1500),
  medicalDisclaimerNeeded: z.boolean(),
});

export type AiCopy = z.infer<typeof aiCopySchema>;

export const COPY_FIELDS = [
  "headlineOptions",
  "bodyText",
  "caption",
  "ctaOptions",
  "hashtags",
  "imagePrompt",
] as const;

export type CopyField = (typeof COPY_FIELDS)[number];

/** Single-field regeneration outputs, keyed by the field name. */
export const fieldSchemas: Record<CopyField, z.ZodType<unknown>> = {
  headlineOptions: z.object({
    headlineOptions: aiCopySchema.shape.headlineOptions,
  }),
  bodyText: z.object({ bodyText: aiCopySchema.shape.bodyText }),
  caption: z.object({ caption: aiCopySchema.shape.caption }),
  ctaOptions: z.object({ ctaOptions: aiCopySchema.shape.ctaOptions }),
  hashtags: z.object({ hashtags: aiCopySchema.shape.hashtags }),
  imagePrompt: z.object({ imagePrompt: aiCopySchema.shape.imagePrompt }),
};

export const FIELD_MODES = [
  "regenerate",
  "shorten",
  "rewrite",
  "professional",
  "friendly",
] as const;

export type FieldMode = (typeof FIELD_MODES)[number];

export const FIELD_MODE_INSTRUCTIONS: Record<FieldMode, string> = {
  regenerate: "Produce fresh alternatives different from the current value.",
  shorten:
    "Make it noticeably shorter while keeping the meaning; stay well inside the character limit.",
  rewrite: "Rewrite it with different wording but the same message.",
  professional: "Rewrite it in a more professional, trustworthy tone.",
  friendly: "Rewrite it in a warmer, friendlier tone.",
};

export const COPY_TONES = ["professional", "friendly", "playful"] as const;
export type CopyTone = (typeof COPY_TONES)[number];
