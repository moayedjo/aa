import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { validateTemplateJson } from "@/lib/templates/schema";

/**
 * Guards that every template shipped in supabase/seed.sql validates against
 * the Zod schema — a corrupt seed template would break design creation and
 * export, so this must never regress.
 */
const seedPath = fileURLToPath(
  new URL("../../../supabase/seed.sql", import.meta.url)
);

function extractTemplateBlocks(sql: string): unknown[] {
  const blocks = [...sql.matchAll(/\$\$\s*\n([\s\S]*?)\$\$::jsonb/g)];
  return blocks.map((m) => JSON.parse(m[1]));
}

describe("seed templates", () => {
  const sql = readFileSync(seedPath, "utf8");
  const templates = extractTemplateBlocks(sql);

  it("ships at least 10 production templates", () => {
    expect(templates.length).toBeGreaterThanOrEqual(10);
  });

  it("every seed template is schema-valid", () => {
    for (const [i, t] of templates.entries()) {
      const result = validateTemplateJson(t);
      expect(result.ok, `template #${i + 1}: ${result.ok ? "" : result.error}`).toBe(
        true
      );
    }
  });

  it("every seed template supports Arabic and English", () => {
    for (const t of templates) {
      const result = validateTemplateJson(t);
      if (result.ok) {
        expect(result.template.supportedLanguages).toContain("ar");
        expect(result.template.supportedLanguages).toContain("en");
      }
    }
  });
});
