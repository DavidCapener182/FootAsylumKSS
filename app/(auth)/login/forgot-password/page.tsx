'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
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
      <div className="min-h-screen bg-gradient-to-br from-[#0e1925] via-[#1a2f3f] to-[#0e1925] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0e1925]/90 via-[#1a2f3f]/80 to-[#0e1925]/90"></div>
        
        <div className="absolute top-6 left-6 z-10">
          <Image
            src="/fa-logo.png"
            alt="KSS x Footasylum Logo"
            width={120}
            height={60}
            className="object-contain"
            priority
          />
        </div>

        <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl border-0">
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 text-center">
              <CardTitle className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                Check your email
              </CardTitle>
              <CardDescription className="text-sm sm:text-base text-slate-600">
                We&apos;ve sent a password reset link to {email}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <p className="text-sm text-slate-600 mb-4">
                Click the link in the email to reset your password. The link will expire in 1 hour.
              </p>
              <Link href="/login">
                <Button className="w-full bg-[#0e1925] hover:bg-[#1a2f3f] text-white">
                  Back to login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0e1925] via-[#1a2f3f] to-[#0e1925] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0e1925]/90 via-[#1a2f3f]/80 to-[#0e1925]/90"></div>
      
      <div className="absolute top-6 left-6 z-10">
        <Image
          src="/fa-logo.png"
          alt="Footasylum KSS Logo"
          width={120}
          height={60}
          className="object-contain"
          priority
        />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl border-0">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 text-center">
            <CardTitle className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
              Reset your password
            </CardTitle>
            <CardDescription className="text-sm sm:text-base text-slate-600">
              Enter your email address and we&apos;ll send you a link to reset your password
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
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full bg-[#0e1925] hover:bg-[#1a2f3f] text-white" disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
              </Button>
              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-[#0e1925] hover:text-[#1a2f3f] hover:underline font-medium"
                >
                  Back to login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
