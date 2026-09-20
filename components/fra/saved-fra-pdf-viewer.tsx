'use client'

import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'

/** Display the saved bytes without relying on an embedded browser PDF plug-in. */
export function SavedFraPdfViewer({ url, label = "Saved FRA PDF" }: { url: string; label?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let disposed = false
    let task: ReturnType<typeof import('pdfjs-dist')['getDocument']> | undefined
    setPdf(null)
    setPage(1)
    setLoading(true)
    setError(null)
    // Load PDF.js as native ESM; its bundled exports collide with webpack's dev eval wrapper.
    const moduleUrl = new URL('../../node_modules/pdfjs-dist/build/pdf.min.mjs', import.meta.url).toString()
    void (import(/* webpackIgnore: true */ moduleUrl) as Promise<typeof import('pdfjs-dist')>).then(async (pdfjs) => {
      if (disposed) return
      if (!pdfjs.GlobalWorkerOptions.workerPort) {
        const workerUrl = new URL('../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)
        pdfjs.GlobalWorkerOptions.workerPort = new Worker(workerUrl, { type: 'module' })
      }
      task = pdfjs.getDocument({ url, isEvalSupported: false })
      const document = await task.promise
      if (!disposed) setPdf(document)
    }).catch(() => {
      if (!disposed) {
        setError('The saved PDF could not be loaded. Retry or open the PDF in a new tab.')
        setLoading(false)
      }
    })
    return () => { disposed = true; void task?.destroy() }
  }, [url, attempt])

  useEffect(() => {
    if (!pdf) return
    let disposed = false
    let render: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined
    setLoading(true)
    setError(null)
    void pdf.getPage(page).then(async (pdfPage) => {
      if (disposed || !canvas.current) return
      const target = canvas.current
      const viewport = pdfPage.getViewport({ scale: 1.5 })
      target.width = viewport.width
      target.height = viewport.height
      render = pdfPage.render({ canvas: target, viewport })
      await render.promise
      if (!disposed) setLoading(false)
    }).catch((reason) => {
      if (!disposed && reason?.name !== 'RenderingCancelledException') {
        setError('This PDF page could not be displayed. Retry or open the PDF in a new tab.')
        setLoading(false)
      }
    })
    return () => { disposed = true; render?.cancel() }
  }, [pdf, page])

  return <section aria-label={label} className="overflow-hidden rounded border bg-slate-100">
    <div className="flex flex-wrap items-center justify-center gap-3 border-b bg-white p-3">
      <button type="button" className="rounded border px-3 py-1 disabled:opacity-40" disabled={!pdf || page <= 1 || loading} onClick={() => setPage(page - 1)}>Previous page</button>
      <label className="flex items-center gap-2">Page
        <input aria-label="PDF page number" type="number" min={1} max={pdf?.numPages || 1} value={page} disabled={!pdf || loading}
          className="w-16 rounded border px-2 py-1"
          onChange={e => { const n = Number(e.target.value); if (pdf && Number.isInteger(n) && n >= 1 && n <= pdf.numPages) setPage(n) }} />
        <span>of {pdf?.numPages || '…'}</span>
      </label>
      <button type="button" className="rounded border px-3 py-1 disabled:opacity-40" disabled={!pdf || page >= pdf.numPages || loading} onClick={() => setPage(page + 1)}>Next page</button>
    </div>
    {loading && <p role="status" className="p-4 text-center">Loading saved PDF…</p>}
    {error && <div role="alert" className="p-6 text-center text-red-800">
      <p>{error}</p>
      <button type="button" className="mt-3 rounded border px-4 py-2" onClick={() => setAttempt(attempt + 1)}>Retry PDF</button>
      <a href={url} target="_blank" rel="noopener noreferrer" className="ml-4 underline">Open PDF in a new tab</a>
    </div>}
    <div className="max-h-[75vh] overflow-auto p-3">
      <canvas ref={canvas} role="img" aria-label={`${label} page ${page}`} className={`mx-auto h-auto max-w-full bg-white shadow ${loading || error ? 'hidden' : ''}`} />
    </div>
  </section>
}
