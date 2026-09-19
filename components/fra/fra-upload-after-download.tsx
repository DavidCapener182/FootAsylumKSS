'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { uploadFraPdfFromClient } from '@/lib/fra/upload-pdf-client'

export function FraUploadAfterDownload({ open, onOpenChange, storeId }: {
  open: boolean; onOpenChange: (open: boolean) => void; storeId?: string
}) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const upload = async () => {
    if (!file || !storeId) return
    setBusy(true)
    setMessage('')
    try {
      await uploadFraPdfFromClient(storeId, file)
      setMessage('PDF uploaded. You can now open it from the FRA section.')
      setFile(null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload failed. Your FRA remains available.')
    } finally { setBusy(false) }
  }
  return <Dialog open={open} onOpenChange={(value) => { if (!busy) onOpenChange(value) }}>
    <DialogContent>
      <DialogHeader><DialogTitle>Upload your downloaded FRA PDF</DialogTitle></DialogHeader>
      <p>Choose the PDF you downloaded to make it the file shown in the FRA section. Any existing file is retained in storage. If you skip this, your FRA remains available to view.</p>
      <p className="text-sm text-muted-foreground">SharePoint uploads remain manual.</p>
      <input aria-label="Choose FRA PDF" type="file" accept=".pdf,application/pdf" disabled={busy} onChange={(event) => { setFile(event.target.files?.[0] || null); setMessage('') }} />
      {message && <p role="status">{message}</p>}
      <div className="flex gap-2">
        <Button disabled={busy || !file || !storeId} onClick={upload}>{busy ? 'Uploading…' : 'Upload to FRA section'}</Button>
        <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Not now — keep viewing FRA</Button>
      </div>
      <a className="underline" href="/fire-risk-assessment">Open FRA section</a>
    </DialogContent>
  </Dialog>
}
