/**
 * Phase 01 database row types. Mirrors supabase/migrations — keep in sync
 * when a migration changes these tables.
 */

export type PlatformRole = "platform_admin" | "user";

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
}

export interface UserRole {
  user_id: string;
  role: PlatformRole;
  created_at: string;
}

export interface WorkspaceMemberWithProfile extends WorkspaceMember {
  profiles: Pick<Profile, "email" | "full_name"> | null;
}
