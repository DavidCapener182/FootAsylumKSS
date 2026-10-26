'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { SavedFraPdfViewer } from '@/components/fra/saved-fra-pdf-viewer'
import { readRevisitEvidence } from '@/lib/evidence/read-evidence'
import { Download, Loader2 } from 'lucide-react'

type LoadedEvidence = { url: string; filename: string; mime: string }

/** One authenticated fetch per opening; preview and download use the same verified bytes. */
export function EvidencePreviewButton({ href, title = 'Revisit evidence', filename, className, children }: {
  href: string; title?: string; filename?: string; className?: string; children: ReactNode;
}) {
  const [open, setOpen] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState<LoadedEvidence | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    let disposed = false
    let objectUrl: string | null = null
    setLoading(true); setError(null); setLoaded(null)
    void readRevisitEvidence(href, controller.signal, filename).then(file => {
      if (disposed) return
      objectUrl = URL.createObjectURL(file.blob)
      setLoaded({ url: objectUrl, filename: file.filename, mime: file.mime })
    }).catch(reason => {
      if (!disposed && !controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Evidence could not be loaded. Please retry.')
    }).finally(() => { if (!disposed) setLoading(false) })
    return () => { disposed = true; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [open, href, attempt, filename])

  const changeOpen = (value: boolean) => {
    if (!value) { setLoaded(null); setError(null); setLoading(false) }
    setOpen(value)
  }

  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild><button type="button" data-evidence-url={href} className={className}>{children}</button></DialogTrigger>
    <DialogContent className="!inset-0 !h-[100dvh] !max-h-[100dvh] !w-screen !max-w-none !overflow-hidden !p-0 !gap-0 flex flex-col md:!inset-auto md:!left-[5vw] md:!top-[5vh] md:!h-[90vh] md:!max-h-[90vh] md:!w-[90vw] md:!max-w-[90vw]">
      <DialogHeader className="flex-shrink-0 border-b p-4 pr-16 text-left">
        <DialogTitle className="break-words text-left text-base">{title}</DialogTitle>
        <DialogDescription className="text-left">Private revisit evidence. Original audit scores and open actions are unchanged.</DialogDescription>
        {loaded && <a href={loaded.url} download={loaded.filename} className="inline-flex min-h-11 max-w-full w-fit items-center gap-2 break-all rounded border border-slate-300 px-3 text-sm font-semibold"><Download className="h-4 w-4" aria-hidden="true" />Download {loaded.filename}</a>}
      </DialogHeader>
      <div className="min-h-0 min-w-0 flex-1 overflow-auto bg-slate-100 p-2 sm:p-4" aria-busy={loading}>
        {loading && <div role="status" className="flex min-h-48 items-center justify-center gap-2 text-sm"><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />Loading evidence…</div>}
        {error && <div role="alert" className="space-y-3 rounded border border-red-200 bg-white p-4 text-sm"><p>{error}</p><button type="button" onClick={() => setAttempt(value => value + 1)} className="min-h-11 rounded border px-4 font-semibold">Retry evidence</button></div>}
        {!loading && !error && loaded && (loaded.mime === 'application/pdf'
          ? <SavedFraPdfViewer key={loaded.url} url={loaded.url} label={loaded.filename} />
          : loaded.mime.startsWith('image/')
            // Blob evidence is private and cannot use the external image optimizer.
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={loaded.url} alt={loaded.filename} className="mx-auto h-auto max-w-full" />
            : <p className="rounded border bg-white p-4 text-sm">Preview is unavailable for this file type. Use Download above to open the document.</p>)}
      </div>
    </DialogContent>
  </Dialog>
}
