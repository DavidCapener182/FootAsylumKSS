import { MfaFlow } from '@/components/auth/mfa-flow'
import { getSafeMfaRedirect } from '@/lib/mfa/redirect'

type MfaPageProps = {
  searchParams?: { redirectTo?: string | string[] }
}

export default function MfaPage({ searchParams }: MfaPageProps) {
  return <MfaFlow redirectTo={getSafeMfaRedirect(searchParams?.redirectTo)} />
}
