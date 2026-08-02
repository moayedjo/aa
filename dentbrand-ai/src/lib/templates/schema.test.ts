import { describe, it, expect } from "vitest";

import { validateTemplateJson } from "@/lib/templates/schema";

const valid = {
  schemaVersion: 1,
  canvas: { width: 1080, height: 1350, backgroundColor: "{{backgroundColor}}" },
  supportedLanguages: ["ar", "en"],
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
      text: "{{headline}}",
      fontFamily: "{{brandFont}}",
      fontSize: 64,
      fontWeight: 700,
      direction: "auto",
      align: "start",
      fill: "{{textColor}}",
      maxCharacters: 65,
    },
  ],
};

describe("template schema", () => {
  it("accepts a valid template", () => {
    const result = validateTemplateJson(valid);
    expect(result.ok).toBe(true);
  });

  it("rejects an unknown template variable", () => {
    const bad = structuredClone(valid);
    bad.layers[0].text = "{{unknownVar}}";
    const result = validateTemplateJson(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("unknownVar");
  });

  it("rejects duplicate layer ids", () => {
    const bad = structuredClone(valid);
    bad.layers.push(structuredClone(valid.layers[0]));
    const result = validateTemplateJson(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("unique");
  });

  it("rejects a wrong schemaVersion", () => {
    const bad = { ...structuredClone(valid), schemaVersion: 2 };
    expect(validateTemplateJson(bad).ok).toBe(false);
  });

  it("rejects a canvas that is too large", () => {
    const bad = structuredClone(valid);
    bad.canvas.width = 99999;
    expect(validateTemplateJson(bad).ok).toBe(false);
  });
});
