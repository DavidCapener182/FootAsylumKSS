'use server'

import { revalidatePath } from 'next/cache'
import { saveLatestAuditPdf } from '@/lib/audit/save-latest-pdf'
import { importAuditPdfActions } from '@/lib/audit/import-pdf-actions'
import { requirePermission } from '@/lib/permissions'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

/**
 * Upload a PDF file for a compliance audit
 * @param storeId - The store ID
 * @param auditNumber - 1 or 2 for audit 1 or audit 2
 * @param file - The PDF file to upload
 * @returns The file path in storage
 */
export async function uploadAuditPDF(
  storeId: string,
  auditNumber: 1 | 2,
  file: File
) {
  const { supabase, userId } = await requirePermission('manageAudits')
  const adminSupabase = createAdminSupabaseClient()

  const { filePath, cleanupWarning } = await saveLatestAuditPdf({
    supabase, storageClient: adminSupabase, storeId, auditNumber, file,
  })

  const result = await importAuditPdfActions({supabase,userId,storeId,auditNumber,filePath,file})
  revalidatePath('/audit-tracker')
  revalidatePath('/actions')
  revalidatePath(`/stores/${storeId}`)
  if (cleanupWarning) throw new Error(cleanupWarning)
  if (result.warning) throw new Error(`PDF saved. Action import needs review: ${result.warning}`)
  return filePath
}

/**
 * Get a signed URL for downloading an audit PDF
 * @param filePath - The file path in storage
 * @returns The signed URL (valid for 1 hour)
 */
export async function getAuditPDFDownloadUrl(filePath: string | null) {
  if (!filePath) {
    return null
  }

  await requirePermission('viewEvidence')
  const adminSupabase = createAdminSupabaseClient()

  const { data, error } = await adminSupabase.storage
    .from('fa-attachments')
    .createSignedUrl(filePath, 3600) // 1 hour expiry

  if (error || !data) {
    throw new Error('Failed to generate download URL')
  }

  return data.signedUrl
}

/**
 * Delete an audit PDF file
 * @param storeId - The store ID
 * @param auditNumber - 1 or 2 for audit 1 or audit 2
 * @returns Success status
 */
export async function deleteAuditPDF(
  storeId: string,
  auditNumber: 1 | 2
) {
  const { supabase } = await requirePermission('manageAudits')
  const adminSupabase = createAdminSupabaseClient()

  // Get current PDF path
  const pdfColumn = auditNumber === 1 
    ? 'compliance_audit_1_pdf_path' 
    : 'compliance_audit_2_pdf_path'

  const { data: store, error: fetchError } = await supabase
    .from('fa_stores')
    .select(pdfColumn)
    .eq('id', storeId)
    .single()

  if (fetchError || !store) {
    throw new Error('Store not found')
  }

  const pdfPath = store[pdfColumn as keyof typeof store] as string | null

  if (!pdfPath) {
    throw new Error('No PDF found to delete')
  }

  // Delete from storage
  const { error: deleteError } = await adminSupabase.storage
    .from('fa-attachments')
    .remove([pdfPath])

  if (deleteError) {
    throw new Error(`Failed to delete PDF from storage: ${deleteError.message}`)
  }

  // Update store record to remove PDF path
  const { error: updateError } = await supabase
    .from('fa_stores')
    .update({ [pdfColumn]: null })
    .eq('id', storeId)

  if (updateError) {
    throw new Error(`Failed to update store record: ${updateError.message}`)
  }

  return { success: true }
}
