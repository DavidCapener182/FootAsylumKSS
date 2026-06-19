import { NextResponse } from 'next/server'
import {
  adminReplaceEquipmentAssignment,
  adminUpdateEquipmentAssignment,
} from '@/lib/emp/event-day-data'
import { empEventDayJsonError, jsonBody } from '@/lib/emp/event-day-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PATCH(
  request: Request,
  { params }: { params: { planId: string } }
) {
  try {
    const body = await jsonBody(request)
    if (body?.action === 'replace') {
      return NextResponse.json(await adminReplaceEquipmentAssignment(params.planId, body))
    }
    return NextResponse.json({ assignment: await adminUpdateEquipmentAssignment(params.planId, body) })
  } catch (error: any) {
    return empEventDayJsonError(error, 'Failed to update equipment')
  }
}
