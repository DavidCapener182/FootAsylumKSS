import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const root = process.cwd()
const inventory = JSON.parse(await readFile(resolve(root, 'output/fra-action-migration-inventory-2026-09-25.json'), 'utf8'))
const envText = await readFile(resolve(root, '.env.local'), 'utf8')
const env = (name) => process.env[name] || envText.split(/\r?\n/).find((line) => line.startsWith(`${name}=`))?.slice(name.length + 1).trim().replace(/^(['"])(.*)\1$/, '$2')
const url = env('NEXT_PUBLIC_SUPABASE_URL')
const key = env('SUPABASE_SERVICE_ROLE_KEY')
if (!url || !key || new URL(url).hostname.split('.')[0] !== inventory.projectId) throw new Error('Expected project connection unavailable')
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const outDir = resolve(root, 'output/fra-issued-pdf-review-2026-09-25')
await mkdir(outDir, { recursive: true })
const references = new Map()
for (const store of inventory.storeInventory) {
  const paths = [store.currentFraPdfReference, ...store.historicalFraReferences.map((row) => row.pdfPath)].filter(Boolean)
  for (const path of paths) {
    if (!references.has(path)) references.set(path, { storeCode: store.storeCode, storeName: store.storeName, storeId: store.storeId, path, referenceKinds: [] })
    references.get(path).referenceKinds.push(path === store.currentFraPdfReference ? 'current' : 'history')
  }
}
for (const assessment of inventory.assessmentInventory) {
  const path = assessment.confirmedPublication?.pdfPath
  if (!path) continue
  if (!references.has(path)) references.set(path, { storeCode: assessment.storeCode, storeName: assessment.storeName, storeId: assessment.storeId, path, referenceKinds: [] })
  references.get(path).referenceKinds.push('confirmed_publication')
}
const manifest = []
for (const ref of references.values()) {
  if (!/^(store|fra)\/[A-Za-z0-9/_-]+\.pdf$/.test(ref.path)) {
    manifest.push({ ...ref, error: 'Invalid path' })
    continue
  }
  const { data, error } = await client.storage.from('fa-attachments').download(ref.path)
  if (error || !data) {
    manifest.push({ ...ref, error: error?.message || 'No data' })
    continue
  }
  const bytes = Buffer.from(await data.arrayBuffer())
  const filename = `${ref.storeCode}-${createHash('sha256').update(ref.path).digest('hex').slice(0, 12)}.pdf`
  const destination = resolve(outDir, filename)
  const prior = await readFile(destination).catch(() => null)
  if (prior && createHash('sha256').update(prior).digest('hex') !== createHash('sha256').update(bytes).digest('hex')) {
    throw new Error(`Existing local PDF differs: ${ref.storeCode}`)
  }
  if (!prior) await writeFile(destination, bytes, { flag: 'wx', mode: 0o600 })
  manifest.push({ ...ref, filename, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
  console.log(`${ref.storeCode} ${ref.storeName}: ${bytes.length} bytes`)
}
await writeFile(resolve(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 })
console.log(JSON.stringify({ references: manifest.length, downloaded: manifest.filter((row) => row.filename).length, errors: manifest.filter((row) => row.error).length }))
