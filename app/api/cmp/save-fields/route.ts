import { NextRequest, NextResponse } from 'next/server'
import { CmpAccessError } from '@/lib/cmp/access'
import { CmpSetupRequiredError, saveCmpPlanFields } from '@/lib/cmp/data'

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

    const editorData = await saveCmpPlanFields({
      planId,
      values,
      selectedAnnexes,
      includeKssProfileAppendix,
    })

    return NextResponse.json(editorData)
  } catch (error: any) {
    if (error instanceof CmpAccessError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    if (error instanceof CmpSetupRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    console.error('Error saving CMP field values:', error)
    return NextResponse.json(
      { error: 'Failed to save CMP field values', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
