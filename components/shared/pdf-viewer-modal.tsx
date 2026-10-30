'use client'

import { ReactNode, useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileText, Download, Loader2 } from 'lucide-react'
import { isSharePointFraPdf } from '@/lib/fra/sharepoint-pdf'

interface PDFViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pdfUrl: string | null
  title?: string
  getDownloadUrl: () => Promise<string | null>
  headerActions?: ReactNode
  renderPdf?: (url: string) => ReactNode
}

export function PDFViewerModal({ 
  open, 
  onOpenChange, 
  pdfUrl, 
  title = 'PDF Viewer',
  getDownloadUrl,
  headerActions,
  renderPdf
}: PDFViewerModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setDownloadUrl(null)
    setError(null)
    setLoading(true)
    if (!open) return () => { active = false }
    void (pdfUrl ? Promise.resolve(pdfUrl) : getDownloadUrl()).then(url => {
      if (!active) return
      setDownloadUrl(url)
      setLoading(false)
    }).catch(() => {
      if (!active) return
      setError('Failed to load PDF')
      setLoading(false)
    })
    return () => { active = false }
  }, [open, pdfUrl, getDownloadUrl, attempt])

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!inset-0 !h-[100dvh] !max-h-[100dvh] !w-screen !max-w-none !overflow-hidden !p-0 !gap-0 flex flex-col md:!inset-auto md:!left-[10vw] md:!top-[5vh] md:!h-[90vh] md:!max-h-[90vh] md:!w-[80vw] md:!max-w-[80vw]">
        <DialogHeader className="border-b px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-12 flex-shrink-0 md:px-6 md:py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <DialogTitle className="min-w-0 break-words text-left text-base font-semibold md:text-lg">{title}</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              {headerActions}
              {downloadUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="flex min-h-11 items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              )}

            </div>
          </div>
        </DialogHeader>
        
        <div className="min-h-0 min-w-0 flex-1 overflow-auto bg-slate-100">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-sm text-slate-600">Loading PDF...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p role="alert" className="text-sm text-red-600">{error}</p>
                <Button variant="outline" className="mt-3 min-h-11" onClick={() => setAttempt(value => value + 1)}>Retry PDF link</Button>
              </div>
            </div>
          ) : isSharePointFraPdf(downloadUrl) ? (
            <div className="p-6 space-y-4">
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="underline">Open PDF</a>
            </div>
          ) : downloadUrl && renderPdf ? (
            <div className="min-h-full p-2 md:p-4">{renderPdf(downloadUrl)}</div>
          ) : downloadUrl ? (
            <iframe
              data-viewing-document={title}
              src={downloadUrl}
              className="w-full h-full border-0"
              title={title}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-sm text-slate-600">No saved PDF available</p>
                <Button variant="outline" className="mt-3 min-h-11" onClick={() => setAttempt(value => value + 1)}>Retry PDF link</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
