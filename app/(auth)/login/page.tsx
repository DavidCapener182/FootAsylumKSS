'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const passwordReset = searchParams?.get('password_reset')
    if (passwordReset === 'success') {
      setSuccess('Your password has been reset successfully. Please sign in with your new password.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      if (data?.user) {
        // Successfully authenticated, redirect to home
        router.push('/')
        router.refresh()
      } else {
        setError('Login failed. Please try again.')
        setLoading(false)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#071321]">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.04fr)_minmax(460px,0.96fr)]">
        <section className="relative flex min-h-[42vh] overflow-hidden bg-[#071321] px-6 py-8 text-white sm:px-10 lg:min-h-screen lg:px-14 lg:py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(120,255,160,0.14),transparent_28%),linear-gradient(145deg,#071321_0%,#0e1925_48%,#102640_100%)]" />
          <div className="relative z-10 flex w-full max-w-2xl flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-16 w-32 sm:h-20 sm:w-40">
                <Image
                  src="/fa-logo.png"
                  alt="KSS x Footasylum"
                  fill
                  sizes="160px"
                  className="object-contain"
                  priority
                />
              </div>
              <div className="hidden h-10 w-px bg-white/20 sm:block" />
              <p className="hidden max-w-40 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 sm:block">
                Authorised access
              </p>
            </div>

            <div className="py-10 lg:py-16">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-semibold text-lime-200">
                <ShieldCheck className="h-4 w-4" />
                Secure compliance operations
              </div>
              <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
                KSS x Footasylum Audit & Fire Safety Platform
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                A secure operational system for tracking store audits, fire risk assessments, compliance actions, visit planning and reporting.
              </p>

              <div className="mt-8 hidden gap-3 text-sm text-slate-200 sm:grid sm:grid-cols-2">
                {[
                  'Track audit progress across the estate',
                  'Monitor fire risk assessment status',
                  'Manage audit and FRA actions',
                  'Plan visits and regional routes',
                  'Produce clear compliance reports',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-lime-300" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="hidden max-w-xl text-xs leading-5 text-slate-400 sm:block">
              Access is restricted to authorised KSS and Footasylum users. Activity may be monitored for compliance and system security.
            </p>
          </div>
        </section>

        <main className="flex min-h-[58vh] items-center justify-center bg-slate-50 px-4 py-8 sm:px-6 lg:min-h-screen lg:px-10">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.14)] sm:p-8">
            <div className="mb-7">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-[#0e1925] text-white">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-950">Sign in to your account</h2>
              <p className="mt-2 text-sm leading-5 text-slate-600">
                Access is restricted to authorised KSS and Footasylum users.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="bg-white h-10 min-h-[44px] rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="h-10 min-h-[44px] rounded-md bg-white px-3 py-2 pr-12 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 flex min-h-[44px] w-11 items-center justify-center rounded-r-md text-slate-500 transition-colors hover:text-slate-900"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-sm text-green-700 bg-green-50 p-3 rounded-md border border-green-200">
                  {success}
                </div>
              )}
              <Button type="submit" className="min-h-[44px] w-full bg-[#0e1925] text-white hover:bg-[#143457]" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
              <div className="space-y-2 text-center">
                <Link
                  href="/login/forgot-password"
                  className="text-sm text-[#0e1925] hover:text-[#1a2f3f] hover:underline block font-medium"
                >
                  Forgot your password?
                </Link>
                <div className="text-sm text-slate-600">
                  Don&apos;t have an account?{' '}
                  <Link
                    href="/login/signup"
                    className="text-[#0e1925] hover:text-[#1a2f3f] hover:underline font-medium"
                  >
                    Sign up
                  </Link>
                </div>
              </div>
            </form>
            <p className="mt-7 border-t border-slate-100 pt-5 text-center text-xs text-slate-500">
              Having access issues? Contact your system administrator.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#071321] p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-2xl">
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
