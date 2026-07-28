import type { BrandKit, WorkspaceIndustrySettings } from "@/types/database";

export interface BrandCompletion {
  /** 0–100 */
  score: number;
  /** Human-readable labels of missing items, in fix-first order. */
  missing: string[];
}

interface ScoreItem {
  label: string;
  weight: number;
  done: boolean;
}

/**
 * Brand completion score. Weights sum to 100; "done" means the field is
 * usable by templates without falling back to defaults.
 */
export function computeBrandCompletion(
  brandKit: BrandKit | null,
  settings: WorkspaceIndustrySettings | null
): BrandCompletion {
  const colorsSet =
    !!brandKit?.primary_color &&
    !!brandKit?.secondary_color &&
    !!brandKit?.accent_color &&
    !!brandKit?.background_color &&
    !!brandKit?.text_color;

  const items: ScoreItem[] = [
    { label: "Business name", weight: 15, done: !!brandKit?.business_name },
    { label: "Logo", weight: 15, done: !!brandKit?.logo_path },
    { label: "Brand colors", weight: 20, done: colorsSet },
    {
      label: "Fonts",
      weight: 10,
      done: !!brandKit?.arabic_font && !!brandKit?.english_font,
    },
    { label: "Phone number", weight: 10, done: !!brandKit?.phone },
    { label: "Website", weight: 5, done: !!brandKit?.website },
    { label: "Default language", weight: 5, done: !!brandKit },
    { label: "Industry", weight: 5, done: !!settings?.industry_key },
    {
      label: "Services",
      weight: 15,
      done: (settings?.selected_services.length ?? 0) > 0,
    },
  ];

  const score = items.reduce((sum, i) => sum + (i.done ? i.weight : 0), 0);
  const missing = items.filter((i) => !i.done).map((i) => i.label);

  return { score, missing };
}
