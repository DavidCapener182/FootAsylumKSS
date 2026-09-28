import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToBuffer } from '@react-pdf/renderer'
import DOMMatrix from '@thednp/dommatrix'
import { MonthlyNewsletterPDF } from './monthly-newsletter-document-v6'
import type { AreaNewsletterReport } from '@/lib/reports/monthly-newsletter-types'

describe('area PDF pagination', () => {
  it('keeps each priority heading, introduction and first finding on one page', async () => {
    const focusItems = Array.from({ length: 10 }, (_, i) => ({
      topic: `PRIORITY-${i}`, actionCount: 3, storeCount: 1, highPriorityCount: 0, overdueCount: 0,
      managerPrompt: 'Review the recorded finding with the store and retain evidence of correction.',
      findings: Array.from({ length: 3 }, (_, j) => ({ question: `CHECK-${i}-${j}: Is the recorded safety control in place and evidenced?`, stores: ['Example store (S0001)'], actionCount: 1 })),
    }))
    const report = {
      areaLabel: 'Area 1', storeCount: 0, stores: [], areaManagerName: 'Area manager',
      storeActionMetrics: { activeCount: 30, highPriorityCount: 0, overdueCount: 0, focusItems },
      reminders: [], legislationUpdates: [], fraMetrics: { upToDate: 0, dueSoon: 0, overdue: 0, required: 0, notableItems: [] },
    } as unknown as AreaNewsletterReport
    const buffer = await renderToBuffer(<MonthlyNewsletterPDF report={report} periodLabel="Second Half 2026" generatedAt="2026-09-13" />)
    ;(globalThis as any).DOMMatrix ||= DOMMatrix
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: buffer })
    try {
      const { pages } = await parser.getText()
      expect(pages.length).toBeGreaterThan(4)
      for (let i = 0; i < 10; i++) {
        const page = pages.find((p) => p.text.includes(`PRIORITY-${i}`))
        expect(page, `priority ${i} must be present`).toBeDefined()
        expect(page!.text).toContain(`CHECK-${i}-0`)
      }
    } finally { await parser.destroy() }
  }, 30000)
})
