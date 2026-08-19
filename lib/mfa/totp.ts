const TOTP_CODE_LENGTH = 6
const MAX_QR_LENGTH = 200_000
const MAX_SECRET_LENGTH = 512

export function normalizeTotpCode(value: string): string {
  return value.replace(/[^0-9]/g, '').slice(0, TOTP_CODE_LENGTH)
}

export function isValidTotpCode(value: string): boolean {
  return /^[0-9]{6}$/.test(value)
}

export function assertSafeEnrollmentSecret(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('MFA enrollment secret is unavailable')
  }

  const secret = value.trim()
  if (!secret || secret.length > MAX_SECRET_LENGTH || /[\u0000-\u001F\u007F]/.test(secret)) {
    throw new Error('MFA enrollment secret is unavailable')
  }

  return secret
}

/** Converts only Supabase's SVG QR representation into an image-safe data URL. */
export function toTotpQrDataUrl(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('MFA enrollment QR code is unavailable')
  }

  const qrCode = value.trim()
  if (!qrCode || qrCode.length > MAX_QR_LENGTH) {
    throw new Error('MFA enrollment QR code is unavailable')
  }

  if (/^data:image\/svg\+xml(?:;charset=utf-8|;utf-8|;base64)?,/i.test(qrCode)) {
    return qrCode
  }

  if (/^(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(qrCode)) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrCode)}`
  }

  throw new Error('MFA enrollment QR code is unavailable')
}
