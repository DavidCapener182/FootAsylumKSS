const DEFAULT_REDIRECT = '/'
const MAX_REDIRECT_LENGTH = 2048

/**
 * Accepts only an application-local path. Auth routes are excluded so a
 * completed MFA flow cannot redirect back into an authentication loop.
 */
export function getSafeMfaRedirect(value: string | string[] | null | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value

  if (
    !candidate
    || candidate.length > MAX_REDIRECT_LENGTH
    || !candidate.startsWith('/')
    || candidate.startsWith('//')
    || candidate.includes('\\')
    || /[\u0000-\u001F\u007F]/.test(candidate)
  ) {
    return DEFAULT_REDIRECT
  }

  try {
    const parsed = new URL(candidate, 'https://mfa.local')
    if (parsed.origin !== 'https://mfa.local' || parsed.pathname.startsWith('/login')) {
      return DEFAULT_REDIRECT
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return DEFAULT_REDIRECT
  }
}

export function getLoginHref(redirectTo: string): string {
  const safeRedirect = getSafeMfaRedirect(redirectTo)
  return `/login?redirectTo=${encodeURIComponent(safeRedirect)}`
}
