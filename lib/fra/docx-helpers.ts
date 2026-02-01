/**
 * DOCX styling helpers for FRA reports.
 * Explicit typography and table styling so Word does not "guess" formatting.
 * Document defaults: A4, 15mm margins, Calibri 11pt, line 1.15, paragraph after 6pt.
 */

import {
  Paragraph,
  TextRun,
  PageBreak as PageBreakNode,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  BorderStyle,
  TableLayoutType,
  AlignmentType,
} from 'docx'

/** Font sizes in half-points (11pt = 22, 18pt = 36, 14pt = 28) */
const FONT_11 = 22
const FONT_14 = 28
const FONT_18 = 36

/** Paragraph spacing in twips (6pt = 120, 10pt = 200, 12pt = 240) */
const SPACE_6PT = 120
const SPACE_10PT = 200
const SPACE_12PT = 240

/** Table borders: outer and inner visible */
export const TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 8, color: 'A0A0A0' },
  bottom: { style: BorderStyle.SINGLE, size: 8, color: 'A0A0A0' },
  left: { style: BorderStyle.SINGLE, size: 8, color: 'A0A0A0' },
  right: { style: BorderStyle.SINGLE, size: 8, color: 'A0A0A0' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: 'D0D0D0' },
  insideVertical: { style: BorderStyle.SINGLE, size: 6, color: 'D0D0D0' },
}

export const TABLE_GRID_OPTS = {
  style: 'TableGrid' as const,
  borders: TABLE_BORDERS,
  width: { size: 100, type: WidthType.PERCENTAGE },
  layout: TableLayoutType.FIXED,
}

export const HEADER_CELL_SHADING = { fill: 'F3F4F6' }
export const CELL_MARGIN = { top: 100, bottom: 100, left: 100, right: 100 }

export function H1(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: FONT_18, font: 'Calibri' })],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: SPACE_12PT, after: SPACE_6PT },
  })
}

export function H2(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: FONT_14, font: 'Calibri' })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: SPACE_10PT, after: SPACE_6PT },
  })
}

export function P(text: string, options?: { bold?: boolean }): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: options?.bold, size: FONT_11, font: 'Calibri' })],
    spacing: { after: SPACE_6PT },
  })
}

export function Spacer(): Paragraph {
  return new Paragraph({ spacing: { after: SPACE_6PT } })
}

export function PageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreakNode()] })
}

export function labelValue(label: string, value: string): Paragraph[] {
  return [
    new Paragraph({
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: FONT_11, font: 'Calibri' }),
        new TextRun({ text: value || '—', size: FONT_11, font: 'Calibri' }),
      ],
      spacing: { after: SPACE_6PT },
    }),
  ]
}

export interface MakeCellOpts {
  bold?: boolean
  header?: boolean
  widthPercent?: number
  /** Right-align content (e.g. for TOC Page column) */
  alignRight?: boolean
}

export function makeCell(text: string, opts?: MakeCellOpts): TableCell {
  const isHeader = opts?.header ?? false
  const run = new TextRun({ text, bold: isHeader || opts?.bold, size: FONT_11, font: 'Calibri' })
  const para = opts?.alignRight
    ? new Paragraph({
        children: [run],
        alignment: AlignmentType.RIGHT,
        spacing: { after: SPACE_6PT },
      })
    : P(text, { bold: isHeader || opts?.bold })
  return new TableCell({
    children: [para],
    width: opts?.widthPercent ? { size: opts.widthPercent, type: WidthType.PERCENTAGE } : undefined,
    shading: isHeader ? HEADER_CELL_SHADING : undefined,
    margins: CELL_MARGIN,
  })
}

export function makeHeaderRow(
  ...cells: { text: string; widthPercent?: number }[]
): TableRow {
  return new TableRow({
    tableHeader: true,
    children: cells.map((c) =>
      makeCell(c.text, { header: true, widthPercent: c.widthPercent })
    ),
  })
}

export function makeTable(
  headers: { text: string; widthPercent?: number }[],
  rows: string[][],
  columnPercents?: number[]
): Table {
  const defaultPercents = headers.length === 3
    ? [50, 25, 25]
    : headers.length === 4
    ? [20, 25, 30, 25]
    : headers.map(() => 100 / headers.length)
  const percents = columnPercents ?? defaultPercents

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      makeCell(h.text, {
        header: true,
        widthPercent: h.widthPercent ?? percents[i],
      })
    ),
  })

  const dataRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map((cell, i) =>
          makeCell(cell, { widthPercent: percents[i] })
        ),
      })
  )

  return new Table({
    rows: [headerRow, ...dataRows],
    ...TABLE_GRID_OPTS,
  })
}
