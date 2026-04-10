import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapHSAuditToFRAData } from '@/app/actions/fra-reports'

export const dynamic = 'force-dynamic'

/**
 * Load FRA placeholder photos from storage (fa-attachments) for this instance.
 * Path pattern: fra/{instanceId}/photos/{placeholderId}/{fileName}
 * Returns { [placeholderId]: [{ file_path, public_url }, ...] } so PDF/print view can show uploaded photos.
 */
async function loadPlaceholderPhotos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  instanceId: string,
  options?: { forPdf?: boolean }
): Promise<Record<string, { file_path: string; public_url: string; comment?: string }[]>> {
  const result: Record<string, { file_path: string; public_url: string; comment?: string }[]> = {}
  const prefix = `fra/${instanceId}/photos`
  const forPdf = options?.forPdf === true
  const transformWidth = forPdf ? 900 : 1600
  const transformHeight = forPdf ? 900 : 1600
  const transformQuality = forPdf ? 45 : 70
  const { data: placeholders, error: listError } = await supabase.storage
    .from('fa-attachments')
    .list(prefix, { limit: 50 })

  if (listError || !placeholders?.length) {
    return result
  }


  const { data: photoComments } = await supabase
    .from('fa_fra_photo_comments')
    .select('file_path, comment')
    .eq('audit_instance_id', instanceId)

  const commentByFilePath = new Map<string, string>()
  for (const item of photoComments || []) {
    const comment = typeof item.comment === 'string' ? item.comment.trim() : ''
    if (!comment) continue
    commentByFilePath.set(item.file_path, comment)
  }

  for (const item of placeholders) {
    const placeholderId = item.name
    if (!placeholderId || placeholderId.includes('/')) continue
    const folderPath = `${prefix}/${placeholderId}`
    const { data: files, error: filesError } = await supabase.storage
      .from('fa-attachments')
      .list(folderPath, { limit: 20 })

    if (filesError || !files?.length) continue

    const entries: { file_path: string; public_url: string; comment?: string }[] = []
    for (const f of files) {
      if (!f.name) continue
      const filePath = `${folderPath}/${f.name}`
      const { data: transformed, error: transformedError } = await supabase.storage
        .from('fa-attachments')
        .createSignedUrl(filePath, 120, {
          transform: {
            width: transformWidth,
            height: transformHeight,
            resize: 'contain',
            quality: transformQuality,
          },
        })

      // Fallback to original if image transforms are unavailable for this file/project.
      if (transformed?.signedUrl) {
        entries.push({
          file_path: filePath,
          public_url: transformed.signedUrl,
          comment: commentByFilePath.get(filePath) || '',
        })
        continue
      }

      if (transformedError) {
        console.warn('Signed URL transform fallback:', transformedError.message)
      }

      const { data: signed } = await supabase.storage
        .from('fa-attachments')
        .createSignedUrl(filePath, 120)
      entries.push({
        file_path: filePath,
        public_url: signed?.signedUrl ?? '',
        comment: commentByFilePath.get(filePath) || '',
      })
    }
    if (entries.length) {
      result[placeholderId] = entries
    }
  }

  return result
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const instanceId = searchParams.get('instanceId')
    const forPdf = searchParams.get('forPdf') === '1'

    if (!instanceId) {
      return NextResponse.json({ error: 'instanceId is required' }, { status: 400 })
    }

    // Map H&S audit data to FRA structure
    const fraData = await mapHSAuditToFRAData(instanceId)

    // Load uploaded placeholder photos from storage so they appear after refresh and in PDF
    const placeholderPhotos = await loadPlaceholderPhotos(supabase, instanceId, { forPdf })
    const dataWithPhotos = { ...fraData, placeholderPhotos }

    return NextResponse.json(dataWithPhotos)
  } catch (error: any) {
    console.error('Error generating FRA report:', error)
    return NextResponse.json(
      { error: 'Failed to generate FRA report', details: error.message },
      { status: 500 }
    )
  }
}
