import { redirect } from 'next/navigation'

export default function EventDayNestedTabRedirectPage({ params }: { params: { planId: string } }) {
  redirect(`/admin/event-management-plans/${params.planId}/event-day`)
}
