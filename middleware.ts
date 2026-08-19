import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabasePublicConfig } from '@/lib/env'
import { accountHasApplicationAccess, type AccountStatus } from '@/lib/account-lifecycle'
import { getMfaChallengeHref, hasRequiredMfaForRole, roleRequiresMfa } from '@/lib/mfa/policy'
import { getSafeMfaRedirect } from '@/lib/mfa/redirect'

function getSafeRedirectPath(pathname: string, search: string) {
  return getSafeMfaRedirect(`${pathname}${search}`)
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
  const isAccountSetupRoute = request.nextUrl.pathname === '/login/account-setup'
  const isMfaRoute = request.nextUrl.pathname === '/login/mfa'
  const isPasswordRecoveryRoute =
    request.nextUrl.pathname.startsWith('/login/forgot-password')
    || request.nextUrl.pathname.startsWith('/login/reset-password')
  const isEventDayKioskRoute =
    request.nextUrl.pathname.startsWith('/event-day/')
    || request.nextUrl.pathname.startsWith('/api/event-day/')

  if (!user && isAccountSetupRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (!user && isMfaRoute) {
    const destination = getSafeRedirectPath(
      request.nextUrl.searchParams.get('redirectTo') || '/',
      ''
    )
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', destination)
    return NextResponse.redirect(loginUrl)
  }
  
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

  // Authentication alone does not authorize platform access. Authenticated
  // users must have a trusted administrator-provisioned profile before any
  // protected page or API request can proceed.
  if (user && !isEventDayKioskRoute && !isPasswordRecoveryRoute) {
    const { data: profile, error: profileError } = await supabase
      .from('fa_profiles')
      .select('id, role, account_status')
      .eq('id', user.id)
      .maybeSingle()

    if (
      profileError
      || !profile
      || !accountHasApplicationAccess(profile.account_status as AccountStatus)
    ) {
      if (isAccountSetupRoute) {
        return response
      }

      if (isApiRoute) {
        return NextResponse.json(
          { error: 'Account profile is not authorized' },
          { status: 403 }
        )
      }

      return NextResponse.redirect(new URL('/login/account-setup', request.url))
    }

    if (roleRequiresMfa(profile.role)) {
      const mfaSatisfied = await hasRequiredMfaForRole(supabase.auth, profile.role)

      if (!mfaSatisfied) {
        // The MFA route must remain reachable so it can enroll/challenge or
        // show a fail-closed recovery state when assurance is unavailable.
        if (isMfaRoute) {
          return response
        }

        if (isApiRoute) {
          return NextResponse.json(
            { error: 'Multi-factor authentication is required for this account' },
            { status: 403 }
          )
        }

        const destination = request.nextUrl.pathname === '/login'
          ? getSafeRedirectPath(request.nextUrl.searchParams.get('redirectTo') || '/', '')
          : getSafeRedirectPath(request.nextUrl.pathname, request.nextUrl.search)
        return NextResponse.redirect(new URL(getMfaChallengeHref(destination), request.url))
      }

      if (isMfaRoute) {
        const destination = getSafeRedirectPath(
          request.nextUrl.searchParams.get('redirectTo') || '/',
          ''
        )
        return NextResponse.redirect(new URL(destination, request.url))
      }
    }

    if (isMfaRoute) {
      const destination = getSafeRedirectPath(
        request.nextUrl.searchParams.get('redirectTo') || '/',
        ''
      )
      return NextResponse.redirect(new URL(destination, request.url))
    }

    if (isAccountSetupRoute) {
      return NextResponse.redirect(new URL('/', request.url))
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
