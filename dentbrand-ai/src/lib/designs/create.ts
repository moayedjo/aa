import type { TemplateJson, TemplateLayer } from "@/lib/templates/schema";
import {
  buildResolveContext,
  resolveTemplate,
  type RenderLanguage,
  type ResolvedLayer,
} from "@/lib/templates/resolve";
import type { DesignJson, DesignLayer } from "@/lib/designs/schema";
import type { BrandKit } from "@/types/database";

/**
 * Builds the initial design JSON from a template snapshot: the Brand Kit
 * is applied automatically (colors, fonts, business info), sample content
 * fills the text slots until AI copy exists (Phase 06), the logo becomes
 * an internal storage reference, and image slots start empty.
 */
export function buildInitialDesignJson(
  template: TemplateJson,
  brandKit: BrandKit | null,
  language: RenderLanguage
): DesignJson {
  const logoRef = brandKit?.logo_path
    ? `supabase://brand-assets/${brandKit.logo_path}`
    : "";

  // Resolve with the storage REF as the logo "URL" — designs persist refs,
  // not signed URLs (which expire).
  const ctx = buildResolveContext(brandKit, logoRef, language);
  const resolved = resolveTemplate(template, ctx);

  const layers = flatten(resolved.layers, template.layers);

  return {
    schemaVersion: 1,
    canvas: resolved.canvas as DesignJson["canvas"],
    layers,
  };
}

/**
 * Flattens groups (the editor works on a flat list) and converts resolved
 * layers into design layers. Children of a locked group stay locked.
 */
function flatten(
  resolvedLayers: ResolvedLayer[],
  templateLayers: TemplateLayer[],
  forceLocked = false
): DesignLayer[] {
  const result: DesignLayer[] = [];
  for (const layer of resolvedLayers) {
    if (layer.type === "group") {
      const groupEditable = !forceLocked && layer.editable;
      result.push(
        ...flatten(layer.children, templateLayers, !groupEditable)
      );
      continue;
    }
    const editable = forceLocked ? false : layer.editable;
    switch (layer.type) {
      case "text":
        result.push({
          ...layer,
          editable,
          text: layer.text,
          fontWeight: layer.fontWeight ?? 400,
        });
        break;
      case "image":
        result.push({ ...layer, editable, src: layer.src, fit: layer.fit ?? "cover" });
        break;
      case "shape":
        result.push({ ...layer, editable });
        break;
      case "logo":
        result.push({ ...layer, editable, src: layer.src, fit: layer.fit ?? "contain" });
        break;
      case "icon":
        result.push({ ...layer, editable });
        break;
    }
  }
  return result;
}
