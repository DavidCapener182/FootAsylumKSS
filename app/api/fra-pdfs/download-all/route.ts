import JSZip from 'jszip'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  appendNumericSuffixToFileName,
  buildFraBulkArchiveName,
  buildFraPdfFileName,
} from '@/lib/fra/download-filenames'
import type { Database } from '@/types/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface BulkFraDownloadRequestBody {
  storeIds?: unknown
}

type FraStoreRow = Pick<
  Database['public']['Tables']['fa_stores']['Row'],
  'id' | 'store_code' | 'store_name' | 'fire_risk_assessment_date' | 'fire_risk_assessment_pdf_path'
>

function parseStoreIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function getUniqueFileName(fileName: string, usedNames: Map<string, number>): string {
  const count = usedNames.get(fileName) ?? 0
  usedNames.set(fileName, count + 1)

  if (count === 0) {
    return fileName
  }

  return appendNumericSuffixToFileName(fileName, count + 1)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = ((await request.json().catch(() => ({}))) || {}) as BulkFraDownloadRequestBody
    const requestedStoreIds = Array.from(new Set(parseStoreIds(body.storeIds)))

    if (requestedStoreIds.length === 0) {
      return NextResponse.json({ error: 'No FRA stores were selected for download.' }, { status: 400 })
    }

    const { data: stores, error: storesError } = await supabase
      .from('fa_stores')
      .select('id, store_code, store_name, fire_risk_assessment_date, fire_risk_assessment_pdf_path')
      .in('id', requestedStoreIds)

    if (storesError) {
      console.error('Failed to fetch FRA stores for bulk download:', storesError)
      return NextResponse.json({ error: 'Failed to load FRA files.' }, { status: 500 })
    }

    const storeMap = new Map(((stores || []) as FraStoreRow[]).map((store) => [store.id, store]))
    const orderedStores = requestedStoreIds
      .map((storeId) => storeMap.get(storeId))
      .filter((store): store is FraStoreRow => Boolean(store))

    const zip = new JSZip()
    const usedNames = new Map<string, number>()
    let skippedCount = requestedStoreIds.length - orderedStores.length
    let includedCount = 0

    for (const store of orderedStores) {
      const filePath = store.fire_risk_assessment_pdf_path

      if (!filePath) {
        skippedCount += 1
        continue
      }

      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from('fa-attachments')
        .download(filePath)

      if (downloadError || !fileBlob) {
        console.error('Failed to download FRA file for archive:', store.id, downloadError)
        skippedCount += 1
        continue
      }

      const fileName = getUniqueFileName(
        buildFraPdfFileName({
          storeCode: store.store_code,
          storeName: store.store_name,
          fraDate: store.fire_risk_assessment_date,
        }),
        usedNames
      )

      zip.file(fileName, await fileBlob.arrayBuffer())
      includedCount += 1
    }

    if (includedCount === 0) {
      return NextResponse.json({ error: 'No FRA PDFs were available to download.' }, { status: 404 })
    }

    const archiveName = buildFraBulkArchiveName()
    const archiveBuffer = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    })
    const archiveArrayBuffer = new ArrayBuffer(archiveBuffer.byteLength)
    new Uint8Array(archiveArrayBuffer).set(archiveBuffer)
    const archiveBlob = new Blob([archiveArrayBuffer], { type: 'application/zip' })

    return new NextResponse(archiveBlob, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${archiveName}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
        'X-FRA-Files-Count': `${includedCount}`,
        'X-FRA-Skipped-Count': `${skippedCount}`,
      },
    })
  } catch (error) {
    console.error('Failed to build FRA download archive:', error)
    return NextResponse.json({ error: 'Failed to prepare FRA download archive.' }, { status: 500 })
  }
}
