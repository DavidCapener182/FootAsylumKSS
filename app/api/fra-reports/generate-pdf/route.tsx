import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFraReportFilename } from '@/lib/utils'
import { launchPuppeteerBrowser } from '@/lib/pdf/puppeteer-browser'
import type { Browser } from 'puppeteer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Generate a PDF of the FRA report using Puppeteer.
 * Loads /print/fra-report with print media; PDF uses preferCSSPageSize and margin 0 so @page in print.css is the single source of truth (no double/triple margins).
 */
export async function GET(request: NextRequest) {
  let browser: Browser | null = null
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const instanceId = searchParams.get('instanceId')

    if (!instanceId) {
      return NextResponse.json({ error: 'instanceId is required' }, { status: 400 })
    }

    // Get the base URL for the report page
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host') || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`
    const reportUrl = `${baseUrl}/print/fra-report?instanceId=${instanceId}&forPdf=1`

    browser = await launchPuppeteerBrowser()

    const page = await browser.newPage()
    const failingRequests: string[] = []
    const pageErrors: string[] = []
    const consoleErrors: string[] = []
    const rawCookieHeader = request.headers.get('cookie')

    page.on('response', (response) => {
      if (response.status() < 400) return
      const responseUrl = response.url()
      if (!responseUrl.startsWith(baseUrl)) return
      failingRequests.push(`${response.status()} ${responseUrl}`)
    })

    page.on('pageerror', (error) => {
      pageErrors.push(error instanceof Error ? error.message : String(error))
    })

    page.on('console', (message) => {
      if (message.type() !== 'error') return
      consoleErrors.push(message.text())
    })

    // Use A4-like viewport so map and content get full width (map was half grey otherwise)
    await page.setViewport({ width: 794, height: 1123 })

    // Preserve the exact incoming auth/session cookies for the internal report page request.
    if (rawCookieHeader) {
      await page.setExtraHTTPHeaders({ cookie: rawCookieHeader })
    }

    // Navigate to the report page (use 'load' - networkidle0 is flaky and can timeout)
    await page.goto(reportUrl, {
      waitUntil: 'load',
      timeout: 30000,
    })

    // Wait for content to load: print page fetches data client-side.
    // Some builds render the root with #print-root first, then inject the wrapper class.
    try {
      await page.waitForFunction(
        () => {
          const hasReportWrapper = !!document.querySelector('.fra-report-print-wrapper')
          const hasPrintRoot = !!document.querySelector('#print-root')
          const hasPages = !!document.querySelector('.fra-print-page')
          const hasErrorBlock = !!document.querySelector('.text-red-600')
          const bodyText = (document.body?.innerText || '').toLowerCase()
          const hasTerminalText = /failed to load|failed to generate|unauthorized|forbidden|no data available|missing audit instance|instanceid is required|not ready to view/i.test(bodyText)
          return hasReportWrapper || hasPrintRoot || hasPages || hasErrorBlock || hasTerminalText
        },
        { timeout: 60000 }
      )
    } catch {
      const visibleText = await page.evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 500))
      const details = [
        visibleText ? `Visible page text: ${visibleText}` : '',
        failingRequests.length ? `Failing requests: ${failingRequests.slice(0, 6).join(' | ')}` : '',
        pageErrors.length ? `Page errors: ${pageErrors.slice(0, 4).join(' | ')}` : '',
        consoleErrors.length ? `Console errors: ${consoleErrors.slice(0, 4).join(' | ')}` : '',
      ].filter(Boolean).join(' ')
      throw new Error(`Print page did not finish rendering within 60000ms. ${details}`.trim())
    }

    const renderState = await page.evaluate(() => {
      const hasRenderableReport = !!document.querySelector('.fra-report-print-wrapper, #print-root, .fra-print-page')
      const errorText = document.querySelector('.text-red-600')?.textContent?.trim() || ''
      const visibleText = (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 500)
      return { hasRenderableReport, errorText, visibleText }
    })

    if (!renderState.hasRenderableReport) {
      const details = [
        renderState.errorText ? `Page error: ${renderState.errorText}` : '',
        renderState.visibleText ? `Visible page text: ${renderState.visibleText}` : '',
        failingRequests.length ? `Failing requests: ${failingRequests.slice(0, 6).join(' | ')}` : '',
        pageErrors.length ? `Page errors: ${pageErrors.slice(0, 4).join(' | ')}` : '',
        consoleErrors.length ? `Console errors: ${consoleErrors.slice(0, 4).join(' | ')}` : '',
      ].filter(Boolean).join(' ')
      throw new Error(`Print page did not render report content. ${details}`.trim())
    }

    await page.waitForSelector('.fra-print-page', { timeout: 30000 })
    await sleep(1500)

    // Apply print media before map checks so Leaflet renders at final PDF dimensions.
    await page.emulateMediaType('print')
    await page.evaluate(() => {
      document.body.classList.add('fra-print-document')
      window.dispatchEvent(new Event('resize'))
    })
    await sleep(700)

    // If the Fire & Rescue map is present, wait for Leaflet container and tile images so map appears in PDF
    try {
      await page.waitForSelector('.fra-map-print .leaflet-container', { timeout: 5000 })
      const mapTilesDeadline = Date.now() + 12000
      while (Date.now() < mapTilesDeadline) {
        const mapReady = await page.evaluate(() => {
          const container = document.querySelector('.fra-map-print .leaflet-container') as HTMLElement | null
          if (!container) return false
          if (container.clientWidth === 0 || container.clientHeight === 0) return false

          const pane = document.querySelector('.fra-map-print .leaflet-tile-pane')
          if (!pane) return false
          const tileImgs = pane.querySelectorAll('img')
          if (tileImgs.length === 0) return false
          return Array.from(tileImgs).every(
            (img: HTMLImageElement) => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0
          )
        })
        if (mapReady) break
        await page.evaluate(() => {
          window.dispatchEvent(new Event('resize'))
        })
        await sleep(400)
      }
      await sleep(1200)
    } catch {
      // No map on this report or map failed to mount; continue without blocking
    }

    // Wait for all images to finish loading so PDF includes uploaded photos
    const imageWaitDeadline = Date.now() + 8000
    while (Date.now() < imageWaitDeadline) {
      const allLoaded = await page.evaluate(() => {
        const imgs = Array.from(document.images)
        return imgs.length === 0 || imgs.every((img: HTMLImageElement) => img.complete)
      })
      if (allLoaded) break
      await sleep(200)
    }

    await sleep(300)

    // Force every ancestor of #print-root to allow pagination (no fixed height/overflow)
    await page.evaluate(() => {
      const root = document.getElementById('print-root')
      if (!root) return
      let el: HTMLElement | null = root
      while (el) {
        ;(el as HTMLElement).style.setProperty('height', 'auto', 'important')
        ;(el as HTMLElement).style.setProperty('min-height', '0', 'important')
        ;(el as HTMLElement).style.setProperty('overflow', 'visible', 'important')
        ;(el as HTMLElement).style.setProperty('max-height', 'none', 'important')
        ;(el as HTMLElement).style.setProperty('display', 'block', 'important')
        el = el.parentElement
      }
      document.documentElement.style.setProperty('height', 'auto', 'important')
      document.body.style.setProperty('height', 'auto', 'important')
      document.body.style.setProperty('overflow', 'visible', 'important')
    })

    // Read premises/date from the page for filename only. Do not use displayHeaderFooter:
    // each .fra-print-page already has its own .fra-print-page-header in the HTML, so
    // Puppeteer's header would duplicate it.
    const { premises, date, storeCode, storeName } = await page.evaluate(() => {
      const root = document.getElementById('print-root')
      return {
        premises: root?.getAttribute('data-pdf-premises') ?? 'Report',
        date: root?.getAttribute('data-pdf-date') ?? '—',
        storeCode: root?.getAttribute('data-pdf-store-code') ?? '',
        storeName: root?.getAttribute('data-pdf-store-name') ?? '',
      }
    })

    // Use per-page headers in HTML only; do not enable Puppeteer headerTemplate or we get two headers on page 1.
    const pdfBuffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      displayHeaderFooter: false,
    })

    await browser.close()
    browser = null

    const filename = getFraReportFilename(premises, date, 'pdf', storeCode, storeName)

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '\\"')}"`,
      },
    })
  } catch (error: any) {
    console.error('Error generating FRA PDF:', error)
    if (browser) {
      try {
        await browser.close()
      } catch (_) {}
    }
    const message = error?.message || String(error)
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: message },
      { status: 500 }
    )
  }
}
