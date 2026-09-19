import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const viewer = readFileSync(new URL('./saved-fra-pdf-viewer.tsx', import.meta.url), 'utf8')
const page = readFileSync(new URL('../../app/(protected)/audit-lab/view-fra-report/page.tsx', import.meta.url), 'utf8')

describe('saved FRA display contract', () => {
  it('preserves only upstream-minified PDF.js module assets in production', () => {
    const config = createRequire(import.meta.url)('../../next.config.js')
    const assets = [
      'node_modules/pdfjs-dist/build/pdf.min.mjs',
      'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
      'node_modules/pdfjs-dist/build/pdf.mjs',
      'components/unrelated.js',
    ].map((sourceFilename) => ({ name: sourceFilename, source: {}, info: { sourceFilename } }))
    const updated: string[] = []
    const bundled = config.webpack({ plugins: [] }, { webpack: { Compilation: { PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE: 400 } } })
    bundled.plugins[0].apply({ hooks: { thisCompilation: { tap: (_name: string, compile: Function) => compile({
      hooks: { processAssets: { tap: (options: { stage: number }, process: Function) => {
        expect(options.stage).toBe(399)
        process()
      } } },
      getAssets: () => assets,
      updateAsset: (name: string, _source: unknown, info: { minimized: boolean }) => {
        expect(info.minimized).toBe(true)
        updated.push(name)
      },
    }) } } })
    expect(updated).toEqual(assets.slice(0, 2).map((asset) => asset.name))
  })
  it('offers an explicit upload or skip after download without automatic SharePoint writes', () => {
    const prompt = readFileSync(new URL('./fra-upload-after-download.tsx', import.meta.url), 'utf8')
    expect(page).toContain('setUploadAfterDownload(true)')
    expect(prompt).toContain('Upload to FRA section')
    expect(prompt).toContain('Not now — keep viewing FRA')
    expect(prompt).toContain('SharePoint uploads remain manual.')
    expect(prompt).toContain('await uploadFraPdfFromClient(storeId, file)')
  })
  it('opens the persisted file before considering an unfinished report in both trackers', () => {
    for (const filename of ['fra-table.tsx', 'fra-completed-table.tsx']) {
      const table = readFileSync(new URL(`./${filename}`, import.meta.url), 'utf8')
      expect(table).toContain('if (!row.fire_risk_assessment_pdf_path && row.fire_risk_assessment_instance_id)')
      expect(table).toContain('<span className="ml-1">Open</span>')
      expect(table).toContain('getFRAPDFDownloadUrl(selectedPdfRow.fire_risk_assessment_pdf_path, undefined, selectedPdfRow.id)')
      expect(table).toContain('renderPdf={(url) => <SavedFraPdfViewer url={url} />}')
    }
  })
  it('downloads confirmed stored bytes after saving without generating another PDF', () => {
    const confirm = page.slice(page.indexOf('const handleConfirmPublication'), page.indexOf('const handlePrint'))
    expect(confirm).toContain('fetch(saved.publication.url)')
    expect(confirm).toContain('link.download =')
    expect(confirm).not.toContain('generate-pdf')
    expect(confirm.indexOf("fetch('/api/fra-reports/complete'")).toBeLessThan(confirm.indexOf('fetch(saved.publication.url)'))
  })
  it('renders the stored PDF with a bundled worker instead of a native iframe', () => {
    expect(page).toContain('<SavedFraPdfViewer url={document.url} />')
    expect(page).not.toContain('<iframe title="FRA PDF for review"')
    expect(viewer).toContain("new URL('../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)")
    expect(viewer).toContain("new URL('../../node_modules/pdfjs-dist/build/pdf.min.mjs', import.meta.url)")
    expect(viewer).toContain('import(/* webpackIgnore: true */ moduleUrl)')
    expect(viewer).toContain('pdfjs.getDocument({ url, isEvalSupported: false })')
    expect(viewer).not.toContain('generate-pdf')
  })
  it('provides progress, errors, retry and page controls', () => {
    for (const text of ['role="status"', 'role="alert"', 'Retry PDF', 'PDF page number', 'Previous page', 'Next page']) expect(viewer).toContain(text)
  })
  it('keeps internal tool names out of the customer-facing status', () => {
    expect(page).not.toContain('Codex verifies')
    expect(page).not.toContain('Opening it does not rebuild')
    expect(page).not.toContain('SharePoint archival is pending.')
  })
  it('resolves the latest attachment before signing instead of trusting stale table URLs', () => {
    const action = readFileSync(new URL('../../app/actions/fra-pdfs.ts', import.meta.url), 'utf8')
    expect(action).toContain(".select('fire_risk_assessment_pdf_path').eq('id', storeId).single()")
    expect(action).toContain('filePath = store.fire_risk_assessment_pdf_path')
    expect(action.indexOf('filePath = store.fire_risk_assessment_pdf_path')).toBeLessThan(action.indexOf('.createSignedUrl(filePath'))
  })
})
