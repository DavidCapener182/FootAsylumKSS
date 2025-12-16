import { getAttachmentDownloadUrl } from '@/app/actions/attachments'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const url = await getAttachmentDownloadUrl(params.id)
    return NextResponse.redirect(url)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get download URL' },
      { status: 500 }
    )
  }
}

