import { NextResponse } from 'next/server'
import {
  isPermissionError,
  requirePermission,
  type PermissionContext,
} from '@/lib/permissions'

export async function requireReportAccess(): Promise<PermissionContext> {
  return requirePermission('exportReports')
}

export function reportPermissionErrorResponse(error: unknown): NextResponse | null {
  if (!isPermissionError(error)) return null

  return NextResponse.json(
    { error: error.message },
    { status: error.status }
  )
}
