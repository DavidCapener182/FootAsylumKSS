import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const viewer = readFileSync(new URL('./saved-fra-pdf-viewer.tsx', import.meta.url), 'utf8')
const page = readFileSync(new URL('../../app/(protected)/audit-lab/view-fra-report/page.tsx', import.meta.url), 'utf8')

describe('saved FRA display contract', () => {
  it('renders the stored PDF with a bundled worker instead of a native iframe', () => {
    expect(page).toContain('<SavedFraPdfViewer url={document.url} />')
    expect(page).not.toContain('<iframe title="FRA PDF for review"')
    expect(viewer).toContain("new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)")
    expect(viewer).toContain('pdfjs.getDocument({ url, isEvalSupported: false })')
    expect(viewer).not.toContain('generate-pdf')
  })
  it('provides progress, errors, retry and page controls', () => {
    for (const text of ['role="status"', 'role="alert"', 'Retry PDF', 'PDF page number', 'Previous page', 'Next page']) expect(viewer).toContain(text)
  })
  it('keeps internal tool names out of the customer-facing status', () => {
    expect(page).not.toContain('Codex verifies')
    expect(page).toContain('Source photographs are retained. SharePoint archival is pending.')
  })
})
