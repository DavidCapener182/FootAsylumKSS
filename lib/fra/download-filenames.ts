export interface FraPdfFileNameInput {
  storeCode?: string | null
  storeName: string
  fraDate?: string | null
}

function sanitizeFileNameSegment(value: string): string {
  return value
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildFraPdfFileName({ storeCode, storeName, fraDate }: FraPdfFileNameInput): string {
  const safeStoreCode = storeCode ? sanitizeFileNameSegment(storeCode) : ''
  const safeStoreName = sanitizeFileNameSegment(storeName) || 'store'
  const safeFraDate = fraDate ? sanitizeFileNameSegment(fraDate) || 'fra' : 'fra'
  const storeCodePrefix = safeStoreCode ? `${safeStoreCode}-` : ''

  return `${storeCodePrefix}${safeStoreName}-FRA-${safeFraDate}.pdf`
}

export function buildFraBulkArchiveName(now: Date = new Date()): string {
  const yyyy = `${now.getUTCFullYear()}`
  const mm = `${now.getUTCMonth() + 1}`.padStart(2, '0')
  const dd = `${now.getUTCDate()}`.padStart(2, '0')
  const hh = `${now.getUTCHours()}`.padStart(2, '0')
  const min = `${now.getUTCMinutes()}`.padStart(2, '0')
  const sec = `${now.getUTCSeconds()}`.padStart(2, '0')

  return `completed-fra-pdfs-${yyyy}${mm}${dd}-${hh}${min}${sec}.zip`
}

export function appendNumericSuffixToFileName(fileName: string, suffix: number): string {
  const lastDotIndex = fileName.lastIndexOf('.')

  if (lastDotIndex <= 0) {
    return `${fileName}-${suffix}`
  }

  return `${fileName.slice(0, lastDotIndex)}-${suffix}${fileName.slice(lastDotIndex)}`
}
