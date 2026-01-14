'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Upload a PDF file for a Fire Risk Assessment
 * @param storeId - The store ID
 * @param file - The PDF file to upload
 * @returns The file path in storage
 */
export async function uploadFRAPDF(
  storeId: string,
  file: File
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Validate file type
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Only PDF files are allowed')
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    throw new Error('File size must be less than 10MB')
  }

  const fileExt = 'pdf'
  const timestamp = Date.now()
  const fileName = `fra-${timestamp}.${fileExt}`
  const filePath = `store/${storeId}/${fileName}`

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('fa-attachments')
    .upload(filePath, file, {
      contentType: 'application/pdf',
      upsert: false // Don't overwrite existing files
    })

  if (uploadError) {
    throw new Error(`Failed to upload file: ${uploadError.message}`)
  }

  // Update the store record with the PDF path
  const { error: updateError } = await supabase
    .from('fa_stores')
    .update({ fire_risk_assessment_pdf_path: filePath })
    .eq('id', storeId)

  if (updateError) {
    // Clean up uploaded file if DB update fails
    await supabase.storage.from('fa-attachments').remove([filePath])
    throw new Error(`Failed to update store record: ${updateError.message}`)
  }

  return filePath
}

/**
 * Get a signed URL for downloading an FRA PDF
 * @param filePath - The file path in storage
 * @returns The signed URL (valid for 1 hour)
 */
export async function getFRAPDFDownloadUrl(filePath: string | null) {
  if (!filePath) {
    return null
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase.storage
    .from('fa-attachments')
    .createSignedUrl(filePath, 3600) // 1 hour expiry

  if (error || !data) {
    throw new Error('Failed to generate download URL')
  }

  return data.signedUrl
}
