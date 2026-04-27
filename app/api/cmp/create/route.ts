import { NextRequest, NextResponse } from 'next/server'
import { CmpAccessError } from '@/lib/cmp/access'
import {
  CmpSetupRequiredError,
  createCmpDemoPlan,
  createCmpPlan,
} from '@/lib/cmp/data'

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
        ? await createCmpDemoPlan()
        : await createCmpPlan()

    if (redirectTo) {
      const redirectUrl = new URL(redirectTo.replace(':planId', planId), request.url)
      return NextResponse.redirect(redirectUrl, { status: 303 })
    }

    return NextResponse.json({ planId })
  } catch (error: any) {
    if (error instanceof CmpAccessError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    if (error instanceof CmpSetupRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    console.error('Error creating CMP plan:', error)
    return NextResponse.json(
      { error: 'Failed to create CMP plan', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
