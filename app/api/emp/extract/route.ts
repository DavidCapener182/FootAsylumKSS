import { NextRequest, NextResponse } from 'next/server'
import { EmpAccessError } from '@/lib/emp/access'
import { EmpSetupRequiredError, extractEmpPlanFromSources } from '@/lib/emp/data'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const planId = String(body?.planId || '').trim()

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }

    const result = await extractEmpPlanFromSources(planId)
    return NextResponse.json(result)
  } catch (error: any) {
    if (error instanceof EmpAccessError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    if (error instanceof EmpSetupRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    console.error('Error extracting EMP source data:', error)
    return NextResponse.json(
      { error: 'Failed to extract EMP source data', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
