import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabasePublicConfig } from '@/lib/env'

function getSafeRedirectPath(pathname: string, search: string) {
  const path = `${pathname}${search}`
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/login')) {
    return '/'
  }
  return path
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const { url, anonKey } = getSupabasePublicConfig()

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Allow access to login and password reset routes
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')
  const isEventDayKioskRoute =
    request.nextUrl.pathname.startsWith('/event-day/')
    || request.nextUrl.pathname.startsWith('/api/event-day/')
  
  // Protect routes - redirect to login if not authenticated
  if (!user && !isAuthRoute && !isEventDayKioskRoute) {
    if (isApiRoute) {
      return NextResponse.json(
        { error: 'Authentication required. Refresh the page and sign in again.' },
        { status: 401 }
      )
    }

    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', getSafeRedirectPath(request.nextUrl.pathname, request.nextUrl.search))
    return NextResponse.redirect(loginUrl)
  }

  // Ensure profile exists for authenticated users
  if (user) {
    const { data: profile } = await supabase
      .from('fa_profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      // Profile will be created on first access via API route
      // For now, allow through - profile creation happens in layout
    }
  }

  // Redirect authenticated users away from login/signup (but allow reset-password page)
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/login/signup') && !request.nextUrl.pathname.startsWith('/login/reset-password')) {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/'
    return NextResponse.redirect(new URL(getSafeRedirectPath(redirectTo, ''), request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static assets in /public (images, css, manifests, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff|woff2|ttf|eot|webmanifest)$).*)',
  ],
}
