import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EmpPreviewDocument } from '@/components/emp/emp-preview-document'
import { buildEmpPreviewModel, renderEmpPreviewHtml } from '@/lib/emp/preview'

const document = {
  documentKind: 'deployment_matrix', fileName: 'Sterling.xlsx', fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', signedUrl: null,
  extractedText: JSON.stringify({ format: 'emp-deployment-appendix-v1', days: [{ title: 'Friday deployment', rows: Array.from({ length: 32 }, (_, i) => ['BAR 1', `POST ${i + 1}`, 'Named Person', 'KSS', '15:30', '22:30', '-', '-']) }] }),
}

describe('deployment appendix', () => {
  it('preserves every row, splits into bounded tables, and follows the complete risk assessment', () => {
    const model = buildEmpPreviewModel({ fieldValues: {}, selectedAnnexes: [], documents: [document] })
    expect(model.deploymentAppendices?.[0].blocks.map((b) => b.type === 'multi_table' ? b.rows.length : 0)).toEqual([14, 14, 4])
    const html = renderToStaticMarkup(createElement(EmpPreviewDocument, { model }))
    expect(html.indexOf('Friday deployment')).toBeGreaterThan(html.lastIndexOf('emp-ra-footer'))
    expect(html).toContain('POST 32')
    const docxHtml = renderEmpPreviewHtml(model)
    expect(docxHtml.indexOf('Friday deployment')).toBeGreaterThan(docxHtml.lastIndexOf('emp-ra-html-section'))
    const raOnly = renderToStaticMarkup(createElement(EmpPreviewDocument, { model, output: 'risk-assessment' }))
    expect(raOnly).not.toContain('Friday deployment')
  })
  it('ignores ordinary extraction text and malformed structured attachments', () => {
    for (const extractedText of ['ordinary spreadsheet extraction', '{"format":"emp-deployment-appendix-v1","days":[{"title":"Bad","rows":[[1]]}]}']) {
      expect(buildEmpPreviewModel({ fieldValues: {}, selectedAnnexes: [], documents: [{ ...document, extractedText }] }).deploymentAppendices).toEqual([])
    }
  })
})
