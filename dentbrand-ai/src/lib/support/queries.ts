import { createClient } from "@/lib/supabase/server";

/** The current user's rating for a design, if any. */
export async function getMyDesignRating(
  designId: string
): Promise<number | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("design_ratings")
    .select("rating")
    .eq("design_id", designId)
    .eq("user_id", user.id)
    .maybeSingle();
  return data?.rating ?? null;
}

export interface FirstDesignChecklist {
  brandComplete: boolean;
  designCreated: boolean;
  designExported: boolean;
}

/** Drives the First Design Checklist / activation nudges on the workspace. */
export async function getFirstDesignChecklist(
  workspaceId: string,
  brandComplete: boolean,
  designCount: number
): Promise<FirstDesignChecklist> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("design_exports")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "completed");

  return {
    brandComplete,
    designCreated: designCount > 0,
    designExported: (count ?? 0) > 0,
  };
}
