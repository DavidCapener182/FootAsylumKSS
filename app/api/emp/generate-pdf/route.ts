import { NextRequest, NextResponse } from 'next/server'
import type { Browser } from 'puppeteer'
import { EMP_ADMIN_EMAIL } from '@/lib/emp/access'
import { createClient } from '@/lib/supabase/server'
import { launchPuppeteerBrowser } from '@/lib/pdf/puppeteer-browser'
import { getEmpReportFilename } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function withPdfTitleMetadata(buffer: Buffer, title: string) {
  if (!title || !/^%PDF-/.test(buffer.subarray(0, 8).toString('latin1'))) return buffer

  const escapePdfString = (value: string) =>
    value
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[\r\n]+/g, ' ')

  const original = buffer.toString('latin1')
  const trailerIndex = original.lastIndexOf('trailer')
  const startXrefMatch = original.match(/startxref\s+(\d+)\s+%%EOF\s*$/)
  if (trailerIndex === -1 || !startXrefMatch) return buffer

  const trailer = original.slice(trailerIndex)
  const size = Number(trailer.match(/\/Size\s+(\d+)/)?.[1] || 0)
  const root = trailer.match(/\/Root\s+(\d+\s+\d+\s+R)/)?.[1]
  const prev = Number(startXrefMatch[1])
  if (!size || !root || !Number.isFinite(prev)) return buffer

  const newObjectNumber = size
  const newObjectOffset = buffer.length
  const object = `\n${newObjectNumber} 0 obj\n<< /Title (${escapePdfString(title)}) /Producer (KSS NW LTD Platform) >>\nendobj\n`
  const xrefOffset = newObjectOffset + Buffer.byteLength(object, 'latin1')
  const xref = `xref\n${newObjectNumber} 1\n${String(newObjectOffset).padStart(10, '0')} 00000 n \n`
  const appendedTrailer = `trailer\n<< /Size ${newObjectNumber + 1} /Root ${root} /Info ${newObjectNumber} 0 R /Prev ${prev} >>\nstartxref\n${xrefOffset}\n%%EOF\n`

  return Buffer.concat([
    buffer,
    Buffer.from(object + xref + appendedTrailer, 'latin1'),
  ])
}

export async function GET(request: NextRequest) {
  let browser: Browser | null = null

  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const email = String(user?.email || '').toLowerCase()

    if (!user || email !== EMP_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const planId = String(request.nextUrl.searchParams.get('planId') || '').trim()

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }

    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host') || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`
    const reportUrl = `${baseUrl}/print/emp-report?planId=${encodeURIComponent(planId)}`
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
          const hasReport = !!document.querySelector('.emp-report-print-wrapper, #print-root, .emp-print-page')
          const bodyText = (document.body?.innerText || '').toLowerCase()
          const hasTerminalText = /unauthorized|forbidden|missing emp planid|failed|required/i.test(
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
      throw new Error(`EMP print page did not finish rendering within 45000ms. ${details}`.trim())
    }

    await page.waitForSelector('.emp-print-page', { timeout: 30000 })
    await page.emulateMediaType('print')
    await page.evaluate(() => {
      document.body.classList.add('emp-print-document')
      const existingPageStyle = document.getElementById('emp-pdf-page-style')
      existingPageStyle?.remove()
      const pageStyle = document.createElement('style')
      pageStyle.id = 'emp-pdf-page-style'
      pageStyle.textContent = '@page { size: A4; margin: 0; }'
      document.head.appendChild(pageStyle)
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
      (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 800)
    )

    if (/emp database setup required|unauthorized|missing emp planid/i.test(visibleText)) {
      throw new Error(visibleText || 'EMP print page did not render report content.')
    }

    const metadata = await page.evaluate(() => {
      const root = document.getElementById('print-root')
      return {
        title: root?.getAttribute('data-pdf-title') || 'Event Management Plan',
        eventName: root?.getAttribute('data-pdf-event') || '',
        showDates: root?.getAttribute('data-pdf-date') || '',
        venueName: root?.getAttribute('data-pdf-venue') || '',
      }
    })

    await page.evaluate((title) => {
      document.title = title
    }, metadata.title)

    const rawPdfBuffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      displayHeaderFooter: false,
    })
    const pdfBuffer = withPdfTitleMetadata(Buffer.from(rawPdfBuffer), metadata.title)

    await browser.close()
    browser = null

    const filename = /Bar Security Operations Plan/i.test(metadata.title)
      ? `${metadata.title}.pdf`
      : getEmpReportFilename(
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
    console.error('Error generating EMP PDF:', error)
    if (browser) {
      try {
        await browser.close()
      } catch {}
    }

    return NextResponse.json(
      { error: 'Failed to generate EMP PDF', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
