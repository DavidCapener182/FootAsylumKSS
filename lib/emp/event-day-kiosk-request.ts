import 'server-only'

import { createHash, randomUUID } from 'crypto'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import type {
  EmpEventDayKioskAction,
  EmpEventDayKioskRequestContext,
} from '@/lib/emp/event-day-kiosk-security'

type LimitResult = {
  allowed: boolean
  retry_after_seconds: number
  current_count: number
  locked_until: string | null
  reservation_window_started_at: string
  attempt_reserved: boolean
}

export type EmpEventDayKioskProofReservation = {
  allowed: boolean
  retryAfterSeconds: number
  currentCount: number
  windowStartedAt: string
}

const ACTION_LIMITS: Record<EmpEventDayKioskAction, {
  limit: number
  windowSeconds: number
  lockSeconds: number
}> = {
  // The source bucket is intentionally shared by tablets behind the same venue
  // NAT. PIN failures have their own much tighter credential-wide lock below.
  verify: { limit: 180, windowSeconds: 60, lockSeconds: 60 },
  search_staff: { limit: 240, windowSeconds: 60, lockSeconds: 60 },
  clocked_in: { limit: 120, windowSeconds: 60, lockSeconds: 60 },
  clock_in: { limit: 60, windowSeconds: 60, lockSeconds: 60 },
  clock_out: { limit: 60, windowSeconds: 60, lockSeconds: 60 },
}

const PIN_FAILURE_LIMIT = {
  limit: 5,
  windowSeconds: 15 * 60,
  lockSeconds: 15 * 60,
}

const WORKER_FAILURE_LIMIT = {
  limit: 5,
  windowSeconds: 15 * 60,
  lockSeconds: 15 * 60,
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function normalizeSourceHeader(value: string | null) {
  const normalized = value?.trim()
  if (!normalized) return null
  return normalized.slice(0, 256)
}

function requestSource(request: Request) {
  // Only trust Vercel's platform-controlled source header when this function
  // is actually running on Vercel. Generic forwarding headers can otherwise
  // be supplied or changed by an untrusted upstream.
  if (process.env.VERCEL === '1') {
    const vercelSource = normalizeSourceHeader(
      request.headers.get('x-vercel-forwarded-for')
    )
    return vercelSource ? `vercel:${vercelSource}` : 'vercel:unknown-source'
  }

  // Self-hosted deployments may opt into a custom header that their edge
  // proxy guarantees it removes and overwrites. Without that explicit
  // contract, use one conservative shared bucket rather than a spoofable IP.
  const trustedHeaderName = process.env.EMP_EVENT_DAY_TRUSTED_IP_HEADER
    ?.trim()
    .toLowerCase()
  if (trustedHeaderName && /^[a-z0-9-]{1,64}$/.test(trustedHeaderName)) {
    const trustedSource = normalizeSourceHeader(
      request.headers.get(trustedHeaderName)
    )
    if (trustedSource) return `proxy:${trustedSource}`
  }

  return 'untrusted-source'
}

export function createEmpEventDayKioskRequestContext(
  request: Request,
  token: string,
  action: EmpEventDayKioskAction
): EmpEventDayKioskRequestContext {
  const tokenHash = sha256(token.trim())
  const clientKeyHash = sha256(requestSource(request))
  return {
    action,
    correlationId: randomUUID(),
    clientKeyHash,
    pinKeyHash: sha256(`pin:${tokenHash}`),
    planId: null,
    kioskAccessId: null,
    eventDate: null,
  }
}

export function enrichEmpEventDayKioskRequestContext(
  context: EmpEventDayKioskRequestContext,
  input: { planId: string; kioskAccessId: string | null; eventDate: string | null }
) {
  context.planId = input.planId
  context.kioskAccessId = input.kioskAccessId
  context.eventDate = input.eventDate
}

export class EmpEventDayRateLimitError extends Error {
  retryAfterSeconds: number

  constructor(retryAfterSeconds: number) {
    super('Too many kiosk requests. Try again shortly.')
    this.name = 'EmpEventDayRateLimitError'
    this.retryAfterSeconds = Math.max(1, Math.ceil(retryAfterSeconds))
  }
}

async function consumeLimit(input: {
  keyHash: string
  action: EmpEventDayKioskAction | 'pin' | 'worker'
  limit: number
  windowSeconds: number
  lockSeconds: number
  increment?: number
}) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.rpc('emp_consume_event_day_kiosk_limit', {
    p_key_hash: input.keyHash,
    p_action: input.action,
    p_limit: input.limit,
    p_window_seconds: input.windowSeconds,
    p_lock_seconds: input.lockSeconds,
    p_increment: input.increment ?? 1,
  })

  if (error) throw new Error(`Failed to enforce kiosk request limit: ${error.message}`)
  const result = (Array.isArray(data) ? data[0] : data) as LimitResult | null
  if (!result) throw new Error('Failed to enforce kiosk request limit: empty result')
  return result
}

function assertAllowed(result: LimitResult) {
  if (!result.allowed) throw new EmpEventDayRateLimitError(result.retry_after_seconds)
}

export async function enforceEmpEventDayKioskRequestLimit(context: EmpEventDayKioskRequestContext) {
  const config = ACTION_LIMITS[context.action]
  assertAllowed(await consumeLimit({
    keyHash: context.clientKeyHash,
    action: context.action,
    ...config,
  }))
}

async function reserveProofAttempt(input: {
  keyHash: string
  action: 'pin' | 'worker'
  limit: number
  windowSeconds: number
  lockSeconds: number
}): Promise<EmpEventDayKioskProofReservation> {
  const result = await consumeLimit({
    ...input,
    increment: 1,
  })

  // A request that reaches the threshold owns the final reservation and must
  // still compare its proof: a correct proof clears the provisional lock,
  // while a bad proof leaves it in place and returns 429. Requests arriving
  // after a lock do not reserve an attempt and are rejected before comparison.
  if (!result.allowed && !result.attempt_reserved) assertAllowed(result)
  if (!result.attempt_reserved || !result.reservation_window_started_at) {
    throw new Error('Failed to reserve kiosk proof attempt')
  }

  return {
    allowed: result.allowed,
    retryAfterSeconds: result.retry_after_seconds,
    currentCount: result.current_count,
    windowStartedAt: result.reservation_window_started_at,
  }
}

async function clearReservedProofAttempts(input: {
  keyHash: string
  action: 'pin' | 'worker'
  reservation: EmpEventDayKioskProofReservation
  errorContext: string
}) {
  const supabase = createAdminSupabaseClient()
  const { error } = await supabase
    .from('emp_event_kiosk_request_limits')
    .delete()
    .eq('key_hash', input.keyHash)
    .eq('action', input.action)
    .eq('window_started_at', input.reservation.windowStartedAt)
    .eq('request_count', input.reservation.currentCount)
  if (error) throw new Error(`Failed to clear ${input.errorContext}: ${error.message}`)
}

export function throwIfEmpEventDayProofAttemptBlocked(
  reservation: EmpEventDayKioskProofReservation
) {
  if (!reservation.allowed) {
    throw new EmpEventDayRateLimitError(reservation.retryAfterSeconds)
  }
}

export async function reserveEmpEventDayKioskPinAttempt(
  context: EmpEventDayKioskRequestContext
) {
  return reserveProofAttempt({
    keyHash: context.pinKeyHash,
    action: 'pin',
    ...PIN_FAILURE_LIMIT,
  })
}

export async function clearEmpEventDayKioskPinFailures(
  context: EmpEventDayKioskRequestContext,
  reservation: EmpEventDayKioskProofReservation
) {
  await clearReservedProofAttempts({
    keyHash: context.pinKeyHash,
    action: 'pin',
    reservation,
    errorContext: 'kiosk PIN failures',
  })
}

export function empEventDayWorkerLimitKey(
  context: EmpEventDayKioskRequestContext,
  staffShiftId: string
) {
  return sha256(`worker:${context.pinKeyHash}:${staffShiftId}`)
}

export async function reserveEmpEventDayWorkerVerificationAttempt(
  context: EmpEventDayKioskRequestContext,
  staffShiftId: string
) {
  return reserveProofAttempt({
    keyHash: empEventDayWorkerLimitKey(context, staffShiftId),
    action: 'worker',
    ...WORKER_FAILURE_LIMIT,
  })
}

export async function clearEmpEventDayWorkerVerificationFailures(
  context: EmpEventDayKioskRequestContext,
  staffShiftId: string,
  reservation: EmpEventDayKioskProofReservation
) {
  await clearReservedProofAttempts({
    keyHash: empEventDayWorkerLimitKey(context, staffShiftId),
    action: 'worker',
    reservation,
    errorContext: 'kiosk worker verification failures',
  })
}

export async function recordEmpEventDayKioskRequest(input: {
  context: EmpEventDayKioskRequestContext
  outcome: 'success' | 'authentication_failed' | 'forbidden' | 'rate_limited' | 'validation_failed' | 'error'
  statusCode: number
}) {
  const { context } = input
  const supabase = createAdminSupabaseClient()
  const { error } = await supabase.from('emp_event_kiosk_request_events').insert({
    plan_id: context.planId,
    kiosk_access_id: context.kioskAccessId,
    event_date: context.eventDate,
    correlation_id: context.correlationId,
    action: context.action,
    outcome: input.outcome,
    status_code: input.statusCode,
    client_key_hash: context.clientKeyHash,
  })
  if (error) throw new Error(`Failed to record kiosk request event: ${error.message}`)
}

export function kioskAuditMetadata(
  context: EmpEventDayKioskRequestContext,
  metadata: Record<string, unknown> = {}
) {
  return {
    ...metadata,
    kioskAccessId: context.kioskAccessId,
    eventDate: context.eventDate,
    correlationId: context.correlationId,
  }
}
