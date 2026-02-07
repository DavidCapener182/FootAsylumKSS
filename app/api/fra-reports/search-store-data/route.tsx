import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOpeningHoursFromSearch } from '@/lib/fra/opening-hours-search'

export const dynamic = 'force-dynamic'

/**
 * Search for store build date and opening times using web search (ChatGPT).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { storeName, address, city } = await request.json()

    if (!storeName || !address) {
      return NextResponse.json({ error: 'storeName and address are required' }, { status: 400 })
    }

    const openingTimes = await getOpeningHoursFromSearch({ storeName, address, city })

    // Search for build date (keep existing logic)
    let buildDate: string | null = null
    // TODO: Implement build date search if needed

    return NextResponse.json({
      buildDate,
      openingTimes,
      message: openingTimes 
        ? 'Opening hours found via web search' 
        : 'Opening hours not found. Please add manually or configure a search API (SerpAPI or Google Custom Search).'
    })
  } catch (error: any) {
    console.error('Error searching store data:', error)
    return NextResponse.json(
      { error: 'Failed to search store data', details: error.message },
      { status: 500 }
    )
  }
}
