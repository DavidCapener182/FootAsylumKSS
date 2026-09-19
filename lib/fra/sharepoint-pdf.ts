/** Only the existing tenant and verified client library may supply archived PDFs. */
export function isSharePointFraPdf(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    const path = decodeURIComponent(url.pathname)
    return url.protocol === 'https:' && url.hostname === 'kssnwlimited.sharepoint.com'
      && !url.port && !url.username && !url.password
      && path.startsWith('/Shared Documents/Operations Clients Drive/Footasylum Ltd/2026 Audits/')
      && path.toLowerCase().endsWith('.pdf')
  } catch { return false }
}
