import { NextResponse } from 'next/server'
import { isPermissionError, requirePermission } from '@/lib/permissions'

/** Guard raw FRA assessment APIs before reading caller-selected store or instance IDs. */
export async function fraAuthorDenialResponse(): Promise<NextResponse | null> {
  try {
    await requirePermission('manageFRA')
    return null
  } catch (error) {
    if (isPermissionError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: error.status })
    }
    throw error
  }
}
