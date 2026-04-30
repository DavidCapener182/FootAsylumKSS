import { NextRequest, NextResponse } from 'next/server'
import { EmpAccessError } from '@/lib/emp/access'
import {
  EmpSetupRequiredError,
  createEmpDemoPlan,
  createEmpPlan,
} from '@/lib/emp/data'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const contentType = String(request.headers.get('content-type') || '').toLowerCase()
    let kind = 'blank'
    let redirectTo = ''

    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => ({}))
      kind = String(body?.kind || 'blank').trim().toLowerCase()
      redirectTo = String(body?.redirectTo || '').trim()
    } else {
      const formData = await request.formData().catch(() => null)
      kind = String(formData?.get('kind') || 'blank').trim().toLowerCase()
      redirectTo = String(formData?.get('redirectTo') || '').trim()
    }

    const planId =
      kind === 'example'
        ? await createEmpDemoPlan()
        : await createEmpPlan()

    if (redirectTo) {
      const redirectUrl = new URL(redirectTo.replace(':planId', planId), request.url)
      return NextResponse.redirect(redirectUrl, { status: 303 })
    }

    return NextResponse.json({ planId })
  } catch (error: any) {
    if (error instanceof EmpAccessError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    if (error instanceof EmpSetupRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    console.error('Error creating EMP plan:', error)
    return NextResponse.json(
      { error: 'Failed to create EMP plan', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
