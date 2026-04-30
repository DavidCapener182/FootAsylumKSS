import { NextRequest, NextResponse } from 'next/server'
import { EmpAccessError } from '@/lib/emp/access'
import { EmpSetupRequiredError, getEmpPreviewData } from '@/lib/emp/data'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const planId = String(request.nextUrl.searchParams.get('planId') || '').trim()

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }

    const previewData = await getEmpPreviewData(planId)
    return NextResponse.json(previewData)
  } catch (error: any) {
    if (error instanceof EmpAccessError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    if (error instanceof EmpSetupRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    console.error('Error loading EMP preview:', error)
    return NextResponse.json(
      { error: 'Failed to load EMP preview', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
