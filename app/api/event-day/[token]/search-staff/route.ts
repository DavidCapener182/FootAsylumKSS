import { searchKioskStaff } from '@/lib/emp/event-day-data'
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
    action: 'search_staff',
    fallback: 'Failed to search kiosk staff',
    handler: async (requestContext) => searchKioskStaff({
      token: params.token,
      body: await jsonBody(request),
      requestContext,
    }),
  })
}
