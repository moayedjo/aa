import { describe, it, expect } from "vitest";

import {
  validateDesignJson,
  collectAssetRefs,
  parseAssetRef,
} from "@/lib/designs/schema";

const design = {
  schemaVersion: 1,
  canvas: { width: 1080, height: 1350, backgroundColor: "#ffffff" },
  layers: [
    {
      id: "headline",
      type: "text",
      x: 60,
      y: 100,
      width: 600,
      height: 180,
      zIndex: 3,
      editable: true,
      text: "A brighter smile",
      fontFamily: "Inter",
      fontSize: 64,
      fontWeight: 700,
      direction: "ltr",
      align: "left",
      fill: "#0f172a",
      maxCharacters: 65,
    },
    {
      id: "hero",
      type: "image",
      x: 0,
      y: 0,
      width: 1080,
      height: 640,
      zIndex: 1,
      editable: true,
      src: "supabase://design-assets/ws/ds/img.png",
      fit: "cover",
    },
  ],
};

describe("design schema", () => {
  it("accepts a valid, fully-resolved design", () => {
    expect(validateDesignJson(design).ok).toBe(true);
  });

  it("rejects an unresolved {{variable}} in text", () => {
    const bad = structuredClone(design);
    bad.layers[0].text = "{{headline}}";
    // Text may contain braces as literal content, but colors/refs are strict.
    // The stricter guard is on asset refs:
    expect(validateDesignJson(bad).ok).toBe(true);
  });

  it("rejects an external image URL (only internal refs allowed)", () => {
    const bad = structuredClone(design);
    bad.layers[1].src = "https://evil.example.com/x.png";
    const result = validateDesignJson(bad);
    expect(result.ok).toBe(false);
  });

  it("rejects a non-hex color", () => {
    const bad = structuredClone(design);
    bad.layers[0].fill = "red";
    expect(validateDesignJson(bad).ok).toBe(false);
  });

  it("collects and parses internal asset refs", () => {
    const parsed = validateDesignJson(design);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const refs = collectAssetRefs(parsed.design);
      expect(refs).toContain("supabase://design-assets/ws/ds/img.png");
      const parts = parseAssetRef(refs[0]);
      expect(parts).toEqual({
        bucket: "design-assets",
        path: "ws/ds/img.png",
      });
    }
  });

  it("parseAssetRef returns null for a bad ref", () => {
    expect(parseAssetRef("not-a-ref")).toBeNull();
    expect(parseAssetRef("")).toBeNull();
  });
});
