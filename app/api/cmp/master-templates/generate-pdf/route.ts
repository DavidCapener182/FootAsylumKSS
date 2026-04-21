import { NextRequest, NextResponse } from 'next/server'
import type { Browser } from 'puppeteer'
import { CMP_ADMIN_EMAIL } from '@/lib/cmp/access'
import { getCmpMasterTemplateById } from '@/lib/cmp/master-templates'
import { launchPuppeteerBrowser } from '@/lib/pdf/puppeteer-browser'
import { createClient } from '@/lib/supabase/server'

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

    const templateId = String(request.nextUrl.searchParams.get('templateId') || '').trim()
    const template = getCmpMasterTemplateById(templateId)

    if (!template) {
      return NextResponse.json({ error: 'Unknown templateId' }, { status: 400 })
    }

    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host') || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`
    const reportUrl = `${baseUrl}/print/cmp-master-template?templateId=${encodeURIComponent(template.id)}`
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

    await page.setViewport({ width: 1400, height: 1000 })

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
          const hasTemplate = !!document.querySelector('.cmp-master-template-page')
          const bodyText = (document.body?.innerText || '').toLowerCase()
          const hasTerminalText = /unauthorized|unknown master template|failed|required/i.test(bodyText)
          return hasTemplate || hasTerminalText
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
      throw new Error(`CMP master template print page did not finish rendering within 45000ms. ${details}`.trim())
    }

    await page.waitForSelector('.cmp-master-template-page', { timeout: 30000 })
    await page.emulateMediaType('print')
    await page.evaluate(() => {
      document.body.classList.add('cmp-master-template-print')
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

    const visibleText = await page.evaluate(() =>
      (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 600)
    )

    if (/unknown master template|unauthorized/i.test(visibleText)) {
      throw new Error(visibleText || 'CMP master template print page did not render template content.')
    }

    const pdfBuffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      displayHeaderFooter: false,
    })

    await browser.close()
    browser = null

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${template.filename.replace(/"/g, '\\"')}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('Error generating CMP master template PDF:', error)
    if (browser) {
      try {
        await browser.close()
      } catch {}
    }

    return NextResponse.json(
      { error: 'Failed to generate CMP master template PDF', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
