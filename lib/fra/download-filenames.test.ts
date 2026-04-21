import { describe, expect, it } from 'vitest'
import {
  appendNumericSuffixToFileName,
  buildFraBulkArchiveName,
  buildFraPdfFileName,
} from './download-filenames'

describe('buildFraPdfFileName', () => {
  it('builds a readable FRA PDF name from store metadata', () => {
    expect(
      buildFraPdfFileName({
        storeCode: 'S001',
        storeName: 'Manchester Arndale',
        fraDate: '2026-04-10',
      })
    ).toBe('S001-Manchester-Arndale-FRA-2026-04-10.pdf')
  })

  it('sanitizes unsafe characters and falls back when values are blank', () => {
    expect(
      buildFraPdfFileName({
        storeCode: '  ',
        storeName: '  / Trafford Centre * ',
        fraDate: null,
      })
    ).toBe('Trafford-Centre-FRA-fra.pdf')
  })
})

describe('buildFraBulkArchiveName', () => {
  it('uses a stable UTC timestamp in the archive name', () => {
    expect(buildFraBulkArchiveName(new Date('2026-04-10T12:34:56.000Z'))).toBe(
      'completed-fra-pdfs-20260410-123456.zip'
    )
  })
})

describe('appendNumericSuffixToFileName', () => {
  it('adds the numeric suffix before the extension', () => {
    expect(appendNumericSuffixToFileName('fra.pdf', 2)).toBe('fra-2.pdf')
  })
})
