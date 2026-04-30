import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

type DateInput = Date | string | number | null | undefined

export const APP_LOCALE = 'en-GB'
export const APP_TIME_ZONE = 'Europe/London'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function parseDateInput(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatAppDate(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = {},
  fallback = '—'
) {
  const date = parseDateInput(value)
  if (!date) return fallback
  return date.toLocaleDateString(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    ...options,
  })
}

export function formatAppTime(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = {},
  fallback = '—'
) {
  const date = parseDateInput(value)
  if (!date) return fallback
  return date.toLocaleTimeString(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options,
  })
}

export function formatAppDateTime(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = {},
  fallback = '—'
) {
  const date = parseDateInput(value)
  if (!date) return fallback
  return date.toLocaleString(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    ...options,
  })
}

/** Returns null for FAHS-imported store codes so they are not displayed in store lists. */
export function getDisplayStoreCode(storeCode: string | null | undefined): string | null {
  if (!storeCode || typeof storeCode !== 'string') return null
  if (storeCode.toUpperCase().startsWith('FAHS-')) return null
  return storeCode
}

export function truncateToDecimals(value: number, decimals = 2) {
  const factor = 10 ** decimals
  return Math.trunc(value * factor) / factor
}

export function formatPercent(value: number | null | undefined, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const truncated = truncateToDecimals(value, decimals)
  return `${truncated.toFixed(decimals)}%`
}

/** Sanitize a string for use in a filename (remove invalid chars, normalise en-dash to hyphen for ASCII-safe headers). */
function sanitizeForFilename(s: string): string {
  return s
    .replace(/[\u2013\u2014]/g, '-') /* en-dash U+2013, em-dash U+2014 → hyphen */
    .replace(/[/\\:*?"<>|\n\r]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

/** Format date string for FRA filename: "22-Jan-2026" or "2026-01-22" → "22-Jan-2026". */
function formatDateForFilename(dateStr: string | null | undefined): string {
  if (!dateStr || typeof dateStr !== 'string') return 'no-date'
  const trimmed = dateStr.trim()
  if (!trimmed) return 'no-date'
  // ISO or YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    const [, y, m, d] = isoMatch
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[parseInt(m!, 10) - 1] || m
    return `${d}-${month}-${y}`
  }
  // "22 January 2026" (en-GB long)
  const longMatch = trimmed.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/)
  if (longMatch) {
    const [, d, monthName, y] = longMatch
    const shortMonth = (monthName || '').slice(0, 3)
    return `${d}-${shortMonth}-${y}`
  }
  return sanitizeForFilename(trimmed) || 'no-date'
}

/**
 * Parse filename from Content-Disposition header.
 * Supports RFC 5987 (filename*=UTF-8''...) and legacy filename="..." or filename=...
 */
export function parseContentDispositionFilename(
  contentDisposition: string | null,
  fallback: string
): string {
  if (!contentDisposition || typeof contentDisposition !== 'string') return fallback
  const cd = contentDisposition.trim()
  const matchStar = cd.match(/filename\*=UTF-8''([^;\s]+)/i)
  if (matchStar?.[1]) {
    try {
      return decodeURIComponent(matchStar[1].replace(/"/g, ''))
    } catch {
      return fallback
    }
  }
  const matchQuoted = cd.match(/filename=([^;]*)/i)
  if (matchQuoted?.[1]) {
    const v = matchQuoted[1].trim().replace(/^["']|["']$/g, '')
    if (v) return v
  }
  return fallback
}

/**
 * Build FRA report download filename:
 * "StoreCode - Store Name, DD-MMM-YYYY - FRA.pdf" (or .docx)
 */
export function getFraReportFilename(
  premises: string | null | undefined,
  assessmentDate: string | null | undefined,
  extension: 'pdf' | 'docx' = 'pdf',
  storeCode?: string | null,
  storeName?: string | null
): string {
  const datePart = formatDateForFilename(assessmentDate)
  const sanitizedCode = sanitizeForFilename(storeCode || '')
  const sanitizedNameFromInput = sanitizeForFilename(storeName || '')

  const derivedStoreName = (() => {
    const sanitizedPremises = sanitizeForFilename(premises || '')
    if (!sanitizedPremises) return ''
    const match = sanitizedPremises.match(/^footasylum\s*-\s*(.+)$/i)
    return sanitizeForFilename((match?.[1] || sanitizedPremises).trim())
  })()

  const finalStoreName = sanitizedNameFromInput || derivedStoreName

  if (sanitizedCode && finalStoreName) {
    return `${sanitizedCode} - ${finalStoreName}, ${datePart} - FRA.${extension}`
  }
  if (finalStoreName) {
    return `${finalStoreName}, ${datePart} - FRA.${extension}`
  }
  if (sanitizedCode) {
    return `${sanitizedCode}, ${datePart} - FRA.${extension}`
  }
  return `fra-report.${extension}`
}

/**
 * Build FRA assessment reference for display: "FRA - Footasylum - (Store Name) - (Date)"
 * Date format: DD-MMM-YYYY when present, otherwise "—".
 */
export function getFraAssessmentReference(
  premises: string | null | undefined,
  assessmentDate: string | null | undefined
): string {
  const storeName = (premises || '').trim() || '—'
  const dateFormatted =
    assessmentDate && typeof assessmentDate === 'string' && assessmentDate.trim()
      ? formatDateForFilename(assessmentDate) !== 'no-date'
        ? formatDateForFilename(assessmentDate)
        : '—'
      : '—'
  return `FRA - Footasylum - ${storeName} - ${dateFormatted}`
}

export function getCmpReportFilename(
  eventName: string | null | undefined,
  showDates: string | null | undefined,
  extension: 'pdf' | 'docx' = 'pdf',
  venueName?: string | null
): string {
  const sanitizedEvent = sanitizeForFilename(eventName || '')
  const sanitizedVenue = sanitizeForFilename(venueName || '')
  const datePart = formatDateForFilename(showDates)

  if (sanitizedEvent && sanitizedVenue) {
    return `${sanitizedEvent} - ${sanitizedVenue}, ${datePart} - CMP.${extension}`
  }
  if (sanitizedEvent) {
    return `${sanitizedEvent}, ${datePart} - CMP.${extension}`
  }
  if (sanitizedVenue) {
    return `${sanitizedVenue}, ${datePart} - CMP.${extension}`
  }
  return `cmp-report.${extension}`
}

export function getEmpReportFilename(
  eventName: string | null | undefined,
  showDates: string | null | undefined,
  extension: 'pdf' | 'docx' = 'pdf',
  venueName?: string | null
): string {
  const sanitizedEvent = sanitizeForFilename(eventName || '')
  const sanitizedVenue = sanitizeForFilename(venueName || '')
  const datePart = formatDateForFilename(showDates)

  if (sanitizedEvent && sanitizedVenue) {
    return `${sanitizedEvent} - ${sanitizedVenue}, ${datePart} - EMP.${extension}`
  }
  if (sanitizedEvent) {
    return `${sanitizedEvent}, ${datePart} - EMP.${extension}`
  }
  if (sanitizedVenue) {
    return `${sanitizedVenue}, ${datePart} - EMP.${extension}`
  }
  return `emp-report.${extension}`
}
