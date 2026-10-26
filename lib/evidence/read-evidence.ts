/** Fetch only the existing authenticated application endpoint; never expose a storage URL. */
export async function readRevisitEvidence(href: string, signal: AbortSignal, fallbackName = 'revisit-evidence.pdf') {
  const url = new URL(href, window.location.origin)
  if (url.origin !== window.location.origin || url.pathname !== '/api/audit-revisits' || !url.searchParams.get('evidenceId')) {
    throw new Error('This evidence link is unavailable.')
  }
  const response = await fetch(url.pathname + url.search, { credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal })
  if (response.status === 401) throw new Error('Your session has expired. Sign in again, then retry this evidence.')
  if (response.status === 403) throw new Error('You no longer have permission to view this evidence.')
  if (response.status === 404) throw new Error('This evidence is unavailable. Check the store history or contact an administrator.')
  if (!response.ok) throw new Error('Evidence could not be retrieved. Please retry.')
  const mime = (response.headers.get('content-type') || '').split(';')[0].toLowerCase()
  if (mime === 'text/html' || mime === 'application/json') throw new Error('A file was not returned. Sign in again if needed, then retry.')
  const bytes = await response.arrayBuffer()
  if (!bytes.byteLength || bytes.byteLength > 4194304) throw new Error('The evidence file is empty or exceeds the supported size.')
  const expectedHash = response.headers.get('x-content-sha256')
  if (expectedHash) {
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('')
    if (hash !== expectedHash) throw new Error('Evidence verification failed. Retry before downloading.')
  }
  if (mime === 'application/pdf' && new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw new Error('A valid PDF was not returned. Please retry.')
  const disposition = response.headers.get('content-disposition') || ''
  let filename = disposition.match(/filename="([^\"]+)"/i)?.[1] || fallbackName
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (encoded) { try { filename = decodeURIComponent(encoded) } catch { /* Keep the ASCII fallback. */ } }
  filename = filename.split(/[\\/]/).pop()?.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200) || fallbackName
  return { blob: new Blob([bytes], { type: mime || 'application/octet-stream' }), filename, mime }
}
