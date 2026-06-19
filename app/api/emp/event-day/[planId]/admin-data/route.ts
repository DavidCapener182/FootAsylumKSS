import { NextResponse } from 'next/server'
import { getEmpEventDayAdminData } from '@/lib/emp/event-day-data'
import { empEventDayJsonError } from '@/lib/emp/event-day-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: { planId: string } }
) {
  try {
    return NextResponse.json(await getEmpEventDayAdminData(params.planId))
  } catch (error: any) {
    return empEventDayJsonError(error, 'Failed to load Event Day Operations data')
  }
}
