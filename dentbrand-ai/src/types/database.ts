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

export type BrandLanguage = "ar" | "en";

export interface BrandKit {
  id: string;
  workspace_id: string;
  business_name: string | null;
  logo_path: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  background_color: string | null;
  text_color: string | null;
  arabic_font: string | null;
  english_font: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  default_language: BrandLanguage;
  onboarding_step: number;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceIndustrySettings {
  id: string;
  workspace_id: string;
  industry_key: string;
  selected_services: string[];
  created_at: string;
  updated_at: string;
}

export type TemplateStatus =
  | "draft"
  | "testing"
  | "approved"
  | "published"
  | "archived";

export interface IndustryVertical {
  id: string;
  key: string;
  label_en: string;
  label_ar: string;
  is_available: boolean;
  sort_order: number;
  created_at: string;
}

export interface Service {
  id: string;
  vertical_id: string;
  key: string;
  label_en: string;
  label_ar: string;
  sort_order: number;
  created_at: string;
}

export interface ContentGoal {
  id: string;
  vertical_id: string;
  key: string;
  label_en: string;
  label_ar: string;
  sort_order: number;
  created_at: string;
}

export interface TemplateCategory {
  id: string;
  vertical_id: string;
  key: string;
  label_en: string;
  label_ar: string;
  sort_order: number;
  created_at: string;
}

export interface Template {
  id: string;
  vertical_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  status: TemplateStatus;
  current_version: number;
  supported_languages: string[];
  canvas_width: number;
  canvas_height: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateVersion {
  id: string;
  template_id: string;
  version: number;
  template_json: unknown;
  created_by: string | null;
  created_at: string;
}
