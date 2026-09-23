import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { AUTH_USER_HEADER } from '@/lib/auth/constants'

/** Paths reachable without a session. Everything else requires login. */
const PUBLIC_PATHS = new Set(['/login'])

/**
 * Proxy refreshes the Supabase session cookie, verifies the user once (network call),
 * forwards the verified id as a request header, and enforces the login boundary for GETs.
 * Profile status, must_change_password, and all role checks live in lib/auth (per page + per action).
 */
export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(AUTH_USER_HEADER, '')

  let response = NextResponse.next({ request: { headers: requestHeaders } })

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
          response = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  if (user) {
    // Rebuild the response so the header change is visible upstream; keep any refreshed cookies.
    requestHeaders.set(AUTH_USER_HEADER, user.id)
    const refreshed = response.cookies.getAll()
    response = NextResponse.next({ request: { headers: requestHeaders } })
    refreshed.forEach(c => response.cookies.set(c))
  }

  // Server Actions are POSTs to the current route — never redirect them, only refresh the session.
  if (request.method !== 'GET') return response

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
