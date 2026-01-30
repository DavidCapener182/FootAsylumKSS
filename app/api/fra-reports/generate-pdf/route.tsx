import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFraReportFilename } from '@/lib/utils'
import puppeteer from 'puppeteer'

export const dynamic = 'force-dynamic'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Generate a PDF of the FRA report using Puppeteer
 * This creates a proper multi-page PDF with headers and footers on each page
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

    // Wait for content to load
    await page.waitForSelector('.fra-report-print-wrapper', { timeout: 15000 })
    await sleep(1500)

    // Set media type to print so @media print styles apply
    await page.emulateMediaType('print')
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

    // Read header/footer text from the page for PDF margin boxes
    const { premises, assessor, date } = await page.evaluate(() => {
      const root = document.getElementById('print-root')
      return {
        premises: root?.getAttribute('data-pdf-premises') ?? 'Report',
        assessor: root?.getAttribute('data-pdf-assessor') ?? '',
        date: root?.getAttribute('data-pdf-date') ?? '—',
      }
    })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '22mm',
        right: '18mm',
        bottom: '22mm',
        left: '18mm',
      },
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size:10pt; padding:0 8px; color:#334155;"><span>KSS NW Ltd</span><span style="position:absolute; left:50%; transform:translateX(-50%);">Fire Risk Assessment – ${String(premises).replace(/</g, '&lt;')}</span></div>`,
      footerTemplate: `<div style="font-size:9pt; color:#64748b; padding:0 8px;"><span>${String(assessor).replace(/</g, '&lt;')} – KSS NW Ltd</span><span style="position:absolute; right:8px;">${String(date).replace(/</g, '&lt;')}</span></div>`,
    })

    await browser.close()
    browser = null

    const filename = getFraReportFilename(premises, date, `fra-report-${instanceId.slice(-8)}.pdf`)

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
