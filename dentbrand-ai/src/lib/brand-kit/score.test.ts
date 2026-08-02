import { describe, it, expect } from "vitest";

import { computeBrandCompletion } from "@/lib/brand-kit/score";
import type { BrandKit, WorkspaceIndustrySettings } from "@/types/database";

const emptyKit: BrandKit = {
  id: "b",
  workspace_id: "w",
  business_name: null,
  logo_path: null,
  primary_color: null,
  secondary_color: null,
  accent_color: null,
  background_color: null,
  text_color: null,
  arabic_font: null,
  english_font: null,
  phone: null,
  website: null,
  address: null,
  default_language: "en",
  onboarding_step: 0,
  onboarding_completed_at: null,
  created_at: "",
  updated_at: "",
};

const fullKit: BrandKit = {
  ...emptyKit,
  business_name: "Clinic",
  logo_path: "w/logo.png",
  primary_color: "#111111",
  secondary_color: "#222222",
  accent_color: "#333333",
  background_color: "#f8fafc",
  text_color: "#0f172a",
  arabic_font: "Cairo",
  english_font: "Inter",
  phone: "+962",
  website: "https://x.com",
};

const settings: WorkspaceIndustrySettings = {
  id: "s",
  workspace_id: "w",
  industry_key: "dental",
  selected_services: ["teeth-whitening"],
  created_at: "",
  updated_at: "",
};

describe("computeBrandCompletion", () => {
  it("is 0 for a null kit", () => {
    expect(computeBrandCompletion(null, null).score).toBe(0);
  });

  it("reports missing items for an empty kit", () => {
    const r = computeBrandCompletion(emptyKit, null);
    expect(r.score).toBeLessThan(100);
    expect(r.missing).toContain("Business name");
    expect(r.missing).toContain("Brand colors");
  });

  it("is 100 for a fully populated kit + services", () => {
    const r = computeBrandCompletion(fullKit, settings);
    expect(r.score).toBe(100);
    expect(r.missing).toHaveLength(0);
  });

  it("weights partial completion between 0 and 100", () => {
    const r = computeBrandCompletion(fullKit, null);
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThan(100);
    expect(r.missing).toContain("Services");
  });
});
