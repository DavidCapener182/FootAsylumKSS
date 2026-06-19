import { NextResponse } from 'next/server'
import {
  disableEmpEventDayKiosk,
  generateEmpEventDayKioskAccess,
  getEmpEventDaySettings,
  updateEmpEventDayKioskSettings,
} from '@/lib/emp/event-day-data'
import { empEventDayJsonError, jsonBody } from '@/lib/emp/event-day-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: { planId: string } }
) {
  try {
    return NextResponse.json({ settings: await getEmpEventDaySettings(params.planId) })
  } catch (error: any) {
    return empEventDayJsonError(error, 'Failed to load kiosk settings')
  }
}

export async function POST(
  request: Request,
  { params }: { params: { planId: string } }
) {
  try {
    const body = await jsonBody(request)
    if (body?.action === 'rotate') {
      return NextResponse.json(await generateEmpEventDayKioskAccess({
        planId: params.planId,
        pin: typeof body.pin === 'string' ? body.pin : null,
        kioskLabel: body.kioskLabel,
        timezone: body.timezone,
      }))
    }
    if (body?.action === 'disable') {
      return NextResponse.json({ settings: await disableEmpEventDayKiosk(params.planId) })
    }
    return NextResponse.json({
      settings: await updateEmpEventDayKioskSettings({
        planId: params.planId,
        enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
        kioskLabel: body.kioskLabel,
        timezone: body.timezone,
        pin: body.pin,
        mealTokenTotal: typeof body.mealTokenTotal === 'undefined' ? undefined : body.mealTokenTotal,
      }),
    })
  } catch (error: any) {
    return empEventDayJsonError(error, 'Failed to update kiosk settings')
  }
}
