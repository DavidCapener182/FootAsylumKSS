import { requireAuth } from '@/lib/auth'
import { getCalendarData } from '@/app/actions/calendar'
import { CalendarClient } from '@/components/calendar/calendar-client'

export default async function CalendarPage() {
  await requireAuth()
  
  // Get current month and year
  const now = new Date()
  const month = now.getMonth() + 1 // JavaScript months are 0-indexed
  const year = now.getFullYear()
  
  const calendarData = await getCalendarData(month, year)

  return <CalendarClient initialData={calendarData} />
}
