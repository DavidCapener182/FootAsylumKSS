import Link from 'next/link'
import { MailCheck, ShieldCheck } from 'lucide-react'
import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignUpPage() {
  return (
    <AuthShell logoSize="compact" desktopLogoPosition="corner">
      <Card className="w-full rounded-[28px] border border-white/65 bg-white/94 shadow-[0_20px_60px_rgba(2,12,27,0.28)] backdrop-blur-xl sm:rounded-lg sm:border-0 sm:bg-white/95 sm:shadow-2xl sm:backdrop-blur-sm">
        <CardHeader className="px-5 pt-5 text-center sm:px-6 sm:pt-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-[#0e1925]">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <CardTitle className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Access is by invitation
          </CardTitle>
          <CardDescription className="mx-auto max-w-sm text-sm leading-6 text-slate-600 sm:text-base">
            Accounts are created by an authorised administrator. Use the invitation sent to your
            work email to set your password and access the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p>
              If you need access or your invitation has expired, contact your system administrator.
            </p>
          </div>
          <Button asChild className="w-full bg-[#0e1925] text-white hover:bg-[#1a2f3f]">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </AuthShell>
  )
}
