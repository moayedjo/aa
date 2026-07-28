import type { TemplateJson, TemplateLayer } from "@/lib/templates/schema";
import type { BrandKit } from "@/types/database";

export type RenderLanguage = "ar" | "en";

/** Concrete values substituted into a template for preview/render. */
export interface ResolveContext {
  language: RenderLanguage;
  brand: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    logoUrl: string;
    businessName: string;
    phone: string;
    website: string;
    arabicFont: string;
    englishFont: string;
  };
  content: {
    headline: string;
    bodyText: string;
    cta: string;
    generatedImage: string;
  };
}

/** Sample copy used until AI copy exists (Phase 06). */
export const SAMPLE_CONTENT: Record<
  RenderLanguage,
  ResolveContext["content"]
> = {
  en: {
    headline: "A brighter smile starts here",
    bodyText: "Book your check-up today and let our team take care of the rest.",
    cta: "Book now",
    generatedImage: "",
  },
  ar: {
    headline: "ابتسامة أجمل تبدأ من هنا",
    bodyText: "احجز فحصك الدوري اليوم ودع فريقنا يعتني بالباقي.",
    cta: "احجز الآن",
    generatedImage: "",
  },
};

const BRAND_DEFAULTS = {
  primaryColor: "#0e7490",
  secondaryColor: "#155e75",
  accentColor: "#f59e0b",
  backgroundColor: "#f8fafc",
  textColor: "#0f172a",
  arabicFont: "Tajawal",
  englishFont: "Inter",
};

/** Builds a resolve context from a Brand Kit (nulls fall back to defaults). */
export function buildResolveContext(
  brandKit: BrandKit | null,
  logoSignedUrl: string | null,
  language: RenderLanguage,
  content?: Partial<ResolveContext["content"]>
): ResolveContext {
  return {
    language,
    brand: {
      primaryColor: brandKit?.primary_color ?? BRAND_DEFAULTS.primaryColor,
      secondaryColor: brandKit?.secondary_color ?? BRAND_DEFAULTS.secondaryColor,
      accentColor: brandKit?.accent_color ?? BRAND_DEFAULTS.accentColor,
      backgroundColor:
        brandKit?.background_color ?? BRAND_DEFAULTS.backgroundColor,
      textColor: brandKit?.text_color ?? BRAND_DEFAULTS.textColor,
      logoUrl: logoSignedUrl ?? "",
      businessName: brandKit?.business_name ?? "Your clinic",
      phone: brandKit?.phone ?? "",
      website: brandKit?.website?.replace(/^https?:\/\//, "") ?? "",
      arabicFont: brandKit?.arabic_font ?? BRAND_DEFAULTS.arabicFont,
      englishFont: brandKit?.english_font ?? BRAND_DEFAULTS.englishFont,
    },
    content: { ...SAMPLE_CONTENT[language], ...content },
  };
}

function variableValue(name: string, ctx: ResolveContext): string {
  if (name === "brandFont") {
    return ctx.language === "ar" ? ctx.brand.arabicFont : ctx.brand.englishFont;
  }
  if (name in ctx.brand) {
    return ctx.brand[name as keyof ResolveContext["brand"]];
  }
  if (name in ctx.content) {
    return ctx.content[name as keyof ResolveContext["content"]];
  }
  return "";
}

function substitute(value: string, ctx: ResolveContext): string {
  return value.replace(/\{\{([a-zA-Z]+)\}\}/g, (_, name: string) =>
    variableValue(name, ctx)
  );
}

function localized(
  value: string | { en: string; ar: string },
  ctx: ResolveContext
): string {
  const raw = typeof value === "string" ? value : value[ctx.language];
  return substitute(raw, ctx);
}

/** A layer with all variables replaced by concrete values. */
export type ResolvedLayer =
  | (Omit<Extract<TemplateLayer, { type: "text" }>, "text" | "fill" | "direction" | "align"> & {
      type: "text";
      text: string;
      fill: string;
      direction: "rtl" | "ltr";
      align: "left" | "center" | "right";
    })
  | (Extract<TemplateLayer, { type: "image" }> & { src: string })
  | (Omit<Extract<TemplateLayer, { type: "shape" }>, "fill"> & { fill: string })
  | (Omit<Extract<TemplateLayer, { type: "logo" }>, "src"> & { src: string })
  | (Omit<Extract<TemplateLayer, { type: "icon" }>, "fill"> & { fill: string })
  | { type: "group"; id: string; x: number; y: number; width: number; height: number; zIndex: number; editable: boolean; hidden?: boolean; opacity?: number; children: ResolvedLayer[] };

function resolveLayer(layer: TemplateLayer, ctx: ResolveContext): ResolvedLayer {
  switch (layer.type) {
    case "text": {
      const direction =
        layer.direction === "auto"
          ? ctx.language === "ar"
            ? "rtl"
            : "ltr"
          : layer.direction;
      const align =
        layer.align === "center"
          ? "center"
          : layer.align === "start"
            ? direction === "rtl"
              ? "right"
              : "left"
            : direction === "rtl"
              ? "left"
              : "right";
      return {
        ...layer,
        text: localized(layer.text, ctx),
        fill: substitute(layer.fill, ctx),
        direction,
        align,
      };
    }
    case "image":
      return { ...layer, src: substitute(layer.src, ctx) };
    case "shape":
      return { ...layer, fill: substitute(layer.fill, ctx) };
    case "logo":
      return { ...layer, src: substitute(layer.src, ctx) };
    case "icon":
      return { ...layer, fill: substitute(layer.fill, ctx) };
    case "group":
      return {
        ...layer,
        children: layer.children.map((child) => resolveLayer(child, ctx)),
      };
  }
}

export interface ResolvedTemplate {
  canvas: { width: number; height: number; backgroundColor: string };
  layers: ResolvedLayer[];
  language: RenderLanguage;
  fontFamily: string;
}

/** Applies brand + content + language to a validated template. */
export function resolveTemplate(
  template: TemplateJson,
  ctx: ResolveContext
): ResolvedTemplate {
  const layers = [...template.layers]
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((layer) => resolveLayer(layer, ctx));

  return {
    canvas: {
      width: template.canvas.width,
      height: template.canvas.height,
      backgroundColor: substitute(template.canvas.backgroundColor, ctx),
    },
    layers,
    language: ctx.language,
    fontFamily: variableValue("brandFont", ctx),
  };
}
