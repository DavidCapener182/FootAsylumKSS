import { verifyEmpEventDayKioskAccess } from '@/lib/emp/event-day-data'
import { empEventDayKioskRoute, jsonBody } from '@/lib/emp/event-day-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  return empEventDayKioskRoute({
    request,
    token: params.token,
    action: 'verify',
    fallback: 'Failed to verify kiosk access',
    handler: async (requestContext) => {
      const body = await jsonBody(request)
      return verifyEmpEventDayKioskAccess({
        token: params.token,
        pin: typeof body.pin === 'string' ? body.pin : null,
        requestContext,
      })
    },
  })
}
