import { describe, expect, it } from 'vitest'

import {
  assertSafeEnrollmentSecret,
  isValidTotpCode,
  normalizeTotpCode,
  toTotpQrDataUrl,
} from '@/lib/mfa/totp'

describe('TOTP input and enrollment data', () => {
  it('normalizes pasted verification codes without retaining extra content', () => {
    expect(normalizeTotpCode(' 12-34 56 78 ')).toBe('123456')
    expect(isValidTotpCode('123456')).toBe(true)
    expect(isValidTotpCode('12345')).toBe(false)
  })

  it('encodes a raw Supabase SVG as an image data URL', () => {
    const result = toTotpQrDataUrl('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
    expect(result).toMatch(/^data:image\/svg\+xml;charset=utf-8,/)
    expect(result).toContain('%3Csvg')
  })

  it('accepts an existing SVG data URL and rejects other schemes', () => {
    const qr = 'data:image/svg+xml;utf-8,%3Csvg%3E%3C%2Fsvg%3E'
    expect(toTotpQrDataUrl(qr)).toBe(qr)
    expect(() => toTotpQrDataUrl('javascript:alert(1)')).toThrow('QR code is unavailable')
    expect(() => toTotpQrDataUrl('data:text/html,<script>alert(1)</script>')).toThrow('QR code is unavailable')
  })

  it('rejects an empty or control-character enrollment secret', () => {
    expect(assertSafeEnrollmentSecret(' ABC234 ')).toBe('ABC234')
    expect(() => assertSafeEnrollmentSecret('')).toThrow('secret is unavailable')
    expect(() => assertSafeEnrollmentSecret('ABC\n234')).toThrow('secret is unavailable')
  })
})
