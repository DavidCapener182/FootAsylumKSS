import { NextRequest, NextResponse } from 'next/server'
import HTMLtoDOCX from 'html-to-docx'
import { EmpAccessError } from '@/lib/emp/access'
import { EmpSetupRequiredError, getEmpPreviewData } from '@/lib/emp/data'
import { renderEmpPreviewHtml } from '@/lib/emp/preview'
import { getEmpReportFilename } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const planId = String(request.nextUrl.searchParams.get('planId') || '').trim()

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }

    const previewData = await getEmpPreviewData(planId)
    const html = renderEmpPreviewHtml(previewData.model)
    const filename = /Bar Security Operations Plan/i.test(previewData.model.title)
      ? `${previewData.model.title}.docx`
      : getEmpReportFilename(
          previewData.model.coverRows.find((row) => row.label === 'Event')?.value || previewData.model.title,
          previewData.model.coverRows.find((row) => row.label === 'Show dates')?.value || '',
          'docx',
          previewData.model.coverRows.find((row) => row.label === 'Venue')?.value || ''
        )
    const buffer = await HTMLtoDOCX(html, undefined, {
      table: { row: { cantSplit: true } },
      footer: false,
      pageNumber: false,
    })

    return new NextResponse(buffer as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '\\"')}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    if (error instanceof EmpAccessError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    if (error instanceof EmpSetupRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    console.error('Error generating EMP DOCX:', error)
    return NextResponse.json(
      { error: 'Failed to generate EMP DOCX', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
