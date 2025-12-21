import { exportActionsCSV } from '@/app/actions/reports'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const response = await exportActionsCSV()
    return response
  } catch (error) {
    console.error('Error exporting actions:', error)
    return new Response('Failed to export actions', { status: 500 })
  }
}

