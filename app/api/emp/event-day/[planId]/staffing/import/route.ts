import { NextResponse } from 'next/server'
import { commitEmpEventMasterDeploymentImport, commitEmpEventStaffingImport } from '@/lib/emp/event-day-data'
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
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Staffing file is required' }, { status: 400 })
    }

    const mappingText = String(formData.get('mapping') || '')
    const mode = String(formData.get('mode') || 'add')
    if (isMasterDeploymentWorkbook(file)) {
      return NextResponse.json(await commitEmpEventMasterDeploymentImport({
        planId: params.planId,
        workbookBuffer: Buffer.from(await file.arrayBuffer()),
        mode: mode === 'replace_unstarted' ? mode : 'add',
        fileMetadata: {
          fileName: file.name,
          fileType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          fileSize: file.size,
        },
      }))
    }

    const mapping = JSON.parse(mappingText || '{}')
    return NextResponse.json(await commitEmpEventStaffingImport({
      planId: params.planId,
      csvText: await file.text(),
      mapping,
      mode: mode === 'replace_unstarted' ? mode : 'add',
      fileMetadata: {
        fileName: file.name,
        fileType: file.type || 'text/csv',
        fileSize: file.size,
      },
    }))
  } catch (error: any) {
    return empEventDayJsonError(error, 'Failed to import staffing list')
  }
}
