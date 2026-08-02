import { describe, it, expect } from "vitest";

import { parseTemplateJson } from "@/lib/templates/schema";
import { buildResolveContext, resolveTemplate } from "@/lib/templates/resolve";
import type { BrandKit } from "@/types/database";

const template = parseTemplateJson({
  schemaVersion: 1,
  canvas: { width: 1080, height: 1350, backgroundColor: "{{backgroundColor}}" },
  supportedLanguages: ["ar", "en"],
  layers: [
    {
      id: "headline",
      type: "text",
      x: 60,
      y: 100,
      width: 900,
      height: 180,
      zIndex: 2,
      editable: true,
      text: { en: "Book now", ar: "احجز الآن" },
      fontFamily: "{{brandFont}}",
      fontSize: 64,
      fontWeight: 800,
      direction: "auto",
      align: "start",
      fill: "{{primaryColor}}",
    },
    {
      id: "bg",
      type: "shape",
      x: 0,
      y: 0,
      width: 1080,
      height: 200,
      zIndex: 1,
      editable: false,
      shape: "rect",
      fill: "{{accentColor}}",
    },
  ],
});

const brand: BrandKit = {
  id: "b",
  workspace_id: "w",
  business_name: "Bright Smile",
  logo_path: null,
  primary_color: "#0e7490",
  secondary_color: "#155e75",
  accent_color: "#f59e0b",
  background_color: "#f8fafc",
  text_color: "#0f172a",
  arabic_font: "Cairo",
  english_font: "Poppins",
  phone: "+962 7",
  website: "https://clinic.com",
  address: null,
  default_language: "en",
  onboarding_step: 6,
  onboarding_completed_at: null,
  created_at: "",
  updated_at: "",
};

describe("resolveTemplate", () => {
  it("substitutes brand variables and picks the English string", () => {
    const ctx = buildResolveContext(brand, null, "en");
    const r = resolveTemplate(template, ctx);
    expect(r.canvas.backgroundColor).toBe("#f8fafc");
    const headline = r.layers.find((l) => l.id === "headline");
    expect(headline?.type).toBe("text");
    if (headline?.type === "text") {
      expect(headline.text).toBe("Book now");
      expect(headline.fill).toBe("#0e7490");
      expect(headline.direction).toBe("ltr");
      expect(headline.align).toBe("left");
    }
  });

  it("resolves Arabic to RTL with right alignment and the Arabic font", () => {
    const ctx = buildResolveContext(brand, null, "ar");
    const r = resolveTemplate(template, ctx);
    expect(r.fontFamily).toBe("Cairo");
    const headline = r.layers.find((l) => l.id === "headline");
    if (headline?.type === "text") {
      expect(headline.text).toBe("احجز الآن");
      expect(headline.direction).toBe("rtl");
      expect(headline.align).toBe("right");
    }
  });

  it("orders layers by zIndex", () => {
    const ctx = buildResolveContext(brand, null, "en");
    const r = resolveTemplate(template, ctx);
    expect(r.layers[0].id).toBe("bg");
    expect(r.layers[1].id).toBe("headline");
  });

  it("falls back to defaults when the brand kit is null", () => {
    const ctx = buildResolveContext(null, null, "en");
    const r = resolveTemplate(template, ctx);
    expect(r.canvas.backgroundColor).toMatch(/^#/);
  });
});
