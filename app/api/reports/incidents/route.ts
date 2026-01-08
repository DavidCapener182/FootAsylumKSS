import { exportIncidentsCSV } from '@/app/actions/reports'
import { NextRequest } from 'next/server'

// Force dynamic rendering for authenticated route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const response = await exportIncidentsCSV()
    return response
  } catch (error) {
    console.error('Error exporting incidents:', error)
    return new Response('Failed to export incidents', { status: 500 })
  }
}

