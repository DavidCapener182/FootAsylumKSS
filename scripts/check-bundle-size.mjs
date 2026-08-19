import { gzipSync } from 'node:zlib'
import { readdir, readFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Current production output is about 1,025 KiB total with a 97 KiB largest
// chunk. These defaults leave deliberate release headroom without making the
// gate ceremonial; override them only through a reviewed CI change.
const DEFAULT_TOTAL_GZIP_KB = 1_250
const DEFAULT_CHUNK_GZIP_KB = 130

async function listJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await listJavaScriptFiles(entryPath))
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(entryPath)
    }
  }

  return files
}

export function evaluateBundleBudget(chunks, limits) {
  const totalBytes = chunks.reduce((total, chunk) => total + chunk.gzipBytes, 0)
  const largestChunk = chunks.reduce(
    (largest, chunk) => (!largest || chunk.gzipBytes > largest.gzipBytes ? chunk : largest),
    null
  )
  const failures = []

  if (totalBytes > limits.totalGzipBytes) {
    failures.push(
      `Total client JavaScript is ${formatKb(totalBytes)}, above the ${formatKb(limits.totalGzipBytes)} budget.`
    )
  }
  if (largestChunk && largestChunk.gzipBytes > limits.chunkGzipBytes) {
    failures.push(
      `Largest client chunk ${largestChunk.path} is ${formatKb(largestChunk.gzipBytes)}, above the ${formatKb(limits.chunkGzipBytes)} budget.`
    )
  }

  return { totalBytes, largestChunk, failures }
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB gzip`
}

export async function checkBundleSize({
  chunksDirectory = resolve('.next/static/chunks'),
  totalGzipKb = Number(process.env.BUNDLE_MAX_TOTAL_GZIP_KB || DEFAULT_TOTAL_GZIP_KB),
  chunkGzipKb = Number(process.env.BUNDLE_MAX_CHUNK_GZIP_KB || DEFAULT_CHUNK_GZIP_KB),
} = {}) {
  if (!Number.isFinite(totalGzipKb) || totalGzipKb <= 0) {
    throw new Error('BUNDLE_MAX_TOTAL_GZIP_KB must be a positive number')
  }
  if (!Number.isFinite(chunkGzipKb) || chunkGzipKb <= 0) {
    throw new Error('BUNDLE_MAX_CHUNK_GZIP_KB must be a positive number')
  }

  let files
  try {
    files = await listJavaScriptFiles(chunksDirectory)
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      throw new Error(`Next.js build output not found at ${chunksDirectory}. Run npm run build first.`)
    }
    throw error
  }

  if (files.length === 0) {
    throw new Error(`No client JavaScript chunks found at ${chunksDirectory}`)
  }

  const chunks = await Promise.all(files.map(async (file) => ({
    path: relative(resolve('.'), file),
    gzipBytes: gzipSync(await readFile(file), { level: 9 }).byteLength,
  })))
  const result = evaluateBundleBudget(chunks, {
    totalGzipBytes: totalGzipKb * 1024,
    chunkGzipBytes: chunkGzipKb * 1024,
  })

  console.log(
    `Bundle budget: ${chunks.length} client chunks, ${formatKb(result.totalBytes)} total; largest ${result.largestChunk.path} at ${formatKb(result.largestChunk.gzipBytes)}.`
  )

  if (result.failures.length > 0) {
    throw new Error(`Bundle-size budget failed:\n- ${result.failures.join('\n- ')}`)
  }

  return result
}

const isDirectExecution = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href

if (isDirectExecution) {
  checkBundleSize().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
