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


