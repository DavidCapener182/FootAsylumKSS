// Local operator command. Default is read-only preflight; --apply calls a
// service-only RPC after source bytes are rechecked. Never runs in the browser.
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const root = process.cwd()
const reviewDir = resolve(root, 'output/fra-issued-pdf-review-2026-09-25')
const rows = JSON.parse(await readFile(resolve(reviewDir, 'pdf-action-import-manifest.json'), 'utf8'))
const files = JSON.parse(await readFile(resolve(reviewDir, 'manifest.json'), 'utf8'))
const inventory = JSON.parse(await readFile(resolve(root, 'output/fra-action-migration-inventory-2026-09-25.json'), 'utf8'))
const apply = process.argv.includes('--apply')
const actorIndex = process.argv.indexOf('--actor')
const actor = actorIndex >= 0 ? process.argv[actorIndex + 1] : null
if (apply && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actor || '')) {
  throw new Error('--apply requires --actor <active KSS user UUID>')
}
if (inventory.projectId !== 'fwnzpafwfaiynrclwtnh') throw new Error('Unexpected project')

const fileByIdentity = new Map(files.map((file) => [`${file.storeId}:${file.path}`, file]))
for (const row of rows) {
  const file = fileByIdentity.get(`${row.storeId}:${row.pdfPath}`)
  if (!file?.filename || file.sha256 !== row.pdfSha256) throw new Error(`Missing PDF reference: ${row.storeCode}`)
  const bytes = await readFile(resolve(reviewDir, file.filename))
  if (createHash('sha256').update(bytes).digest('hex') !== row.pdfSha256) throw new Error(`Local PDF byte mismatch: ${row.storeCode}`)
  const expectedKey = createHash('sha256').update(JSON.stringify({
    storeId: row.storeId, pdfSha256: row.pdfSha256, page: row.page,
    rowOrdinal: row.rowOrdinal, wording: row.wording,
  })).digest('hex')
  if (expectedKey !== row.sourceKey) throw new Error(`Source key mismatch: ${row.storeCode}`)
}
const envText = await readFile(resolve(root, '.env.local'), 'utf8')
const env = (name) => process.env[name] || envText.split(/\r?\n/).find((line) => line.startsWith(`${name}=`))?.slice(name.length + 1).trim().replace(/^(['"])(.*)\1$/, '$2')
const url = env('NEXT_PUBLIC_SUPABASE_URL')
const key = env('SUPABASE_SERVICE_ROLE_KEY')
if (!url || !key || new URL(url).hostname.split('.')[0] !== inventory.projectId) throw new Error('Expected project connection unavailable')
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

for (const file of files) {
  const { data, error } = await client.storage.from('fa-attachments').download(file.path)
  if (error || !data) throw new Error(`Storage read failed for ${file.storeCode}: ${error?.message || 'No data'}`)
  const hash = createHash('sha256').update(Buffer.from(await data.arrayBuffer())).digest('hex')
  if (hash !== file.sha256) throw new Error(`Storage PDF bytes changed for ${file.storeCode}`)
}
console.log(`Verified ${files.length} remote PDFs and ${rows.length} PDF action rows`)
if (!apply) {
  console.log('Read-only preflight complete. No database action rows created.')
  process.exit(0)
}
let imported = 0
for (const row of rows) {
  const { data, error } = await client.rpc('fa_fra_import_historical_pdf_action', { p_actor: actor, p_row: row })
  if (error || !data) throw new Error(`Import failed at ${row.storeCode} row ${row.rowOrdinal}: ${error?.message || 'No action ID'}`)
  const { data: saved, error: readError } = await client.from('fa_fra_actions')
    .select('id,store_id,source_origin,source_key,pdf_sha256,pdf_page,pdf_row_ordinal,recommendation,priority,status,historical_completion_unknown')
    .eq('id', data).single()
  if (readError || !saved || saved.store_id !== row.storeId || saved.source_origin !== 'historical_pdf'
    || saved.source_key !== row.sourceKey || saved.pdf_sha256 !== row.pdfSha256
    || saved.pdf_page !== row.page || saved.pdf_row_ordinal !== row.rowOrdinal
    || saved.recommendation !== row.wording || saved.priority !== row.priority
    || saved.status !== 'open' || saved.historical_completion_unknown !== true) {
    throw new Error(`Import readback mismatch at ${row.storeCode} row ${row.rowOrdinal}: ${readError?.message || 'Field mismatch'}`)
  }
  imported++
}
console.log(`Import command returned IDs for ${imported} PDF rows; rerun is idempotent by PDF location.`)
