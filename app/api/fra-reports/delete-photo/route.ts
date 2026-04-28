import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * Delete a single FRA placeholder photo from storage.
 * Body: { instanceId: string, filePath: string }
 * filePath must be under fra/{instanceId}/photos/
 */
export async function POST(request: NextRequest) {
  let step = 'authorizing delete'
  try {
    step = 'checking FRA permissions'
    const { supabase } = await requirePermission('manageFRA')
    let storageClient = supabase
    try {
      step = 'creating storage admin client'
      storageClient = createAdminSupabaseClient() as any
    } catch (adminError) {
      console.warn('delete-photo: service role client unavailable, falling back to user client', adminError)
    }

    step = 'reading delete request'
    const body = await request.json().catch(() => ({}))
    const instanceId = body.instanceId as string
    const filePath = body.filePath as string

    if (!instanceId || !filePath || typeof filePath !== 'string') {
      return NextResponse.json({ error: 'instanceId and filePath are required' }, { status: 400 })
    }

    const expectedPrefix = `fra/${instanceId}/photos/`
    if (!filePath.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: 'Invalid file path for this instance' }, { status: 400 })
    }

    step = `removing ${filePath}`
    const { error } = await storageClient.storage
      .from('fa-attachments')
      .remove([filePath])

    if (error) {
      console.error('Error deleting photo:', error)
      return NextResponse.json(
        { error: 'Failed to delete photo', details: `${step}: ${error.message}` },
        { status: 500 }
      )
    }

    step = 'removing photo comment'
    await supabase
      .from('fa_fra_photo_comments')
      .delete()
      .eq('audit_instance_id', instanceId)
      .eq('file_path', filePath)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error(`Error in delete-photo while ${step}:`, error)
    return NextResponse.json(
      { error: 'Failed to delete photo', details: `${step}: ${error.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
}
