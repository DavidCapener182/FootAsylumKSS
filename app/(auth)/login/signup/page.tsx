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

export default function SignUpPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isFootAsylumClient, setIsFootAsylumClient] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (!fullName.trim()) {
      setError('Full name is required')
      return
    }

    setLoading(true)

    const supabase = createClient()
    
    // Determine role
    const role = isFootAsylumClient ? 'client' : 'readonly'
    
    // Sign up the user with role in metadata
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          intended_role: role, // Store intended role for profile creation
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    })

    if (signUpError) {
      // Handle specific error cases
      if (signUpError.message.includes('already registered') || signUpError.message.includes('already exists')) {
        setError('An account with this email already exists. Please sign in instead or use a different email.')
      } else {
        setError(signUpError.message)
      }
      setLoading(false)
      return
    }

    // Check if user was actually created (handles case where email already exists)
    if (!data.user) {
      setError('Unable to create account. This email may already be registered. Please try signing in instead.')
      setLoading(false)
      return
    }

    if (data.user) {
      // Check if email confirmation is required
      if (data.session) {
        // User is immediately signed in (email confirmation disabled)
        // Create profile now with intended role
        // KSS x Footasylum clients get 'client' role, others need admin approval ('pending')
        const finalRole = isFootAsylumClient ? 'client' : 'pending'
        
        const { error: profileError } = await supabase
          .from('fa_profiles')
          .insert({
            id: data.user.id,
            full_name: fullName,
            role: finalRole,
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
          // If profile already exists, try to update it
          if (profileError.code === '23505') { // Unique violation
            const { error: updateError } = await supabase
              .from('fa_profiles')
              .update({ role: finalRole, full_name: fullName })
              .eq('id', data.user.id)
            
            if (updateError) {
              console.error('Profile update error:', updateError)
            }
          }
        }

        setSuccess('Account created successfully! Redirecting...')
        setTimeout(() => {
          router.push('/')
          router.refresh()
        }, 1500)
      } else {
        // Email confirmation required
        // Role is stored in user metadata and will be used when profile is created on first login
        setSuccess('Account created! Please check your email to confirm your account before signing in.')
      }
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
                {success}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
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
              Create an account
            </CardTitle>
            <CardDescription className="text-sm sm:text-base text-slate-600">
              Sign up to access the KSS x Footasylum Assurance Platform
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-slate-700 font-medium">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-white"
                />
              </div>
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
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-white"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isFootAsylumClient"
                  checked={isFootAsylumClient}
                  onChange={(e) => setIsFootAsylumClient(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#0e1925] focus:ring-[#0e1925]"
                />
                <Label htmlFor="isFootAsylumClient" className="text-sm font-normal cursor-pointer text-slate-700">
                  Footasylum Head Office
                </Label>
              </div>
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full bg-[#0e1925] hover:bg-[#1a2f3f] text-white" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
              <div className="text-center text-sm text-slate-600">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="text-[#0e1925] hover:text-[#1a2f3f] hover:underline font-medium"
                >
                  Sign in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
