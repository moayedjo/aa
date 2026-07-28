import { z } from "zod";

/**
 * Design JSON schema — the concrete working state of a design project.
 * Same layer vocabulary as templates, but every value is resolved: no
 * {{variables}}, colors are hex, text is a plain string, and image/logo
 * sources are internal storage references (`supabase://bucket/path`) or
 * empty. Validated on every save.
 */

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/, "Colors must be hex");

/** Internal storage reference or empty (placeholder). Never an external URL. */
const assetRef = z
  .string()
  .max(600)
  .regex(
    /^(|supabase:\/\/(brand-assets|design-assets)\/[\w\-./]+)$/,
    "Image sources must be internal storage references"
  );

const layerBase = z.object({
  id: z.string().min(1).max(60),
  name: z.string().max(120).optional(),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().positive(),
  height: z.number().positive(),
  zIndex: z.number().int().min(0).max(999),
  editable: z.boolean(),
  hidden: z.boolean().optional(),
  opacity: z.number().min(0).max(1).optional(),
});

const textLayer = layerBase.extend({
  type: z.literal("text"),
  text: z.string().max(2000),
  fontFamily: z.string().min(1).max(80),
  fontSize: z.number().min(6).max(400),
  fontWeight: z.number().int().min(100).max(900),
  direction: z.enum(["rtl", "ltr"]),
  align: z.enum(["left", "center", "right"]),
  fill: hexColor,
  lineHeight: z.number().min(0.5).max(3).optional(),
  maxCharacters: z.number().int().min(1).max(2000).optional(),
});

const imageLayer = layerBase.extend({
  type: z.literal("image"),
  src: assetRef,
  fit: z.enum(["cover", "contain"]),
  cornerRadius: z.number().min(0).max(500).optional(),
});

const shapeLayer = layerBase.extend({
  type: z.literal("shape"),
  shape: z.enum(["rect", "ellipse"]),
  fill: hexColor,
  cornerRadius: z.number().min(0).max(500).optional(),
});

const logoLayer = layerBase.extend({
  type: z.literal("logo"),
  src: assetRef,
  fit: z.enum(["contain", "cover"]),
});

const iconLayer = layerBase.extend({
  type: z.literal("icon"),
  icon: z.string().min(1).max(60),
  fill: hexColor,
});

export const designLayerSchema = z.discriminatedUnion("type", [
  textLayer,
  imageLayer,
  shapeLayer,
  logoLayer,
  iconLayer,
]);

export type DesignLayer = z.infer<typeof designLayerSchema>;
export type DesignTextLayer = z.infer<typeof textLayer>;
export type DesignImageLayer = z.infer<typeof imageLayer>;

export const designJsonSchema = z.object({
  schemaVersion: z.literal(1),
  canvas: z.object({
    width: z.number().int().min(100).max(4000),
    height: z.number().int().min(100).max(4000),
    backgroundColor: hexColor,
  }),
  // Groups from templates are flattened at design creation; the editor
  // works on a flat, z-ordered layer list.
  layers: z.array(designLayerSchema).min(1).max(80),
});

export type DesignJson = z.infer<typeof designJsonSchema>;

export function validateDesignJson(
  input: unknown
): { ok: true; design: DesignJson } | { ok: false; error: string } {
  const result = designJsonSchema.safeParse(input);
  if (result.success) return { ok: true, design: result.data };
  const first = result.error.issues[0];
  const path = first?.path.join(".") || "design";
  return { ok: false, error: `${path}: ${first?.message ?? "invalid"}` };
}

/** All storage refs used by a design (for signed-URL resolution). */
export function collectAssetRefs(design: DesignJson): string[] {
  const refs = new Set<string>();
  for (const layer of design.layers) {
    if ((layer.type === "image" || layer.type === "logo") && layer.src) {
      refs.add(layer.src);
    }
  }
  return [...refs];
}

/** Splits `supabase://bucket/path` into its parts, or null when empty/invalid. */
export function parseAssetRef(
  ref: string
): { bucket: string; path: string } | null {
  const match = /^supabase:\/\/([\w-]+)\/(.+)$/.exec(ref);
  if (!match) return null;
  return { bucket: match[1], path: match[2] };
}
