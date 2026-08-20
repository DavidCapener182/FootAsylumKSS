import { AuditLabWorkspace } from '../_components/workspace'
import { AuditSchedulePanel } from '@/components/audit/audit-schedule-panel'
import { getAuditScheduleData } from '@/features/audits/schedule-service'
import { requireRole } from '@/lib/auth'

export default async function ActiveAuditsPage() {
  await requireRole(['admin', 'ops'])
  const schedule = await getAuditScheduleData()
  return <><div className="bg-slate-50 px-3 pt-3 sm:px-6 sm:pt-5 lg:px-8"><AuditSchedulePanel initialData={schedule} /></div><AuditLabWorkspace initialTab="active-audits" activeHref="/audit-lab/active" /></>
}
