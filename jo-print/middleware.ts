import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

const ADMIN_ROLES = new Set(['admin', 'order_manager', 'production', 'support'])

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

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const loginUrl = new URL('/auth', request.url)
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Server-side role check — fetch from profiles (not JWT claims)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !ADMIN_ROLES.has(profile.role as string)) {
      // Authenticated but not an admin — redirect to home with a hint
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
