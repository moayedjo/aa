import { describe, it, expect } from "vitest";

import { aiCopySchema } from "@/lib/ai/copy-schema";
import { buildImagePrompt, MAX_IMAGE_PROMPT_CHARS } from "@/lib/ai/image-prompt";

describe("aiCopySchema", () => {
  const good = {
    headlineOptions: ["A", "B", "C"],
    bodyText: "Some body copy.",
    caption: "A caption.",
    ctaOptions: ["Book", "Call", "Visit"],
    hashtags: ["#dental", "#smile"],
    imagePrompt: "A bright clinic",
    medicalDisclaimerNeeded: false,
  };

  it("accepts well-formed copy", () => {
    expect(aiCopySchema.safeParse(good).success).toBe(true);
  });

  it("rejects fewer than 2 headline options", () => {
    expect(
      aiCopySchema.safeParse({ ...good, headlineOptions: ["only one"] }).success
    ).toBe(false);
  });

  it("rejects a missing boolean disclaimer flag", () => {
    const { medicalDisclaimerNeeded: _omit, ...rest } = good;
    void _omit;
    expect(aiCopySchema.safeParse(rest).success).toBe(false);
  });
});

describe("buildImagePrompt", () => {
  it("always appends the no-text / no-logo composition rules", () => {
    const prompt = buildImagePrompt("A smiling patient");
    expect(prompt).toContain("A smiling patient");
    expect(prompt).toMatch(/NO text/i);
    expect(prompt).toMatch(/NO logos/i);
    expect(prompt).toMatch(/negative space/i);
  });

  it("clips an over-long user scene", () => {
    const long = "x".repeat(MAX_IMAGE_PROMPT_CHARS + 500);
    const prompt = buildImagePrompt(long);
    // The scene portion is capped; rules are appended after.
    expect(prompt.length).toBeLessThan(MAX_IMAGE_PROMPT_CHARS + 600);
  });
});
