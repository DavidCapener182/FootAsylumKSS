import { NextRequest, NextResponse } from 'next/server'
import { EmpAccessError } from '@/lib/emp/access'
import { EmpSetupRequiredError, uploadEmpSourceDocument } from '@/lib/emp/data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const planId = String(formData.get('planId') || '').trim()
    const documentKind = String(formData.get('documentKind') || '').trim()
    const replaceExisting = String(formData.get('replaceExisting') || '').trim().toLowerCase() === 'true'
    const file = formData.get('file')

    if (!planId || !documentKind || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'planId, documentKind, and file are required' },
        { status: 400 }
      )
    }

    const uploaded = await uploadEmpSourceDocument({
      planId,
      documentKind,
      file,
      replaceExisting,
    })

    return NextResponse.json(uploaded)
  } catch (error: any) {
    if (error instanceof EmpAccessError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    if (error instanceof EmpSetupRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    console.error('Error uploading EMP source document:', error)
    return NextResponse.json(
      { error: 'Failed to upload EMP source document', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
