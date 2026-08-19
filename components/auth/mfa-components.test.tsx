import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { MfaCodeForm } from '@/components/auth/mfa-code-form'
import { MfaRecoveryHelp } from '@/components/auth/mfa-recovery-help'

describe('MFA UI accessibility', () => {
  it('renders a labelled one-time-code field with numeric constraints', () => {
    const html = renderToStaticMarkup(
      <MfaCodeForm descriptionId="mfa-help" submitLabel="Verify" onVerify={async () => null} />
    )

    expect(html).toContain('autoComplete="one-time-code"')
    expect(html).toContain('inputMode="numeric"')
    expect(html).toContain('pattern="[0-9]{6}"')
    expect(html).toContain('aria-describedby="mfa-help"')
    expect(html).toContain('Verification code')
  })

  it('states the recovery limitation and provides sign out', () => {
    const html = renderToStaticMarkup(<MfaRecoveryHelp onSignOut={() => undefined} />)
    expect(html).toContain('Recovery codes are not available')
    expect(html).toContain('verified account recovery')
    expect(html).toContain('Sign out safely')
  })
})
