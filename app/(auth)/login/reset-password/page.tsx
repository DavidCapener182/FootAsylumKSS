'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Check if we have the necessary tokens in the URL
    // Can come from password reset (type=recovery) or invitation (type=invite)
    // Tokens can be in hash (#) or query parameters (?)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const queryParams = new URLSearchParams(window.location.search)
    
    // Try hash first, then query params
    const accessToken = hashParams.get('access_token') || queryParams.get('access_token')
    const type = hashParams.get('type') || queryParams.get('type')
    const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token')

    if ((type === 'recovery' || type === 'invite' || type === 'signup') && accessToken) {
      // User came from email link (password reset or invitation), we can proceed
      // If tokens are in query params, we might need to redirect to hash format
      if (queryParams.get('access_token') && !hashParams.get('access_token')) {
        // Supabase sometimes uses query params, but we need hash for client-side
        // The page should still work, but let's log for debugging
        console.log('Tokens found in query params')
      }
    } else if (!accessToken) {
      // No valid token found - might be a direct visit or expired link
      // Don't redirect immediately, let the form show and handle error on submit
      console.log('No access token found in URL')
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const supabase = createClient()
    
    // Get the access token from the URL (check both hash and query params)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const queryParams = new URLSearchParams(window.location.search)
    
    const accessToken = hashParams.get('access_token') || queryParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token')
    const type = hashParams.get('type') || queryParams.get('type')

    if (!accessToken) {
      setError('Invalid or expired link. Please request a new invitation or password reset.')
      setLoading(false)
      return
    }

    // Set the session with the tokens from the email link
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || '',
    })

    if (sessionError) {
      setError('Invalid or expired reset link. Please request a new one.')
      setLoading(false)
      return
    }

    // Update the password
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
    } else {
      setSuccess(true)
      // Redirect to home page after password is set (user is now logged in)
      // For invitations, they should go to the app, not back to login
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 1500)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-xl sm:text-2xl">Password set successfully</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Your password has been set. Redirecting to the app...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-xl sm:text-2xl">
            {(() => {
              const hashParams = new URLSearchParams(window.location.hash.substring(1))
              const queryParams = new URLSearchParams(window.location.search)
              const type = hashParams.get('type') || queryParams.get('type')
              return type === 'invite' ? 'Set your password' : 'Set new password'
            })()}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {(() => {
              const hashParams = new URLSearchParams(window.location.hash.substring(1))
              const queryParams = new URLSearchParams(window.location.search)
              const type = hashParams.get('type') || queryParams.get('type')
              return type === 'invite' 
                ? 'Welcome! Please set a password to complete your account setup.'
                : 'Enter your new password below'
            })()}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter new password"
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
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating password...' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
