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

  const OPENING_DAY_ORDER = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ] as const

  const toDisplayDay = (day: string): string =>
    day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()

  const normalizeHoursLabel = (value: string): string => {
    const cleaned = String(value || '')
      .replace(/\r\n?/g, '\n')
      .replace(/[–—]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
    if (!cleaned) return ''
    if (/^closed$/i.test(cleaned)) return 'Closed'
    if (/^open\s*24\s*hours$/i.test(cleaned)) return 'Open 24 hours'
    return cleaned.replace(/\s*-\s*/g, ' - ')
  }

  const formatOpeningTimesMap = (map: Record<string, unknown>): string | null => {
    type OpeningDay = typeof OPENING_DAY_ORDER[number]
    const entries: Array<{ day: OpeningDay; hours: string }> = []
    for (const day of OPENING_DAY_ORDER) {
      const value = map[day] ?? map[toDisplayDay(day)] ?? map[day.slice(0, 3)]
      if (typeof value !== 'string') continue
      const hours = normalizeHoursLabel(value)
      if (!hours) continue
      entries.push({ day, hours })
    }

    if (!entries.length) return null

    const groups: Array<{ start: string; end: string; hours: string }> = []
    for (const entry of entries) {
      const previous = groups[groups.length - 1]
      if (previous && previous.hours === entry.hours) {
        previous.end = entry.day
      } else {
        groups.push({ start: entry.day, end: entry.day, hours: entry.hours })
      }
    }

    return groups
      .map((group) => {
        const label = group.start === group.end
          ? toDisplayDay(group.start)
          : `${toDisplayDay(group.start)} to ${toDisplayDay(group.end)}`
        return `${label}: ${group.hours}`
      })
      .join('; ')
  }

  const normalizeOpeningTimesStructuredText = (value: string): string | null => {
    const trimmed = value.trim()
    if (!/^\{[\s\S]*\}$/.test(trimmed)) return null
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
      return formatOpeningTimesMap(parsed as Record<string, unknown>)
    } catch {
      return null
    }
  }

  const sanitizeOpeningTimes = (value: string | null | undefined): string | null => {
    const raw = String(value || '')
      .replace(/\r\n?/g, '\n')
      .replace(/\s+/g, ' ')
      .trim()
    const structured = normalizeOpeningTimesStructuredText(raw)
    const cleaned = (structured || raw)
      .replace(/^footasylum[^:]*:\s*/i, '')
      .trim()
    if (!cleaned) return null
    if (!/\d/.test(cleaned)) return null
    if (!/(am|pm|\d{1,2}:\d{2})/i.test(cleaned)) return null
    return cleaned
  }

  const extractJsonObjectFromText = (value: string): Record<string, unknown> | null => {
    const cleaned = value.replace(/```json|```/gi, '')
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0]) as Record<string, unknown>
    } catch {
      return null
    }
  }

  try {
    const locationPart = [city, address].filter(Boolean).join(', ')
    console.log('[OPENING-HOURS] Searching for opening hours:', storeName, locationPart || '(no location)')

    const prompt = `Find opening/trading hours for this exact Footasylum branch.

Store: ${storeName}
Location: ${locationPart || 'Unknown'}

Return ONLY valid JSON with exactly:
{
  "openingTimes": string|null,
  "sourceUrl": string|null
}

Rules:
- Prefer an official Footasylum page (footasylum.com) for this branch.
- If official page hours are unavailable, you may use a high-confidence Google/Maps listing for this exact branch.
- If not explicit, set openingTimes to null.
- Do not guess.`

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        tools: [{ type: 'web_search_preview' }],
        input: prompt,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      console.error('[OPENING-HOURS] OpenAI API error:', err)
      return null
    }

    const data = await response.json()
    const message = (data.output || []).find((o: any) => o?.type === 'message')
    const outputText = Array.isArray(message?.content)
      ? message.content
          .map((item: any) => String(item?.text || item?.output_text || ''))
          .join('\n')
      : ''
    const parsed = extractJsonObjectFromText(outputText)
    const openingTimes = sanitizeOpeningTimes(typeof parsed?.openingTimes === 'string' ? parsed.openingTimes : null)

    if (openingTimes) {
      console.log('[OPENING-HOURS] ✓ Found:', openingTimes)
      return openingTimes
    }

    console.log('[OPENING-HOURS] No opening hours found')
    return null
  } catch (error) {
    console.error('[OPENING-HOURS] Error:', error)
    return null
  }
}
