type GoogleStoreSearchParams = {
  storeName: string
  address?: string | null
  city?: string | null
}

export type GoogleStoreSearchResult = {
  openingTimes: string | null
  buildDate: string | null
  adjacentOccupancies: string | null
  squareFootage: string | null
}

type AreaCandidate = {
  formatted: string
  unit: 'sqft' | 'm2'
  valueSqFt: number
  score: number
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeLineBreaks(value: string): string {
  return value.replace(/\r\n?/g, '\n')
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => normalizeWhitespace(v)).filter(Boolean)))
}

function extractLocationTokens(address?: string | null, city?: string | null): string[] {
  const stopTokens = new Set([
    'road', 'rd', 'street', 'st', 'avenue', 'ave', 'drive', 'dr', 'lane', 'ln',
    'centre', 'center', 'shopping', 'retail', 'unit', 'store', 'footasylum',
    'park', 'plaza', 'the', 'and',
  ])
  const source = [address, city]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase()
  const tokens = source
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !stopTokens.has(token))
  return Array.from(new Set(tokens)).slice(0, 10)
}

function stripMarkdownLinks(value: string): string {
  return value.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
}

function cleanOutputText(value: string): string {
  return normalizeWhitespace(stripMarkdownLinks(value).replace(/```json|```/gi, ''))
}

function extractJsonObjectFromText(value: string): Record<string, unknown> | null {
  const cleaned = cleanOutputText(value)
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try {
    return JSON.parse(jsonMatch[0]) as Record<string, unknown>
  } catch {
    return null
  }
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const cleaned = cleanOutputText(value)
  if (!cleaned || /^(null|not_found|not found|unknown|n\/a)$/i.test(cleaned)) return null
  return cleaned
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

function toDisplayDay(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()
}

function normalizeHoursLabel(value: string): string {
  const cleaned = normalizeWhitespace(String(value || '').replace(/[–—]/g, '-'))
  if (!cleaned) return ''
  if (/^closed$/i.test(cleaned)) return 'Closed'
  if (/^open\s*24\s*hours$/i.test(cleaned)) return 'Open 24 hours'
  return cleaned.replace(/\s*-\s*/g, ' - ')
}

function formatOpeningTimesMap(map: Record<string, unknown>): string | null {
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

function normalizeOpeningTimesStructuredText(value: string): string | null {
  const trimmed = normalizeWhitespace(value)
  if (!trimmed) return null
  if (!/^\{[\s\S]*\}$/.test(trimmed)) return null
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return formatOpeningTimesMap(parsed as Record<string, unknown>)
  } catch {
    return null
  }
}

function parseAreaCandidatesFromText(rawText: string, locationTokens: string[] = []): AreaCandidate[] {
  const text = normalizeLineBreaks(rawText)
  const candidates = new Map<string, AreaCandidate>()

  const pushCandidate = (
    rawNumericValue: number,
    unit: 'sqft' | 'm2',
    matchIndex: number,
    matchLength: number
  ): void => {
    if (!Number.isFinite(rawNumericValue) || rawNumericValue <= 0) return

    const valueSqFt = unit === 'sqft' ? rawNumericValue : rawNumericValue * 10.7639
    const numericForDisplay = unit === 'sqft' ? rawNumericValue : rawNumericValue
    const formattedNumber = Number.isInteger(numericForDisplay)
      ? Math.round(numericForDisplay).toLocaleString('en-GB')
      : numericForDisplay.toLocaleString('en-GB', { maximumFractionDigits: 2 })
    const formatted = unit === 'sqft' ? `${formattedNumber} sq ft` : `${formattedNumber} m²`
    const key = `${unit}:${Math.round(valueSqFt)}`

    const contextStart = Math.max(0, matchIndex - 100)
    const contextEnd = Math.min(text.length, matchIndex + matchLength + 100)
    const context = text.slice(contextStart, contextEnd).toLowerCase()

    let score = unit === 'sqft' ? 70 : 40

    if (/\b(store size|floor area|sales area|unit size|gross area|square footage|sq ft|sqm|m²)\b/i.test(context)) score += 25
    if (/\b(footasylum|shopping centre|shopping center|retail unit|store|shop|eagles meadow|wrexham)\b/i.test(context)) score += 20

    if (locationTokens.length > 0) {
      const locationHits = locationTokens.reduce((count, token) => {
        const re = new RegExp(`\\b${escapeRegex(token)}\\b`, 'i')
        return re.test(context) ? count + 1 : count
      }, 0)
      if (locationHits === 0) {
        score -= 55
      } else {
        score += Math.min(locationHits * 14, 40)
      }
    }

    if (/\b(occupancy|capacity|person|people|per person|60 sq ft|30 sq ft|fire risk)\b/i.test(context)) score -= 55
    if (/\b(accessibility links|see more|report inappropriate|predictions|directions|website|reviews|photos|opening hours)\b/i.test(context)) score -= 40
    if (/\b(company|founded|revenue|turnover|share price|stock)\b/i.test(context)) score -= 35

    if (unit === 'sqft') {
      if (rawNumericValue >= 1000 && rawNumericValue <= 50000) score += 20
      if (rawNumericValue < 500) score -= 35
    } else {
      if (rawNumericValue >= 100 && rawNumericValue <= 5000) score += 20
      if (rawNumericValue < 50) score -= 35
    }

    const current = candidates.get(key)
    if (!current || score > current.score) {
      candidates.set(key, { formatted, unit, valueSqFt, score })
    }
  }

  const sqFtRegex = /(\d{1,3}(?:,\d{3})+|\d{3,6})(?:\.\d+)?\s*(?:square[\s-]*feet|sq\.?\s*ft|sqft|ft²|ft2|square[\s-]*foot)\b/gi
  let sqFtMatch: RegExpExecArray | null
  while ((sqFtMatch = sqFtRegex.exec(text)) !== null) {
    const raw = parseFloat((sqFtMatch[1] || '').replace(/,/g, ''))
    if (raw >= 200 && raw <= 200000) {
      pushCandidate(raw, 'sqft', sqFtMatch.index, sqFtMatch[0].length)
    }
  }

  const m2Regex = /(\d{2,6}(?:\.\d+)?)\s*(?:m²|m2|sqm|sq\.?\s*m|square\s*met(?:re|er)s?)\b/gi
  let m2Match: RegExpExecArray | null
  while ((m2Match = m2Regex.exec(text)) !== null) {
    const raw = parseFloat((m2Match[1] || '').replace(/,/g, ''))
    if (raw >= 20 && raw <= 20000) {
      pushCandidate(raw, 'm2', m2Match.index, m2Match[0].length)
    }
  }

  return Array.from(candidates.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (b.unit !== a.unit) return b.unit === 'sqft' ? 1 : -1
    return b.valueSqFt - a.valueSqFt
  })
}

function pickBestAreaCandidate(rawText: string, locationTokens: string[] = []): AreaCandidate | null {
  const candidates = parseAreaCandidatesFromText(rawText, locationTokens)
  if (!candidates.length) return null
  const best = candidates[0]
  if (best.score < 50) return null
  return best
}

function sanitizeOpeningTimes(value: unknown): string | null {
  const normalized = normalizeNullableString(value)
  if (!normalized) return null
  const structured = normalizeOpeningTimesStructuredText(normalized)
  const hoursOnly = (structured || normalized)
    .replace(/^footasylum[^:]*:\s*/i, '')
    .replace(/\(.*source.*\)$/i, '')
    .trim()
  return /\d{1,2}[:.]?\d{0,2}\s*(am|pm)/i.test(hoursOnly) || /(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(hoursOnly)
    ? hoursOnly
    : null
}

function scoreOpeningTimes(value: string | null | undefined): number {
  const normalized = normalizeWhitespace(value || '')
  if (!normalized) return -100
  if (!/\d/.test(normalized)) return -100
  if (!/(am|pm|\d{1,2}:\d{2})/i.test(normalized)) return -40

  let score = 0
  if (/(monday\s+to\s+saturday|mon(?:day)?\s*-\s*sat(?:urday)?)/i.test(normalized)) score += 45
  if (/sunday/i.test(normalized)) score += 20
  if (/\d{1,2}:\d{2}/.test(normalized)) score += 20
  if (/\d{1,2}\s*(am|pm)/i.test(normalized)) score += 10
  if (/[;|]/.test(normalized)) score += 10
  if (/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(normalized)) score += 12

  const dayEntries = normalized.match(
    /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b[^,;|]*/gi
  ) || []
  if (dayEntries.length >= 6) {
    const times = dayEntries
      .map((entry) => {
        const range = entry.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:-|–|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i)
        return range ? normalizeWhitespace(range[1].toLowerCase()) : ''
      })
      .filter(Boolean)
    const uniqueRanges = new Set(times)
    if (times.length >= 6 && uniqueRanges.size <= 1) {
      score -= 35
    }
  }

  return score
}

function pickBestOpeningTimes(candidates: Array<string | null | undefined>): string | null {
  const normalized = uniqueNonEmpty(candidates.filter((value): value is string => typeof value === 'string'))
  if (!normalized.length) return null
  const ranked = normalized
    .map((value) => ({ value, score: scoreOpeningTimes(value) }))
    .sort((a, b) => b.score - a.score)
  const best = ranked[0]
  return best && best.score >= 20 ? best.value : null
}

function sanitizeBuildDate(value: unknown): string | null {
  const normalized = normalizeNullableString(value)
  if (!normalized) return null
  const year = normalized.match(/\b(1[7-9]\d{2}|20[0-2]\d)\b/)?.[1] || null
  return year
}

function sanitizeSquareFootage(value: unknown): string | null {
  const normalized = normalizeNullableString(value)
  if (!normalized) return null
  return pickBestAreaCandidate(normalized)?.formatted || null
}

function isJunkAdjacentToken(value: string): boolean {
  const lower = normalizeWhitespace(value).toLowerCase()
  if (!lower) return true
  if (/^(none|unknown|not found|to be confirmed|n\/a|na)$/i.test(lower)) return true
  if (/\b(accessibility links?|see more|report inappropriate predictions?|report inappropriate|predictions?)\b/i.test(lower)) return true
  if (/\b(directions|website|opening hours|reviews|photos|google maps|people also ask|search results?)\b/i.test(lower)) return true
  if (/^\d+$/.test(lower)) return true
  return false
}

function sanitizeAdjacentOccupancies(value: unknown): string | null {
  const normalized = normalizeNullableString(value)
  if (!normalized) return null
  const cleaned = normalized
    .replace(/^adjacent occupanc(?:y|ies)\s*[:\-]?\s*/i, '')
    .replace(/\.$/, '')
    .replace(/\s*[|]\s*/g, ', ')
    .trim()
  if (!cleaned || cleaned.length < 4) return null

  const tokens = cleaned
    .split(/[,;/]|(?:\s+and\s+)/i)
    .map((token) => normalizeWhitespace(token))
    .filter((token) => !!token && !isJunkAdjacentToken(token))
    .filter((token) => token.length >= 2 && token.length <= 50)
    .filter((token) => /[a-z]/i.test(token))
    .filter((token) => !/\b(footasylum)\b/i.test(token))

  const uniqueTokens = uniqueNonEmpty(tokens).slice(0, 4)
  if (uniqueTokens.length >= 2) {
    return `Nearby retail occupancies include ${uniqueTokens.join(', ')}.`
  }

  if (isJunkAdjacentToken(cleaned)) return null
  if (cleaned.length < 8) return null
  return cleaned.endsWith('.') ? cleaned : `${cleaned}.`
}

async function fetchStoreDataViaOpenAIWebSearch(
  params: GoogleStoreSearchParams
): Promise<GoogleStoreSearchResult | null> {
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) return null

  try {
    const locationPart = [params.address, params.city].filter(Boolean).join(', ')
    const prompt = `Find store profile data for this specific Footasylum branch.

Store: ${params.storeName}
Location: ${locationPart || 'Unknown'}

Return ONLY valid JSON with exactly these keys:
{
  "openingTimes": string|null,
  "buildDate": string|null,
  "adjacentOccupancies": string|null,
  "squareFootage": string|null
}

Rules:
- Use web results for this exact branch/location.
- openingTimes: concise one-line trading hours if explicitly found, else null.
- buildDate: one 4-digit building construction year if explicitly found, else null.
- adjacentOccupancies: short phrase listing nearby/adjoining occupancies if explicitly found, else null. Never output UI labels like "Accessibility links", "See more", or "Report inappropriate predictions".
- squareFootage: include units and prefer sq ft (e.g. "9,600 sq ft") if explicitly found, else null.
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
    if (!parsed) return null

    return {
      openingTimes: sanitizeOpeningTimes(parsed.openingTimes),
      buildDate: sanitizeBuildDate(parsed.buildDate),
      adjacentOccupancies: sanitizeAdjacentOccupancies(parsed.adjacentOccupancies),
      squareFootage: sanitizeSquareFootage(parsed.squareFootage),
    }
  } catch (error) {
    console.error('[OPENAI-WEB-SEARCH] Failed:', error)
    return null
  }
}

async function fetchOfficialFootasylumOpeningTimesViaOpenAI(
  params: GoogleStoreSearchParams
): Promise<string | null> {
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) return null

  try {
    const locationPart = [params.address, params.city].filter(Boolean).join(', ')
    const prompt = `Find the official opening/trading hours for this exact Footasylum store branch, using only the official Footasylum website.

Store: ${params.storeName}
Location: ${locationPart || 'Unknown'}

Return ONLY valid JSON:
{
  "openingTimes": string|null,
  "sourceUrl": string|null
}

Rules:
- You MUST use an official Footasylum source URL on footasylum.com for openingTimes.
- If you cannot find the hours on footasylum.com for this exact branch, set openingTimes to null.
- Do not use Google snippets, Maps-only summaries, or third-party directory pages as primary source.
- openingTimes should be one concise line (example: "Monday to Saturday: 09:00 - 18:00; Sunday: 10:30 - 16:30").
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

    if (!response.ok) return null
    const data = await response.json()
    const message = (data.output || []).find((o: any) => o?.type === 'message')
    const outputText = Array.isArray(message?.content)
      ? message.content
          .map((item: any) => String(item?.text || item?.output_text || ''))
          .join('\n')
      : ''
    const parsed = extractJsonObjectFromText(outputText)
    if (!parsed) return null

    const sourceUrl = normalizeNullableString(parsed.sourceUrl)
    if (!sourceUrl || !/https?:\/\/(?:www\.)?footasylum\.com\//i.test(sourceUrl)) {
      return null
    }
    return sanitizeOpeningTimes(parsed.openingTimes)
  } catch (error) {
    console.error('[OPENAI-WEB-SEARCH] Official Footasylum opening-times lookup failed:', error)
    return null
  }
}

async function fetchSingleFieldViaOpenAIWebSearch(
  params: GoogleStoreSearchParams,
  field: 'squareFootage' | 'adjacentOccupancies'
): Promise<string | null> {
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) return null

  const locationPart = [params.address, params.city].filter(Boolean).join(', ')
  const fieldPrompt =
    field === 'squareFootage'
      ? `Return the store's floor area for this exact branch in sq ft when explicitly available.`
      : `Return nearby/adjoining retail occupancies for this exact branch as a short phrase. Exclude all web UI text fragments.`
  const fieldRules =
    field === 'squareFootage'
      ? '- squareFootage must include unit (e.g. "9,600 sq ft") and be null if not explicit.\n- Use the exact branch location only, not any other city/branch.\n- If multiple values exist for different branches, return null.'
      : '- adjacentOccupancies must be plain occupancy text, never "Accessibility links", "See more", "Report inappropriate predictions", or similar UI strings.\n- Set null if explicit nearby occupancies are not found.'

  const prompt = `Find one data point for this specific Footasylum branch.

Store: ${params.storeName}
Location: ${locationPart || 'Unknown'}

${fieldPrompt}

Return ONLY valid JSON with exactly this shape:
{
  "${field}": string|null
}

Rules:
${fieldRules}
- Do not guess.`

  try {
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

    if (!response.ok) return null
    const data = await response.json()
    const message = (data.output || []).find((o: any) => o?.type === 'message')
    const outputText = Array.isArray(message?.content)
      ? message.content
          .map((item: any) => String(item?.text || item?.output_text || ''))
          .join('\n')
      : ''
    const parsed = extractJsonObjectFromText(outputText)
    if (!parsed) return null

    return field === 'squareFootage'
      ? sanitizeSquareFootage(parsed.squareFootage)
      : sanitizeAdjacentOccupancies(parsed.adjacentOccupancies)
  } catch (error) {
    console.error('[OPENAI-WEB-SEARCH] Single-field fetch failed:', error)
    return null
  }
}

function extractBuildYearFromText(rawText: string): string | null {
  const text = normalizeLineBreaks(rawText)
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const strictYears: string[] = []
  const looseYears: string[] = []
  for (const line of lines) {
    const lower = line.toLowerCase()
    const years = line.match(/\b(1[7-9]\d{2}|20[0-2]\d)\b/g) || []
    if (!years.length) continue

    if (
      /(building|built|constructed|construction|completed|redeveloped|refurbished|premises)/i.test(lower) &&
      !/(company|founded|share price|revenue|turnover|wikipedia)/i.test(lower)
    ) {
      strictYears.push(...years)
      continue
    }

    if (
      /(opened|opening)\b/i.test(lower) &&
      !/(company|founded|footasylum founded|group)/i.test(lower)
    ) {
      looseYears.push(...years)
    }
  }

  const candidates = strictYears.length ? strictYears : looseYears
  if (!candidates.length) return null

  const counts = new Map<string, number>()
  for (const year of candidates) {
    counts.set(year, (counts.get(year) || 0) + 1)
  }
  const sorted = Array.from(counts.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]
    return a[0].localeCompare(b[0])
  })
  return sorted[0]?.[0] || null
}

function extractOpeningTimesFromText(rawText: string): string | null {
  const text = normalizeLineBreaks(rawText)

  const weekdayMatches = text.match(
    /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b\s*[:\-]?\s*(?:Closed|Open 24 hours|\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*(?:-|–|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))/gi
  ) || []
  const weekdayLines = uniqueNonEmpty(weekdayMatches).slice(0, 7)
  if (weekdayLines.length >= 2) {
    return weekdayLines.join(', ')
  }

  const lineByLine = text
    .split('\n')
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)
  const hoursLine = lineByLine.find((line) =>
    /(opening hours|trading hours|store hours|hours)\b/i.test(line) &&
    /\d{1,2}(?::\d{2})?\s*(am|pm)/i.test(line)
  )
  if (hoursLine) {
    return hoursLine.replace(/^(opening hours|trading hours|store hours|hours)\s*[:\-]?\s*/i, '').trim()
  }

  const openClose = lineByLine.find((line) =>
    /\b(open|opens|closes)\b/i.test(line) &&
    /\d{1,2}(?::\d{2})?\s*(am|pm)/i.test(line)
  )
  if (openClose) return openClose

  return null
}

function extractSquareFootageFromText(rawText: string): string | null {
  return pickBestAreaCandidate(rawText)?.formatted || null
}

function extractAdjacentOccupanciesFromText(rawText: string, storeName: string): string | null {
  const text = normalizeLineBreaks(rawText)
  const lines = text
    .split('\n')
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)

  const lowerStoreName = storeName.toLowerCase()
  const stopWords = [
    'google',
    'maps',
    'directions',
    'website',
    'opening hours',
    'hours',
    'reviews',
    'photos',
    'people also ask',
    'search',
    'result',
    'accessibility links',
    'see more',
    'report inappropriate predictions',
    'report inappropriate',
    'predictions',
    'uk',
    'ltd',
  ]

  const candidates: string[] = []
  for (const line of lines) {
    const lower = line.toLowerCase()
    if (lower.includes(lowerStoreName)) continue
    if (stopWords.some((word) => lower.includes(word))) continue
    if (!/^[a-z0-9&'.,\-\/()\s]{3,60}$/i.test(line)) continue
    if (!/[a-z]/i.test(line)) continue
    if (!/[A-Z]/.test(line[0])) continue
    if (/\d{3,}/.test(line)) continue
    if (/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|open|closed)\b/i.test(lower)) continue
    candidates.push(line)
  }

  const unique = uniqueNonEmpty(candidates).slice(0, 3)
  if (!unique.length) return null
  return `Nearby retail occupancies include ${unique.join(', ')}.`
}

async function fetchGoogleTextResult(query: string): Promise<string | null> {
  try {
    const url = `https://r.jina.ai/http://www.google.com/search?hl=en&gl=uk&num=8&q=${encodeURIComponent(query)}`
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FRAStoreSearch/1.0)',
      },
    })
    if (!response.ok) return null
    const text = await response.text()
    return text && text.length > 50 ? text : null
  } catch (error) {
    console.error('[GOOGLE-SEARCH] Text search failed:', error)
    return null
  }
}

type PlacesResult = {
  openingTimes: string | null
  adjacentOccupancies: string | null
}

function scorePlaceSearchResult(
  result: any,
  params: GoogleStoreSearchParams
): number {
  const name = normalizeWhitespace(String(result?.name || '')).toLowerCase()
  const address = normalizeWhitespace(String(result?.formatted_address || '')).toLowerCase()
  const types: string[] = Array.isArray(result?.types) ? result.types.map((t: any) => String(t).toLowerCase()) : []
  if (!name) return -100

  let score = 0
  if (name.includes('footasylum')) score += 120
  if (name.includes(params.storeName.toLowerCase())) score += 60
  if (types.includes('clothing_store') || types.includes('shoe_store')) score += 20
  if (types.includes('shopping_mall')) score -= 40

  const locationTokens = [params.address, params.city]
    .filter((v): v is string => typeof v === 'string')
    .flatMap((v) => v.toLowerCase().split(/[^a-z0-9]+/))
    .filter((token) => token.length >= 4)
  const uniqueTokens = Array.from(new Set(locationTokens)).slice(0, 8)
  const tokenHits = uniqueTokens.reduce((count, token) => {
    if (name.includes(token) || address.includes(token)) return count + 1
    return count
  }, 0)
  score += Math.min(tokenHits * 8, 40)
  return score
}

async function fetchGooglePlacesData(params: GoogleStoreSearchParams): Promise<PlacesResult> {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY
    || process.env.GOOGLE_PLACES_API_KEY
    || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return { openingTimes: null, adjacentOccupancies: null }
  }

  try {
    const locationPart = [params.address, params.city].filter(Boolean).join(', ')
    const query = `${params.storeName}${locationPart ? `, ${locationPart}` : ''}`
    const textSearchUrl =
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`
    const textSearchResponse = await fetch(textSearchUrl, { cache: 'no-store' })
    if (!textSearchResponse.ok) return { openingTimes: null, adjacentOccupancies: null }

    const textSearchData = await textSearchResponse.json()
    const results: any[] = Array.isArray(textSearchData?.results) ? textSearchData.results : []
    const rankedResults = results
      .map((result) => ({ result, score: scorePlaceSearchResult(result, params) }))
      .sort((a, b) => b.score - a.score)
    const top = rankedResults[0]
    if (!top || top.score < 80) {
      return { openingTimes: null, adjacentOccupancies: null }
    }
    const place = top.result
    const placeId = place?.place_id
    if (!placeId) return { openingTimes: null, adjacentOccupancies: null }

    const detailsUrl =
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,opening_hours,geometry&key=${apiKey}`
    const detailsResponse = await fetch(detailsUrl, { cache: 'no-store' })
    if (!detailsResponse.ok) return { openingTimes: null, adjacentOccupancies: null }
    const detailsData = await detailsResponse.json()
    const detail = detailsData?.result

    const weekdayText = detail?.opening_hours?.weekday_text
    const openingTimesRaw = Array.isArray(weekdayText) && weekdayText.length
      ? weekdayText.map((line: string) => normalizeWhitespace(line)).join(', ')
      : null
    const openingTimes = pickBestOpeningTimes([openingTimesRaw])

    const lat = detail?.geometry?.location?.lat
    const lng = detail?.geometry?.location?.lng
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return { openingTimes, adjacentOccupancies: null }
    }

    const nearbyUrl =
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=100&type=store&key=${apiKey}`
    const nearbyResponse = await fetch(nearbyUrl, { cache: 'no-store' })
    if (!nearbyResponse.ok) {
      return { openingTimes, adjacentOccupancies: null }
    }
    const nearbyData = await nearbyResponse.json()
    const placeName = String(detail?.name || '').toLowerCase()

    const nearbyNames = uniqueNonEmpty(
      (nearbyData?.results || [])
        .map((item: any) => normalizeWhitespace(String(item?.name || '')))
        .filter((name: string) => {
          const lower = name.toLowerCase()
          if (!name) return false
          if (lower.includes('footasylum')) return false
          if (placeName && lower === placeName) return false
          return true
        })
    ).slice(0, 3)

    const adjacentOccupancies = nearbyNames.length
      ? `Nearby retail occupancies include ${nearbyNames.join(', ')}.`
      : null

    return { openingTimes, adjacentOccupancies }
  } catch (error) {
    console.error('[GOOGLE-PLACES] Failed:', error)
    return { openingTimes: null, adjacentOccupancies: null }
  }
}

export async function getStoreDataFromGoogleSearch(
  params: GoogleStoreSearchParams
): Promise<GoogleStoreSearchResult> {
  const { storeName, address, city } = params
  if (!storeName?.trim()) {
    return { openingTimes: null, buildDate: null, adjacentOccupancies: null, squareFootage: null }
  }

  const [officialOpeningTimes, openAiWebData, placesData] = await Promise.all([
    fetchOfficialFootasylumOpeningTimesViaOpenAI({ storeName, address, city }),
    fetchStoreDataViaOpenAIWebSearch({ storeName, address, city }),
    fetchGooglePlacesData({ storeName, address, city }),
  ])
  const locationTokens = extractLocationTokens(address, city)

  let buildDate = openAiWebData?.buildDate || null
  if (!buildDate) {
    const buildQuery = `${storeName} ${address || ''} ${city || ''} building construction year`
    const buildText = await fetchGoogleTextResult(buildQuery)
    if (buildText) {
      buildDate = extractBuildYearFromText(buildText)
    }
  }

  let openingTimes = officialOpeningTimes && scoreOpeningTimes(officialOpeningTimes) >= 20
    ? officialOpeningTimes
    : pickBestOpeningTimes([officialOpeningTimes, openAiWebData?.openingTimes, placesData.openingTimes])
  if (!openingTimes) {
    const hoursQuery = `${storeName} ${address || ''} ${city || ''} opening hours`
    const hoursText = await fetchGoogleTextResult(hoursQuery)
    if (hoursText) {
      openingTimes = pickBestOpeningTimes([extractOpeningTimesFromText(hoursText)])
    }
  }

  let adjacentOccupancies = placesData.adjacentOccupancies || openAiWebData?.adjacentOccupancies
  if (!adjacentOccupancies) {
    adjacentOccupancies = await fetchSingleFieldViaOpenAIWebSearch({ storeName, address, city }, 'adjacentOccupancies')
  }
  if (!adjacentOccupancies) {
    const nearbyQuery = `${storeName} ${address || ''} ${city || ''} nearby shops`
    const nearbyText = await fetchGoogleTextResult(nearbyQuery)
    if (nearbyText) {
      adjacentOccupancies = extractAdjacentOccupanciesFromText(nearbyText, storeName)
    }
  }

  let squareFootage: string | null = null
  const focusedSquareFootage = await fetchSingleFieldViaOpenAIWebSearch({ storeName, address, city }, 'squareFootage')
  if (focusedSquareFootage) {
    squareFootage = focusedSquareFootage
  }

  if (!squareFootage) {
    const sizeQuery = `${storeName} ${address || ''} ${city || ''} store size square feet`
    const sizeText = await fetchGoogleTextResult(sizeQuery)
    if (sizeText) {
      squareFootage = pickBestAreaCandidate(sizeText, locationTokens)?.formatted || null
    }
  }

  if (!squareFootage && openAiWebData?.squareFootage) {
    squareFootage = openAiWebData.squareFootage
  }

  return {
    openingTimes: openingTimes || null,
    buildDate: buildDate || null,
    adjacentOccupancies: adjacentOccupancies || null,
    squareFootage: squareFootage || null,
  }
}
