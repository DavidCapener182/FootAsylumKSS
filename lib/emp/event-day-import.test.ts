import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import {
  normaliseStaffName,
  previewEmpEventMasterDeploymentXlsx,
  previewEmpEventStaffingCsv,
} from '@/lib/emp/event-day-import'

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function columnName(index: number) {
  let name = ''
  let value = index + 1
  while (value > 0) {
    const remainder = (value - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    value = Math.floor((value - remainder) / 26)
  }
  return name
}

async function workbookBufferFromRows(rows: string[][]) {
  const zip = new JSZip()
  zip.file('xl/workbook.xml', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    '<sheets><sheet name="MASTER" sheetId="1" r:id="rId1"/></sheets>',
    '</workbook>',
  ].join(''))
  zip.file('xl/_rels/workbook.xml.rels', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>',
    '</Relationships>',
  ].join(''))
  zip.file('xl/worksheets/sheet1.xml', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>',
    rows.map((row, rowIndex) => (
      `<row r="${rowIndex + 1}">`
      + row.map((value, columnIndexValue) => {
        if (!value) return ''
        const ref = `${columnName(columnIndexValue)}${rowIndex + 1}`
        return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`
      }).join('')
      + '</row>'
    )).join(''),
    '</sheetData></worksheet>',
  ].join(''))
  return await zip.generateAsync({ type: 'nodebuffer' })
}

describe('event-day staffing import', () => {
  it('normalises staff names for search and matching', () => {
    expect(normaliseStaffName('  John   Smith  ')).toBe('john smith')
  })

  it('maps common staffing CSV headers and validates rows', () => {
    const preview = previewEmpEventStaffingCsv({
      csvText: [
        'Full Name,Employer,Role,Zone,Start,Finish,SIA Number',
        'Jane Smith,KSS,Supervisor,Gate A,2026-06-20 09:00,2026-06-20 17:00,123456',
      ].join('\n'),
    })

    expect(preview.errorCount).toBe(0)
    expect(preview.validRows).toHaveLength(1)
    expect(preview.mapping.staffName).toBe('Full Name')
    expect(preview.validRows[0].row?.staffName).toBe('Jane Smith')
    expect(preview.validRows[0].row?.agency).toBe('KSS')
  })

  it('flags missing staff names as invalid', () => {
    const preview = previewEmpEventStaffingCsv({
      csvText: [
        'Name,Agency,Position,Start',
        ',KSS,Steward,2026-06-20 09:00',
      ].join('\n'),
    })

    expect(preview.errorCount).toBe(1)
    expect(preview.rows[0].errors.join(' ')).toContain('Staff name is required')
  })

  it('detects duplicate roster rows without rejecting the preview', () => {
    const preview = previewEmpEventStaffingCsv({
      csvText: [
        'Name,Agency,Position,Start,End',
        'Alex Jones,KSS,Steward,2026-06-20 09:00,2026-06-20 17:00',
        'Alex Jones,KSS,Steward,2026-06-20 09:00,2026-06-20 17:00',
      ].join('\n'),
    })

    expect(preview.errorCount).toBe(0)
    expect(preview.duplicateCount).toBe(1)
    expect(preview.rows[1].warnings.join(' ')).toContain('Possible duplicate')
  })

  it('combines time-only shift values with the EMP event date when available', () => {
    const preview = previewEmpEventStaffingCsv({
      csvText: [
        'Name,Start,End',
        'Sam Taylor,09:15,17:30',
      ].join('\n'),
      eventDateIso: '2026-06-20T00:00:00.000Z',
    })

    expect(preview.errorCount).toBe(0)
    expect(preview.validRows[0].row?.shiftStart).toContain('2026-06-20')
    expect(preview.validRows[0].row?.shiftEnd).toContain('2026-06-20')
  })

  it('flags time-only shift values when the event date is unavailable', () => {
    const preview = previewEmpEventStaffingCsv({
      csvText: [
        'Name,Start,End',
        'Sam Taylor,09:15,17:30',
      ].join('\n'),
    })

    expect(preview.errorCount).toBe(1)
    expect(preview.rows[0].errors.join(' ')).toContain('needs an event date')
  })

  it('parses master deployment XLSX rows by allowed event day', async () => {
    const buffer = await workbookBufferFromRows([
      ['', 'OUTLET+B1:T41', 'ROLE', 'Company', 'Name of Person', 'Tue 9 Jun', '', '', 'Wed 10 Jun', '', '', 'Thu 11 Jun'],
      ['', 'Outlet', 'Role', 'Company', 'Name of Person', 'START', 'END', 'HOURS', 'START', 'END', 'HOURS', 'START', 'END', 'HOURS'],
      ['', 'MGMT Team', 'MGR', 'KSS', 'Floyd Allen', '14:00', '23:30', '9.5', '07:00', '01:00', '18.0', '', '', ''],
      ['', 'Gate A', 'SIA', 'HDT', 'Alex Jones', '', '', '', '09:00', '17:00', '8.0', '10:00', '18:00', '8.0'],
      ['', 'Gate B', 'SIA', 'HDT', '', '', '', '', '09:00', '17:00', '8.0', '', '', ''],
    ])

    const preview = await previewEmpEventMasterDeploymentXlsx({
      workbookBuffer: buffer,
      allowedDateKeys: ['2026-06-10', '2026-06-11'],
      fallbackYear: 2026,
    })

    expect(preview.sourceType).toBe('master_deployment_xlsx')
    expect(preview.validRows).toHaveLength(3)
    expect(preview.errorCount).toBe(1)
    expect(preview.dayCounts).toEqual([
      { date: '2026-06-10', label: 'Wed 10 Jun', rowCount: 3, validCount: 2, skippedBlankNameCount: 1, skippedNoShowCount: 0 },
      { date: '2026-06-11', label: 'Thu 11 Jun', rowCount: 1, validCount: 1, skippedBlankNameCount: 0, skippedNoShowCount: 0 },
    ])
    expect(preview.validRows.some((row) => row.raw.Date === 'Tue 9 Jun')).toBe(false)
    expect(preview.validRows[0].row?.area).toBe('MGMT Team')
    expect(preview.validRows[0].row?.position).toBe('MGR')
  })

  it('uses master deployment hours to carry overnight finishes onto the next day', async () => {
    const buffer = await workbookBufferFromRows([
      ['', 'OUTLET+B1:T41', 'ROLE', 'Company', 'Name of Person', 'Wed 10 Jun'],
      ['', 'Outlet', 'Role', 'Company', 'Name of Person', 'START', 'END', 'HOURS'],
      ['', 'Main Gate', 'SIA', 'KSS', 'Sam Taylor', '07:00', '01:00', '18.0'],
    ])

    const preview = await previewEmpEventMasterDeploymentXlsx({
      workbookBuffer: buffer,
      allowedDateKeys: ['2026-06-10'],
      fallbackYear: 2026,
    })
    const row = preview.validRows[0].row
    expect(row?.shiftStart).toBeTruthy()
    expect(row?.shiftEnd).toBeTruthy()
    expect((new Date(row!.shiftEnd!).getTime() - new Date(row!.shiftStart!).getTime()) / 36e5).toBe(18)
  })
})
