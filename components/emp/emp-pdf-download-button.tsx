'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function filenameFromDisposition(disposition: string | null, fallback: string) {
  const match = disposition?.match(/filename="([^"]+)"/i)
  return match?.[1] || fallback
}

async function downloadFile(url: string, fallbackFilename: string) {
  const response = await fetch(url, { credentials: 'include' })
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`)
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filenameFromDisposition(response.headers.get('content-disposition'), fallbackFilename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

export function EmpPdfDownloadButton({ planId }: { planId: string }) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (downloading) return

    setDownloading(true)
    try {
      await downloadFile(`/api/emp/generate-pdf?planId=${encodeURIComponent(planId)}`, 'event-management-plan.pdf')
      await downloadFile(`/api/emp/generate-pdf?planId=${encodeURIComponent(planId)}&document=risk-assessment`, 'operational-risk-assessment.pdf')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      className={cn(buttonVariants({ variant: 'default' }), downloading && 'opacity-70')}
    >
      <Download className="mr-2 h-4 w-4" />
      {downloading ? 'Downloading...' : 'Download PDF'}
    </button>
  )
}
