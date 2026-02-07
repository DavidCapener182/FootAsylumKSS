/**
 * Search for store opening/trading hours using OpenAI (ChatGPT).
 * Used by the search-store-data API and by mapHSAuditToFRAData when building FRA data.
 */
export async function getOpeningHoursFromSearch(params: {
  storeName: string
  address?: string | null
  city?: string | null
}): Promise<string | null> {
  const { storeName, address, city } = params
  if (!storeName?.trim()) return null

  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    console.log('[OPENING-HOURS] OpenAI API key not configured')
    return null
  }

  try {
    const locationPart = [city, address].filter(Boolean).join(', ')
    console.log('[OPENING-HOURS] Searching for opening hours:', storeName, locationPart || '(no location)')

    const prompt = `Find the opening hours/trading hours for this retail store. Return ONLY the opening hours in a clear, concise format (e.g., "Monday-Saturday: 9am-6pm, Sunday: 10am-4pm" or "Mon-Fri: 9am-6pm, Sat: 9am-5pm, Sun: 11am-4pm"). If you cannot find the opening hours, return "NOT_FOUND".

Store: ${storeName}
Location: ${locationPart || 'Unknown'}

Return ONLY the opening hours format, nothing else.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that finds store opening hours. Return only the opening hours in a clear format, or "NOT_FOUND" if unavailable.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 150,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      console.error('[OPENING-HOURS] OpenAI API error:', err)
      return null
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim() || ''

    if (
      content &&
      content !== 'NOT_FOUND' &&
      !content.toLowerCase().includes('cannot find') &&
      !content.toLowerCase().includes('unable to find')
    ) {
      console.log('[OPENING-HOURS] ✓ Found:', content)
      return content
    }
    console.log('[OPENING-HOURS] No opening hours found')
    return null
  } catch (error) {
    console.error('[OPENING-HOURS] Error:', error)
    return null
  }
}
