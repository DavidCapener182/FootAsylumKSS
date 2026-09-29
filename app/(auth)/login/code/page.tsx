'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { getSafeAuthRedirect } from '@/lib/auth-redirect'

function CodeContent() {
  const router = useRouter()
  const params = useSearchParams()
  const mode = params?.get('mode') === 'recovery' ? 'recovery' : 'invite'
  const [email, setEmail] = useState(params?.get('email') || '')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verified, setVerified] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (!/^\d{6,10}$/.test(code)) {
      setError('Enter the code from your email.')
      return
    }
    setBusy(true)
    try {
      const { error: verifyError } = await createClient().auth.verifyOtp({
        email: email.trim().toLowerCase(), token: code, type: mode,
      })
      if (verifyError) setError('The code could not be verified. Check it or request a new one.')
      else setVerified(true)
    } catch {
      setError('Could not verify the code. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const { error: updateError } = await createClient().auth.updateUser({ password })
      if (updateError) setError(updateError.message)
      else {
        router.replace(getSafeAuthRedirect(params?.get('redirectTo')))
        router.refresh()
      }
    } catch {
      setError('Could not save your password. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell logoSize="compact" desktopLogoPosition="corner">
      <main className="w-full rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">{verified ? 'Set your password' : mode === 'invite' ? 'Accept your invitation' : 'Reset your password'}</h1>
        <p className="mt-2 text-sm text-slate-600">{verified ? 'Choose a password for your Footasylum account.' : 'Enter the code provided by your KSS administrator.'}</p>
        {!verified ? (
          <form onSubmit={verifyCode} className="mt-6 space-y-4">
            <div className="space-y-2"><Label htmlFor="code-email">Work email</Label><Input id="code-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="login-code">Login code</Label><Input id="login-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" maxLength={10} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))} /></div>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full bg-[#0e1925] text-white">{busy ? 'Checking…' : 'Continue'}</Button>
          </form>
        ) : (
          <form onSubmit={savePassword} className="mt-6 space-y-4">
            <div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></div>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full bg-[#0e1925] text-white">{busy ? 'Saving…' : 'Set password and sign in'}</Button>
          </form>
        )}
        <Link href="/login" className="mt-5 block text-center text-sm font-medium text-[#0e1925] underline">Back to sign in</Link>
      </main>
    </AuthShell>
  )
}

export default function CodePage() {
  return <Suspense fallback={null}><CodeContent /></Suspense>
}
