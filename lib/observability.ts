export type OperationalEvent = {
  event: 'server_error' | 'client_error' | 'web_vital' | 'query_failure' | 'slow_query' | 'upload_failure' | 'report_failure' | 'permission_denial' | 'kiosk_auth_failure' | 'schema_mismatch'
  route?: string
  operation?: string
  durationMs?: number
  correlationId?: string
  detail?: Record<string, string | number | boolean | null>
}

export function recordOperationalEvent(event: OperationalEvent): void {
  const payload = { ...event, service: 'footasylum-kss', recordedAt: new Date().toISOString() }
  const output = JSON.stringify(payload)
  if (event.event.endsWith('failure') || event.event.endsWith('error') || event.event === 'permission_denial' || event.event === 'schema_mismatch') console.error(output)
  else console.info(output)
}

export async function observeQuery<T>(operation: string, query: () => Promise<T>, slowThresholdMs = 1_500): Promise<T> {
  const startedAt = Date.now()
  try {
    const result = await query()
    const durationMs = Date.now() - startedAt
    if (durationMs >= slowThresholdMs) recordOperationalEvent({ event: 'slow_query', operation, durationMs })
    return result
  } catch (error) {
    recordOperationalEvent({ event: 'query_failure', operation, durationMs: Date.now() - startedAt, detail: { message: error instanceof Error ? error.message : 'Unknown query error' } })
    throw error
  }
}
