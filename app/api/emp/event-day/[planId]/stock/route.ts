import { NextResponse } from 'next/server'
import {
  adminUpdateEquipmentStock,
  adminUpsertEquipmentStock,
} from '@/lib/emp/event-day-data'
import { empEventDayJsonError, jsonBody } from '@/lib/emp/event-day-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: Request,
  { params }: { params: { planId: string } }
) {
  try {
    return NextResponse.json({ stock: await adminUpsertEquipmentStock(params.planId, await jsonBody(request)) })
  } catch (error: any) {
    return empEventDayJsonError(error, 'Failed to update equipment stock')
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { planId: string } }
) {
  try {
    return NextResponse.json({ stock: await adminUpdateEquipmentStock(params.planId, await jsonBody(request)) })
  } catch (error: any) {
    return empEventDayJsonError(error, 'Failed to update equipment stock')
  }
}
