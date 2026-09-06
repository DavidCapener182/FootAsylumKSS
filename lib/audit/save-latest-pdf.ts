import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

const PDF_COLUMNS = ['compliance_audit_1_pdf_path', 'compliance_audit_2_pdf_path'] as const
const MAX_PDF_BYTES = 500 * 1024 * 1024

/** Link the replacement before removing superseded files; keep audit history. */
export async function saveLatestAuditPdf({ supabase, storageClient, storeId, auditNumber, file }: {
  supabase: SupabaseClient
  storageClient: SupabaseClient
  storeId: string
  auditNumber: 1 | 2
  file: File
}) {
  if (!storeId || ![1, 2].includes(auditNumber) || !(file instanceof File)) {
    throw new Error('Missing required fields')
  }
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Only PDF files are allowed')
  }
  if (file.size > MAX_PDF_BYTES) throw new Error('File size must be less than 500MB')
  if (await file.slice(0, 5).text() !== '%PDF-') throw new Error('The file is not a valid PDF')

  const { data: previous, error: readError } = await supabase.from('fa_stores')
    .select('compliance_audit_1_pdf_path,compliance_audit_2_pdf_path').eq('id', storeId).single()
  if (readError || !previous) throw new Error('Store not found or access denied')
  if (auditNumber === 1 && previous.compliance_audit_2_pdf_path) {
    throw new Error('This store already has an Audit 2 PDF. Replace Audit 2 to keep the latest report.')
  }

  const filePath = `store/${storeId}/audit-${auditNumber}-${randomUUID()}.pdf`
  const bucket = storageClient.storage.from('fa-attachments')
  const { error: uploadError } = await bucket.upload(filePath, file, {
    contentType: 'application/pdf', upsert: false,
  })
  if (uploadError) throw new Error(`Failed to upload file: ${uploadError.message}`)

  const paths = {
    compliance_audit_1_pdf_path: auditNumber === 1 ? filePath : null,
    compliance_audit_2_pdf_path: auditNumber === 2 ? filePath : null,
  }
  // Compare both paths so concurrent uploads cannot discard each other's files.
  // Use the authenticated client for RLS and attribution in the activity log.
  let update = supabase.from('fa_stores').update(paths).eq('id', storeId)
  for (const column of PDF_COLUMNS) {
    update = previous[column] == null ? update.is(column, null) : update.eq(column, previous[column])
  }
  const { data: saved, error: updateError } = await update.select('id').single()
  if (updateError || !saved) {
    const { error: rollbackError } = await bucket.remove([filePath])
    throw new Error(`Failed to update store record: ${updateError?.message || 'The PDF changed during upload; please retry.'}${rollbackError ? ' The unused upload could not be removed; storage cleanup needs review.' : ''}`)
  }

  const oldPaths = [...new Set(PDF_COLUMNS.map(column => previous[column] as string | null))]
    .filter((path): path is string => !!path && path !== filePath)
  // Legacy FRA folders may also back a report-builder attachment. Never delete
  // those source files automatically; all new audit uploads use store/.../audit-.
  const removable = oldPaths.filter(path => path.startsWith(`store/${storeId}/audit-`) && path.endsWith('.pdf'))
  let cleanupWarning: string | null = oldPaths.length > removable.length
    ? 'The latest PDF is saved. A legacy source PDF needs a reference check before removal.' : null
  if (removable.length) {
    try {
      const { error } = await bucket.remove(removable)
      if (error) cleanupWarning = 'The latest PDF is saved, but the previous PDF could not be removed. Storage cleanup needs review.'
    } catch {
      cleanupWarning = 'The latest PDF is saved, but the previous PDF could not be removed. Storage cleanup needs review.'
    }
  }
  return { filePath, paths, cleanupWarning }
}
