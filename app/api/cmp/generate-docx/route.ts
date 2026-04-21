import { NextRequest, NextResponse } from 'next/server'
import HTMLtoDOCX from 'html-to-docx'
import { CmpAccessError } from '@/lib/cmp/access'
import { CmpSetupRequiredError, getCmpPreviewData } from '@/lib/cmp/data'
import { renderCmpPreviewHtml } from '@/lib/cmp/preview'
import { getCmpReportFilename } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const planId = String(request.nextUrl.searchParams.get('planId') || '').trim()

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }

    const previewData = await getCmpPreviewData(planId)
    const html = renderCmpPreviewHtml(previewData.model)
    const buffer = await HTMLtoDOCX(html, undefined, {
      table: { row: { cantSplit: true } },
      footer: false,
      pageNumber: false,
    })

    return new NextResponse(buffer as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${getCmpReportFilename(
          previewData.model.coverRows.find((row) => row.label === 'Event')?.value || previewData.model.title,
          previewData.model.coverRows.find((row) => row.label === 'Show dates')?.value || '',
          'docx',
          previewData.model.coverRows.find((row) => row.label === 'Venue')?.value || ''
        ).replace(/"/g, '\\"')}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    if (error instanceof CmpAccessError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    if (error instanceof CmpSetupRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    console.error('Error generating CMP DOCX:', error)
    return NextResponse.json(
      { error: 'Failed to generate CMP DOCX', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
