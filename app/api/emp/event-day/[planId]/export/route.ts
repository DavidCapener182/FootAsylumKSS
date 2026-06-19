import { exportEmpEventDayCsv } from '@/lib/emp/event-day-data'
import { empEventDayJsonError } from '@/lib/emp/event-day-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: { planId: string } }
) {
  try {
    const { filename, csv } = await exportEmpEventDayCsv(params.planId)
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '\\"')}"`,
      },
    })
  } catch (error: any) {
    return empEventDayJsonError(error, 'Failed to export Event Day Operations CSV')
  }
}
