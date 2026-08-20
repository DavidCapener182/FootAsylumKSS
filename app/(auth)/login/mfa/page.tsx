import { redirect } from 'next/navigation'

import { getSafeAuthRedirect } from '@/lib/auth-redirect'

type RetiredMfaPageProps = {
  searchParams?: { redirectTo?: string | string[] }
}

export default function RetiredMfaPage({ searchParams }: RetiredMfaPageProps) {
  redirect(getSafeAuthRedirect(searchParams?.redirectTo))
}
