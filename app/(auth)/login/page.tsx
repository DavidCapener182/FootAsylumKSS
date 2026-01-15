'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const passwordReset = searchParams.get('password_reset')
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
    <div className="min-h-screen bg-gradient-to-br from-[#0e1925] via-[#1a2f3f] to-[#0e1925] relative overflow-hidden">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0e1925]/90 via-[#1a2f3f]/80 to-[#0e1925]/90"></div>

      {/* Main content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4">
        {/* Logo above the card */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/fa-logo.png"
            alt="KSS x Footasylum Logo"
            width={200}
            height={100}
            className="object-contain"
            priority
          />
        </div>

        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl border-0">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 text-center">
            <CardTitle className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
              KSS x Footasylum Audit Platform
            </CardTitle>
            <CardDescription className="text-sm sm:text-base text-slate-600">
              KSS Internal - Sign in to your account
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white"
                />
              </div>
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-sm text-green-700 bg-green-50 p-3 rounded-md border border-green-200">
                  {success}
                </div>
              )}
              <Button type="submit" className="w-full bg-[#0e1925] hover:bg-[#1a2f3f] text-white" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
              <div className="space-y-2 text-center">
                <a
                  href="/login/forgot-password"
                  className="text-sm text-[#0e1925] hover:text-[#1a2f3f] hover:underline block font-medium"
                >
                  Forgot your password?
                </a>
                <div className="text-sm text-slate-600">
                  Don&apos;t have an account?{' '}
                  <a
                    href="/login/signup"
                    className="text-[#0e1925] hover:text-[#1a2f3f] hover:underline font-medium"
                  >
                    Sign up
                  </a>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#0e1925] via-[#1a2f3f] to-[#0e1925] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-slate-600">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}


