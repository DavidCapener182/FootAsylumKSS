import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapHSAuditToFRAData } from '@/app/actions/fra-reports'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  PageBreak,
  Tab,
  Header,
  Footer,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  ImageRun,
  BorderStyle,
  PageNumber,
  sectionPageSizeDefaults,
} from 'docx'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/** A4 15mm margins in twips (1mm ≈ 56.7 twips) */
const MARGIN_15MM = 850

/** Table borders: outer 8pt, inner 6pt so tables are visibly tables in Word */
const TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 8, color: 'A0A0A0' },
  bottom: { style: BorderStyle.SINGLE, size: 8, color: 'A0A0A0' },
  left: { style: BorderStyle.SINGLE, size: 8, color: 'A0A0A0' },
  right: { style: BorderStyle.SINGLE, size: 8, color: 'A0A0A0' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: 'D0D0D0' },
  insideVertical: { style: BorderStyle.SINGLE, size: 6, color: 'D0D0D0' },
}

const TABLE_GRID_OPTS = {
  style: 'TableGrid' as const,
  borders: TABLE_BORDERS,
  width: { size: 100, type: WidthType.PERCENTAGE },
}

/** Header row cell shading so header stands out */
const HEADER_CELL_SHADING = { fill: 'F3F4F6' }

/** Cell margins in twips so table cells don't look cramped (≈1.8mm) */
const CELL_MARGIN = { top: 100, bottom: 100, left: 100, right: 100 }

type FRAData = Awaited<ReturnType<typeof mapHSAuditToFRAData>>

/** Image buffer + type for DOCX ImageRun */
type PlaceholderPhotoBuffer = { data: Buffer; type: 'jpg' | 'png' | 'gif' | 'bmp' }

/**
 * Load FRA placeholder photos from storage and return buffers for embedding in DOCX.
 * Path pattern: fra/{instanceId}/photos/{placeholderId}/{fileName}
 */
async function loadPlaceholderPhotoBuffers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  instanceId: string
): Promise<Record<string, PlaceholderPhotoBuffer[]>> {
  const result: Record<string, PlaceholderPhotoBuffer[]> = {}
  const prefix = `fra/${instanceId}/photos`
  const { data: placeholders, error: listError } = await supabase.storage
    .from('fa-attachments')
    .list(prefix, { limit: 50 })

  if (listError || !placeholders?.length) return result

  for (const item of placeholders) {
    const placeholderId = item.name
    if (!placeholderId || placeholderId.includes('/')) continue
    const folderPath = `${prefix}/${placeholderId}`
    const { data: files, error: filesError } = await supabase.storage
      .from('fa-attachments')
      .list(folderPath, { limit: 20 })

    if (filesError || !files?.length) continue

    const buffers: PlaceholderPhotoBuffer[] = []
    for (const f of files) {
      if (!f.name) continue
      const filePath = `${folderPath}/${f.name}`
      const ext = f.name.split('.').pop()?.toLowerCase()
      const type = (ext === 'png' ? 'png' : ext === 'gif' ? 'gif' : ext === 'bmp' ? 'bmp' : 'jpg') as PlaceholderPhotoBuffer['type']
      const { data: blob, error: downloadError } = await supabase.storage
        .from('fa-attachments')
        .download(filePath)
      if (downloadError || !blob) continue
      const arrayBuffer = await blob.arrayBuffer()
      buffers.push({ data: Buffer.from(arrayBuffer), type })
    }
    if (buffers.length) result[placeholderId] = buffers
  }

  return result
}

/** Default font 11pt (22 half-points), paragraph spacing after 6pt (120 twips) */
const FONT_11 = 22
const SPACE_6PT = 120

function docxPageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] })
}

function H1(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 36, font: 'Calibri' })],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 160 },
  })
}

function H2(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 28, font: 'Calibri' })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 120 },
  })
}

function P(text: string, options?: { bold?: boolean }): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: options?.bold, size: FONT_11, font: 'Calibri' })],
    spacing: { after: SPACE_6PT },
  })
}

function Spacer(): Paragraph {
  return new Paragraph({ spacing: { after: SPACE_6PT } })
}

function labelValue(label: string, value: string): Paragraph[] {
  return [
    new Paragraph({
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: FONT_11, font: 'Calibri' }),
        new TextRun({ text: value || '—', size: FONT_11, font: 'Calibri' }),
      ],
      spacing: { after: 80 },
    }),
  ]
}

/** Alias for existing para() call sites */
function para(text: string, options?: { bold?: boolean }): Paragraph {
  return P(text, options)
}

function heading1(text: string): Paragraph {
  return H1(text)
}

function heading2(text: string): Paragraph {
  return H2(text)
}

function pageBreak(): Paragraph {
  return docxPageBreak()
}

const DOCX_IMAGE_WIDTH = 300
const DOCX_IMAGE_HEIGHT = 200

function buildDocxChildren(
  data: FRAData,
  placeholderPhotoBuffers?: Record<string, PlaceholderPhotoBuffer[]>
): (Paragraph | Table)[] {
  const dateStr = data.assessmentDate
    ? new Date(data.assessmentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  const children: (Paragraph | Table)[] = []

  // Cover
  children.push(heading1('Fire Risk Assessment - Review'))
  children.push(para('Page 1'))
  children.push(new Paragraph({ spacing: { after: 400 } }))
  children.push(heading2(data.premises || 'Premises'))
  children.push(...labelValue('Client Name', data.clientName))
  children.push(...labelValue('Premises', data.premises || ''))
  children.push(...labelValue('Address', data.address || ''))
  children.push(...labelValue('Responsible person (as defined by the Regulatory Reform (Fire Safety) Order 2025)', data.responsiblePerson))
  children.push(...labelValue('Ultimate responsible person', data.ultimateResponsiblePerson))
  children.push(...labelValue(`Appointed Person at ${data.premises || 'premises'}`, data.appointedPerson))
  children.push(para('Responsibilities of Appointed Person', { bold: true }))
  children.push(para('Ensuring effective communication and coordination of emergency response arrangements; Oversight of Fire Wardens and Fire Marshals; Ensuring fire drills are conducted and recorded; Ensuring staff fire safety training is completed and maintained; Communicating non-compliance and concerns to Head Office; Implementing and maintaining the site Fire Safety Plan.'))
  children.push(...labelValue('Name of person undertaking the assessment', `${data.assessorName || ''} – KSS NW Ltd`))
  children.push(...labelValue('Assessment date', data.assessmentDate || 'Not specified'))
  if (data.assessmentStartTime) children.push(...labelValue('Assessment start time', data.assessmentStartTime))
  if (data.assessmentEndTime) children.push(...labelValue('Assessment end time', data.assessmentEndTime))

  children.push(pageBreak())

  // Photo of Site / Building / Premises (with embedded images if uploaded)
  children.push(heading2('Photo of Site / Building / Premises'))
  const sitePhotos = placeholderPhotoBuffers?.['site-premises-photos']
  if (sitePhotos?.length) {
    for (const img of sitePhotos) {
      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              type: img.type,
              data: img.data,
              transformation: {
                width: DOCX_IMAGE_WIDTH,
                height: DOCX_IMAGE_HEIGHT,
              },
            }),
          ],
          spacing: { after: 120 },
        })
      )
    }
  } else {
    children.push(para('Add screenshots or photos of the site, building and premises.'))
  }

  children.push(pageBreak())

  // Table of Contents
  children.push(heading2('Table of Contents'))
  children.push(para('Purpose of This Assessment'))
  children.push(para('Regulatory Reform (Fire Safety) Order 2005 – Fire Risk Assessment'))
  children.push(para('Travel Distances'))
  children.push(para('Category L Fire Alarm Systems'))
  children.push(para('Fire Resistance'))
  children.push(para('Fire Risk Assessment – Terms, Conditions and Limitations'))
  children.push(para('About the Property'))
  children.push(para('Stage 1 – Fire Hazards'))
  children.push(para('Stage 2 – People at Risk'))
  children.push(para('Stage 3 – Evaluate, remove, reduce and protect from risk'))
  children.push(para('Fire Plan'))
  children.push(para('Risk Rating'))
  children.push(para('Action Plan'))

  children.push(pageBreak())

  // Purpose
  children.push(heading2('Purpose of This Assessment'))
  children.push(para('The purpose of this Fire Risk Assessment is to provide a suitable and sufficient assessment of the risk to life from fire within the above premises and to confirm that appropriate fire safety measures are in place to comply with current fire safety legislation.'))
  children.push(para('This assessment relates solely to life safety and does not address business continuity or property protection.'))
  children.push(para('This document represents a live, operational Fire Risk Assessment and supersedes the pre-opening assumptions contained within the previous assessment.'))

  children.push(pageBreak())

  // Regulatory Reform
  children.push(heading2('Regulatory Reform (Fire Safety) Order 2005'))
  children.push(heading2('FIRE RISK ASSESSMENT'))
  children.push(new Paragraph({ spacing: { after: 200 } }))
  children.push(para('(5 steps – identify hazards, people at risk, evaluate, record, review)'))

  children.push(pageBreak())

  // Travel Distances (real table so DOCX has visible structure)
  children.push(heading2('Travel Distances'))
  children.push(para('Travel distances and fire-fighting equipment are documented in the tables below.'))
  const travelRows = [
    new TableRow({
      children: [
        new TableCell({ children: [para('Floor / Area', { bold: true })], width: { size: 30, type: WidthType.PERCENTAGE }, shading: HEADER_CELL_SHADING, margins: CELL_MARGIN }),
        new TableCell({ children: [para('Max travel distance (m)', { bold: true })], width: { size: 25, type: WidthType.PERCENTAGE }, shading: HEADER_CELL_SHADING, margins: CELL_MARGIN }),
        new TableCell({ children: [para('Notes', { bold: true })], width: { size: 45, type: WidthType.PERCENTAGE }, shading: HEADER_CELL_SHADING, margins: CELL_MARGIN }),
      ],
      tableHeader: true,
    }),
    new TableRow({
      children: [
        new TableCell({ children: [para('Ground floor')], margins: CELL_MARGIN }),
        new TableCell({ children: [para('18 (single direction)')], margins: CELL_MARGIN }),
        new TableCell({ children: [para('In line with BS 9999')], margins: CELL_MARGIN }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [para('First floor and above')], margins: CELL_MARGIN }),
        new TableCell({ children: [para('45 (multi-direction)')], margins: CELL_MARGIN }),
        new TableCell({ children: [para('As applicable')], margins: CELL_MARGIN }),
      ],
    }),
  ]
  children.push(new Table({ rows: travelRows, ...TABLE_GRID_OPTS }))
  children.push(new Paragraph({ spacing: { after: 200 } }))

  // Fire Resistance (real table)
  children.push(heading2('Fire Resistance'))
  const fireResistRows = [
    new TableRow({
      children: [
        new TableCell({ children: [para('Element', { bold: true })], width: { size: 30, type: WidthType.PERCENTAGE }, shading: HEADER_CELL_SHADING, margins: CELL_MARGIN }),
        new TableCell({ children: [para('Standard', { bold: true })], width: { size: 25, type: WidthType.PERCENTAGE }, shading: HEADER_CELL_SHADING, margins: CELL_MARGIN }),
        new TableCell({ children: [para('Condition', { bold: true })], width: { size: 45, type: WidthType.PERCENTAGE }, shading: HEADER_CELL_SHADING, margins: CELL_MARGIN }),
      ],
      tableHeader: true,
    }),
    new TableRow({
      children: [
        new TableCell({ children: [para('Internal fire doors')], margins: CELL_MARGIN }),
        new TableCell({ children: [para('FD30 / appropriate standard')], margins: CELL_MARGIN }),
        new TableCell({ children: [para(data.internalFireDoors?.slice(0, 80) ?? 'To be verified')], margins: CELL_MARGIN }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [para('Compartmentation')], margins: CELL_MARGIN }),
        new TableCell({ children: [para('As per building design')], margins: CELL_MARGIN }),
        new TableCell({ children: [para('Observed at time of assessment')], margins: CELL_MARGIN }),
      ],
    }),
  ]
  children.push(new Table({ rows: fireResistRows, ...TABLE_GRID_OPTS }))

  children.push(pageBreak())

  // About the Property
  children.push(heading2('About the Property'))
  children.push(...labelValue('Property type', data.propertyType))
  children.push(...labelValue('Description', data.description))
  children.push(...labelValue('Number of floors', data.numberOfFloors))
  children.push(...labelValue('Floor area', data.floorArea))
  if (data.floorAreaComment) children.push(...labelValue('Floor area comment', data.floorAreaComment))
  children.push(...labelValue('Occupancy', data.occupancy))
  if (data.occupancyComment) children.push(...labelValue('Occupancy comment', data.occupancyComment))
  children.push(...labelValue('Operating hours', data.operatingHours))
  if (data.operatingHoursComment) children.push(...labelValue('Operating hours comment', data.operatingHoursComment))
  children.push(...labelValue('Build date', data.buildDate))
  const d = data as FRAData & { storeOpeningTimes?: string; accessDescription?: string }
  if (d.storeOpeningTimes) children.push(...labelValue('Store opening times', d.storeOpeningTimes))
  if (d.accessDescription) children.push(...labelValue('Access description', d.accessDescription))

  children.push(pageBreak())

  // Stage 1 – Fire Hazards
  children.push(heading2('Stage 1 – Fire Hazards'))
  children.push(para('Sources of ignition:', { bold: true }))
  children.push(para((data.sourcesOfIgnition && data.sourcesOfIgnition.length) ? data.sourcesOfIgnition.join('; ') : 'None identified'))
  children.push(para('Sources of fuel:', { bold: true }))
  children.push(para((data.sourcesOfFuel && data.sourcesOfFuel.length) ? data.sourcesOfFuel.join('; ') : 'None identified'))
  children.push(para('Sources of oxygen:', { bold: true }))
  children.push(para((data.sourcesOfOxygen && data.sourcesOfOxygen.length) ? data.sourcesOfOxygen.join('; ') : 'Normal atmosphere'))

  children.push(pageBreak())

  // Stage 2 – People at Risk
  children.push(heading2('Stage 2 – People at Risk'))
  children.push(para((data.peopleAtRisk && data.peopleAtRisk.length) ? data.peopleAtRisk.join('; ') : 'Persons in the premises.'))

  children.push(pageBreak())

  // Stage 3 – Evaluate
  children.push(heading2('Stage 3 – Evaluate, remove, reduce and protect from risk'))
  children.push(para('Significant findings:', { bold: true }))
  children.push(para((data.significantFindings && data.significantFindings.length) ? data.significantFindings.join('; ') : '—'))
  children.push(para('Recommended controls:', { bold: true }))
  children.push(para((data.recommendedControls && data.recommendedControls.length) ? data.recommendedControls.join('; ') : '—'))
  children.push(...labelValue('Sleeping risk', data.sleepingRisk))
  children.push(...labelValue('Internal fire doors', data.internalFireDoors))
  children.push(...labelValue('History of fires', data.historyOfFires))
  children.push(...labelValue('Fire alarm description', data.fireAlarmDescription))
  children.push(...labelValue('Fire alarm panel location', data.fireAlarmPanelLocation))
  children.push(...labelValue('Emergency lighting description', data.emergencyLightingDescription))
  children.push(...labelValue('Fire extinguishers description', data.fireExtinguishersDescription))
  if (data.hasSprinklers) {
    children.push(...labelValue('Sprinkler description', data.sprinklerDescription))
    children.push(...labelValue('Sprinkler clearance', data.sprinklerClearance))
  }

  children.push(pageBreak())

  // Fire Plan
  children.push(heading2('Fire Plan'))
  children.push(para('Fire safety arrangements and evacuation procedures are in place as per the Fire Safety Order.'))

  children.push(pageBreak())

  // Risk Rating
  children.push(heading2('Risk Rating'))
  children.push(...labelValue('Likelihood', data.riskRatingLikelihood ?? '—'))
  children.push(...labelValue('Consequences', data.riskRatingConsequences ?? '—'))
  children.push(...labelValue('Summary', data.summaryOfRiskRating ?? '—'))

  children.push(pageBreak())

  // Action Plan
  children.push(heading2('Action Plan'))
  if (data.actionPlanItems && data.actionPlanItems.length > 0) {
    const rows = [
      new TableRow({
        children: [
          new TableCell({ children: [para('Recommendation', { bold: true })], width: { size: 55, type: WidthType.PERCENTAGE }, shading: HEADER_CELL_SHADING, margins: CELL_MARGIN }),
          new TableCell({ children: [para('Priority', { bold: true })], width: { size: 25, type: WidthType.PERCENTAGE }, shading: HEADER_CELL_SHADING, margins: CELL_MARGIN }),
          new TableCell({ children: [para('Due', { bold: true })], width: { size: 20, type: WidthType.PERCENTAGE }, shading: HEADER_CELL_SHADING, margins: CELL_MARGIN }),
        ],
        tableHeader: true,
      }),
      ...data.actionPlanItems.map(
        (item: { recommendation: string; priority: string; dueNote?: string }) =>
          new TableRow({
            children: [
              new TableCell({ children: [para(item.recommendation)], margins: CELL_MARGIN }),
              new TableCell({ children: [para(item.priority)], margins: CELL_MARGIN }),
              new TableCell({ children: [para(item.dueNote || '—')], margins: CELL_MARGIN }),
            ],
          })
      ),
    ]
    children.push(new Table({ rows, ...TABLE_GRID_OPTS }))
  } else {
    children.push(para('No action plan items recorded.'))
  }

  return children
}

/**
 * Generate a DOCX of the FRA report from structured data.
 * DOCX is built server-side using the docx library; page breaks are inserted between major sections.
 * Filename format: FRA - (Store Name) (DD-MMM-YYYY).docx
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const instanceId = searchParams.get('instanceId')

    if (!instanceId) {
      return NextResponse.json({ error: 'instanceId is required' }, { status: 400 })
    }

    const fraData = await mapHSAuditToFRAData(instanceId)
    const premises = fraData.premises ?? 'Report'
    const dateStr = fraData.assessmentDate
      ? new Date(fraData.assessmentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : '—'

    const placeholderPhotoBuffers = await loadPlaceholderPhotoBuffers(supabase, instanceId)
    const docChildren = buildDocxChildren(fraData, placeholderPhotoBuffers)

    const buildStamp = new Date().toISOString()

    const header = new Header({
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: 'KSS NW Ltd', size: 20, font: 'Calibri' }),
            new Tab(),
            new TextRun({ text: `Fire Risk Assessment – ${premises}`, size: 20, font: 'Calibri' }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ],
    })

    const footer = new Footer({
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: `Generated: ${buildStamp} | Instance: ${instanceId}`, size: 18, color: '666666', font: 'Calibri' }),
            new Tab(),
            new TextRun({
              children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES],
              size: 18,
              font: 'Calibri',
            }),
          ],
          alignment: AlignmentType.JUSTIFIED,
        }),
      ],
    })

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              size: { width: sectionPageSizeDefaults.WIDTH, height: sectionPageSizeDefaults.HEIGHT },
              margin: { top: MARGIN_15MM, right: MARGIN_15MM, bottom: MARGIN_15MM, left: MARGIN_15MM },
            },
          },
          headers: { default: header },
          footers: { default: footer },
          children: docChildren,
        },
      ],
    })

    const buffer = await Packer.toBuffer(doc)
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const safeName = (premises ?? 'Report').replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 60)
    const filename = `FRA-${safeName}-${stamp}.docx`

    return new Response(buffer as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '\\"')}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error: any) {
    console.error('Error generating FRA DOCX:', error)
    return NextResponse.json(
      { error: 'Failed to generate DOCX', details: error.message },
      { status: 500 }
    )
  }
}
