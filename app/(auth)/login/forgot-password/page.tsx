'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthShell logoSize="compact" desktopLogoPosition="corner">
          <Card className="w-full rounded-[28px] border border-white/65 bg-white/94 shadow-[0_20px_60px_rgba(2,12,27,0.28)] backdrop-blur-xl sm:rounded-lg sm:border-0 sm:bg-white/95 sm:shadow-2xl sm:backdrop-blur-sm">
            <CardHeader className="px-5 pt-5 text-center sm:px-6 sm:pt-6">
              <CardTitle className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                Check your email
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 sm:text-base">
                If this account exists, password reset instructions were sent to {email}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
              <p className="text-sm text-slate-600 mb-4">
                Follow the email instructions to reset your password. If it contains a six-digit code, enter it below.
              </p>
              <Button asChild className="mb-3 w-full bg-[#0e1925] text-white hover:bg-[#1a2f3f]">
                <Link href={`/login/code?mode=recovery&email=${encodeURIComponent(email)}`}>Enter reset code</Link>
              </Button>
              <Button asChild className="w-full bg-[#0e1925] text-white hover:bg-[#1a2f3f]">
                <Link href="/login">
                  Back to login
                </Link>
              </Button>
            </CardContent>
          </Card>
      </AuthShell>
    )
  }

  return (
    <AuthShell logoSize="compact" desktopLogoPosition="corner">
        <Card className="w-full rounded-[28px] border border-white/65 bg-white/94 shadow-[0_20px_60px_rgba(2,12,27,0.28)] backdrop-blur-xl sm:rounded-lg sm:border-0 sm:bg-white/95 sm:shadow-2xl sm:backdrop-blur-sm">
          <CardHeader className="px-5 pt-5 text-center sm:px-6 sm:pt-6">
            <CardTitle className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Reset your password
            </CardTitle>
            <CardDescription className="mx-auto max-w-sm text-sm text-slate-600 sm:text-base">
              Enter your email address to receive password reset instructions
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
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
                  className="bg-white"
                />
              </div>
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full bg-[#0e1925] hover:bg-[#1a2f3f] text-white" disabled={loading}>
                {loading ? 'Sending...' : 'Send reset instructions'}
              </Button>
              <Link
                href="/login"
                className="flex min-h-[48px] items-center justify-center rounded-2xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 sm:hidden"
              >
                Back to login
              </Link>
              <div className="hidden text-center sm:block">
                <Link
                  href="/login"
                  className="text-sm font-medium text-[#0e1925] hover:text-[#1a2f3f] hover:underline"
                >
                  Back to login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
    </AuthShell>
  )
}
