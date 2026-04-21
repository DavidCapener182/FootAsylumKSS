import { NextRequest, NextResponse } from 'next/server'
import { CmpAccessError } from '@/lib/cmp/access'
import { CmpSetupRequiredError, getCmpPreviewData } from '@/lib/cmp/data'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const planId = String(request.nextUrl.searchParams.get('planId') || '').trim()

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }

    const previewData = await getCmpPreviewData(planId)
    return NextResponse.json(previewData)
  } catch (error: any) {
    if (error instanceof CmpAccessError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    if (error instanceof CmpSetupRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    console.error('Error loading CMP preview:', error)
    return NextResponse.json(
      { error: 'Failed to load CMP preview', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
