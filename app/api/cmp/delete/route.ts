import { NextRequest, NextResponse } from 'next/server'
import { CmpAccessError } from '@/lib/cmp/access'
import {
  CmpSetupRequiredError,
  deleteCmpPlan,
} from '@/lib/cmp/data'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const planId = String(body?.planId || '').trim()

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }

    const result = await deleteCmpPlan(planId)
    return NextResponse.json(result)
  } catch (error: any) {
    if (error instanceof CmpAccessError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    if (error instanceof CmpSetupRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    console.error('Error deleting CMP plan:', error)
    return NextResponse.json(
      { error: 'Failed to delete CMP plan', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
