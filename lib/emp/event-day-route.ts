import { NextResponse } from 'next/server'
import { EmpAccessError } from '@/lib/emp/access'
import { EmpSetupRequiredError } from '@/lib/emp/data'
import { EmpEventDayError } from '@/lib/emp/event-day-data'

export function empEventDayJsonError(error: any, fallback: string) {
  if (error instanceof EmpEventDayError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  if (error instanceof EmpAccessError) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }
  if (error instanceof EmpSetupRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 503 })
  }

  console.error(fallback, error)
  return NextResponse.json(
    { error: fallback, details: error?.message || String(error) },
    { status: 500 }
  )
}

export async function jsonBody(request: Request) {
  return request.json().catch(() => ({}))
}
