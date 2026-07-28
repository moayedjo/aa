import { createClient } from "@/lib/supabase/server";
import type {
  Workspace,
  WorkspaceMemberWithProfile,
  WorkspaceRole,
} from "@/types/database";

/**
 * Workspaces the current user belongs to. RLS restricts rows to
 * memberships of auth.uid(), so no explicit user filter is needed.
 */
export async function getUserWorkspaces(): Promise<Workspace[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load workspaces: ${error.message}`);
  }
  return data ?? [];
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load workspace: ${error.message}`);
  }
  return data;
}

export async function getWorkspaceMembers(
  workspaceId: string
): Promise<WorkspaceMemberWithProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("*, profiles(email, full_name)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load members: ${error.message}`);
  }
  return (data ?? []) as WorkspaceMemberWithProfile[];
}

export async function getMyWorkspaceRole(
  workspaceId: string
): Promise<WorkspaceRole | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load role: ${error.message}`);
  }
  return data?.role ?? null;
}
