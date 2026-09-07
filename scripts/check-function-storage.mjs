import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Build-trace budgets, not Vercel billed storage. The September 2026 local
// baseline is 244 MB unique / 130 MB largest trace. Leave Linux build headroom.
export async function checkFunctionStorage(directory = '.next', limits = {}) {
  const maxUnique = limits.maxUnique ?? 300 * 1024 ** 2
  const maxTrace = limits.maxTrace ?? 160 * 1024 ** 2
  for (const limit of [maxUnique, maxTrace]) {
    if (!Number.isFinite(limit) || limit <= 0) throw new Error('Budgets must be positive finite bytes')
  }
  const traces = []
  async function walk(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const file = resolve(folder, entry.name)
      if (entry.isDirectory()) await walk(file)
      else if (entry.isFile() && entry.name.endsWith('.nft.json')) traces.push(file)
    }
  }
  await walk(resolve(directory))
  if (!traces.length) throw new Error('No build traces found; run a production build first')
  const unique = new Map()
  const rows = []
  for (const trace of traces) {
    const manifest = JSON.parse(await readFile(trace, 'utf8'))
    if (!Array.isArray(manifest.files)) throw new Error(`Invalid trace: ${trace}`)
    const files = new Set(manifest.files.map(file => resolve(dirname(trace), file)))
    let bytes = 0
    for (const file of files) {
      if (!unique.has(file)) unique.set(file, (await stat(file)).size)
      bytes += unique.get(file)
    }
    rows.push({ trace, bytes })
  }
  rows.sort((a, b) => b.bytes - a.bytes)
  const uniqueBytes = [...unique.values()].reduce((sum, size) => sum + size, 0)
  const failures = []
  if (uniqueBytes > maxUnique) failures.push(`Unique traced files exceed ${maxUnique} bytes`)
  for (const row of rows) {
    if (row.bytes > maxTrace) failures.push(`${row.trace} exceeds ${maxTrace} bytes`)
    if (row.trace.replaceAll('\\', '/').endsWith('/api/reports/monthly-newsletter/pdf/route.js.nft.json') && row.bytes > 90 * 1024 ** 2) {
      failures.push('Newsletter PDF exceeds 90 MiB; check for unrelated public assets in its trace')
    }
  }
  return { uniqueBytes, traceCount: traces.length, largestTraces: rows.slice(0, 10), failures }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await checkFunctionStorage(process.argv[2])
    console.log(JSON.stringify(result, null, 2))
    console.log('Trace sizes are uncompressed local estimates; they do not measure account usage or retained deployments.')
    if (result.failures.length) process.exitCode = 1
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
