import { describe, expect, it } from 'vitest'

import { makeSpreadsheetSafe, serializeCsv } from '@/lib/csv'

describe('CSV serialization', () => {
  it.each(['=SUM(A1:A2)', '+cmd', '-2+3', '@IMPORT', '  =HYPERLINK("x")'])(
    'neutralizes spreadsheet formulas in string cells: %s',
    (value) => {
      expect(makeSpreadsheetSafe(value)).toBe(`'${value}`)
    }
  )

  it('keeps numeric negative values as numbers rather than formula-like strings', () => {
    expect(makeSpreadsheetSafe(-12)).toBe('-12')
  })

  it('quotes commas, line breaks and double quotes and includes an Excel UTF-8 BOM', () => {
    const csv = serializeCsv(['Store', 'Notes'], [['Manchester, Arndale', 'Line 1\n"Line 2"']])

    expect(csv).toBe(
      '\uFEFF"Store","Notes"\r\n"Manchester, Arndale","Line 1\n""Line 2"""'
    )
  })

  it('rejects rows that do not match the declared columns', () => {
    expect(() => serializeCsv(['A', 'B'], [['only one']])).toThrow(
      'CSV row has 1 cells but 2 headers were provided'
    )
  })
})
