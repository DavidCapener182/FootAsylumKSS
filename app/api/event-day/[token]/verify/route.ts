import { NextResponse } from 'next/server'
import { verifyEmpEventDayKioskAccess } from '@/lib/emp/event-day-data'
import { empEventDayJsonError, jsonBody } from '@/lib/emp/event-day-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const body = await jsonBody(request)
    return NextResponse.json(await verifyEmpEventDayKioskAccess({
      token: params.token,
      pin: typeof body.pin === 'string' ? body.pin : null,
    }))
  } catch (error: any) {
    return empEventDayJsonError(error, 'Failed to verify kiosk access')
  }
}
