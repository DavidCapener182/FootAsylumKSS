/**
 * Seed script: generates a minimal FRA_Template.docx with placeholders for docx-templates.
 * Run: node scripts/seed-fra-template.js
 * Output: templates/FRA_Template.docx
 *
 * Placeholders use docx-templates syntax with cmdDelimiter ['{', '}']:
 * - Simple: {STORE_NAME}, {ASSESSMENT_DATE}, etc.
 * - Image: {IMAGE getCategoryLImage()}
 * - Loop: {FOR item IN ACTION_PLAN_ITEMS} ... {INS $item.recommendation} ... {END-FOR item}
 */

const fs = require('fs')
const path = require('path')
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  PageBreak,
  sectionPageSizeDefaults,
} = require('docx')

const MARGIN_15MM = 850

function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: opts.bold ? 28 : 22, bold: opts.bold, font: 'Calibri' })],
    spacing: { after: 120 },
  })
}

function sectionProps() {
  return {
    page: {
      size: { width: sectionPageSizeDefaults.WIDTH, height: sectionPageSizeDefaults.HEIGHT },
      margin: { top: MARGIN_15MM, right: MARGIN_15MM, bottom: MARGIN_15MM, left: MARGIN_15MM },
    },
  }
}

const sections = [
  // Cover
  {
    properties: sectionProps(),
    children: [
      p('Fire Risk Assessment - Review', { bold: true }),
      p('Page 1'),
      new Paragraph({ spacing: { after: 400 } }),
      p('{STORE_NAME}', { bold: true }),
      p('Client Name: {CLIENT_NAME}'),
      p('Premises: {STORE_NAME}'),
      p('Address: {ADDRESS}'),
      p('Responsible person: {RESPONSIBLE_PERSON}'),
      p('Ultimate responsible person: {ULTIMATE_RESPONSIBLE_PERSON}'),
      p('Appointed Person: {APPOINTED_PERSON}'),
      p('Name of person undertaking the assessment: {ASSESSOR_NAME} – KSS NW Ltd'),
      p('Assessment date: {ASSESSMENT_DATE}'),
      p('Assessment start time: {ASSESSMENT_START_TIME}'),
      p('Assessment end time: {ASSESSMENT_END_TIME}'),
    ],
  },
  // Photo / TOC
  {
    properties: sectionProps(),
    children: [
      p('Photo of Site / Building / Premises', { bold: true }),
      p('Add screenshots or photos of the site, building and premises.'),
      new Paragraph({ spacing: { after: 200 } }),
      p('Table of Contents', { bold: true }),
      p('Purpose of This Assessment | —'),
      p('Travel Distances | —'),
      p('Category L Fire Alarm Systems | —'),
      p('Fire Resistance | —'),
      p('Action Plan | —'),
    ],
  },
  // Category L (with diagram image)
  {
    properties: sectionProps(),
    children: [
      p('Category L Fire Alarm Systems - Life Protection', { bold: true }),
      p('Life protection systems can be divided into various categories, L1, L2, L3, L4, L5.'),
      new Paragraph({ spacing: { after: 120 } }),
      p('{IMAGE getCategoryLImage()}'),
      p('L1–L5 fire alarm system coverage: detector and manual call point placement by category.'),
    ],
  },
  // Purpose
  {
    properties: sectionProps(),
    children: [
      p('Purpose of This Assessment', { bold: true }),
      p('The purpose of this Fire Risk Assessment is to provide a suitable and sufficient assessment of the risk to life from fire within the above premises.'),
    ],
  },
  // About the Property
  {
    properties: sectionProps(),
    children: [
      p('About the Property', { bold: true }),
      p('Approximate build date: {BUILD_DATE}'),
      p('Property type: {PROPERTY_TYPE}'),
      p('Description: {DESCRIPTION}'),
      p('Number of Floors: {NUMBER_OF_FLOORS}'),
      p('Floor Area: {FLOOR_AREA}'),
      p('Occupancy: {OCCUPANCY}'),
      p('Operating hours: {OPERATING_HOURS}'),
    ],
  },
  // Fire systems
  {
    properties: sectionProps(),
    children: [
      p('Fire Alarm Systems', { bold: true }),
      p('Description: {FIRE_ALARM_DESCRIPTION}'),
      p('Fire Panel Location: {FIRE_PANEL_LOCATION}'),
      p('Emergency Lighting: {EMERGENCY_LIGHTING_DESCRIPTION}'),
      p('Emergency Lighting Test Switch: {EMERGENCY_LIGHTING_SWITCH}'),
      p('Fire Extinguishers: {FIRE_EXTINGUISHERS_DESCRIPTION}'),
    ],
  },
  // Risk
  {
    properties: sectionProps(),
    children: [
      p('Risk Rating', { bold: true }),
      p('Likelihood: {RISK_LIKELIHOOD}'),
      p('Consequences: {RISK_CONSEQUENCES}'),
      p('Summary: {RISK_SUMMARY}'),
    ],
  },
  // Action Plan with FOR loop table
  {
    properties: sectionProps(),
    children: [
      p('Action Plan', { bold: true }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ children: [p('Recommendation', { bold: true })] }),
              new TableCell({ children: [p('Priority', { bold: true })] }),
              new TableCell({ children: [p('Due', { bold: true })] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [p('{FOR item IN ACTION_PLAN_ITEMS}')] }),
              new TableCell({ children: [p('')] }),
              new TableCell({ children: [p('')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [p('{INS $item.recommendation}')] }),
              new TableCell({ children: [p('{INS $item.priority}')] }),
              new TableCell({ children: [p('{INS $item.dueNote || "—"}')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [p('{END-FOR item}')] }),
              new TableCell({ children: [p('')] }),
              new TableCell({ children: [p('')] }),
            ],
          }),
        ],
      }),
      p('Generated: {GENERATED_TIMESTAMP} | Instance: {INSTANCE_ID}'),
    ],
  },
]

async function main() {
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
    sections: sections.map((sec) => ({
      properties: sec.properties,
      children: sec.children,
    })),
  })

  const buffer = await Packer.toBuffer(doc)
  const outDir = path.join(process.cwd(), 'templates')
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }
  const outPath = path.join(outDir, 'FRA_Template.docx')
  fs.writeFileSync(outPath, buffer)
  console.log('Wrote', outPath)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
