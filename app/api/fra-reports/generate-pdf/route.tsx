import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFraReportFilename } from '@/lib/utils'
import puppeteer from 'puppeteer'

export const dynamic = 'force-dynamic'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Generate a PDF of the FRA report using Puppeteer.
 * Loads /print/fra-report with print media; PDF uses preferCSSPageSize and margin 0 so @page in print.css is the single source of truth (no double/triple margins).
 */
export async function GET(request: NextRequest) {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null
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
    const reportUrl = `${baseUrl}/print/fra-report?instanceId=${instanceId}`

    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()

    // Set cookies from the request to maintain authentication
    const cookies = request.cookies.getAll()
    if (cookies.length > 0) {
      const cookieObjects = cookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: new URL(baseUrl).hostname,
        path: '/',
      }))
      await page.setCookie(...cookieObjects)
    }

    // Navigate to the report page (use 'load' - networkidle0 is flaky and can timeout)
    await page.goto(reportUrl, {
      waitUntil: 'load',
      timeout: 30000,
    })

    // Wait for content to load (wrapper and at least one section so all pages can render)
    await page.waitForSelector('.fra-report-print-wrapper', { timeout: 15000 })
    await page.waitForSelector('.fra-print-page', { timeout: 10000 })
    await sleep(1500)

    // If the Fire & Rescue map is present, wait for Leaflet container and tile images so map appears in PDF
    try {
      await page.waitForSelector('.fra-map-print .leaflet-container', { timeout: 5000 })
      const mapTilesDeadline = Date.now() + 8000
      while (Date.now() < mapTilesDeadline) {
        const mapReady = await page.evaluate(() => {
          const pane = document.querySelector('.fra-map-print .leaflet-tile-pane')
          if (!pane) return false
          const tileImgs = pane.querySelectorAll('img')
          if (tileImgs.length === 0) return false
          return Array.from(tileImgs).every((img: HTMLImageElement) => img.complete)
        })
        if (mapReady) break
        await sleep(300)
      }
      await sleep(800)
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

    // Set media type to print so @media print styles apply
    await page.emulateMediaType('print')
    await sleep(300)

    // Ensure print-document class so print.css per-page header and layout rules apply
    await page.evaluate(() => {
      document.body.classList.add('fra-print-document')
    })

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
    const { premises, date } = await page.evaluate(() => {
      const root = document.getElementById('print-root')
      return {
        premises: root?.getAttribute('data-pdf-premises') ?? 'Report',
        date: root?.getAttribute('data-pdf-date') ?? '—',
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

    const filename = getFraReportFilename(premises, date, 'pdf')

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
