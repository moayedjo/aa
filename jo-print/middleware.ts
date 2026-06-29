import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { isAllowedOnRoute } from '@/lib/rbac'

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)

  // Protect /admin routes: require authenticated user with an admin-family role
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {},
        },
      }
    )

    // Default DENY on query error
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      const loginUrl = new URL('/auth', request.url)
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Server-side role check — fetch from profiles (not JWT claims)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Default DENY on query error
    if (profileError || !profile) {
      const homeUrl = new URL('/', request.url)
      homeUrl.searchParams.set('error', 'access_denied')
      return NextResponse.redirect(homeUrl)
    }

    if (!isAllowedOnRoute(request.nextUrl.pathname, profile.role as string)) {
      // Authenticated but not allowed on this route — redirect to home with a hint.
      //
      // NOTE: Audit logging is intentionally NOT done here.
      // Middleware runs in Edge Runtime which cannot use Node.js crypto or
      // the service-role Supabase client (no Buffer, no Node fetch).
      // To audit access-denied events, consume the `?error=access_denied`
      // query param in the home page server component or a dedicated
      // /api/audit-event API route that runs in the Node.js runtime.
      const homeUrl = new URL('/', request.url)
      homeUrl.searchParams.set('error', 'access_denied')
      return NextResponse.redirect(homeUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
