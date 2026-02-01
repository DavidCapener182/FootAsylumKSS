import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

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

    if (!instanceId || !placeholderId || !files || files.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Limit to 6 photos per placeholder (site-premises-photos has 6 slots; others use 5)
    const maxFiles = placeholderId === 'site-premises-photos' ? 6 : 5
    if (files.length > maxFiles) {
      return NextResponse.json({ error: `Maximum ${maxFiles} photos per placeholder` }, { status: 400 })
    }

    const uploadedFiles: any[] = []

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
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
      const filePath = `fra/${instanceId}/photos/${placeholderId}/${fileName}`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('fa-attachments')
        .upload(filePath, file, {
          contentType: file.type,
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
        file_type: file.type,
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
