import { exportActionsCSV } from '@/app/actions/reports'
import { NextRequest } from 'next/server'

// Force dynamic rendering for authenticated route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const response = await exportActionsCSV()
    return response
  } catch (error) {
    console.error('Error exporting actions:', error)
    return new Response('Failed to export actions', { status: 500 })
  }
}

