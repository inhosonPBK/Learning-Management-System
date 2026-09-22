import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Paths reachable without a session. Everything else requires login. */
const PUBLIC_PATHS = new Set(['/login'])

/**
 * Proxy only refreshes the Supabase session cookie and enforces the login boundary.
 * Profile status, must_change_password, and all role checks live in lib/auth (per page + per action).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  if (!user) {
    if (PUBLIC_PATHS.has(pathname)) return response
    const login = new URL('/login', request.url)
    if (pathname !== '/') login.searchParams.set('next', pathname)
    return NextResponse.redirect(login)
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  // Skip static assets and public HTML docs (manuals) — they stay unauthenticated by design.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:html|png|jpg|jpeg|svg|ico|webp)$).*)'],
}
