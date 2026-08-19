'use client'

import React from 'react'
import { HelpCircle, LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'

type MfaRecoveryHelpProps = {
  onSignOut: () => void
  signingOut?: boolean
}

export function MfaRecoveryHelp({ onSignOut, signingOut = false }: MfaRecoveryHelpProps) {
  return (
    <details className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2">
        <HelpCircle className="h-4 w-4" aria-hidden="true" />
        Lost access to your authenticator?
      </summary>
      <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
        <p className="leading-6">
          Recovery codes are not available for this sign-in method. Sign out and contact your system administrator for a verified account recovery.
        </p>
        <p className="leading-6">
          An administrator should confirm your identity before resetting any authenticator factor.
        </p>
        <Button type="button" variant="outline" onClick={onSignOut} disabled={signingOut} className="w-full sm:w-auto">
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          {signingOut ? 'Signing out…' : 'Sign out safely'}
        </Button>
      </div>
    </details>
  )
}
