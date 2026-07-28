"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createWorkspaceSchema } from "@/lib/validation/workspace";

export interface WorkspaceActionResult {
  error?: string;
}

export async function createWorkspace(
  input: unknown
): Promise<WorkspaceActionResult> {
  const parsed = createWorkspaceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in to create a workspace" };
  }

  // The creator is added as owner by a database trigger, atomically with
  // the insert (see migration 0001).
  const { data, error } = await supabase
    .from("workspaces")
    .insert({ name: parsed.data.name, created_by: user.id })
    .select("id")
    .single();

  if (error) {
    return { error: `Could not create workspace: ${error.message}` };
  }

  revalidatePath("/dashboard");
  // New workspaces go straight into brand onboarding.
  redirect(`/onboarding/${data.id}`);
}
