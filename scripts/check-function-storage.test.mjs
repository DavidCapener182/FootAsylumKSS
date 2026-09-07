import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm, truncate } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkFunctionStorage } from './check-function-storage.mjs'

const folders = []
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'function-budget-'))
  folders.push(root)
  await mkdir(join(root, 'routes'))
  await writeFile(join(root, 'shared.bin'), Buffer.alloc(100))
  for (const name of ['a', 'b']) {
    await writeFile(join(root, 'routes', `${name}.nft.json`), JSON.stringify({ files: ['../shared.bin', '../shared.bin'] }))
  }
  return root
}
afterEach(async () => { await Promise.all(folders.splice(0).map(folder => rm(folder, { recursive: true, force: true }))) })
describe('function storage build guard', () => {
  it('deduplicates shared dependencies while checking every route', async () => {
    const result = await checkFunctionStorage(await fixture(), { maxUnique: 100, maxTrace: 100 })
    expect(result.uniqueBytes).toBe(100)
    expect(result.traceCount).toBe(2)
    expect(result.failures).toEqual([])
  })
  it('rejects both total and individual trace growth', async () => {
    const result = await checkFunctionStorage(await fixture(), { maxUnique: 99, maxTrace: 99 })
    expect(result.failures).toHaveLength(3)
  })
  it('fails when referenced dependencies are missing', async () => {
    const root = await fixture()
    await rm(join(root, 'shared.bin'))
    await expect(checkFunctionStorage(root)).rejects.toThrow()
  })
  it('rejects empty builds and invalid budgets', async () => {
    const root = await fixture()
    await expect(checkFunctionStorage(root, { maxUnique: NaN })).rejects.toThrow('Budgets')
    await rm(join(root, 'routes'), { recursive: true })
    await expect(checkFunctionStorage(root)).rejects.toThrow('No build traces')
  })
  it('prevents the newsletter from bundling the entire public directory again', async () => {
    const root = await fixture()
    const folder = join(root, 'api/reports/monthly-newsletter/pdf')
    await mkdir(folder, { recursive: true })
    await writeFile(join(folder, 'asset.bin'), '')
    await truncate(join(folder, 'asset.bin'), 90 * 1024 ** 2 + 1)
    await writeFile(join(folder, 'route.js.nft.json'), JSON.stringify({ files: ['./asset.bin'] }))
    const result = await checkFunctionStorage(root)
    expect(result.failures).toEqual(['Newsletter PDF exceeds 90 MiB; check for unrelated public assets in its trace'])
  })
})
