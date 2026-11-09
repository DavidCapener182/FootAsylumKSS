// Isolated browser check of the real form. No Supabase or production requests.
// Run: node scripts/store-creation-ui-check.mjs
import { build } from 'esbuild'
import { chromium, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createServer } from 'node:http'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve('.')
const output = resolve('output/store-creation-qa')
await mkdir(output, { recursive: true })
const temporary = await mkdtemp(join(tmpdir(), 'store-creation-ui-'))
execFileSync(process.execPath, ['node_modules/tailwindcss/lib/cli.js', '-i', 'app/globals.css', '-o', join(temporary, 'style.css'), '--minify'], { cwd: root, stdio: 'pipe' })
const bundle = await build({
  stdin: { contents: `import React from 'react'; import { createRoot } from 'react-dom/client'; import { CreateStoreForm } from './components/stores/create-store-form';
    window.calls=[]; window.navigation=[]; const root=createRoot(document.getElementById('root'));
    window.leave=()=>root.render(React.createElement('p',null,'Another page'));
    root.render(React.createElement(CreateStoreForm));`, resolveDir: root, loader: 'tsx' },
  bundle: true, write: false, format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'isolated-boundaries', setup(plugin) {
    plugin.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'router', namespace: 'fixture' }))
    plugin.onResolve({ filter: /^@\/app\/actions\/create-store$/ }, () => ({ path: 'action', namespace: 'fixture' }))
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === 'router'
      ? `export function useRouter(){return {push:p=>window.navigation.push(['push',p]),replace:p=>window.navigation.push(['replace',p]),refresh:()=>window.navigation.push(['refresh'])}}`
      : `export async function createStore(input){window.calls.push(input);return await new Promise((resolve,reject)=>{window.resolveAction=resolve;window.rejectAction=reject})}` }))
  } }],
})
const css = await readFile(join(temporary, 'style.css'))
const server = createServer((request, response) => {
  if (request.url === '/app.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(bundle.outputFiles[0].text); return }
  if (request.url === '/style.css') { response.setHeader('Content-Type', 'text/css'); response.end(css); return }
  response.setHeader('Content-Type', 'text/html')
  response.end('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>New store form check</title><link rel="stylesheet" href="/style.css"></head><body><main class="mx-auto max-w-3xl p-3 sm:p-6"><h1 class="mb-4 text-2xl font-bold">Add new store</h1><div id="root"></div></main><script src="/app.js"></script></body></html>')
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}`
let browser
try {
  browser = await chromium.launch({ headless: true })
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort())
    await page.goto(base)
    await page.getByRole('button', { name: 'Create store', exact: true }).click()
    expect(await page.evaluate(() => window.calls.length)).toBe(0)
    const fill = async () => {
      await page.getByLabel('Store name', { exact: true }).fill('New Outlet')
      await page.getByLabel('Address', { exact: true }).fill('1 Example Road')
      await page.getByLabel('Town or city').fill('Example')
      await page.getByLabel('Postcode').fill('AB1 2CD')
    }
    await fill()
    const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(accessibility.violations.filter(v => ['critical', 'serious'].includes(v.impact))).toEqual([])
    expect(await page.evaluate(() => [...document.querySelectorAll('input,select,button')].every(el => el.getBoundingClientRect().right <= innerWidth))).toBe(true)
    await page.screenshot({ path: join(output, `store-form-${width}.png`), fullPage: true })
    await page.getByRole('button', { name: 'Create store', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Creating store…' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    await page.locator('form').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(await page.evaluate(() => window.calls.length)).toBe(1)
    expect(await page.evaluate(() => window.calls[0].store_code)).toBe('')
    await page.evaluate(() => window.rejectAction(new Error('lost response')))
    await expect(page.getByRole('alert')).toContainText('could not be confirmed')
    await expect(page.getByLabel('Store name', { exact: true })).toHaveValue('New Outlet')
    await page.getByRole('button', { name: 'Create store', exact: true }).click()
    expect(await page.evaluate(() => window.calls[0].requestId === window.calls[1].requestId)).toBe(true)
    await page.evaluate(() => window.resolveAction({ ok: true, id: 'saved-record' }))
    await expect.poll(() => page.evaluate(() => window.navigation)).toEqual([['replace', '/stores/saved-record'], ['refresh']])
    await page.reload()
    await page.getByRole('button', { name: 'Cancel' }).click()
    expect(await page.evaluate(() => window.calls.length)).toBe(0)
    expect(await page.evaluate(() => window.navigation)).toEqual([['push', '/stores']])
    await page.reload(); await fill()
    await page.getByRole('button', { name: 'Create store', exact: true }).click()
    await page.evaluate(() => window.leave())
    await expect(page.getByText('Another page')).toBeVisible()
    await page.evaluate(() => window.resolveAction({ ok: true, id: 'saved-after-leaving' }))
    await page.waitForTimeout(100)
    expect(await page.evaluate(() => window.navigation)).toEqual([])
    expect(errors).toEqual([])
    await context.close()
    console.log(`PASS ${width}px: validation, optional code, duplicate click, lost-response retry, save navigation, cancel, late result, accessibility and layout`)
  }
} finally {
  if (browser) await browser.close()
  await new Promise(resolve => server.close(resolve))
}
