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
    const body = await request.json().catch(() => ({}))
    const kind = String(body?.kind || 'blank').trim().toLowerCase()

    const planId =
      kind === 'example'
        ? await createCmpDemoPlan()
        : await createCmpPlan()

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
