import { requireReportAccess } from '@/lib/reports/authorization'
import { ReportsCentre } from '@/components/reports/reports-centre'
import { getRecentReportVersions } from '@/features/reports/query-service'

export default async function ReportsPage() {
  await requireReportAccess()
  const versions = await getRecentReportVersions()

  return <ReportsCentre versions={versions} />
}
