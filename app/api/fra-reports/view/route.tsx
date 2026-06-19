import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { mapHSAuditToFRAData } from '@/app/actions/fra-reports'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PDF_PHOTO_MAX_EDGE = 520
const PDF_PHOTO_JPEG_QUALITY = 45
const REPORT_PHOTO_MAX_EDGE = 700

type CanvasModule = {
  createCanvas: (width: number, height: number) => {
    getContext: (contextType: '2d') => {
      fillStyle: string
      fillRect: (x: number, y: number, width: number, height: number) => void
      drawImage: (image: unknown, x: number, y: number, width: number, height: number) => void
    }
    toBuffer: (mime: 'image/jpeg', quality?: number) => Buffer
  }
  loadImage: (input: Buffer) => Promise<{ width: number; height: number }>
}

let canvasModule: CanvasModule | null = null

function getCanvasModule(): CanvasModule {
  if (canvasModule) return canvasModule
  // Keep this native optional dependency out of Next's server bundle graph.
  const runtimeRequire = new Function('moduleName', 'return require(moduleName)') as (moduleName: string) => CanvasModule
  canvasModule = runtimeRequire('@napi-rs/canvas')
  return canvasModule
}

async function compactImageForPdf(sourceUrl: string): Promise<string | null> {
  try {
    const response = await fetch(sourceUrl)
    if (!response.ok) {
      console.warn('FRA PDF photo compression skipped; image fetch failed:', response.status)
      return null
    }

    const input = Buffer.from(await response.arrayBuffer())
    if (!input.length) return null

    const { createCanvas, loadImage } = getCanvasModule()
    const image = await loadImage(input)
    const sourceWidth = image.width || 0
    const sourceHeight = image.height || 0
    if (sourceWidth <= 0 || sourceHeight <= 0) return null

    const scale = Math.min(1, PDF_PHOTO_MAX_EDGE / Math.max(sourceWidth, sourceHeight))
    const width = Math.max(1, Math.round(sourceWidth * scale))
    const height = Math.max(1, Math.round(sourceHeight * scale))
    const canvas = createCanvas(width, height)
    const context = canvas.getContext('2d')
    context.fillStyle = '#f8fafc'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)

    const output = canvas.toBuffer('image/jpeg', PDF_PHOTO_JPEG_QUALITY)
    if (!output.length) return null

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
  const transformWidth = forPdf ? PDF_PHOTO_MAX_EDGE : REPORT_PHOTO_MAX_EDGE
  const transformHeight = forPdf ? PDF_PHOTO_MAX_EDGE : REPORT_PHOTO_MAX_EDGE
  const transformQuality = forPdf ? PDF_PHOTO_JPEG_QUALITY : 62
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
