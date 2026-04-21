import { NextRequest, NextResponse } from 'next/server'
import type { Browser } from 'puppeteer'
import { CMP_ADMIN_EMAIL } from '@/lib/cmp/access'
import { createClient } from '@/lib/supabase/server'
import { launchPuppeteerBrowser } from '@/lib/pdf/puppeteer-browser'
import { getCmpReportFilename } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function GET(request: NextRequest) {
  let browser: Browser | null = null

  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const email = String(user?.email || '').toLowerCase()

    if (!user || email !== CMP_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const planId = String(request.nextUrl.searchParams.get('planId') || '').trim()

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }

    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host') || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`
    const reportUrl = `${baseUrl}/print/cmp-report?planId=${encodeURIComponent(planId)}`
    const rawCookieHeader = request.headers.get('cookie')

    browser = await launchPuppeteerBrowser()
    const page = await browser.newPage()
    const failingRequests: string[] = []
    const pageErrors: string[] = []
    const consoleErrors: string[] = []

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

    await page.setViewport({ width: 794, height: 1123 })

    if (rawCookieHeader) {
      await page.setExtraHTTPHeaders({ cookie: rawCookieHeader })
    }

    await page.goto(reportUrl, {
      waitUntil: 'load',
      timeout: 30000,
    })

    try {
      await page.waitForFunction(
        () => {
          const hasReport = !!document.querySelector('.cmp-report-print-wrapper, #print-root, .cmp-print-page')
          const bodyText = (document.body?.innerText || '').toLowerCase()
          const hasTerminalText = /unauthorized|forbidden|missing cmp planid|failed|required/i.test(
            bodyText
          )
          return hasReport || hasTerminalText
        },
        { timeout: 45000 }
      )
    } catch {
      const visibleText = await page.evaluate(() =>
        (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 500)
      )
      const details = [
        visibleText ? `Visible page text: ${visibleText}` : '',
        failingRequests.length ? `Failing requests: ${failingRequests.slice(0, 6).join(' | ')}` : '',
        pageErrors.length ? `Page errors: ${pageErrors.slice(0, 4).join(' | ')}` : '',
        consoleErrors.length ? `Console errors: ${consoleErrors.slice(0, 4).join(' | ')}` : '',
      ]
        .filter(Boolean)
        .join(' ')
      throw new Error(`CMP print page did not finish rendering within 45000ms. ${details}`.trim())
    }

    await page.waitForSelector('.cmp-print-page', { timeout: 30000 })
    await page.emulateMediaType('print')
    await page.evaluate(() => {
      document.body.classList.add('cmp-print-document')
      window.dispatchEvent(new Event('resize'))
    })
    await sleep(700)

    const imageWaitDeadline = Date.now() + 5000
    while (Date.now() < imageWaitDeadline) {
      const allLoaded = await page.evaluate(() => {
        const imgs = Array.from(document.images)
        return imgs.length === 0 || imgs.every((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)
      })
      if (allLoaded) break
      await sleep(200)
    }

    await sleep(300)

    await page.evaluate(() => {
      const root = document.getElementById('print-root')
      if (!root) return
      let el: HTMLElement | null = root
      while (el) {
        el.style.setProperty('height', 'auto', 'important')
        el.style.setProperty('min-height', '0', 'important')
        el.style.setProperty('overflow', 'visible', 'important')
        el.style.setProperty('max-height', 'none', 'important')
        el.style.setProperty('display', 'block', 'important')
        el = el.parentElement
      }
      document.documentElement.style.setProperty('height', 'auto', 'important')
      document.body.style.setProperty('height', 'auto', 'important')
      document.body.style.setProperty('overflow', 'visible', 'important')
    })

    const visibleText = await page.evaluate(() =>
      (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 800)
    )

    if (/cmp database setup required|unauthorized|missing cmp planid/i.test(visibleText)) {
      throw new Error(visibleText || 'CMP print page did not render report content.')
    }

    const metadata = await page.evaluate(() => {
      const root = document.getElementById('print-root')
      return {
        title: root?.getAttribute('data-pdf-title') || 'Crowd Management Plan',
        eventName: root?.getAttribute('data-pdf-event') || '',
        showDates: root?.getAttribute('data-pdf-date') || '',
        venueName: root?.getAttribute('data-pdf-venue') || '',
      }
    })

    const pdfBuffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      displayHeaderFooter: false,
    })

    await browser.close()
    browser = null

    const filename = getCmpReportFilename(
      metadata.eventName || metadata.title,
      metadata.showDates,
      'pdf',
      metadata.venueName
    )

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '\\"')}"`,
      },
    })
  } catch (error: any) {
    console.error('Error generating CMP PDF:', error)
    if (browser) {
      try {
        await browser.close()
      } catch {}
    }

    return NextResponse.json(
      { error: 'Failed to generate CMP PDF', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
