import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { mapHSAuditToFRAData } from '@/app/actions/fra-reports'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const REPORT_PHOTO_MAX_EDGE = 700

async function compactImageForPdf(sourceUrl: string): Promise<string | null> {
  try {
    const response = await fetch(sourceUrl)
    if (!response.ok) return null
    const input = Buffer.from(await response.arrayBuffer())
    if (!input.length) return null
    // Keep readable detail in the report; archive the original separately.
    const output = await sharp(input).rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 85, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toBuffer()
    return `data:image/jpeg;base64,${output.toString('base64')}`
  } catch (error) {
    console.warn('FRA PDF photo compression skipped:', error)
    return null
  }
}

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
  type PlaceholderPhotoEntry = { file_path: string; public_url: string; comment: string }
  const result: Record<string, { file_path: string; public_url: string; comment?: string }[]> = {}
  const prefix = `fra/${instanceId}/photos`
  const forPdf = options?.forPdf === true
  let storageClient = supabase
  try {
    storageClient = createAdminSupabaseClient() as any
  } catch (adminError) {
    console.warn('view FRA photos: service role client unavailable, falling back to user client', adminError)
  }

  const { data: placeholders, error: listError } = await storageClient.storage
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

  const placeholderEntries = await Promise.all(
    placeholders.map(async (item) => {
      const placeholderId = item.name
      if (!placeholderId || placeholderId.includes('/')) return null

      const folderPath = `${prefix}/${placeholderId}`
      const { data: files, error: filesError } = await storageClient.storage
        .from('fa-attachments')
        .list(folderPath, { limit: 20 })

      if (filesError || !files?.length) return null

      const entries = await Promise.all(
        files.map(async (f) => {
          if (!f.name) return null

          const filePath = `${folderPath}/${f.name}`
          const { data: transformed, error: transformedError } = await storageClient.storage
            .from('fa-attachments')
            .createSignedUrl(filePath, 120, forPdf ? undefined : {
              transform: {
                width: REPORT_PHOTO_MAX_EDGE,
                height: REPORT_PHOTO_MAX_EDGE,
                resize: 'contain',
                quality: 62,
              },
            })

          // Fallback to original if image transforms are unavailable for this file/project.
          if (transformed?.signedUrl) {
            const pdfDataUrl = forPdf ? await compactImageForPdf(transformed.signedUrl) : null
            return {
              file_path: filePath,
              public_url: pdfDataUrl || transformed.signedUrl,
              comment: commentByFilePath.get(filePath) || '',
            }
          }

          if (transformedError) {
            console.warn('Signed URL transform fallback:', transformedError.message)
          }

          const { data: signed } = await storageClient.storage
            .from('fa-attachments')
            .createSignedUrl(filePath, 120)

          const signedUrl = signed?.signedUrl ?? ''
          const pdfDataUrl = forPdf && signedUrl ? await compactImageForPdf(signedUrl) : null

          return {
            file_path: filePath,
            public_url: pdfDataUrl || signedUrl,
            comment: commentByFilePath.get(filePath) || '',
          }
        })
      )

      const filteredEntries = entries.filter((entry): entry is PlaceholderPhotoEntry => entry !== null)

      if (!filteredEntries.length) return null

      return [placeholderId, filteredEntries] as const
    })
  )

  for (const entry of placeholderEntries) {
    if (!entry) continue
    result[entry[0]] = entry[1]
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

    // Map H&S audit data to FRA structure using this authenticated request.
    // Viewing an already-generated FRA should not fail because a nested write
    // permission lookup could not re-read the user's profile.
    const fraData = await mapHSAuditToFRAData(instanceId, { supabase, userId: user.id })

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
