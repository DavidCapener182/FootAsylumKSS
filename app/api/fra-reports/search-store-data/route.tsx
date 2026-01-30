import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Search for store build date and opening times using web search
 * This is a placeholder - in production, you'd use a web search API like SerpAPI, Google Custom Search, etc.
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

    // Search for opening hours using OpenAI (ChatGPT)
    let openingTimes: string | null = null
    
    try {
      const openaiApiKey = process.env.OPENAI_API_KEY
      
      if (openaiApiKey) {
        const searchQuery = `${storeName} ${city} ${address ? address : ''} opening hours`.trim()
        console.log('[SEARCH] Using ChatGPT to find opening hours for:', searchQuery)
        
        const prompt = `Find the opening hours/trading hours for this retail store. Return ONLY the opening hours in a clear, concise format (e.g., "Monday-Saturday: 9am-6pm, Sunday: 10am-4pm" or "Mon-Fri: 9am-6pm, Sat: 9am-5pm, Sun: 11am-4pm"). If you cannot find the opening hours, return "NOT_FOUND".

Store: ${storeName}
Location: ${city}${address ? `, ${address}` : ''}

Return ONLY the opening hours format, nothing else.`

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini', // Using cheaper model for simple lookups
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant that finds store opening hours. Return only the opening hours in a clear format, or "NOT_FOUND" if unavailable.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 150,
            temperature: 0.3 // Lower temperature for more factual responses
          })
        })

        if (response.ok) {
          const data = await response.json()
          const content = data.choices?.[0]?.message?.content?.trim() || ''
          
          if (content && content !== 'NOT_FOUND' && !content.toLowerCase().includes('cannot find') && !content.toLowerCase().includes('unable to find')) {
            openingTimes = content
            console.log('[SEARCH] ✓ Found opening hours via ChatGPT:', openingTimes)
          } else {
            console.log('[SEARCH] ChatGPT could not find opening hours')
          }
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.error('[SEARCH] OpenAI API error:', errorData)
        }
      } else {
        console.log('[SEARCH] OpenAI API key not configured - opening hours will need manual entry')
      }
    } catch (searchError) {
      console.error('[SEARCH] Error searching for opening hours:', searchError)
    }

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
