export const MFA_REQUIRED_ROLES = ['admin', 'ops'] as const

type MfaRole = string | null | undefined

type AssuranceAuthApi = {
  mfa: {
    getAuthenticatorAssuranceLevel(): Promise<{
      data: { currentLevel: string | null; nextLevel: string | null } | null
      error: { message: string } | null
    }>
  }
}

export function roleRequiresMfa(role: MfaRole): boolean {
  return role === 'admin' || role === 'ops'
}

/** Fail closed for privileged roles when AAL cannot be established. */
export async function hasRequiredMfaForRole(auth: AssuranceAuthApi, role: MfaRole): Promise<boolean> {
  if (!roleRequiresMfa(role)) return true

  try {
    const result = await auth.mfa.getAuthenticatorAssuranceLevel()
    return !result.error
      && result.data?.currentLevel === 'aal2'
      && result.data.nextLevel === 'aal2'
  } catch {
    return false
  }
}

export function getMfaChallengeHref(redirectTo = '/'): string {
  return `/login/mfa?redirectTo=${encodeURIComponent(redirectTo)}`
}
