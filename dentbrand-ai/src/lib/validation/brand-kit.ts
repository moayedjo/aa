import { z } from "zod";

import {
  APPROVED_ARABIC_FONTS,
  APPROVED_ENGLISH_FONTS,
  INDUSTRY_VERTICALS,
} from "@/lib/industries/config";

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color like #0E7490");

export const identityStepSchema = z.object({
  step: z.literal("identity"),
  businessName: z
    .string()
    .trim()
    .min(2, "Business name must be at least 2 characters")
    .max(120, "Business name must be at most 120 characters"),
});

export const colorsStepSchema = z.object({
  step: z.literal("colors"),
  primaryColor: hexColor,
  secondaryColor: hexColor,
  accentColor: hexColor,
  backgroundColor: hexColor,
  textColor: hexColor,
});

export const fontsStepSchema = z.object({
  step: z.literal("fonts"),
  arabicFont: z.enum(APPROVED_ARABIC_FONTS, {
    message: "Choose an approved Arabic font",
  }),
  englishFont: z.enum(APPROVED_ENGLISH_FONTS, {
    message: "Choose an approved English font",
  }),
});

export const contactStepSchema = z.object({
  step: z.literal("contact"),
  phone: z
    .string()
    .trim()
    .min(5, "Enter a valid phone number")
    .max(30, "Phone number is too long")
    .regex(/^[+\d][\d\s\-()]*$/, "Enter a valid phone number"),
  website: z
    .union([
      z.literal(""),
      z.string().trim().url("Enter a full URL, e.g. https://clinic.com").max(200),
    ])
    .optional(),
  address: z.string().trim().max(300, "Address is too long").optional(),
});

const industryKeys = INDUSTRY_VERTICALS.filter((v) => v.available).map(
  (v) => v.key
) as [string, ...string[]];

export const languageStepSchema = z.object({
  step: z.literal("language"),
  defaultLanguage: z.enum(["ar", "en"]),
  industryKey: z.enum(industryKeys, { message: "Choose an available industry" }),
});

export const servicesStepSchema = z.object({
  step: z.literal("services"),
  services: z
    .array(z.string().min(1).max(60))
    .min(1, "Select at least one service")
    .max(20, "Too many services selected"),
});

export const onboardingStepSchema = z.discriminatedUnion("step", [
  identityStepSchema,
  colorsStepSchema,
  fontsStepSchema,
  contactStepSchema,
  languageStepSchema,
  servicesStepSchema,
]);

export type OnboardingStepInput = z.infer<typeof onboardingStepSchema>;
export type IdentityStepInput = z.infer<typeof identityStepSchema>;
export type ColorsStepInput = z.infer<typeof colorsStepSchema>;
export type FontsStepInput = z.infer<typeof fontsStepSchema>;
export type ContactStepInput = z.infer<typeof contactStepSchema>;
export type LanguageStepInput = z.infer<typeof languageStepSchema>;
export type ServicesStepInput = z.infer<typeof servicesStepSchema>;

/** Storage object path saved after a logo upload: {workspaceId}/{filename}. */
export const logoPathSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[\w.-]+\.(png|jpg|jpeg|svg|webp)$/i,
    "Invalid logo path"
  );

export const ALLOWED_LOGO_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
] as const;

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
