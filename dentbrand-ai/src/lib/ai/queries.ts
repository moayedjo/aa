import { createClient } from "@/lib/supabase/server";
import { aiCopySchema, type AiCopy } from "@/lib/ai/copy-schema";

export interface ImageGeneration {
  id: string;
  created_at: string;
  prompt: string;
  ref: string;
  signedUrl: string;
}

/**
 * Recent successful image generations for a design — the "keep previous
 * image" history. Every entry stays applicable.
 */
export async function getRecentImageGenerations(
  designId: string,
  limit = 8
): Promise<ImageGeneration[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_generations")
    .select("id, created_at, input, asset_path")
    .eq("design_id", designId)
    .eq("kind", "image")
    .eq("status", "completed")
    .not("asset_path", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load image history: ${error.message}`);

  const result: ImageGeneration[] = [];
  for (const row of data ?? []) {
    const assetPath = row.asset_path as string;
    const { data: signed } = await supabase.storage
      .from("design-assets")
      .createSignedUrl(assetPath, 60 * 60);
    if (!signed?.signedUrl) continue;
    const input = row.input as { prompt?: string } | null;
    result.push({
      id: row.id,
      created_at: row.created_at,
      prompt: input?.prompt ?? "",
      ref: `supabase://design-assets/${assetPath}`,
      signedUrl: signed.signedUrl,
    });
  }
  return result;
}

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
