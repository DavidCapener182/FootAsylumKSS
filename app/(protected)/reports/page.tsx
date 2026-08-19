import { requireReportAccess } from '@/lib/reports/authorization'
import ReportsClient from './reports-client'

export default async function ReportsPage() {
  await requireReportAccess()

  return <ReportsClient />
}
