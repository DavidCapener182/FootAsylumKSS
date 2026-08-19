import { redirect } from 'next/navigation'
import { LogOut, ShieldAlert } from 'lucide-react'
import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

async function signOut() {
  'use server'

  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default function AccountSetupPage() {
  return (
    <AuthShell logoSize="compact" desktopLogoPosition="corner">
      <Card className="w-full rounded-[28px] border border-white/65 bg-white/94 shadow-[0_20px_60px_rgba(2,12,27,0.28)] backdrop-blur-xl sm:rounded-lg sm:border-0 sm:bg-white/95 sm:shadow-2xl sm:backdrop-blur-sm">
        <CardHeader className="px-5 pt-5 text-center sm:px-6 sm:pt-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </div>
          <CardTitle className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Account setup required
          </CardTitle>
          <CardDescription className="mx-auto max-w-sm text-sm leading-6 text-slate-600 sm:text-base">
            Your sign-in is valid, but this account is not currently active. No operational data is
            available while an account is invited, pending, suspended, or deactivated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
          <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            Ask your system administrator to approve or reactivate the account, then sign in again.
          </p>
          <form action={signOut}>
            <Button type="submit" variant="outline" className="w-full">
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  )
}
