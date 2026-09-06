import { saveLatestAuditPdf } from '@/lib/audit/save-latest-pdf'
import { importAuditPdfActions } from '@/lib/audit/import-pdf-actions'
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export const maxDuration = 60

const MAX_AUDIT_PDF_SIZE_BYTES = 500 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const { supabase, userId } = await requirePermission('manageAudits')
    const adminSupabase = createAdminSupabaseClient()

    const formData = await request.formData()
    const storeId = formData.get('storeId') as string
    const auditNumber = parseInt(formData.get('auditNumber') as string) as 1 | 2
    const file = formData.get('file') as File

    if (!storeId || ![1,2].includes(auditNumber) || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate file type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
    }

    if (file.size > MAX_AUDIT_PDF_SIZE_BYTES) {
      return NextResponse.json({ error: 'File size must be less than 500MB' }, { status: 400 })
    }

    const { filePath, paths, cleanupWarning } = await saveLatestAuditPdf({
      supabase, storageClient: adminSupabase, storeId, auditNumber, file,
    })

    const actionImport = await importAuditPdfActions({supabase,userId,storeId,auditNumber,filePath,file})
    revalidatePath('/actions')
    revalidatePath('/audit-tracker')
    revalidatePath(`/stores/${storeId}`)
    return NextResponse.json({ success: true, filePath, paths, cleanupWarning, actionImport })
  } catch (error) {
    console.error('Error uploading audit PDF:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload PDF' },
      { status: 500 }
    )
  }
}
