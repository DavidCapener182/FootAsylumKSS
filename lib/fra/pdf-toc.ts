/** Resolve TOC entries from physical PDF pages, never from DOM height estimates. */
export interface FraPdfTextPage { num: number; text: string }
export const PRE_OPENING_TOC_HEADINGS: Record<string, string> = {
  'Purpose of This Assessment': 'Purpose of This Assessment',
  'Regulatory Reform (Fire Safety) Order 2005 – Fire Risk Assessment': 'Regulatory Reform (Fire Safety) Order 2005',
  'Travel Distances': 'Travel Distances:',
  'Category L Fire Alarm Systems - Life Protection': 'Category L Fire Alarm Systems - Life Protection',
  'Fire Resistance': 'Fire Resistance:',
  'Fire Risk Assessment – Terms, Conditions and Limitations': 'Fire Risk Assessment – Terms, Conditions and Limitations',
  'Scope of Assessment / Limitations / Enforcement / Specialist Advice / Liability': 'Scope of Assessment',
  'About the Property': 'About the Property:',
  'Stage 1 – Fire Hazards': 'Stage 1 – Fire Hazards',
  'Stage 2 – People at Risk': 'Stage 2 – People at Risk',
  'Stage 3 – Evaluate, remove, reduce and protect from risk': 'Stage 3 – Evaluate, remove, reduce and protect from risk',
  'Fire Plan': 'Fire Plan',
  'Fire Risk Assessment Report': 'Fire Risk Assessment Report',
  'Risk Rating': '7. Risk Rating',
  'Action Plan': '8. Action Plan',
  'Additional Site Pictures / Appendices': 'Additional Site Pictures',
}

export function resolvePreOpeningToc(pages: FraPdfTextPage[], labels: string[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const label of labels) {
    const heading = PRE_OPENING_TOC_HEADINGS[label]
    if (!heading) throw new Error(`Unrecognized pre-opening contents entry: ${label}`)
    // Whole heading lines only: the TOC itself appends a page number and must not match.
    // Whitespace allows headings wrapped across lines; punctuation remains exact.
    const pattern = heading.split(/\s+/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+')
    const regex = new RegExp(`^\\s*${pattern}\\s*$`, 'm')
    const matches = pages.filter(page => regex.test(page.text))
    if (matches.length !== 1) throw new Error(`Cannot verify PDF contents page for ${label}: ${matches.length} matching pages`)
    result[label] = matches[0].num
  }
  return result
}

export async function readPreOpeningPdfToc(pdf: Uint8Array, labels: string[]): Promise<Record<string, number>> {
  // PDF.js initializes DOMMatrix even for text-only parsing on serverless Node.
  // Install the existing lightweight polyfill before loading the parser module.
  if (typeof globalThis.DOMMatrix === 'undefined') {
    const { default: DOMMatrix } = await import('@thednp/dommatrix')
    globalThis.DOMMatrix = DOMMatrix as unknown as typeof globalThis.DOMMatrix
  }
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: new Uint8Array(pdf) })
  try {
    const result = await parser.getText()
    return resolvePreOpeningToc(result.pages, labels)
  } finally {
    await parser.destroy()
  }
}
