// Local component/browser regression harness. Uses fictional API responses and never contacts Supabase.
import { build } from 'esbuild'
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, readdir, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
const out = resolve('output/playwright/audit-revisits')
await mkdir(out, { recursive: true })
const storeId = '11111111-1111-4111-8111-111111111111'
const originalId = '22222222-2222-4222-8222-222222222222'
const compiled = await build({ stdin: {
 contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {AuditRevisits} from './components/stores/audit-revisits'; createRoot(document.getElementById('app')).render(<AuditRevisits storeId="${storeId}" canUpload={!location.search.includes('readonly')}/>);`,
 resolveDir: process.cwd(), loader: 'tsx',
}, plugins: [{ name: 'local-router', setup(b) { b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'local-router', namespace: 'local-router' })); b.onLoad({ filter: /.*/, namespace: 'local-router' }, () => ({ contents: 'export const useRouter = () => ({refresh(){}})', loader: 'js' })) } }], bundle: true, write: false, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' } })
const cssFiles = await readdir('.next/static/css')
const css = (await Promise.all(cssFiles.filter(f => f.endsWith('.css')).map(f => readFile(`.next/static/css/${f}`, 'utf8')))).join('\n')
const html = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local revisit preview</title><style>${css}body{font-family:Arial,sans-serif;background:#f3f6f9;color:#0f172a}main{max-width:1120px;margin:32px auto;padding:20px}h1{font-size:28px;font-weight:bold;margin:16px 0}.preview{background:#fff7d6;border:1px solid #e1bd4a;padding:12px;margin-bottom:20px}</style></head><body><main><div class="preview">LOCAL PREVIEW · synthetic evidence · no live upload</div><h1>Dundee · S0053 · Audit history</h1><div id="app"></div></main><script>${compiled.outputFiles[0].text.replaceAll('</script', '<\\/script')}</script></body></html>`
const server = createServer((_req, response) => { response.writeHead(200, { 'Content-Type': 'text/html' }); response.end(html) })
await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen))
const browser = await chromium.launch({ headless: true })
try {
 const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
 page.setDefaultTimeout(5000)
 const originals = [
  { id: originalId, audit_number: 2, visit_date: '2026-09-17', percentage: 73.20 },
  { id: '44444444-4444-4444-8444-444444444444', audit_number: 1, visit_date: '2026-01-22', percentage: 83.67 },
 ]
 const rows = [], submissions = []
 let interrupt = true
 await page.route('**/api/audit-revisits**', async route => {
  if (route.request().method() === 'GET') return route.fulfill({ json: { originals, revisits: rows } })
  submissions.push(route.request().postData())
  // Simulate a committed server response lost on the first attempt.
  if (!rows.length) rows.push({ id: '55555555-5555-4555-8555-555555555555', original_history_id: originalId, revisit_date: '2026-10-22', notes: 'Synthetic follow-up: training and roof leaks remain open.', file_name: 'Example revisit document.pdf', created_at: '2026-10-25T17:00:00Z', file_sha256: 'a'.repeat(64) })
  if (interrupt) { interrupt = false; return route.fulfill({ status: 503, json: { error: 'Submission outcome is uncertain; retry the same submission' } }) }
  return route.fulfill({ json: { id: rows[0].id, cleanupWarning: null } })
 })
 await page.goto(`http://127.0.0.1:${server.address().port}`)
 await page.getByText('Original Audit 2', { exact: false }).waitFor()
 await page.getByLabel('Original audit', { exact: true }).selectOption(originalId)
 await page.getByLabel('Revisit date', { exact: true }).fill('2026-10-22')
 await page.getByLabel('Revisit notes', { exact: true }).fill(rows[0]?.notes || 'Synthetic follow-up: training and roof leaks remain open.')
 await page.locator('input[type=file]').setInputFiles({ name: 'Example revisit document.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fictional test data') })
 await page.getByRole('button', { name: 'Add revisit evidence', exact: true }).click()
 await page.getByRole('button', { name: 'Retry same submission' }).waitFor()
 assert.equal(await page.getByLabel('Revisit notes', { exact: true }).isDisabled(), true)
 await page.getByRole('button', { name: 'Retry same submission' }).click()
 await page.getByRole('link', { name: 'Download Example revisit document.pdf' }).waitFor()
 assert.equal(submissions.length, 2)
 const ids = submissions.map(body => body.match(/name="requestId"\r\n\r\n([^\r]+)/)?.[1])
 assert.ok(ids[0]); assert.equal(ids[0], ids[1])
 assert.equal(await page.getByText('Original Audit 2 · 17 Sept 2026 · 73.20%', { exact: true }).count(), 1)
 assert.equal(await page.getByText('Original Audit 1 · 22 Jan 2026 · 83.67%', { exact: true }).count(), 1)
 assert.equal(await page.getByRole('link', { name: 'Download Example revisit document.pdf' }).count(), 1)
 await page.screenshot({ path: `${out}/desktop.png`, fullPage: true })
 await page.setViewportSize({ width: 390, height: 844 })
 assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
 await page.screenshot({ path: `${out}/mobile.png`, fullPage: true })
 await page.goto(`http://127.0.0.1:${server.address().port}?readonly`)
 await page.getByRole('link', { name: 'Download Example revisit document.pdf' }).waitFor()
 assert.equal(await page.getByRole('button', { name: 'Add revisit evidence', exact: true }).count(), 0)
 console.log('PASS: real component renders original audits and child revisit, preserves submission ID after uncertain response, avoids duplicate rows, hides uploads for read-only users, and fits desktop/mobile. Screenshots:', out)
} finally { await browser.close(); await new Promise(resolveClose => server.close(resolveClose)) }
