import { NextResponse } from 'next/server'
import { adminIssueMealToken } from '@/lib/emp/event-day-data'
import { empEventDayJsonError, jsonBody } from '@/lib/emp/event-day-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: Request,
  { params }: { params: { planId: string } }
) {
  try {
    return NextResponse.json({ mealToken: await adminIssueMealToken(params.planId, await jsonBody(request)) })
  } catch (error: any) {
    return empEventDayJsonError(error, 'Failed to issue meal token')
  }
}
