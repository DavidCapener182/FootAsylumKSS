import { z } from 'zod'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { recordOperationalEvent } from '@/lib/observability'

const eventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('web_vital'), name: z.string().max(40), value: z.number(), rating: z.string().max(30).optional(), route: z.string().max(300), metricId: z.string().max(100).optional() }),
  z.object({ type: z.literal('client_error'), message: z.string().max(1000), route: z.string().max(300), digest: z.string().max(200).optional() }),
])

export async function POST(request: Request) {
  await requireAuth()
  const parsed = eventSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid telemetry event' }, { status: 400 })
  if (parsed.data.type === 'web_vital') {
    recordOperationalEvent({ event: 'web_vital', route: parsed.data.route, operation: parsed.data.name, durationMs: parsed.data.value, detail: { rating: parsed.data.rating || null, metricId: parsed.data.metricId || null } })
  } else {
    recordOperationalEvent({ event: 'client_error', route: parsed.data.route, detail: { message: parsed.data.message, digest: parsed.data.digest || null } })
  }
  return new NextResponse(null, { status: 204 })
}
