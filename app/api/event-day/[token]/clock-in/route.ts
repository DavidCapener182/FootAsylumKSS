import { NextResponse } from 'next/server'
import { clockInEmpEventStaff } from '@/lib/emp/event-day-data'
import { empEventDayJsonError, jsonBody } from '@/lib/emp/event-day-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    return NextResponse.json(await clockInEmpEventStaff({
      token: params.token,
      body: await jsonBody(request),
    }))
  } catch (error: any) {
    return empEventDayJsonError(error, 'Failed to clock staff in')
  }
}
