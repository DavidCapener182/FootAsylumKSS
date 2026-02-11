/**
 * Search for an approximate store building construction year using OpenAI.
 * Returns a 4-digit year string when confidently extracted, otherwise null.
 */
export async function getBuildDateFromSearch(params: {
  storeName: string
  address?: string | null
  city?: string | null
}): Promise<string | null> {
  const { storeName, address, city } = params
  if (!storeName?.trim()) return null

  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    console.log('[BUILD-DATE] OpenAI API key not configured')
    return null
  }

  try {
    const locationPart = [city, address].filter(Boolean).join(', ')
    console.log('[BUILD-DATE] Searching build year:', storeName, locationPart || '(no location)')

    const prompt = `Find the most likely construction/build year of the building used by this retail store location.

Store: ${storeName}
Location: ${locationPart || 'Unknown'}

Rules:
- Return ONLY one of:
  1) a single 4-digit year (example: 1998)
  2) NOT_FOUND
- If uncertain or no reliable information is available, return NOT_FOUND.
- Do not include any extra words, punctuation, or explanation.`

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
            content:
              'You extract approximate building construction years for specific store locations. Return only a 4-digit year or NOT_FOUND.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 20,
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      console.error('[BUILD-DATE] OpenAI API error:', err)
      return null
    }

    const data = await response.json()
    const content = String(data.choices?.[0]?.message?.content || '').trim()
    if (!content || /^not_found$/i.test(content)) {
      console.log('[BUILD-DATE] No build year found')
      return null
    }

    const yearMatch = content.match(/\b(1[6-9]\d{2}|20[0-2]\d)\b/)
    if (!yearMatch) {
      console.log('[BUILD-DATE] Response did not include a safe year:', content)
      return null
    }

    const year = yearMatch[1]
    console.log('[BUILD-DATE] ✓ Found:', year)
    return year
  } catch (error) {
    console.error('[BUILD-DATE] Error:', error)
    return null
  }
}
