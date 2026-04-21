'use client'

import { useEffect } from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CmpMasterTemplatePrintToolbar() {
  useEffect(() => {
    const prepareForPrint = () => {
      document.body.classList.add('cmp-master-template-browser-print')
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0

      const printStage = document.querySelector<HTMLElement>('.cmp-master-template-print-stage')
      printStage?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }

    const cleanupAfterPrint = () => {
      document.body.classList.remove('cmp-master-template-browser-print')
    }

    window.addEventListener('beforeprint', prepareForPrint)
    window.addEventListener('afterprint', cleanupAfterPrint)

    return () => {
      window.removeEventListener('beforeprint', prepareForPrint)
      window.removeEventListener('afterprint', cleanupAfterPrint)
      cleanupAfterPrint()
    }
  }, [])

  const handlePrint = () => {
    document.body.classList.add('cmp-master-template-browser-print')
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0

    const printStage = document.querySelector<HTMLElement>('.cmp-master-template-print-stage')
    printStage?.scrollTo({ top: 0, left: 0, behavior: 'auto' })

    window.setTimeout(() => {
      window.print()
    }, 50)
  }

  return (
    <Button type="button" variant="outline" onClick={handlePrint}>
      <Printer className="mr-2 h-4 w-4" />
      Print
    </Button>
  )
}
