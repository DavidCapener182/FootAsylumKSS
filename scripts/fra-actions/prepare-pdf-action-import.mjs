// Builds a deterministic, read-only import manifest from extracted PDF rows.
// No database or storage writes. Status and completion are intentionally absent.
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const reviewDir = resolve(root, 'output/fra-issued-pdf-review-2026-09-25')
const [inventory, manifest, rows] = await Promise.all([
  readFile(resolve(root, 'output/fra-action-migration-inventory-2026-09-25.json'), 'utf8').then(JSON.parse),
  readFile(resolve(reviewDir, 'manifest.json'), 'utf8').then(JSON.parse),
  readFile(resolve(reviewDir, 'pdf-action-rows.json'), 'utf8').then(JSON.parse),
])
if (inventory.projectId !== 'fwnzpafwfaiynrclwtnh') throw new Error('Unexpected project')
const stores = new Map(inventory.storeInventory.map((store) => [store.storeId, store]))
const pdfs = new Map(manifest.map((pdf) => [`${pdf.storeId}:${pdf.path}`, pdf]))
const seen = new Set()
const prepared = []
for (const row of rows) {
  const store = stores.get(row.storeId)
  const pdf = pdfs.get(`${row.storeId}:${row.pdfPath}`)
  if (!store || store.storeCode !== row.storeCode || !pdf || pdf.sha256 !== row.pdfSha256) throw new Error(`Store/PDF mismatch: ${row.storeCode}`)
  if (!Number.isInteger(row.page) || row.page < 1 || !Number.isInteger(row.sourceOrdinal) || row.sourceOrdinal < 1) throw new Error('Invalid PDF location')
  if (!['Low', 'Medium', 'High'].includes(row.priority) || !row.recommendation?.trim()) throw new Error('Invalid PDF row')
  const sourceIdentity = { storeId: row.storeId, pdfSha256: row.pdfSha256, page: row.page, rowOrdinal: row.sourceOrdinal, wording: row.recommendation }
  const sourceKey = createHash('sha256').update(JSON.stringify(sourceIdentity)).digest('hex')
  const location = `${row.storeId}:${row.pdfSha256}:${row.page}:${row.sourceOrdinal}`
  if (seen.has(location)) throw new Error(`Duplicate PDF location: ${location}`)
  seen.add(location)
  const confirmed = inventory.assessmentInventory.find((assessment) => assessment.storeId === row.storeId &&
    assessment.confirmedPublication?.pdfPath === row.pdfPath && assessment.confirmedPublication?.pdfSha256 === row.pdfSha256)
  prepared.push({
    ...sourceIdentity,
    sourceKey,
    storeCode: row.storeCode,
    storeName: row.storeName,
    pdfPath: row.pdfPath,
    priority: row.priority,
    publicationId: confirmed?.confirmedPublication?.id || null,
    assessmentInstanceId: confirmed?.instanceId || null,
    provenance: confirmed ? 'confirmed_publication_pdf' : 'current_store_pdf_reference',
    completionStatus: 'unknown',
    reviewRequired: true,
  })
}
const output = resolve(reviewDir, 'pdf-action-import-manifest.json')
await writeFile(output, `${JSON.stringify(prepared, null, 2)}\n`, { mode: 0o600 })
console.log(JSON.stringify({ output, rows: prepared.length, confirmedPublicationRows: prepared.filter((row) => row.publicationId).length, unconfirmedCurrentPdfRows: prepared.filter((row) => !row.publicationId).length }))
