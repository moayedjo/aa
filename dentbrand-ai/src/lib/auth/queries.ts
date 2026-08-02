import { createClient } from "@/lib/supabase/server";

/**
 * True when the current user has the platform_admin role. Reads the
 * server-managed user_roles table — never profile fields or metadata.
 */
export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  return data?.role === "platform_admin";
}
