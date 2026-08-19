import { exportAuditHistoryCsv } from '@/lib/reports/audit-history-server'
import { reportPermissionErrorResponse, requireReportAccess } from '@/lib/reports/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireReportAccess()
    return await exportAuditHistoryCsv()
  } catch (error) {
    const permissionResponse = reportPermissionErrorResponse(error)
    if (permissionResponse) return permissionResponse

    console.error('Error exporting audit history:', error)
    return new Response('Failed to export audit history', { status: 500 })
  }
}
