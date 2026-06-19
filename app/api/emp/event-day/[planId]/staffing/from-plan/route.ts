import { NextResponse } from 'next/server'
import { syncEmpEventDayRosterFromPlan } from '@/lib/emp/event-day-data'
import { empEventDayJsonError, jsonBody } from '@/lib/emp/event-day-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: Request,
  { params }: { params: { planId: string } }
) {
  try {
    const body = await jsonBody(request)
    const mode = String(body?.mode || 'replace_unstarted')
    return NextResponse.json(await syncEmpEventDayRosterFromPlan({
      planId: params.planId,
      mode: mode === 'add' ? 'add' : 'replace_unstarted',
    }))
  } catch (error: any) {
    return empEventDayJsonError(error, 'Failed to import EMP roster')
  }
}
