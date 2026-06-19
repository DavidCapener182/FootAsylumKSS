import { NextResponse } from 'next/server'
import { previewEmpEventMasterDeploymentImport, previewEmpEventStaffingImport } from '@/lib/emp/event-day-data'
import { empEventDayJsonError } from '@/lib/emp/event-day-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function isMasterDeploymentWorkbook(file: File) {
  const name = file.name.toLowerCase()
  return name.endsWith('.xlsx') || name.endsWith('.xlsm') || file.type.includes('spreadsheet')
}

export async function POST(
  request: Request,
  { params }: { params: { planId: string } }
) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const mappingText = String(formData.get('mapping') || '').trim()
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Staffing file is required' }, { status: 400 })
    }
    if (isMasterDeploymentWorkbook(file)) {
      return NextResponse.json(await previewEmpEventMasterDeploymentImport({
        planId: params.planId,
        workbookBuffer: Buffer.from(await file.arrayBuffer()),
      }))
    }
    const mapping = mappingText ? JSON.parse(mappingText) : null
    return NextResponse.json(await previewEmpEventStaffingImport({
      planId: params.planId,
      csvText: await file.text(),
      mapping,
    }))
  } catch (error: any) {
    return empEventDayJsonError(error, 'Failed to preview staffing import')
  }
}
