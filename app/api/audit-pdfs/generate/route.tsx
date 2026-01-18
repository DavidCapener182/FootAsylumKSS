import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTemplate, getAuditInstance } from '@/app/actions/safehub'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { InspectionReportPDF } from '@/lib/pdf/inspection-report-document'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const instanceId = searchParams.get('instanceId')

    if (!instanceId) {
      return NextResponse.json({ error: 'instanceId is required' }, { status: 400 })
    }

    // Get audit instance with related data
    const instance = await getAuditInstance(instanceId)
    const template = await getTemplate(instance.template_id)

    // Calculate overall score
    const overallScore = instance.overall_score || 0

    // Create PDF
    const pdfDoc = (
      <InspectionReportPDF
        template={template}
        instance={instance}
        store={instance.fa_stores}
        responses={instance.responses || []}
        overallScore={Math.round(overallScore)}
      />
    )

    const pdfBuffer = await renderToBuffer(pdfDoc)

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="inspection-report-${instanceId.slice(-8)}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error.message },
      { status: 500 }
    )
  }
}
