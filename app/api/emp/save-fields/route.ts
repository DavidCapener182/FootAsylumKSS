import { NextRequest, NextResponse } from 'next/server'
import { EmpAccessError } from '@/lib/emp/access'
import { EmpSetupRequiredError, saveEmpPlanFields } from '@/lib/emp/data'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const planId = String(body?.planId || '').trim()
    const values = body?.values && typeof body.values === 'object' ? body.values : null
    const selectedAnnexes = Array.isArray(body?.selectedAnnexes) ? body.selectedAnnexes : undefined
    const includeKssProfileAppendix =
      typeof body?.includeKssProfileAppendix === 'boolean'
        ? body.includeKssProfileAppendix
        : undefined

    if (!planId || !values) {
      return NextResponse.json({ error: 'planId and values are required' }, { status: 400 })
    }

    const editorData = await saveEmpPlanFields({
      planId,
      values,
      selectedAnnexes,
      includeKssProfileAppendix,
    })

    return NextResponse.json(editorData)
  } catch (error: any) {
    if (error instanceof EmpAccessError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    if (error instanceof EmpSetupRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    console.error('Error saving EMP field values:', error)
    return NextResponse.json(
      { error: 'Failed to save EMP field values', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
