export type CsvValue = string | number | boolean | null | undefined

const SPREADSHEET_FORMULA_PREFIX = /^[\t\r\n ]*[=+\-@]/

export function makeSpreadsheetSafe(value: CsvValue): string {
  if (value === null || value === undefined) return ''

  const text = String(value)
  return typeof value === 'string' && SPREADSHEET_FORMULA_PREFIX.test(text)
    ? `'${text}`
    : text
}

export function serializeCsv(
  headers: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<CsvValue>>
): string {
  const escapeCell = (value: CsvValue) =>
    `"${makeSpreadsheetSafe(value).replace(/"/g, '""')}"`

  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => {
      if (row.length !== headers.length) {
        throw new Error(
          `CSV row has ${row.length} cells but ${headers.length} headers were provided`
        )
      }
      return row.map(escapeCell).join(',')
    }),
  ]

  return `\uFEFF${lines.join('\r\n')}`
}
