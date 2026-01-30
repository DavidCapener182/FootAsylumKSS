import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapHSAuditToFRAData } from '@/app/actions/fra-reports'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const instanceId = searchParams.get('instanceId')

    if (!instanceId) {
      return NextResponse.json({ error: 'instanceId is required' }, { status: 400 })
    }

    // Map H&S audit data to FRA structure
    const fraData = await mapHSAuditToFRAData(instanceId)

    // Return JSON data - the page component will render it
    return NextResponse.json(fraData)
  } catch (error: any) {
    console.error('Error generating FRA report:', error)
    return NextResponse.json(
      { error: 'Failed to generate FRA report', details: error.message },
      { status: 500 }
    )
  }
}
