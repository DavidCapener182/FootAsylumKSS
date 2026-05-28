import { NextRequest, NextResponse } from 'next/server'
import { EmpAccessError } from '@/lib/emp/access'
import {
  EmpSetupRequiredError,
  createEmpEventControlLogEntry,
  getEmpEventControlLogData,
  updateEmpEventControlLogEntry,
} from '@/lib/emp/data'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function jsonError(error: any, fallback: string, status = 500) {
  if (error instanceof EmpAccessError) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }
  if (error instanceof EmpSetupRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 503 })
  }

  console.error(fallback, error)
  return NextResponse.json(
    { error: fallback, details: error?.message || String(error) },
    { status }
  )
}

export async function GET(request: NextRequest) {
  try {
    const planId = String(request.nextUrl.searchParams.get('planId') || '').trim()
    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }

    return NextResponse.json(await getEmpEventControlLogData(planId))
  } catch (error: any) {
    return jsonError(error, 'Failed to load EMP event control log')
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const planId = String(body?.planId || '').trim()
    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }

    const entry = await createEmpEventControlLogEntry({
      planId,
      loggedAt: body?.loggedAt,
      fromCallSign: body?.fromCallSign,
      toCallSign: body?.toCallSign,
      occurrence: body?.occurrence,
      messageType: body?.messageType,
      actionTaken: body?.actionTaken,
      owner: body?.owner,
      priority: body?.priority,
      status: body?.status,
    })

    return NextResponse.json({ entry })
  } catch (error: any) {
    return jsonError(error, 'Failed to create EMP event control log entry')
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const planId = String(body?.planId || '').trim()
    const entryId = String(body?.entryId || '').trim()
    if (!planId || !entryId) {
      return NextResponse.json({ error: 'planId and entryId are required' }, { status: 400 })
    }

    const entry = await updateEmpEventControlLogEntry({
      planId,
      entryId,
      loggedAt: body?.loggedAt,
      fromCallSign: body?.fromCallSign,
      toCallSign: body?.toCallSign,
      occurrenceAmendment: body?.occurrenceAmendment,
      messageType: body?.messageType,
      actionTakenAmendment: body?.actionTakenAmendment,
      owner: body?.owner,
      priority: body?.priority,
      status: body?.status,
    })

    return NextResponse.json({ entry })
  } catch (error: any) {
    return jsonError(error, 'Failed to update EMP event control log entry')
  }
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Event control log entries cannot be deleted. Edit the entry instead.' },
    {
      status: 405,
      headers: {
        Allow: 'GET, POST, PATCH',
      },
    }
  )
}
