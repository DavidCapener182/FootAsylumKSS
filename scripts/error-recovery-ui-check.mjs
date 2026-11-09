// Exercise the real error screen with failed imports and full browser reloads.
// Run: node scripts/error-recovery-ui-check.mjs
import { build } from 'esbuild'
import { chromium, expect } from '@playwright/test'
import { createServer } from 'node:http'
import { resolve } from 'node:path'

const bundle = await build({
  stdin: { contents: `import React, { Suspense } from 'react'; import { createRoot } from 'react-dom/client'; import ApplicationError from './app/error';
    const mode = new URL(location.href).searchParams.get('mode');
    const url = new URL('/workspace-chunk.js?mode=' + mode, location.href).href;
    const Workspace = React.lazy(() => import(url));
    let retry = false;
    class Boundary extends React.Component {
      state = { error: null };
      static getDerivedStateFromError(error) { return { error }; }
      render() { return this.state.error ? React.createElement(ApplicationError, { error: this.state.error, reset: () => { retry = true; this.setState({ error: null }); } }) : this.props.children; }
    }
    function Content() { if (mode === 'ordinary') { if (!retry) throw new Error('Request failed'); return 'Request recovered'; } return React.createElement(Suspense, { fallback: 'Loading' }, React.createElement(Workspace)); }
    createRoot(document.getElementById('root')).render(React.createElement(Boundary, null, React.createElement(Content)));`, resolveDir: resolve('.'), loader: 'tsx' },
  bundle: true, write: false, format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
})
const documents = new Map()
const chunks = new Map()
const server = createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost')
  const mode = url.searchParams.get('mode')
  response.setHeader('Cache-Control', 'no-store')
  if (url.pathname === '/app.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(bundle.outputFiles[0].text); return }
  if (url.pathname === '/workspace-chunk.js') {
    chunks.set(mode, (chunks.get(mode) || 0) + 1)
    response.setHeader('Content-Type', 'text/javascript')
    if (mode === 'persistent' || chunks.get(mode) === 1) { response.statusCode = 503; response.end(''); return }
    response.end('export default function Workspace() { return "Workspace recovered"; }'); return
  }
  if (url.pathname === '/api/observability/client') { request.socket.destroy(); return }
  if (url.pathname === '/') documents.set(mode, (documents.get(mode) || 0) + 1)
  response.setHeader('Content-Type', 'text/html')
  response.end('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Error recovery check</title></head><body><div id="root"></div><script src="/app.js"></script></body></html>')
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}`
let browser
try {
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) })
  for (const width of [320, 1440]) {
    documents.clear(); chunks.clear()
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    await page.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort())
    await page.addInitScript(() => { window.unhandled = []; addEventListener('unhandledrejection', event => window.unhandled.push(String(event.reason))); })
    await page.goto(`${base}/?mode=transient`)
    await expect(page.getByRole('button', { name: 'Reload workspace' })).toBeVisible()
    expect(documents.get('transient')).toBe(1)
    await page.getByRole('button', { name: 'Reload workspace' }).click()
    await expect(page.getByText('Workspace recovered', { exact: true })).toBeVisible()
    expect(documents.get('transient')).toBe(2)
    expect(chunks.get('transient')).toBe(2)

    await page.goto(`${base}/?mode=persistent`)
    for (const attempts of [1, 2, 3]) {
      await expect(page.getByRole('button', { name: 'Reload workspace' })).toBeVisible()
      await page.waitForTimeout(100)
      expect(documents.get('persistent')).toBe(attempts)
      expect(await page.evaluate(() => window.unhandled)).toEqual([])
      if (attempts < 3) await page.getByRole('button', { name: 'Reload workspace' }).click()
    }
    await page.goto(`${base}/?mode=ordinary`)
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.getByText('Request recovered', { exact: true })).toBeVisible()
    expect(documents.get('ordinary')).toBe(1)
    await page.close()
    console.log(`PASS ${width}px: failed dynamic import recovers after full reload; persistent failures allow repeated manual retries without a reload loop; ordinary errors reset; failed telemetry is handled`)
  }
} finally {
  if (browser) await browser.close()
  await new Promise(resolve => server.close(resolve))
}
