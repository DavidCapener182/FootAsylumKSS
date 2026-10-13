'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ChangePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (password.length < 12) { setMessage('Use at least 12 characters.'); return }
    if (password !== confirmation) { setMessage('Passwords do not match.'); return }
    setBusy(true)
    const client = createClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) { setMessage('Sign in with your temporary password first, then return here.'); setBusy(false); return }
    const { error } = await client.auth.updateUser({ password })
    setMessage(error ? error.message : 'Your password has been changed.')
    setDone(!error)
    setPassword(''); setConfirmation(''); setBusy(false)
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4"><section className="w-full max-w-md rounded-xl border bg-white p-6">
    <h1 className="text-2xl font-bold">Change your password</h1>
    <p className="mt-2 text-sm text-slate-600">Sign in first, then choose your own password below.</p>
    {!done && <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block text-sm font-semibold">New password<input required minLength={12} autoComplete="new-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full rounded-lg border p-3" /></label>
      <label className="block text-sm font-semibold">Confirm new password<input required autoComplete="new-password" type="password" value={confirmation} onChange={e => setConfirmation(e.target.value)} className="mt-1 block w-full rounded-lg border p-3" /></label>
      <button disabled={busy} className="w-full rounded-lg bg-slate-900 p-3 font-semibold text-white">{busy ? 'Saving…' : 'Save password'}</button>
    </form>}
    <p role="status" className="mt-4 text-sm">{message}</p>
    <Link href={done ? '/' : '/login'} className="mt-4 inline-block text-sm font-semibold text-indigo-700">{done ? 'Return to your dashboard' : 'Sign in'}</Link>
  </section></main>
}
