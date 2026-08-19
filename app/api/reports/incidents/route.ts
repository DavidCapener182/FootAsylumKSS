import { exportIncidentsCSV } from '@/app/actions/reports'
import { NextRequest } from 'next/server'
import { reportPermissionErrorResponse, requireReportAccess } from '@/lib/reports/authorization'

// Force dynamic rendering for authenticated route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireReportAccess()
    const response = await exportIncidentsCSV()
    return response
  } catch (error) {
    const permissionResponse = reportPermissionErrorResponse(error)
    if (permissionResponse) return permissionResponse

    console.error('Error exporting incidents:', error)
    return new Response('Failed to export incidents', { status: 500 })
  }
}
