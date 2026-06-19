import { NextResponse } from 'next/server'
import { adminAddWalkUpStaff, adminMarkNoShow, adminReinstateNoShow } from '@/lib/emp/event-day-data'
import { empEventDayJsonError, jsonBody } from '@/lib/emp/event-day-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: Request,
  { params }: { params: { planId: string } }
) {
  try {
    return NextResponse.json({ shift: await adminAddWalkUpStaff(params.planId, await jsonBody(request)) })
  } catch (error: any) {
    return empEventDayJsonError(error, 'Failed to add walk-up staff')
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { planId: string } }
) {
  try {
    const body = await jsonBody(request)
    const action = typeof body?.action === 'string' ? body.action : 'mark_no_show'
    const shift = action === 'reinstate'
      ? await adminReinstateNoShow(params.planId, body)
      : await adminMarkNoShow(params.planId, body)
    return NextResponse.json({ shift })
  } catch (error: any) {
    return empEventDayJsonError(error, 'Failed to update staff shift')
  }
}
