'use client'

import { createClient } from '@/lib/supabase/client'
import { Upload } from 'tus-js-client'

const MAX_FRA_PDF_SIZE_BYTES = 50 * 1024 * 1024
const TUS_CHUNK_SIZE_BYTES = 6 * 1024 * 1024

export async function uploadFraPdfFromClient(storeId: string, file: File): Promise<string> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Only PDF files are allowed')
  }

  if (file.size > MAX_FRA_PDF_SIZE_BYTES) {
    throw new Error('File size must be less than 50MB on the current Supabase plan')
  }

  const supabase = createClient()
  const filePath = `store/${storeId}/fra-${Date.now()}.pdf`
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing Supabase client configuration')
  }

  const parsedSupabaseUrl = new URL(supabaseUrl)
  const projectId = parsedSupabaseUrl.hostname.split('.')[0]
  const resumableEndpoint = `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`

  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token

  if (!accessToken) {
    throw new Error('You must be signed in to upload files')
  }

  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: resumableEndpoint,
      chunkSize: TUS_CHUNK_SIZE_BYTES,
      retryDelays: [0, 1000, 3000, 5000],
      uploadDataDuringCreation: true,
      metadata: {
        bucketName: 'fa-attachments',
        objectName: filePath,
        contentType: 'application/pdf',
        cacheControl: '3600',
      },
      headers: {
        authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
        'x-upsert': 'false',
      },
      removeFingerprintOnSuccess: true,
      onError: (error) => reject(error),
      onSuccess: () => resolve(),
    })

    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length > 0) {
        upload.resumeFromPreviousUpload(previousUploads[0]!)
      }
      upload.start()
    }).catch((error) => reject(error))
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown upload error'
    throw new Error(`Failed to upload file: ${message}`)
  })

  const { error: updateError } = await supabase
    .from('fa_stores')
    .update({ fire_risk_assessment_pdf_path: filePath })
    .eq('id', storeId)

  if (updateError) {
    await supabase.storage.from('fa-attachments').remove([filePath])
    throw new Error(`Failed to update store record: ${updateError.message}`)
  }

  return filePath
}
