import { redirect } from 'next/navigation'

export default function EventDayMissingTokenPage() {
  redirect('/admin/event-management-plans')
}
