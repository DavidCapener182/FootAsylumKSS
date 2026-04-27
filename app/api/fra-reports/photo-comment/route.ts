import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { supabase, userId } = await requirePermission('manageFRA')

    const body = await request.json().catch(() => ({}))
    const instanceId = String(body.instanceId || '')
    const placeholderId = String(body.placeholderId || '')
    const filePath = String(body.filePath || '')
    const comment = String(body.comment || '').trim()

    if (!instanceId || !placeholderId || !filePath) {
      return NextResponse.json({ error: 'instanceId, placeholderId and filePath are required' }, { status: 400 })
    }

    const expectedPrefix = `fra/${instanceId}/photos/${placeholderId}/`
    if (!filePath.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: 'Invalid file path for this instance/placeholder' }, { status: 400 })
    }

    if (!comment) {
      await supabase
        .from('fa_fra_photo_comments')
        .delete()
        .eq('audit_instance_id', instanceId)
        .eq('file_path', filePath)

      return NextResponse.json({ success: true, comment: '' })
    }

    const { error } = await supabase
      .from('fa_fra_photo_comments')
      .upsert(
        {
          audit_instance_id: instanceId,
          placeholder_id: placeholderId,
          file_path: filePath,
          comment,
          created_by: userId,
        },
        { onConflict: 'audit_instance_id,file_path' }
      )

    if (error) {
      return NextResponse.json({ error: `Failed to save comment: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, comment })
  } catch (error: any) {
    console.error('Error saving photo comment:', error)
    return NextResponse.json(
      { error: 'Failed to save photo comment', details: error.message },
      { status: 500 }
    )
  }
}
