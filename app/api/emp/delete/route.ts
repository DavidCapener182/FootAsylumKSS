import { NextRequest, NextResponse } from 'next/server'
import { EmpAccessError } from '@/lib/emp/access'
import {
  EmpSetupRequiredError,
  deleteEmpPlan,
} from '@/lib/emp/data'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // If the endpoint is opened directly in a browser, avoid a blank 405 page.
  return NextResponse.redirect(new URL('/admin/event-management-plans', request.url), { status: 303 })
}

export async function POST(request: NextRequest) {
  try {
    const contentType = String(request.headers.get('content-type') || '').toLowerCase()
    let planId = ''
    let redirectTo = ''

    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => ({}))
      planId = String(body?.planId || '').trim()
      redirectTo = String(body?.redirectTo || '').trim()
    } else {
      const formData = await request.formData().catch(() => null)
      planId = String(formData?.get('planId') || '').trim()
      redirectTo = String(formData?.get('redirectTo') || '').trim()
    }

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }

    const result = await deleteEmpPlan(planId)

    if (redirectTo) {
      const redirectUrl = new URL(redirectTo, request.url)
      return NextResponse.redirect(redirectUrl, { status: 303 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    if (error instanceof EmpAccessError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    if (error instanceof EmpSetupRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    console.error('Error deleting EMP plan:', error)
    return NextResponse.json(
      { error: 'Failed to delete EMP plan', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
