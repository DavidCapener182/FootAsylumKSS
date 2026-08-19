'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, KeyRound, Loader2, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react'

import { AuthShell } from '@/components/auth/auth-shell'
import { MfaCodeForm } from '@/components/auth/mfa-code-form'
import { MfaRecoveryHelp } from '@/components/auth/mfa-recovery-help'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import {
  beginTotpEnrollment,
  discardTotpEnrollment,
  inspectMfaRequirement,
  verifyTotpCode,
  type MfaAuthApi,
  type TotpEnrollment,
  type VerifiedTotpFactor,
} from '@/lib/mfa/service'
import { getLoginHref, getSafeMfaRedirect } from '@/lib/mfa/redirect'

type ViewState =
  | { kind: 'checking' }
  | { kind: 'enrolling' }
  | { kind: 'enrollment'; enrollment: TotpEnrollment }
  | { kind: 'challenge'; factors: VerifiedTotpFactor[]; selectedFactorId: string }
  | { kind: 'error'; retry: 'inspection' | 'enrollment'; message: string }

type SupabaseBrowserClient = ReturnType<typeof createClient>

export function MfaFlow({ redirectTo }: { redirectTo: string }) {
  const router = useRouter()
  const destination = getSafeMfaRedirect(redirectTo)
  const clientRef = useRef<SupabaseBrowserClient | null>(null)
  const enrollmentStartedRef = useRef(false)
  const mountedRef = useRef(true)
  const [state, setState] = useState<ViewState>({ kind: 'checking' })
  const [showSecret, setShowSecret] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const getClient = useCallback(() => {
    if (!clientRef.current) {
      clientRef.current = createClient()
    }
    return clientRef.current
  }, [])

  const complete = useCallback(() => {
    if (!mountedRef.current) return
    setState({ kind: 'checking' })
    router.replace(destination)
    router.refresh()
  }, [destination, router])

  const startEnrollment = useCallback(async () => {
    if (enrollmentStartedRef.current) return
    enrollmentStartedRef.current = true
    setState({ kind: 'enrolling' })

    try {
      const enrollment = await beginTotpEnrollment(getClient().auth as unknown as MfaAuthApi)
      if (mountedRef.current) {
        setShowSecret(false)
        setState({ kind: 'enrollment', enrollment })
      }
    } catch {
      if (mountedRef.current) {
        setState({
          kind: 'error',
          retry: 'enrollment',
          message: 'Authenticator setup could not be started. No access has been granted.',
        })
      }
    }
  }, [getClient])

  const inspect = useCallback(async () => {
    setState({ kind: 'checking' })
    try {
      const requirement = await inspectMfaRequirement(getClient().auth as unknown as MfaAuthApi)
      if (!mountedRef.current) return

      if (requirement.kind === 'signed-out') {
        router.replace(getLoginHref(destination))
        router.refresh()
        return
      }
      if (requirement.kind === 'satisfied') {
        complete()
        return
      }
      if (requirement.kind === 'challenge') {
        setState({
          kind: 'challenge',
          factors: requirement.factors,
          selectedFactorId: requirement.factors[0].id,
        })
        return
      }

      await startEnrollment()
    } catch {
      if (mountedRef.current) {
        setState({
          kind: 'error',
          retry: 'inspection',
          message: 'Your sign-in security could not be verified. Protected access remains locked.',
        })
      }
    }
  }, [complete, destination, getClient, router, startEnrollment])

  useEffect(() => {
    mountedRef.current = true
    void inspect()
    return () => {
      mountedRef.current = false
    }
  }, [inspect])

  const verify = async (factorId: string, code: string): Promise<string | null> => {
    try {
      const verified = await verifyTotpCode(getClient().auth as unknown as MfaAuthApi, factorId, code)
      if (!verified) {
        return 'That code could not be verified. Wait for a new code and try again.'
      }
      complete()
      return null
    } catch {
      return 'Verification could not be completed. Protected access remains locked; please try again.'
    }
  }

  const restartEnrollment = async () => {
    if (state.kind !== 'enrollment') return
    setState({ kind: 'enrolling' })
    try {
      await discardTotpEnrollment(
        getClient().auth as unknown as MfaAuthApi,
        state.enrollment.factorId
      )
      enrollmentStartedRef.current = false
      await startEnrollment()
    } catch {
      setState({
        kind: 'error',
        retry: 'enrollment',
        message: 'Authenticator setup could not be restarted. Protected access remains locked.',
      })
    }
  }

  const signOut = async () => {
    setSigningOut(true)
    const result = await getClient().auth.signOut({ scope: 'local' })
    if (result.error) {
      setSigningOut(false)
      setState({
        kind: 'error',
        retry: 'inspection',
        message: 'You could not be signed out. Close this window and contact your system administrator.',
      })
      return
    }
    router.replace('/login')
    router.refresh()
  }

  const retry = () => {
    if (state.kind !== 'error') return
    if (state.retry === 'enrollment') {
      enrollmentStartedRef.current = false
      void startEnrollment()
      return
    }
    void inspect()
  }

  return (
    <AuthShell logoSize="compact">
      <main className="rounded-xl border border-white/20 bg-white p-6 shadow-2xl sm:p-8" aria-busy={state.kind === 'checking' || state.kind === 'enrolling'}>
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#0e1925] text-white">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Protected account</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">Authenticator verification</h1>
          </div>
        </div>

        {(state.kind === 'checking' || state.kind === 'enrolling') && (
          <div role="status" aria-live="polite" className="flex min-h-48 flex-col items-center justify-center gap-3 text-center text-slate-700">
            <Loader2 className="h-7 w-7 animate-spin text-[#0e1925]" aria-hidden="true" />
            <p className="font-medium">
              {state.kind === 'checking' ? 'Checking sign-in security…' : 'Preparing authenticator setup…'}
            </p>
            <p className="max-w-sm text-sm text-slate-500">Protected access stays locked until verification is complete.</p>
          </div>
        )}

        {state.kind === 'challenge' && (
          <div className="space-y-5">
            <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-950">
              <KeyRound className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p id="mfa-challenge-help" className="text-sm leading-6">
                Open your authenticator app and enter the current 6-digit code to finish signing in.
              </p>
            </div>

            {state.factors.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="mfa-factor">Authenticator</Label>
                <select
                  id="mfa-factor"
                  value={state.selectedFactorId}
                  onChange={(event) => setState({ ...state, selectedFactorId: event.target.value })}
                  className="min-h-[44px] w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                >
                  {state.factors.map((factor) => <option key={factor.id} value={factor.id}>{factor.label}</option>)}
                </select>
              </div>
            )}

            <MfaCodeForm
              descriptionId="mfa-challenge-help"
              submitLabel="Verify and continue"
              onVerify={(code) => verify(state.selectedFactorId, code)}
            />
            <MfaRecoveryHelp onSignOut={() => void signOut()} signingOut={signingOut} />
          </div>
        )}

        {state.kind === 'enrollment' && (
          <div className="space-y-5">
            <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
              <Smartphone className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p className="text-sm leading-6">
                Set up an authenticator before continuing. Scan this QR code in your authenticator app, then enter its 6-digit code.
              </p>
            </div>

            <div className="flex justify-center rounded-xl border border-slate-200 bg-white p-4">
              <Image
                src={state.enrollment.qrCodeDataUrl}
                alt="QR code for this account's authenticator setup"
                width={224}
                height={224}
                unoptimized
                className="h-56 w-56 max-w-full"
                priority
              />
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <button
                type="button"
                className="min-h-[44px] w-full text-left text-sm font-semibold text-slate-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                onClick={() => setShowSecret((visible) => !visible)}
                aria-expanded={showSecret}
                aria-controls="manual-mfa-secret"
              >
                {showSecret ? 'Hide manual setup key' : 'Cannot scan? Show manual setup key'}
              </button>
              {showSecret && (
                <div id="manual-mfa-secret" className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                  <p className="text-xs leading-5 text-slate-600">Enter this key only in your authenticator app. Do not share or store it in messages.</p>
                  <code className="block break-all rounded bg-slate-100 p-3 font-mono text-sm text-slate-950" aria-label="Manual authenticator setup key">
                    {state.enrollment.secret}
                  </code>
                </div>
              )}
            </div>

            <p id="mfa-enrollment-help" className="text-sm leading-6 text-slate-600">
              The code changes every 30 seconds. Verification completes setup for this sign-in.
            </p>
            <MfaCodeForm
              descriptionId="mfa-enrollment-help"
              submitLabel="Enable authenticator"
              onVerify={(code) => verify(state.enrollment.factorId, code)}
            />
            <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-between">
              <Button type="button" variant="ghost" onClick={() => void restartEnrollment()}>
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                Start setup again
              </Button>
              <Button type="button" variant="ghost" onClick={() => void signOut()} disabled={signingOut}>
                {signingOut ? 'Signing out…' : 'Sign out'}
              </Button>
            </div>
          </div>
        )}

        {state.kind === 'error' && (
          <div className="space-y-5">
            <div role="alert" className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">Verification unavailable</p>
                <p className="mt-1 text-sm leading-6">{state.message}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" onClick={retry} className="flex-1 bg-[#0e1925] text-white hover:bg-[#143457]">
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                Try again
              </Button>
              <Button type="button" variant="outline" onClick={() => void signOut()} disabled={signingOut} className="flex-1">
                {signingOut ? 'Signing out…' : 'Sign out'}
              </Button>
            </div>
          </div>
        )}

        <p className="mt-6 border-t border-slate-100 pt-5 text-center text-xs leading-5 text-slate-500">
          Never share a verification code with another person. KSS support will not ask for it.
        </p>
      </main>
    </AuthShell>
  )
}
