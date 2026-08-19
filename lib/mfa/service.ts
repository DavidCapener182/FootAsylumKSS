import { assertSafeEnrollmentSecret, isValidTotpCode, toTotpQrDataUrl } from '@/lib/mfa/totp'

type AuthFailure = { message: string } | null

type MfaFactor = {
  id: string
  factor_type: string
  status: string
  friendly_name?: string
  created_at?: string
}

export type VerifiedTotpFactor = {
  id: string
  label: string
}

export type MfaRequirement =
  | { kind: 'signed-out' }
  | { kind: 'satisfied' }
  | { kind: 'enroll' }
  | { kind: 'challenge'; factors: VerifiedTotpFactor[] }

export type TotpEnrollment = {
  factorId: string
  qrCodeDataUrl: string
  secret: string
}

export interface MfaAuthApi {
  getUser(): Promise<{
    data: { user: { id: string } | null }
    error: AuthFailure
  }>
  mfa: {
    listFactors(): Promise<{
      data: { all: MfaFactor[]; totp: MfaFactor[] } | null
      error: AuthFailure
    }>
    getAuthenticatorAssuranceLevel(): Promise<{
      data: { currentLevel: string | null; nextLevel: string | null } | null
      error: AuthFailure
    }>
    enroll(params: {
      factorType: 'totp'
      friendlyName: string
      issuer: string
    }): Promise<{
      data: {
        id: string
        type: string
        totp: { qr_code: string; secret: string }
      } | null
      error: AuthFailure
    }>
    unenroll(params: { factorId: string }): Promise<{
      data: { id: string } | null
      error: AuthFailure
    }>
    challengeAndVerify(params: { factorId: string; code: string }): Promise<{
      data: unknown
      error: AuthFailure
    }>
  }
}

export class MfaFlowError extends Error {
  readonly stage: 'inspection' | 'enrollment' | 'verification'

  constructor(stage: MfaFlowError['stage']) {
    super(`MFA ${stage} failed`)
    this.name = 'MfaFlowError'
    this.stage = stage
  }
}

function verifiedTotpFactors(factors: MfaFactor[]): VerifiedTotpFactor[] {
  return factors
    .filter((factor) => factor.factor_type === 'totp' && factor.status === 'verified' && factor.id)
    .map((factor, index) => ({
      id: factor.id,
      label: factor.friendly_name?.trim() || `Authenticator ${index + 1}`,
    }))
}

export async function inspectMfaRequirement(auth: MfaAuthApi): Promise<MfaRequirement> {
  const userResult = await auth.getUser()
  if (userResult.error || !userResult.data.user) {
    return { kind: 'signed-out' }
  }

  const [factorResult, assuranceResult] = await Promise.all([
    auth.mfa.listFactors(),
    auth.mfa.getAuthenticatorAssuranceLevel(),
  ])

  if (factorResult.error || !factorResult.data || assuranceResult.error || !assuranceResult.data) {
    throw new MfaFlowError('inspection')
  }

  const { currentLevel, nextLevel } = assuranceResult.data
  if (currentLevel === 'aal2' && nextLevel === 'aal2') {
    return { kind: 'satisfied' }
  }

  if (currentLevel !== 'aal1' && currentLevel !== 'aal2') {
    throw new MfaFlowError('inspection')
  }

  const factors = verifiedTotpFactors(factorResult.data.totp)
  if (factors.length > 0) {
    return { kind: 'challenge', factors }
  }

  return { kind: 'enroll' }
}

export async function beginTotpEnrollment(auth: MfaAuthApi): Promise<TotpEnrollment> {
  const factorsResult = await auth.mfa.listFactors()
  if (factorsResult.error || !factorsResult.data) {
    throw new MfaFlowError('enrollment')
  }

  // A previously abandoned setup cannot be resumed because its secret is not
  // returned again. Remove only unverified TOTP factors before starting fresh.
  const abandonedFactors = factorsResult.data.all.filter(
    (factor) => factor.factor_type === 'totp' && factor.status === 'unverified'
  )

  for (const factor of abandonedFactors) {
    const removal = await auth.mfa.unenroll({ factorId: factor.id })
    if (removal.error) {
      throw new MfaFlowError('enrollment')
    }
  }

  const enrollmentResult = await auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'KSS Footasylum authenticator',
    issuer: 'KSS Footasylum',
  })

  const enrollment = enrollmentResult.data
  if (
    enrollmentResult.error
    || !enrollment
    || enrollment.type !== 'totp'
    || !enrollment.id
    || !enrollment.totp
  ) {
    throw new MfaFlowError('enrollment')
  }

  try {
    return {
      factorId: enrollment.id,
      qrCodeDataUrl: toTotpQrDataUrl(enrollment.totp.qr_code),
      secret: assertSafeEnrollmentSecret(enrollment.totp.secret),
    }
  } catch {
    // Do not include the returned QR code or secret in the thrown error.
    throw new MfaFlowError('enrollment')
  }
}

export async function discardTotpEnrollment(auth: MfaAuthApi, factorId: string): Promise<void> {
  if (!factorId) {
    throw new MfaFlowError('enrollment')
  }

  const result = await auth.mfa.unenroll({ factorId })
  if (result.error) {
    throw new MfaFlowError('enrollment')
  }
}

export async function verifyTotpCode(
  auth: MfaAuthApi,
  factorId: string,
  code: string
): Promise<boolean> {
  if (!factorId || !isValidTotpCode(code)) {
    return false
  }

  const verification = await auth.mfa.challengeAndVerify({ factorId, code })
  if (verification.error || !verification.data) {
    return false
  }

  // challengeAndVerify refreshes the session. Verify the resulting assurance
  // level before allowing the caller to continue to the protected destination.
  const assurance = await auth.mfa.getAuthenticatorAssuranceLevel()
  if (
    assurance.error
    || !assurance.data
    || assurance.data.currentLevel !== 'aal2'
    || assurance.data.nextLevel !== 'aal2'
  ) {
    throw new MfaFlowError('verification')
  }

  return true
}
