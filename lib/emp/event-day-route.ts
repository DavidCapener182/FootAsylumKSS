import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { EmpAccessError } from '@/lib/emp/access'
import { EmpSetupRequiredError } from '@/lib/emp/data'
import { EmpEventDayError } from '@/lib/emp/event-day-data'
import type { EmpEventDayKioskAction, EmpEventDayKioskRequestContext } from '@/lib/emp/event-day-kiosk-security'
import {
  createEmpEventDayKioskRequestContext,
  EmpEventDayRateLimitError,
  enforceEmpEventDayKioskRequestLimit,
  recordEmpEventDayKioskRequest,
} from '@/lib/emp/event-day-kiosk-request'

function requestHeaders(requestId?: string | null, retryAfterSeconds?: number | null) {
  const headers: Record<string, string> = {}
  if (requestId) headers['X-Request-ID'] = requestId
  if (retryAfterSeconds) headers['Retry-After'] = String(retryAfterSeconds)
  return headers
}

export function empEventDayJsonError(error: any, fallback: string, requestId?: string | null) {
  if (error instanceof EmpEventDayRateLimitError) {
    return NextResponse.json(
      { error: error.message, requestId },
      { status: 429, headers: requestHeaders(requestId, error.retryAfterSeconds) }
    )
  }
  if (error instanceof EmpEventDayError) {
    return NextResponse.json(
      { error: error.message, requestId },
      { status: error.status, headers: requestHeaders(requestId) }
    )
  }
  if (error instanceof EmpAccessError) {
    return NextResponse.json(
      { error: error.message, requestId },
      { status: 401, headers: requestHeaders(requestId) }
    )
  }
  if (error instanceof EmpSetupRequiredError) {
    return NextResponse.json(
      { error: error.message, requestId },
      { status: 503, headers: requestHeaders(requestId) }
    )
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message || 'Invalid request', requestId },
      { status: 400, headers: requestHeaders(requestId) }
    )
  }

  console.error(fallback, error)
  return NextResponse.json(
    { error: fallback, requestId },
    { status: 500, headers: requestHeaders(requestId) }
  )
}

function requestOutcome(status: number) {
  if (status >= 200 && status < 300) return 'success' as const
  if (status === 400 || status === 404 || status === 409) return 'validation_failed' as const
  if (status === 401) return 'authentication_failed' as const
  if (status === 403) return 'forbidden' as const
  if (status === 429) return 'rate_limited' as const
  return 'error' as const
}

async function safelyRecordKioskRequest(context: EmpEventDayKioskRequestContext, statusCode: number) {
  try {
    await recordEmpEventDayKioskRequest({
      context,
      outcome: requestOutcome(statusCode),
      statusCode,
    })
  } catch (error) {
    console.error(`Failed to record kiosk request ${context.correlationId}`, error)
  }
}

export async function empEventDayKioskRoute<T>(input: {
  request: Request
  token: string
  action: EmpEventDayKioskAction
  fallback: string
  handler: (context: EmpEventDayKioskRequestContext) => Promise<T>
}) {
  const context = createEmpEventDayKioskRequestContext(input.request, input.token, input.action)
  try {
    await enforceEmpEventDayKioskRequestLimit(context)
    const body = await input.handler(context)
    const response = NextResponse.json(body, {
      headers: requestHeaders(context.correlationId),
    })
    await safelyRecordKioskRequest(context, response.status)
    return response
  } catch (error: any) {
    const response = empEventDayJsonError(error, input.fallback, context.correlationId)
    await safelyRecordKioskRequest(context, response.status)
    return response
  }
}

export async function jsonBody(request: Request) {
  return request.json().catch(() => ({}))
}
