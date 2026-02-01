import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapHSAuditToFRAData } from '@/app/actions/fra-reports'
import { FRA_SECTIONS } from '@/lib/fra/report-sections'
import {
  H1,
  H2,
  P,
  Spacer,
  labelValue,
  makeTable,
  makeHeaderRow,
  makeCell,
  TABLE_GRID_OPTS,
  HEADER_CELL_SHADING,
  CELL_MARGIN,
} from '@/lib/fra/docx-helpers'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Tab,
  Header,
  Footer,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ImageRun,
  PageNumber,
  sectionPageSizeDefaults,
} from 'docx'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/** A4 15mm margins in twips (1mm ≈ 56.7 twips) */
const MARGIN_15MM = 850

function getBuildId(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return String(Date.now())
  }
}

type FRAData = Awaited<ReturnType<typeof mapHSAuditToFRAData>>

type PlaceholderPhotoBuffer = { data: Buffer; type: 'jpg' | 'png' | 'gif' | 'bmp' }

interface BuildContext {
  data: FRAData
  placeholderPhotoBuffers?: Record<string, PlaceholderPhotoBuffer[]>
  instanceId: string
}

/** Paragraph alias */
function para(text: string, options?: { bold?: boolean }) {
  return P(text, options)
}

/**
 * Load FRA placeholder photos from storage.
 */
async function loadPlaceholderPhotoBuffers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  instanceId: string
): Promise<Record<string, PlaceholderPhotoBuffer[]>> {
  const result: Record<string, PlaceholderPhotoBuffer[]> = {}
  const prefix = `fra/${instanceId}/photos`
  const { data: placeholders } = await supabase.storage
    .from('fa-attachments')
    .list(prefix, { limit: 50 })

  if (!placeholders?.length) return result

  for (const item of placeholders) {
    const placeholderId = item.name
    if (!placeholderId || placeholderId.includes('/')) continue
    const folderPath = `${prefix}/${placeholderId}`
    const { data: files } = await supabase.storage
      .from('fa-attachments')
      .list(folderPath, { limit: 20 })

    if (!files?.length) continue

    const buffers: PlaceholderPhotoBuffer[] = []
    for (const f of files) {
      if (!f.name) continue
      const filePath = `${folderPath}/${f.name}`
      const ext = f.name.split('.').pop()?.toLowerCase()
      const type = (ext === 'png' ? 'png' : ext === 'gif' ? 'gif' : ext === 'bmp' ? 'bmp' : 'jpg') as PlaceholderPhotoBuffer['type']
      const { data: blob } = await supabase.storage.from('fa-attachments').download(filePath)
      if (!blob) continue
      buffers.push({ data: Buffer.from(await blob.arrayBuffer()), type })
    }
    if (buffers.length) result[placeholderId] = buffers
  }
  return result
}

/** Load Category L diagram from public folder. Returns { buffer, size } or null. */
function loadCategoryLImage(): { buffer: Buffer; size: number } | null {
  try {
    const p = path.join(process.cwd(), 'public', 'fra-category-l-fire-alarm-systems.png')
    const buffer = fs.readFileSync(p)
    return { buffer, size: buffer.length }
  } catch {
    return null
  }
}

const DOCX_IMAGE_WIDTH = 300
const DOCX_IMAGE_HEIGHT = 200
const DOCX_CATEGORY_L_WIDTH = 450
const DOCX_CATEGORY_L_HEIGHT = 300

function buildSectionCover(ctx: BuildContext): (Paragraph | Table)[] {
  const { data } = ctx
  const out: (Paragraph | Table)[] = []
  out.push(H1('Fire Risk Assessment - Review'))
  out.push(para('Page 1'))
  out.push(new Paragraph({ spacing: { after: 400 } }))
  out.push(H2(data.premises || 'Premises'))
  out.push(...labelValue('Client Name', data.clientName))
  out.push(...labelValue('Premises', data.premises || ''))
  out.push(...labelValue('Address', data.address || ''))
  out.push(...labelValue('Responsible person (as defined by the Regulatory Reform (Fire Safety) Order 2025)', data.responsiblePerson))
  out.push(...labelValue('Ultimate responsible person', data.ultimateResponsiblePerson))
  out.push(...labelValue(`Appointed Person at ${data.premises || 'premises'}`, data.appointedPerson))
  out.push(para('Responsibilities of Appointed Person', { bold: true }))
  out.push(para('Ensuring effective communication and coordination of emergency response arrangements; Oversight of Fire Wardens and Fire Marshals; Ensuring fire drills are conducted and recorded; Ensuring staff fire safety training is completed and maintained; Communicating non-compliance and concerns to Head Office; Implementing and maintaining the site Fire Safety Plan.'))
  out.push(...labelValue('Name of person undertaking the assessment', `${data.assessorName || ''} – KSS NW Ltd`))
  out.push(...labelValue('Assessment date', data.assessmentDate || 'Not specified'))
  if (data.assessmentStartTime) out.push(...labelValue('Assessment start time', data.assessmentStartTime))
  if (data.assessmentEndTime) out.push(...labelValue('Assessment end time', data.assessmentEndTime))
  return out
}

function buildSectionPhotosToc(ctx: BuildContext): (Paragraph | Table)[] {
  const { data, placeholderPhotoBuffers } = ctx
  const out: (Paragraph | Table)[] = []
  out.push(H2('Photo of Site / Building / Premises'))
  out.push(para('Add screenshots or photos of the site, building and premises (e.g. from pages 3–6 of the reference FRA).'))
  const sitePhotos = placeholderPhotoBuffers?.['site-premises-photos']
  if (sitePhotos?.length) {
    for (const img of sitePhotos) {
      out.push(
        new Paragraph({
          keepNext: true,
          children: [
            new ImageRun({
              type: img.type,
              data: img.data,
              transformation: { width: DOCX_IMAGE_WIDTH, height: DOCX_IMAGE_HEIGHT },
            }),
          ],
          spacing: { after: 120 },
        })
      )
    }
  }
  out.push(new Paragraph({ spacing: { after: 200 } }))
  out.push(H2('Table of Contents'))
  const tocItems: [string, string][] = [
    ['Purpose of This Assessment', ''],
    ['Regulatory Reform (Fire Safety) Order 2005 – Fire Risk Assessment', ''],
    ['Travel Distances', ''],
    ['Category L Fire Alarm Systems - Life Protection', ''],
    ['Fire Resistance', ''],
    ['Fire Risk Assessment – Terms, Conditions and Limitations', ''],
    ['About the Property', ''],
    ['Stage 1 – Fire Hazards', ''],
    ['Stage 2 – People at Risk', ''],
    ['Stage 3 – Evaluate, remove, reduce and protect from risk', ''],
    ['Fire Plan', ''],
    ['Risk Rating', ''],
    ['Action Plan', ''],
  ]
  const tocHeaderRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: [
      makeCell('Title', { header: true, widthPercent: 85 }),
      makeCell('Page', { header: true, widthPercent: 15, alignRight: true }),
    ],
  })
  const tocDataRows = tocItems.map(([title, page]) =>
    new TableRow({
      cantSplit: true,
      children: [makeCell(title, { widthPercent: 85 }), makeCell(page || '—', { widthPercent: 15, alignRight: true })],
    })
  )
  out.push(new Table({ rows: [tocHeaderRow, ...tocDataRows], ...TABLE_GRID_OPTS }))
  return out
}

function buildSectionPurpose(): (Paragraph | Table)[] {
  return [
    H2('Purpose of This Assessment'),
    para('The purpose of this Fire Risk Assessment is to provide a suitable and sufficient assessment of the risk to life from fire within the above premises and to confirm that appropriate fire safety measures are in place to comply with current fire safety legislation.'),
    para('This assessment relates solely to life safety and does not address business continuity or property protection.'),
    para('This document represents a live, operational Fire Risk Assessment and supersedes the pre-opening assumptions contained within the previous assessment.'),
  ]
}

function buildSectionRegulatoryReform(): (Paragraph | Table)[] {
  return [
    H2('Regulatory Reform (Fire Safety) Order 2005'),
    H2('FIRE RISK ASSESSMENT'),
    new Paragraph({ spacing: { after: 200 } }),
    para('STEP 1: Identify fire hazards – Sources of ignition; Sources of fuel; Work processes.'),
    para('STEP 2: Identify the location of people at significant risk in case of fire.'),
    para('STEP 3: Evaluate the risk – Are existing fire safety measures adequate? Control of ignition sources; Fire detection/warning; Means of escape; Means of fighting fire; Maintenance and testing; Fire safety training; Emergency services provisions. Carry out any improvements needed.'),
    para('STEP 4: Record findings and action taken – Prepare emergency plan; Inform, instruct and train employees.'),
    para('STEP 5: Keep assessment under review – Revise if situation changes.'),
  ]
}

function buildSectionTravelDistances(): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = []
  out.push(H2('Travel Distances:'))
  out.push(para('The distance of travel should be measured as being the actual distance to be travelled between any point in the building and the nearest storey exit.'))
  out.push(para('The distance of travel for escape are governed by recommended maximum distances and these are detailed below:'))
  out.push(new Paragraph({ spacing: { after: 120 } }))

  const colPercents = [5, 25, 35, 35]
  const headers = [
    { text: 'No.', widthPercent: 5 },
    { text: 'Category of risk', widthPercent: 25 },
    { text: 'Distance of travel within room, work-room or enclosure', widthPercent: 35 },
    { text: 'Total distance of travel', widthPercent: 35 },
  ]

  const tables: [string, string[][]][] = [
    ['TABLE A: Escape in more than one direction (Factories)', [['1', 'High', '12m', '25m'], ['2', 'Normal', '25m', '45m'], ['3', 'Low', '35m', '60m']]],
    ['TABLE B: Escape in one direction only (Factories)', [['4', 'High', '6m', '12m'], ['5', 'Normal', '12m', '25m'], ['6', 'Low', '25m', '45m']]],
    ['TABLE C: Escape in more than one direction (Shops)', [['1', 'High', '12m', '25m'], ['2', 'Normal', '25m', '45m']]],
    ['TABLE D: Escape in one direction only (Shops)', [['3', 'High', '6m', '12m'], ['4', 'Normal', '12m', '25m']]],
    ['TABLE E: Escape in more than one direction (Offices)', [['1', 'Normal', '25m', '45m']]],
    ['TABLE F: Escape in one direction only (Offices)', [['2', 'Normal', '12m', '25m']]],
  ]

  for (const [title, rows] of tables) {
    const headerRow = new TableRow({
      tableHeader: true,
      children: headers.map((h) => new TableCell({
        children: [para(h.text, { bold: true })],
        width: { size: h.widthPercent!, type: WidthType.PERCENTAGE },
        shading: HEADER_CELL_SHADING,
        margins: CELL_MARGIN,
      })),
    })
    const titleRow = new TableRow({
      children: [
        new TableCell({
          children: [para(title, { bold: true })],
          columnSpan: 4,
          shading: { fill: 'F8FAFC' },
          margins: CELL_MARGIN,
        }),
      ],
    })
    const dataRows = rows.map((r) =>
      new TableRow({
        children: r.map((c) => new TableCell({ children: [para(c)], margins: CELL_MARGIN })),
      })
    )
    out.push(new Table({
      rows: [headerRow, titleRow, ...dataRows],
      ...TABLE_GRID_OPTS,
    }))
    out.push(new Paragraph({ spacing: { after: 120 } }))
  }

  out.push(para('Where a room is an inner room (i.e. a room accessible only via an access room) the distance to the exit from the access room should be a maximum of:'))
  out.push(para("• If the inner room is of 'high risk' 6m"))
  out.push(para("• If the access room is of 'normal risk' 12m"))
  out.push(para("• If the access room is of 'low risk' 25m"))
  return out
}

function buildSectionCategoryL(): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = []
  out.push(H2('Category L Fire Alarm Systems - Life Protection'))
  out.push(para('Life protection systems can be divided into various categories, L1, L2, L3, L4, L5.'))
  out.push(para('L1 provides for Automatic Fire Detection (AFD) to be installed into all areas of a building.'))
  out.push(para('L2 provides Automatic Fire Detection (AFD) as defined in L3 as well as high risk or hazardous areas. Examples: Kitchens, boiler rooms, sleeping risk, storerooms if not fire resistant or if smoke could affect escape routes.'))
  out.push(para('L3 Automatic Fire Detection (AFD) with smoke detection should be installed on escape routes with detection in rooms opening onto escape routes.'))
  out.push(para('L4 provides Automatic Fire Detection (AFD) within escape routes only.'))
  out.push(para('L5 is installed in building with a specific risk that has been identified. An example would be L5/M for an area of high risk requiring detection.'))
  out.push(new Paragraph({ spacing: { after: 200 } }))
  const imgResult = loadCategoryLImage()
  if (imgResult) {
    out.push(
      new Paragraph({
        keepNext: true,
        children: [
          new ImageRun({
            type: 'png',
            data: imgResult.buffer,
            transformation: { width: DOCX_CATEGORY_L_WIDTH, height: DOCX_CATEGORY_L_HEIGHT },
          }),
        ],
        spacing: { after: 120 },
      })
    )
    out.push(para('L1–L5 fire alarm system coverage: detector and manual call point placement by category.'))
  } else {
    out.push(para('(Image unavailable: fra-category-l-fire-alarm-systems.png)', { bold: false }))
  }
  return out
}

function buildSectionFireResistance(ctx: BuildContext): (Paragraph | Table)[] {
  const { data } = ctx
  const out: (Paragraph | Table)[] = []
  out.push(H2('Fire Resistance:'))
  out.push(para('There are standards recommended for the fire resistance of the elements of a building structure (e.g. floors, walls etc.) and these are given in the table below.'))
  out.push(new Paragraph({ spacing: { after: 120 } }))

  const headers = [
    { text: 'Element being separated or protected', widthPercent: 45 },
    { text: 'Walls (mins)', widthPercent: 15 },
    { text: 'Fire-resisting doors (mins)', widthPercent: 20 },
    { text: 'Floors (mins)', widthPercent: 20 },
  ]
  const rows: string[][] = [
    ['Floor immediately over a basement', '—', '—', '60'],
    ['All separating floors', '—', '—', '30 (1)'],
    ['Separating a stairway', '30', '30 (2)', '—'],
    ['Separating a protected lobby', '30', '30', '—'],
    ['Separating a lift well', '30 (4)', '30 (3)', '—'],
    ['Separating a lift motor room', '30', '30', '—'],
    ['Separating a protected route', '30', '30 (2)', '—'],
    ['Separating compartments', '60', '60', '—'],
    ['In a corridor to sub-divide it', '30', '30', '—'],
    ['In a stairway from ground floor to basement', '—', '2 x 30 or 1 x 60', '—'],
  ]

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h) => makeCell(h.text, { header: true, widthPercent: h.widthPercent })),
  })
  const colPercents = [45, 15, 20, 20]
  const dataRows = rows.map((r) =>
    new TableRow({ children: r.map((c, i) => makeCell(c, { widthPercent: colPercents[i] })) })
  )
  out.push(new Table({ rows: [headerRow, ...dataRows], ...TABLE_GRID_OPTS }))
  out.push(new Paragraph({ spacing: { after: 120 } }))
  out.push(para('(1) Fire/smoke stopping cavity barriers and fire dampers in ductwork'))
  out.push(para('(2) Excluding incomplete floors e.g. a gallery floor'))
  out.push(para('(3) Except a door to a WC containing no fire risk'))
  out.push(para('(4) Except a lift well contained within a stairway enclosure'))
  return out
}

function buildSectionTermsLimitations(ctx: BuildContext): (Paragraph | Table)[] {
  const { data } = ctx
  const dateStr = data.assessmentDate || 'the assessment date'
  return [
    H2('Fire Risk Assessment – Terms, Conditions and Limitations'),
    para('This Fire Risk Assessment has been undertaken in accordance with the requirements of the Regulatory Reform (Fire Safety) Order 2005 (as applicable in Scotland) and relevant supporting guidance.'),
    para('It is agreed that, in order to enable a thorough inspection and assessment, the Fire Risk Assessor was permitted open and free access to all areas of the premises reasonably accessible at the time of the assessment and review.'),
    para("It is the responsibility of the Responsible Person to ensure that all relevant personnel are aware of the Fire Risk Assessor's visit and that the assessor is not hindered in the carrying out of their duties."),
    para('Scope of Assessment', { bold: true }),
    para('This Fire Risk Assessment is based on:'),
    para('• A visual inspection of the premises'),
    para('• Review of fire safety arrangements in place at the time of the assessment'),
    para('• Consideration of documented records made available, including fire alarm testing, emergency lighting tests and fire drill records'),
    para(`• Observations made during a Health & Safety and Fire Safety audit conducted on ${dateStr}`),
    para('No intrusive inspection, destructive testing, or specialist testing of fire systems, structural elements, luminance levels, alarm sound pressure levels or HVAC systems has been undertaken as part of this assessment.'),
    para('Limitations', { bold: true }),
    para('Whilst all reasonable care has been taken to identify matters that may give rise to fire risk, this assessment cannot be regarded as a guarantee that all fire hazards or deficiencies have been identified.'),
    para('The assessment is based on a sample of conditions observed at the time of inspection. It is possible that this may not be fully representative of all conditions present at all times.'),
    para('The Fire Risk Assessor cannot be held responsible for:'),
    para('• Failure to implement recommendations'),
    para('• Deterioration in standards following the assessment'),
    para('• Changes in use, layout, occupancy or management practices after the date of assessment'),
    para('• Acts or omissions of employees, contractors or third parties'),
  ]
}

function buildSectionEnforcementInsurers(): (Paragraph | Table)[] {
  return [
    H2('Enforcement and Insurers'),
    para('The Fire Risk Assessor should be notified of any visit, or intended visit, by an enforcing authority or insurer relating to fire safety matters.'),
    para('Where requirements or recommendations are made by an enforcing authority, insurer or competent third party, it is the responsibility of the Responsible Person to ensure compliance within appropriate timescales.'),
    H2('Specialist Advice'),
    para('Where hazards are identified that, in the opinion of the Fire Risk Assessor, require specialist advice or further investigation, this will be highlighted. The decision to appoint specialist contractors or consultants, and any associated costs, remains the responsibility of the Responsible Person.'),
    H2('Liability'),
    para("KSS NW Ltd limits its liability for any loss, damage or injury (including consequential or indirect loss) arising from the performance of this Fire Risk Assessment to the extent permitted by law and as defined by the company's professional indemnity insurance."),
  ]
}

function buildSectionAboutProperty(ctx: BuildContext): (Paragraph | Table)[] {
  const { data } = ctx
  const d = data as FRAData & { storeOpeningTimes?: string; accessDescription?: string }
  const out: (Paragraph | Table)[] = []
  out.push(H2('About the Property:'))
  out.push(...labelValue('Approximate build date', data.buildDate))
  out.push(...labelValue('Property type', data.propertyType))
  if (d.storeOpeningTimes) out.push(...labelValue('Store Opening Times', d.storeOpeningTimes))
  out.push(para('Description of the Premises', { bold: true }))
  out.push(para(data.description || '—'))
  out.push(...labelValue('Number of Floors', data.numberOfFloors))
  out.push(...labelValue('Approximate Floor Area', data.floorArea))
  if (data.floorAreaComment) out.push(...labelValue('Floor area comment', data.floorAreaComment))
  out.push(...labelValue('Occupancy and Capacity', data.occupancy))
  if (data.occupancyComment) out.push(...labelValue('Occupancy comment', data.occupancyComment))
  out.push(...labelValue('Operating hours', data.operatingHours))
  if (data.operatingHoursComment) out.push(...labelValue('Operating hours comment', data.operatingHoursComment))
  out.push(para('Sleeping Risk', { bold: true }))
  out.push(para(data.sleepingRisk || '—'))
  out.push(para('Internal Fire Doors:', { bold: true }))
  out.push(para(data.internalFireDoors || '—'))
  out.push(para('History of Fires or Fire-Related Incidents in the Previous 12 Months:', { bold: true }))
  out.push(para(data.historyOfFires || '—'))
  return out
}

function buildSectionFireAlarm(ctx: BuildContext): (Paragraph | Table)[] {
  const { data } = ctx
  const d = data as FRAData & {
    fireAlarmPanelFaults?: string
    fireAlarmPanelFaultsComment?: string
    fireAlarmMaintenance?: string
  }
  const out: (Paragraph | Table)[] = []
  out.push(H2('Brief description of any fire alarm or automatic fire/heat/smoke detection:'))
  out.push(para(data.fireAlarmDescription || '—'))
  out.push(para('Location of Fire Panel:', { bold: true }))
  out.push(para(data.fireAlarmPanelLocation || '—'))
  if (d.fireAlarmPanelFaults) out.push(...labelValue('Is panel free of faults', d.fireAlarmPanelFaults))
  if (d.fireAlarmMaintenance) out.push(para(d.fireAlarmMaintenance))
  out.push(para('(NB: This assessment is based on visual inspection and review of available records. No physical testing of the fire alarm or emergency lighting systems was undertaken as part of this Fire Risk Assessment.)'))
  return out
}

function buildSectionEmergencyLighting(ctx: BuildContext): (Paragraph | Table)[] {
  const { data } = ctx
  const d = data as FRAData & {
    emergencyLightingMaintenance?: string
    emergencyLightingTestSwitchLocation?: string
  }
  const out: (Paragraph | Table)[] = []
  out.push(H2('Brief description of any emergency lighting systems:'))
  out.push(para(data.emergencyLightingDescription || '—'))
  if (d.emergencyLightingMaintenance) out.push(para(d.emergencyLightingMaintenance))
  if (d.emergencyLightingTestSwitchLocation) out.push(...labelValue('Location of Emergency Lighting Test Switch', d.emergencyLightingTestSwitchLocation))
  out.push(para('(NB: This assessment is based on visual inspection and review of available records only. No physical testing of the emergency lighting system was undertaken as part of this assessment.)'))
  return out
}

function buildSectionFireExtinguishers(ctx: BuildContext): (Paragraph | Table)[] {
  const { data } = ctx
  const d = data as FRAData & { fireExtinguisherService?: string }
  const out: (Paragraph | Table)[] = []
  out.push(H2('Brief description of any portable fire-fighting equipment:'))
  out.push(para(data.fireExtinguishersDescription || '—'))
  if (d.fireExtinguisherService) out.push(para(d.fireExtinguisherService))
  out.push(para('Staff receive fire safety awareness training as part of their induction and refresher training, which includes instruction on the purpose of fire extinguishers. Company fire safety arrangements place emphasis on raising the alarm and evacuation, rather than firefighting.'))
  return out
}

function buildSectionSprinkler(ctx: BuildContext): (Paragraph | Table)[] {
  const { data } = ctx
  return [
    H2('Brief Description of Sprinkler & Smoke Extraction Strategy:'),
    para(data.sprinklerDescription || '—'),
    ...labelValue('Sprinkler clearance', data.sprinklerClearance || '—'),
  ]
}

function buildSectionFireRescueAccess(ctx: BuildContext): (Paragraph | Table)[] {
  const { data } = ctx
  const d = data as FRAData & { accessDescription?: string }
  const out: (Paragraph | Table)[] = []
  out.push(H2('Brief description of access for Fire and Rescue Services:'))
  out.push(para(d.accessDescription || 'Entry to the site can be gained via the main front entrance doors and via the rear service entry/loading bay. There is suitable access for Fire and Rescue Services from the surrounding road network.'))
  out.push(...labelValue('Fire lift', 'N/A'))
  out.push(...labelValue('Dry / wet riser', 'N/A'))
  out.push(...labelValue('Fire hydrant', 'N/A'))
  out.push(...labelValue('Open water', 'N/A'))
  return out
}

function buildSectionStage1Stage2(ctx: BuildContext): (Paragraph | Table)[] {
  const { data } = ctx
  const out: (Paragraph | Table)[] = []
  out.push(H2('Stage 1 – Fire Hazards'))
  out.push(para('Sources of ignition:', { bold: true }))
  out.push(para((data.sourcesOfIgnition?.length) ? data.sourcesOfIgnition.join('; ') : 'None identified'))
  out.push(para('Sources of fuel:', { bold: true }))
  out.push(para((data.sourcesOfFuel?.length) ? data.sourcesOfFuel.join('; ') : 'None identified'))
  out.push(para('Sources of oxygen:', { bold: true }))
  out.push(para((data.sourcesOfOxygen?.length) ? data.sourcesOfOxygen.join('; ') : 'Normal atmosphere'))
  out.push(new Paragraph({ spacing: { after: 200 } }))
  out.push(H2('Stage 2 – People at Risk'))
  out.push(para('The following persons may be at risk in the event of a fire within the premises:'))
  out.push(para((data.peopleAtRisk?.length) ? data.peopleAtRisk.join('; ') : 'Persons in the premises.'))
  out.push(para('There are no sleeping occupants within the premises.'))
  return out
}

function buildSectionStage3(ctx: BuildContext): (Paragraph | Table)[] {
  const { data } = ctx
  const out: (Paragraph | Table)[] = []
  out.push(H2('Stage 3 – Evaluate, remove, reduce and protect from risk'))
  out.push(para('Significant findings:', { bold: true }))
  out.push(para((data.significantFindings?.length) ? data.significantFindings.join('; ') : '—'))
  out.push(para('Recommended controls:', { bold: true }))
  out.push(para((data.recommendedControls?.length) ? data.recommendedControls.join('; ') : '—'))
  out.push(...labelValue('Fire alarm description', data.fireAlarmDescription))
  out.push(...labelValue('Fire alarm panel location', data.fireAlarmPanelLocation))
  out.push(...labelValue('Emergency lighting description', data.emergencyLightingDescription))
  out.push(...labelValue('Fire extinguishers description', data.fireExtinguishersDescription))
  if (data.hasSprinklers) {
    out.push(...labelValue('Sprinkler description', data.sprinklerDescription))
    out.push(...labelValue('Sprinkler clearance', data.sprinklerClearance))
  }
  return out
}

function buildSectionFirePlan(ctx: BuildContext): (Paragraph | Table)[] {
  const { data } = ctx
  const out: (Paragraph | Table)[] = []
  out.push(H2('Fire Plan'))
  out.push(para('Roles and identity of employees with specific responsibilities in the event of a fire', { bold: true }))
  out.push(para('Store management are designated as Fire Wardens and have overall responsibility for coordinating the emergency response within the premises. Supervisory staff may act as Fire Marshals. All staff are responsible for following fire safety instructions and evacuating immediately on hearing the fire alarm. No person is permitted to re-enter the premises until authorised to do so by the Fire and Rescue Service.'))
  out.push(para('Arrangements for the safe evacuation of people identified at risk', { bold: true }))
  out.push(para('All persons within the premises will be instructed to evacuate immediately via the nearest available fire exit upon activation of the fire alarm. Escape routes are clearly identified and lead to a place of relative safety.'))
  out.push(para('How the Fire and Rescue Service will be contacted', { bold: true }))
  out.push(para('The Fire and Rescue Service will be contacted via the emergency services by dialling 999 or 112.'))
  out.push(para('Procedures for liaising with the Fire and Rescue Service', { bold: true }))
  out.push(para('On arrival of the Fire and Rescue Service, store management will liaise with the attending officers, providing relevant information regarding the premises and fire alarm activation.'))
  out.push(para('Arrangements for fire safety training and drills', { bold: true }))
  out.push(para('All staff receive fire safety training as part of their induction and refresher training. Fire drills are conducted at appropriate intervals and records are maintained.'))
  out.push(new Paragraph({ spacing: { after: 120 } }))
  out.push(para('Assessment review', { bold: true }))
  const reviewRows = [
    new TableRow({
      tableHeader: true,
      children: [
        makeCell('Assessment review date', { header: true, widthPercent: 33 }),
        makeCell('Completed by', { header: true, widthPercent: 34 }),
        makeCell('Signature', { header: true, widthPercent: 33 }),
      ],
    }),
    new TableRow({
      children: [
        makeCell(data.assessmentDate || ''),
        makeCell(data.assessorName || ''),
        makeCell(''),
      ],
    }),
  ]
  out.push(new Table({ rows: reviewRows, ...TABLE_GRID_OPTS }))
  return out
}

function buildSectionFRAReport(ctx: BuildContext): (Paragraph | Table)[] {
  const { data } = ctx
  const out: (Paragraph | Table)[] = []
  out.push(H2('Fire Risk Assessment Report'))
  out.push(...labelValue('Assessor', data.assessorName || ''))
  out.push(...labelValue('Company name', 'KSS NW LTD'))
  out.push(...labelValue('Date of assessment', data.assessmentDate || ''))
  out.push(new Paragraph({ spacing: { after: 120 } }))
  out.push(para('Introduction', { bold: true }))
  out.push(para(`The client is Footasylum Ltd, a national branded fashion apparel and footwear retailer. This Fire Risk Assessment relates solely to their retail premises at ${data.premises}. The premises is situated within an established managed shopping centre environment.`))
  out.push(para('Overview of the workplace being assessed', { bold: true }))
  out.push(para('The primary function of the premises is the retail sale of branded fashion apparel and footwear to members of the public. The store operates as a standard high-street retail environment with a public sales area and associated back-of-house accommodation.'))
  out.push(para('Overview of the significant findings related to fire hazards', { bold: true }))
  out.push(para((data.significantFindings?.length) ? data.significantFindings.join('; ') : 'No significant deficiencies were identified that would prevent the safe evacuation of occupants in the event of a fire.'))
  out.push(para('Proposed Recommended Controls', { bold: true }))
  out.push(para((data.recommendedControls?.length) ? data.recommendedControls.join('; ') : '—'))
  return out
}

function buildSectionRiskRating(ctx: BuildContext): (Paragraph | Table)[] {
  const { data } = ctx
  return [
    H2('Risk Rating'),
    ...labelValue('Likelihood', data.riskRatingLikelihood ?? '—'),
    ...labelValue('Consequences', data.riskRatingConsequences ?? '—'),
    ...labelValue('Summary', data.summaryOfRiskRating ?? '—'),
  ]
}

function buildSectionActionPlan(ctx: BuildContext): (Paragraph | Table)[] {
  const { data } = ctx
  const out: (Paragraph | Table)[] = []
  out.push(H2('Action Plan'))
  const items = data.actionPlanItems ?? []
  if (items.length > 0) {
    const headerRow = makeHeaderRow(
      { text: 'Recommendation', widthPercent: 55 },
      { text: 'Priority', widthPercent: 25 },
      { text: 'Due', widthPercent: 20 }
    )
    const dataRows = items.map((item: { recommendation: string; priority: string; dueNote?: string }) =>
      new TableRow({
        children: [
          makeCell(item.recommendation),
          makeCell(item.priority),
          makeCell(item.dueNote ?? '—'),
        ],
      })
    )
    out.push(new Table({ rows: [headerRow, ...dataRows], ...TABLE_GRID_OPTS }))
  } else {
    const noActionRow = new TableRow({
      children: [
        new TableCell({
          children: [para('No actions recorded.', { bold: false })],
          columnSpan: 3,
          margins: CELL_MARGIN,
        }),
      ],
    })
    const headerRow = makeHeaderRow(
      { text: 'Recommendation', widthPercent: 55 },
      { text: 'Priority', widthPercent: 25 },
      { text: 'Due', widthPercent: 20 }
    )
    out.push(new Table({ rows: [headerRow, noActionRow], ...TABLE_GRID_OPTS }))
  }
  return out
}

const SECTION_BUILDERS: Record<string, (ctx: BuildContext) => (Paragraph | Table)[]> = {
  'cover': buildSectionCover,
  'photos-toc': buildSectionPhotosToc,
  'purpose': buildSectionPurpose,
  'regulatory-reform': buildSectionRegulatoryReform,
  'travel-distances': buildSectionTravelDistances,
  'category-l': buildSectionCategoryL,
  'fire-resistance': buildSectionFireResistance,
  'terms-limitations': buildSectionTermsLimitations,
  'enforcement-insurers': buildSectionEnforcementInsurers,
  'about-property': buildSectionAboutProperty,
  'fire-alarm': buildSectionFireAlarm,
  'emergency-lighting': buildSectionEmergencyLighting,
  'fire-extinguishers': buildSectionFireExtinguishers,
  'sprinkler': buildSectionSprinkler,
  'fire-rescue-access': buildSectionFireRescueAccess,
  'stage1-stage2': buildSectionStage1Stage2,
  'stage3': buildSectionStage3,
  'fire-plan': buildSectionFirePlan,
  'fra-report': buildSectionFRAReport,
  'risk-rating': buildSectionRiskRating,
  'action-plan': buildSectionActionPlan,
}

/** Section properties: A4, 15mm margins. Each DOCX section = hard layout boundary (Word stops reflowing). */
const SECTION_PROPERTIES = {
  page: {
    size: { width: sectionPageSizeDefaults.WIDTH, height: sectionPageSizeDefaults.HEIGHT },
    margin: { top: MARGIN_15MM, right: MARGIN_15MM, bottom: MARGIN_15MM, left: MARGIN_15MM },
  },
}

type DocxSection = { properties: typeof SECTION_PROPERTIES; children: (Paragraph | Table)[] }

function buildDocxSections(ctx: BuildContext): DocxSection[] {
  const buildStamp = new Date().toISOString()
  const buildId = getBuildId()
  const sections: DocxSection[] = []

  for (const section of FRA_SECTIONS) {
    if (section.id === 'sprinkler' && !ctx.data.hasSprinklers) continue
    const builder = SECTION_BUILDERS[section.id]
    if (!builder) continue
    const content = builder(ctx)
    sections.push({
      properties: SECTION_PROPERTIES,
      children: content,
    })
  }

  // Build stamp in last section
  const last = sections[sections.length - 1]
  if (last) {
    last.children.push(new Paragraph({ spacing: { before: 200 } }))
    last.children.push(para(`Generated: ${buildStamp} | Instance: ${ctx.instanceId} | Build: ${buildId}`, { bold: false }))
  }
  return sections
}

const TOC_ENTRY_COUNT = 13

export async function GET(request: NextRequest) {
  try {
    const debug = request.nextUrl.searchParams.get('debug') === '1'

    console.log('[DOCX] USING SECTION MODEL: sections=%d', FRA_SECTIONS.length)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const instanceId = request.nextUrl.searchParams.get('instanceId')
    if (!instanceId) return NextResponse.json({ error: 'instanceId is required' }, { status: 400 })

    const fraData = await mapHSAuditToFRAData(instanceId)
    const premises = fraData.premises ?? 'Report'
    const placeholderPhotoBuffers = await loadPlaceholderPhotoBuffers(supabase, instanceId)

    const ctx: BuildContext = { data: fraData, placeholderPhotoBuffers, instanceId }
    const docSections = buildDocxSections(ctx)
    const totalChildren = docSections.reduce((n, s) => n + s.children.length, 0)
    const tableCount = docSections.reduce((n, s) => n + s.children.filter((c): c is Table => c instanceof Table).length, 0)
    console.log('[DOCX] Built from section model: sections=%d children=%d tables=%d', docSections.length, totalChildren, tableCount)

    const buildStamp = new Date().toISOString()
    const buildId = getBuildId()

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
            new TextRun({ text: `Generated: ${buildStamp} | Instance: ${instanceId} | Build: ${buildId}`, size: 18, color: '666666', font: 'Calibri' }),
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
      styles: {
        default: {
          document: {
            run: { font: 'Calibri', size: 22 },
            paragraph: { spacing: { line: 276, after: 120 } },
          },
          heading1: { run: { font: 'Calibri', size: 36, bold: true } },
          heading2: { run: { font: 'Calibri', size: 28, bold: true } },
        },
      },
      sections: docSections.map((sec) => ({
        properties: sec.properties,
        headers: { default: header },
        footers: { default: footer },
        children: sec.children,
      })),
    })

    const buffer = await Packer.toBuffer(doc)

    if (debug) {
      const categoryLResult = loadCategoryLImage()
      const imageCount =
        (placeholderPhotoBuffers?.['site-premises-photos']?.length ?? 0) + (categoryLResult ? 1 : 0)
      const firstHeadings = FRA_SECTIONS.slice(0, 10).map((s) => s.title)
      console.log('[DOCX DEBUG] output buffer size:', buffer.length, 'bytes')
      console.log('[DOCX DEBUG] sections:', docSections.length, 'tables:', tableCount, 'images:', imageCount)
      console.log('[DOCX DEBUG] first 10 headings:', firstHeadings)
      console.log('[DOCX DEBUG] Category L image:', categoryLResult ? `loaded (${categoryLResult.size} bytes)` : 'FAILED')
      console.log('[DOCX DEBUG] TOC block: entries=', TOC_ENTRY_COUNT)
      if (buffer.length < 51200) {
        console.warn('[DOCX DEBUG] WARNING: buffer size < 50KB — generation may be incomplete')
      }
    }

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
