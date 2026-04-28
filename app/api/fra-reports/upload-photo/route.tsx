import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function inferImageMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'heic') return 'image/heic'
  if (ext === 'heif') return 'image/heif'
  if (ext === 'avif') return 'image/avif'
  if (ext === 'bmp') return 'image/bmp'
  if (ext === 'tif' || ext === 'tiff') return 'image/tiff'
  if (ext === 'jfif') return 'image/jpeg'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'svg') return 'image/svg+xml'
  return ''
}

function resolveUploadMimeType(file: File): string {
  const inferred = inferImageMimeType(file.name)
  const declared = String(file.type || '').toLowerCase()
  if (!declared || declared === 'application/octet-stream') return inferred
  return declared
}

function parseExistingFilePaths(value: FormDataEntryValue | null, expectedPrefix: string): string[] | null {
  if (typeof value !== 'string' || !value.trim()) return null

  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return null

    return parsed
      .map((item) => String(item || '').trim())
      .filter((item) => item.startsWith(expectedPrefix) && !item.endsWith('/'))
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  let step = 'authorizing upload'
  try {
    step = 'checking FRA permissions'
    const { supabase } = await requirePermission('manageFRA')
    let storageClient = supabase
    try {
      step = 'creating storage admin client'
      storageClient = createAdminSupabaseClient() as any
    } catch (adminError) {
      console.warn('upload-photo: service role client unavailable, falling back to user client', adminError)
    }

    step = 'reading upload form data'
    const formData = await request.formData()
    const instanceId = formData.get('instanceId') as string
    const placeholderId = formData.get('placeholderId') as string
    const files = formData.getAll('files') as File[]
    const replace = String(formData.get('replace') ?? '').toLowerCase() === 'true'

    if (!instanceId || !placeholderId || !files || files.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Limit photos per placeholder (6 for site-premises-photos, additional-site-pictures, manual-call-points, intumescent-strips; others: 5)
    const maxFiles = (placeholderId === 'site-premises-photos' || placeholderId === 'additional-site-pictures' || placeholderId === 'manual-call-points' || placeholderId === 'intumescent-strips') ? 6 : 5
    if (files.length > maxFiles) {
      return NextResponse.json({ error: `Maximum ${maxFiles} photos per placeholder` }, { status: 400 })
    }

    const placeholderPath = `fra/${instanceId}/photos/${placeholderId}`
    const expectedPrefix = `${placeholderPath}/`
    let existingFilePaths = parseExistingFilePaths(formData.get('existingFilePaths'), expectedPrefix)

    if (existingFilePaths === null) {
      step = 'inspecting existing FRA photos'
      const { data: existingFiles, error: listError } = await storageClient.storage
        .from('fa-attachments')
        .list(placeholderPath, { limit: 200 })

      if (listError) {
        console.warn('Failed to inspect existing FRA photos before upload:', listError.message)
        existingFilePaths = []
      } else {
        existingFilePaths = (existingFiles || [])
          .filter((entry) => !!entry.name)
          .map((entry) => `${placeholderPath}/${entry.name}`)
      }
    }

    if (!replace && existingFilePaths.length + files.length > maxFiles) {
      return NextResponse.json(
        {
          error: `This section allows up to ${maxFiles} photos. Remove some photos or use "Change photos".`,
        },
        { status: 400 }
      )
    }

    if (replace && existingFilePaths.length > 0) {
      step = 'removing existing FRA photos'
      const { error: removeError } = await storageClient.storage
        .from('fa-attachments')
        .remove(existingFilePaths)

      if (removeError) {
        return NextResponse.json({ error: `Failed to replace existing photos: ${removeError.message}` }, { status: 500 })
      }
    }

    const uploadedFiles: any[] = []

    for (const file of files) {
      const detectedType = resolveUploadMimeType(file)

      // Validate file type
      if (!detectedType.startsWith('image/')) {
        return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
      }

      // Validate file size (max 25MB for high-res site/premises photos)
      const maxSize = 25 * 1024 * 1024 // 25MB
      if (file.size > maxSize) {
        return NextResponse.json({ error: 'File size must be less than 25MB' }, { status: 400 })
      }

      const fileExt = file.name.split('.').pop()
      const timestamp = Date.now()
      const fileName = `fra-${instanceId}-${placeholderId}-${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${placeholderPath}/${fileName}`
      step = `buffering ${file.name || 'photo'}`
      const fileBuffer = Buffer.from(await file.arrayBuffer())

      // Upload to storage
      step = `uploading ${fileName}`
      const { error: uploadError } = await storageClient.storage
        .from('fa-attachments')
        .upload(filePath, fileBuffer, {
          contentType: detectedType,
          upsert: false
        })

      if (uploadError) {
        console.error('FRA photo upload failed:', uploadError)
        return NextResponse.json({ error: `Failed to upload file: ${uploadError.message}` }, { status: 500 })
      }

      // Use signed URL so the image displays immediately (bucket may be private)
      step = `signing ${fileName}`
      const { data: signed } = await storageClient.storage
        .from('fa-attachments')
        .createSignedUrl(filePath, 60 * 60 * 24) // 24 hours

      uploadedFiles.push({
        file_path: filePath,
        file_name: file.name,
        file_type: detectedType,
        file_size: file.size,
        public_url: signed?.signedUrl ?? ''
      })
    }

    return NextResponse.json({ files: uploadedFiles })
  } catch (error: any) {
    console.error(`Error uploading photos while ${step}:`, error)
    return NextResponse.json(
      { error: 'Failed to upload photos', details: `${step}: ${error.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
}
