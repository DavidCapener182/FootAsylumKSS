import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
 * Build FRA report download filename: "FRA - (Store name) (DD-MMM-YYYY).pdf" or ".docx"
 */
export function getFraReportFilename(
  premises: string | null | undefined,
  assessmentDate: string | null | undefined,
  extension: 'pdf' | 'docx' = 'pdf'
): string {
  const sanitized = sanitizeForFilename(premises || '')
  if (!sanitized) return `fra-report.${extension}`
  const datePart = formatDateForFilename(assessmentDate)
  return `FRA - ${sanitized} ${datePart}.${extension}`
}


