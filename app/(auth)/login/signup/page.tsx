'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
        // Foot Asylum clients get 'client' role, others need admin approval ('pending')
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-xl sm:text-2xl">Check your email</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {success}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <Link href="/login">
              <Button className="w-full">
                Back to login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-xl sm:text-2xl">Create an account</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Sign up to access the Foot Asylum Assurance Platform
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isFootAsylumClient"
                checked={isFootAsylumClient}
                onChange={(e) => setIsFootAsylumClient(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isFootAsylumClient" className="text-sm font-normal cursor-pointer">
                Foot Asylum Head Office
              </Label>
            </div>
            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
            <div className="text-center text-sm">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
