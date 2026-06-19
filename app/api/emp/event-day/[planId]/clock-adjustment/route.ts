import { NextResponse } from 'next/server'
import { adminAdjustClockTime } from '@/lib/emp/event-day-data'
import { empEventDayJsonError, jsonBody } from '@/lib/emp/event-day-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: Request,
  { params }: { params: { planId: string } }
) {
  try {
    return NextResponse.json({ shift: await adminAdjustClockTime(params.planId, await jsonBody(request)) })
  } catch (error: any) {
    return empEventDayJsonError(error, 'Failed to adjust clock time')
  }
}
