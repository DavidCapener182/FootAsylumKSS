import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    const { data: existingFiles, error: listError } = await supabase.storage
      .from('fa-attachments')
      .list(placeholderPath, { limit: 200 })

    if (listError) {
      return NextResponse.json({ error: `Failed to inspect existing photos: ${listError.message}` }, { status: 500 })
    }

    const existingFilePaths = (existingFiles || [])
      .filter((entry) => !!entry.name)
      .map((entry) => `${placeholderPath}/${entry.name}`)

    if (!replace && existingFilePaths.length + files.length > maxFiles) {
      return NextResponse.json(
        {
          error: `This section allows up to ${maxFiles} photos. Remove some photos or use "Change photos".`,
        },
        { status: 400 }
      )
    }

    if (replace && existingFilePaths.length > 0) {
      const { error: removeError } = await supabase.storage
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

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('fa-attachments')
        .upload(filePath, file, {
          contentType: detectedType,
          upsert: false
        })

      if (uploadError) {
        return NextResponse.json({ error: `Failed to upload file: ${uploadError.message}` }, { status: 500 })
      }

      // Use signed URL so the image displays immediately (bucket may be private)
      const { data: signed } = await supabase.storage
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
    console.error('Error uploading photos:', error)
    return NextResponse.json(
      { error: 'Failed to upload photos', details: error.message },
      { status: 500 }
    )
  }
}
