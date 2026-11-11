import { describe, expect, it } from 'vitest'
import { readPreOpeningPdfToc, PRE_OPENING_TOC_HEADINGS, resolvePreOpeningToc } from './pdf-toc'

describe('pre-opening physical PDF contents', () => {
  it('uses physical pages after arbitrary photo and findings overflow, not section indices', () => {
    const labels = Object.keys(PRE_OPENING_TOC_HEADINGS)
    const pages = [{ num: 3, text: `Table of Contents\n${labels.map(label => `${label}\t2`).join('\n')}` },
      ...labels.map((label, index) => ({ num: 4 + index * 3, text: `Pre-Opening Fire Risk Assessment\n${PRE_OPENING_TOC_HEADINGS[label]}\nBody text` }))]
    const result = resolvePreOpeningToc(pages, labels)
    expect(result['Purpose of This Assessment']).toBe(4)
    expect(result['Action Plan']).toBe(46)
    expect(result['Additional Site Pictures / Appendices']).toBe(49)
  })
  it('finds headings wrapped across lines and ignores numbered TOC entries', () => {
    const label = 'Stage 3 – Evaluate, remove, reduce and protect from risk'
    expect(resolvePreOpeningToc([
      { num: 3, text: `${label}\t10` },
      { num: 25, text: 'Stage 3 – Evaluate, remove, reduce and\nprotect from risk\nMore text' },
    ], [label])[label]).toBe(25)
  })
  it('reads real PDF page numbers and preserves the bytes returned to the client', async () => {
    const { PDFDocument } = await import('pdf-lib')
    const doc = await PDFDocument.create()
    doc.addPage().drawText('Fire Plan 2') // TOC entry, not the destination
    for (let i = 0; i < 5; i++) doc.addPage().drawText('Photo / long findings continuation')
    doc.addPage().drawText('Fire Plan')
    const bytes = await doc.save()
    const before = Buffer.from(bytes)
    expect(await readPreOpeningPdfToc(bytes, ['Fire Plan'])).toEqual({ 'Fire Plan': 7 })
    expect(Buffer.from(bytes)).toEqual(before)
  })
  it('fails rather than publishing missing, ambiguous or unknown targets', () => {
    expect(() => resolvePreOpeningToc([], ['Fire Plan'])).toThrow('0 matching pages')
    expect(() => resolvePreOpeningToc([{num: 2,text:'Fire Plan'}, {num: 7,text:'Fire Plan'}], ['Fire Plan'])).toThrow('2 matching pages')
    expect(() => resolvePreOpeningToc([], ['New heading'])).toThrow('Unrecognized')
  })
})
