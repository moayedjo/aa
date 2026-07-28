import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Auth callback: exchanges the code from confirmation / recovery emails
 * for a session, then forwards to `next` (restricted to relative paths).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//")
    ? rawNext
    : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=Could not verify the link. Please try again.`
  );
}
