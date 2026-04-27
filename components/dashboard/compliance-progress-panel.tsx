import Link from 'next/link'
import { Activity, ChevronRight } from 'lucide-react'

import type { StatusBadgeTone } from '@/components/ui/status-badge'
import type { DashboardData } from './dashboard-types'
import { clampPercentage, percent, safeNumber, toneMap } from './dashboard-utils'
import { Panel, ProgressBar } from './panel'

export function ComplianceProgressPanel({ data }: { data: DashboardData }) {
  const totalStores = safeNumber(data.auditStats?.totalStores)
  const audit1Complete = safeNumber(data.auditStats?.firstAuditsComplete)
  const audit2Complete = safeNumber(data.auditStats?.secondAuditsComplete)
  const awaitingSecondAudit = safeNumber(data.complianceTracking?.awaitingSecondAuditCount)
  const fraRequired = safeNumber(data.storesRequiringFRA ?? data.fraStats?.required)
  const fraOverdue = safeNumber(data.fraStats?.overdue)
  const fraDueSoon = safeNumber(data.fraStats?.due)

  return (
    <Panel title="Compliance Progress" icon={Activity} actionLabel={`${totalStores} stores`}>
      <div className="space-y-4">
        <ComplianceProgressRow label="Audit 1 Complete" value={audit1Complete} percentage={safeNumber(data.auditStats?.firstAuditPercentage, percent(audit1Complete, totalStores))} tone="success" />
        <ComplianceProgressRow label="Audit 2 Complete" value={audit2Complete} percentage={safeNumber(data.auditStats?.secondAuditPercentage, percent(audit2Complete, totalStores))} tone="success" />
        <ComplianceProgressRow label="Awaiting Second Audit" value={awaitingSecondAudit} percentage={percent(awaitingSecondAudit, totalStores)} tone="info" />
        <ComplianceProgressRow label="FRA Required" value={fraRequired} percentage={percent(fraRequired, totalStores)} tone="warning" />
        <ComplianceProgressRow label="FRA Overdue" value={fraOverdue} percentage={percent(fraOverdue, totalStores)} tone="danger" />
        <ComplianceProgressRow label="FRA Due Soon" value={fraDueSoon} percentage={percent(fraDueSoon, totalStores)} tone="warning" />
      </div>

      <Link href="/reports" prefetch={false} className="mt-5 inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800">
        View full compliance report <ChevronRight className="ml-1 h-4 w-4" />
      </Link>
    </Panel>
  )
}

function ComplianceProgressRow({
  label,
  value,
  percentage,
  tone,
}: {
  label: string
  value: number
  percentage: number
  tone: StatusBadgeTone
}) {
  const barClass = tone === 'muted' ? 'bg-slate-300' : toneMap[tone]?.bar || 'bg-slate-300'

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-slate-900">
          {value} <span className="text-xs font-medium text-slate-500">({clampPercentage(percentage)}%)</span>
        </span>
      </div>
      <ProgressBar value={percentage} className={barClass} />
    </div>
  )
}
