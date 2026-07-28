import { z } from "zod";

/**
 * Template JSON schema (schemaVersion 1).
 *
 * Templates are structured JSON validated with Zod before every save and
 * render. Strings may reference variables like `{{primaryColor}}`; the
 * allowed set is fixed below. Static text can be a per-language object so
 * one template serves Arabic and English.
 */

export const BRAND_VARIABLES = [
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "backgroundColor",
  "textColor",
  "logoUrl",
  "businessName",
  "phone",
  "website",
  "brandFont", // resolves to arabicFont or englishFont by render language
  "arabicFont",
  "englishFont",
] as const;

export const CONTENT_VARIABLES = [
  "headline",
  "bodyText",
  "cta",
  "generatedImage",
] as const;

const ALL_VARIABLES = new Set<string>([...BRAND_VARIABLES, ...CONTENT_VARIABLES]);

const VARIABLE_PATTERN = /\{\{([a-zA-Z]+)\}\}/g;

/** A string value or a per-language pair; language is chosen at render time. */
const localizedString = z.union([
  z.string().max(2000),
  z.object({ en: z.string().max(2000), ar: z.string().max(2000) }),
]);

const colorValue = z
  .string()
  .regex(
    /^(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|\{\{[a-zA-Z]+\}\})$/,
    "Colors must be hex (#RRGGBB/#RRGGBBAA) or a {{variable}}"
  );

const layerBase = z.object({
  id: z.string().min(1).max(60),
  name: z.string().max(120).optional(),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().positive(),
  height: z.number().positive(),
  zIndex: z.number().int().min(0).max(999),
  /** Editable layers can be modified in the editor (Phase 04+); others are locked. */
  editable: z.boolean().default(false),
  hidden: z.boolean().optional(),
  opacity: z.number().min(0).max(1).optional(),
});

export const textLayerSchema = layerBase.extend({
  type: z.literal("text"),
  text: localizedString,
  fontFamily: z.string().min(1).max(80),
  fontSize: z.number().min(6).max(400),
  fontWeight: z.number().int().min(100).max(900).default(400),
  /** "auto" resolves from the render language (ar → rtl). */
  direction: z.enum(["rtl", "ltr", "auto"]).default("auto"),
  /** start/end resolve from the direction at render time. */
  align: z.enum(["start", "center", "end"]).default("start"),
  fill: colorValue,
  lineHeight: z.number().min(0.5).max(3).optional(),
  maxCharacters: z.number().int().min(1).max(2000).optional(),
});

export const imageLayerSchema = layerBase.extend({
  type: z.literal("image"),
  /** `{{generatedImage}}` or empty (placeholder until Phase 04 uploads). */
  src: z.string().max(500),
  fit: z.enum(["cover", "contain"]).default("cover"),
  cornerRadius: z.number().min(0).max(500).optional(),
});

export const shapeLayerSchema = layerBase.extend({
  type: z.literal("shape"),
  shape: z.enum(["rect", "ellipse"]),
  fill: colorValue,
  cornerRadius: z.number().min(0).max(500).optional(),
});

export const logoLayerSchema = layerBase.extend({
  type: z.literal("logo"),
  src: z.literal("{{logoUrl}}").default("{{logoUrl}}"),
  fit: z.enum(["contain", "cover"]).default("contain"),
});

export const iconLayerSchema = layerBase.extend({
  type: z.literal("icon"),
  /** Icon key from the icon set delivered with the editor (Phase 04). */
  icon: z.string().min(1).max(60),
  fill: colorValue,
});

export type TemplateLayer =
  | z.infer<typeof textLayerSchema>
  | z.infer<typeof imageLayerSchema>
  | z.infer<typeof shapeLayerSchema>
  | z.infer<typeof logoLayerSchema>
  | z.infer<typeof iconLayerSchema>
  | GroupLayer;

export interface GroupLayer extends z.infer<typeof layerBase> {
  type: "group";
  children: TemplateLayer[];
}

const groupLayerSchema = layerBase.extend({
  type: z.literal("group"),
  children: z.lazy(() => z.array(layerSchema).min(1).max(20)),
}) as unknown as z.ZodType<GroupLayer>;

const layerSchema: z.ZodType<TemplateLayer> = z.lazy(() =>
  z.union([
    textLayerSchema,
    imageLayerSchema,
    shapeLayerSchema,
    logoLayerSchema,
    iconLayerSchema,
    groupLayerSchema,
  ])
) as unknown as z.ZodType<TemplateLayer>;

export const templateJsonSchema = z
  .object({
    schemaVersion: z.literal(1),
    canvas: z.object({
      width: z.number().int().min(100).max(4000),
      height: z.number().int().min(100).max(4000),
      backgroundColor: colorValue,
    }),
    layers: z.array(layerSchema).min(1).max(60),
    supportedLanguages: z
      .array(z.enum(["ar", "en"]))
      .min(1)
      .refine((languages) => new Set(languages).size === languages.length, {
        message: "Duplicate languages",
      }),
  })
  .superRefine((template, ctx) => {
    // Every {{variable}} used anywhere must come from the allowed set.
    for (const match of JSON.stringify(template).matchAll(VARIABLE_PATTERN)) {
      if (!ALL_VARIABLES.has(match[1])) {
        ctx.addIssue({
          code: "custom",
          message: `Unknown template variable {{${match[1]}}}`,
        });
      }
    }

    // Layer ids must be unique (flattened, including groups).
    const ids: string[] = [];
    const collect = (layers: TemplateLayer[]) => {
      for (const layer of layers) {
        ids.push(layer.id);
        if (layer.type === "group") collect(layer.children);
      }
    };
    collect(template.layers);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: "custom", message: "Layer ids must be unique" });
    }
  });

export type TemplateJson = z.infer<typeof templateJsonSchema>;

/** Parse unknown JSON into a validated template, throwing on failure. */
export function parseTemplateJson(input: unknown): TemplateJson {
  return templateJsonSchema.parse(input);
}

/** Safe variant returning a readable error string instead of throwing. */
export function validateTemplateJson(
  input: unknown
): { ok: true; template: TemplateJson } | { ok: false; error: string } {
  const result = templateJsonSchema.safeParse(input);
  if (result.success) return { ok: true, template: result.data };
  const first = result.error.issues[0];
  const path = first?.path.join(".") || "template";
  return { ok: false, error: `${path}: ${first?.message ?? "invalid"}` };
}
