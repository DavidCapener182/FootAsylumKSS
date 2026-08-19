import { NextRequest, NextResponse } from 'next/server'
import { buildMonthlyNewsletterData } from '@/lib/reports/monthly-newsletter'
import type { MonthlyNewsletterRequestBody } from '@/lib/reports/monthly-newsletter-types'
import { reportPermissionErrorResponse, requireReportAccess } from '@/lib/reports/authorization'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireReportAccess()

    const body = ((await request.json().catch(() => ({}))) || {}) as MonthlyNewsletterRequestBody
    const newsletter = await buildMonthlyNewsletterData(supabase, body)

    return NextResponse.json(newsletter)
  } catch (error: any) {
    const permissionResponse = reportPermissionErrorResponse(error)
    if (permissionResponse) return permissionResponse

    console.error('Error generating monthly newsletter:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to generate monthly newsletter' },
      { status: 500 }
    )
  }
}
