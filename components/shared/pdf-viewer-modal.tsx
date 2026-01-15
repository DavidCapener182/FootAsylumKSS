'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileText, Download, X, Loader2 } from 'lucide-react'

interface PDFViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pdfUrl: string | null
  title?: string
  getDownloadUrl: () => Promise<string | null>
}

export function PDFViewerModal({ 
  open, 
  onOpenChange, 
  pdfUrl, 
  title = 'PDF Viewer',
  getDownloadUrl 
}: PDFViewerModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  useEffect(() => {
    if (open && !pdfUrl) {
      // Fetch the download URL when modal opens
      setLoading(true)
      setError(null)
      getDownloadUrl()
        .then(url => {
          setDownloadUrl(url)
          setLoading(false)
        })
        .catch(err => {
          console.error('Error fetching PDF URL:', err)
          setError('Failed to load PDF')
          setLoading(false)
        })
    } else if (open && pdfUrl) {
      setDownloadUrl(pdfUrl)
      setLoading(false)
    }
  }, [open, pdfUrl, getDownloadUrl])

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[80vw] !w-[80vw] md:!max-w-[80vw] md:!w-[80vw] !max-h-[90vh] !h-[90vh] md:!max-h-[90vh] md:!h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              {downloadUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden bg-slate-100">
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
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          ) : downloadUrl ? (
            <iframe
              src={downloadUrl}
              className="w-full h-full border-0"
              title={title}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-sm text-slate-600">No PDF available</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
