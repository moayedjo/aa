import { createClient } from "@/lib/supabase/server";
import { aiCopySchema, type AiCopy } from "@/lib/ai/copy-schema";

export interface CopyGeneration {
  id: string;
  created_at: string;
  copy: AiCopy;
}

/**
 * Recent successful copy generations for a design — "keep previous
 * result" is backed by this history, not by client memory alone.
 */
export async function getRecentCopyGenerations(
  designId: string,
  limit = 5
): Promise<CopyGeneration[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_generations")
    .select("id, created_at, output")
    .eq("design_id", designId)
    .eq("kind", "copy")
    .eq("status", "completed")
    .not("output", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit * 2);
  if (error) throw new Error(`Failed to load generations: ${error.message}`);

  const result: CopyGeneration[] = [];
  for (const row of data ?? []) {
    // Field regenerations store partial outputs; only full packs are
    // offered as restorable previous results.
    const validated = aiCopySchema.safeParse(row.output);
    if (validated.success) {
      result.push({
        id: row.id,
        created_at: row.created_at,
        copy: validated.data,
      });
    }
    if (result.length >= limit) break;
  }
  return result;
}
