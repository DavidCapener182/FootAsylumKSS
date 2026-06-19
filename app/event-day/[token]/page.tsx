import { EmpEventDayKioskClient } from '@/components/emp/event-day/emp-event-day-kiosk-client'

export const dynamic = 'force-dynamic'

export default function EventDayKioskPage({
  params,
}: {
  params: { token: string }
}) {
  return <EmpEventDayKioskClient token={params.token} />
}
