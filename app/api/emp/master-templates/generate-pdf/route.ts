import { NextRequest, NextResponse } from 'next/server'
import type { Browser } from 'puppeteer'
import JSZip from 'jszip'
import { isCurrentEmpAdmin } from '@/lib/emp/access'
import { getEmpMasterTemplatePlanPrefill } from '@/lib/emp/data'
import {
  applyDeploymentMatrixSourcePageOverrides,
  buildSupervisorDeploymentTablePagesFromDeploymentMatrixOverrides,
  normalizeStaffSignInTablePages,
  syncDeploymentMatrixEventPagesFromSourcePages,
} from '@/lib/emp/master-template-prefill'
import {
  getEmpMasterTemplateById,
  resolveEmpMasterTemplateForEvent,
  type EmpMasterTemplateDefinition,
} from '@/lib/emp/master-templates'
import { launchPuppeteerBrowser } from '@/lib/pdf/puppeteer-browser'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function ensureAuthorizedAdmin() {
  return isCurrentEmpAdmin()
}

async function renderTemplatePdf(
  request: NextRequest,
  template: EmpMasterTemplateDefinition,
  prefill: string,
  browser: Browser
) {
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const host = request.headers.get('host') || 'localhost:3000'
  const baseUrl = `${protocol}://${host}`
  const reportParams = new URLSearchParams({ templateId: template.id })
  if (prefill) {
    reportParams.set('prefill', prefill)
  }
  const reportUrl = `${baseUrl}/print/emp-master-template?${reportParams.toString()}`
  const rawCookieHeader = request.headers.get('cookie')

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
        const hasTemplate = !!document.querySelector('.emp-master-template-page')
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
    throw new Error(`EMP master template print page did not finish rendering within 45000ms. ${details}`.trim())
  }

  await page.waitForSelector('.emp-master-template-page', { timeout: 30000 })
  await page.emulateMediaType('print')
  await page.evaluate(() => {
    document.body.classList.add('emp-master-template-print')
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
    throw new Error(visibleText || 'EMP master template print page did not render template content.')
  }

  const pdfBuffer = await page.pdf({
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    displayHeaderFooter: false,
  })
  await page.close()
  return pdfBuffer
}

function getSafeArchiveFilename() {
  return `emp-master-templates-${new Date().toISOString().slice(0, 10)}.zip`
}

function buildPrefillForTemplate(
  templateId: string,
  prefill: {
    eventName?: string
    eventDate?: string
    templateFieldValues?: Record<string, Record<string, string>>
    templateTableCellValues?: Record<string, Record<string, string>>
    templateTablePageValues?: Record<string, Array<{
      fields?: Record<string, string>
      tableCells?: Record<string, string>
    }>>
  },
  options: {
    deploymentOverrides?: Array<{
      fields?: Record<string, string>
      tableCells?: Record<string, string>
    }>
  } = {}
) {
  const rawTablePages = prefill.templateTablePageValues?.[templateId] || []
  const tablePages = templateId === 'staff-sign-in-sign-out-sheet'
    ? normalizeStaffSignInTablePages(rawTablePages)
    : rawTablePages
  const deploymentMatrixPages = prefill.templateTablePageValues?.['deployment-matrix'] || []
  const supervisorDeploymentPages = templateId === 'supervisor-deployment' && options.deploymentOverrides?.length
    ? buildSupervisorDeploymentTablePagesFromDeploymentMatrixOverrides(deploymentMatrixPages, options.deploymentOverrides)
    : []

  return JSON.stringify({
    eventName: String(prefill.eventName || ''),
    eventDate: String(prefill.eventDate || ''),
    fields: prefill.templateFieldValues?.[templateId] || {},
    tableCells: prefill.templateTableCellValues?.[templateId] || {},
    tablePages: templateId === 'deployment-matrix'
      ? options.deploymentOverrides?.length
        ? applyDeploymentMatrixSourcePageOverrides(tablePages, options.deploymentOverrides)
        : syncDeploymentMatrixEventPagesFromSourcePages(tablePages)
      : templateId === 'supervisor-deployment' && supervisorDeploymentPages.length
        ? supervisorDeploymentPages
      : tablePages,
  })
}

function readEventIdentityFromPrefill(prefill: string) {
  if (!prefill) return {}
  try {
    const parsed = JSON.parse(prefill)
    if (!parsed || typeof parsed !== 'object') return {}
    return {
      eventName: typeof parsed.eventName === 'string' ? parsed.eventName : '',
    }
  } catch {
    return {}
  }
}

export async function GET(request: NextRequest) {
  let browser: Browser | null = null

  try {
    const authorized = await ensureAuthorizedAdmin()
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const templateId = String(request.nextUrl.searchParams.get('templateId') || '').trim()
    const planId = String(request.nextUrl.searchParams.get('planId') || '').trim()
    const deploymentOverridesRaw = String(request.nextUrl.searchParams.get('deploymentOverrides') || '').trim()
    const disposition = request.nextUrl.searchParams.get('disposition') === 'inline' ? 'inline' : 'attachment'
    let prefill = String(request.nextUrl.searchParams.get('prefill') || '')
    let template = getEmpMasterTemplateById(templateId)

    if (!template) {
      return NextResponse.json({ error: 'Unknown templateId' }, { status: 400 })
    }

    let planPrefill: Awaited<ReturnType<typeof getEmpMasterTemplatePlanPrefill>> | null = null
    if (!prefill && planId) {
      planPrefill = await getEmpMasterTemplatePlanPrefill(planId)
      template = resolveEmpMasterTemplateForEvent(template.id, {
        eventName: planPrefill.prefillData.eventName,
        planTitle: planPrefill.planTitle,
      })
      if (!template) {
        return NextResponse.json({ error: 'Unknown templateId' }, { status: 400 })
      }
      let deploymentOverrides: Array<{
        fields?: Record<string, string>
        tableCells?: Record<string, string>
      }> = []

      if (deploymentOverridesRaw) {
        try {
          const parsedOverrides = JSON.parse(deploymentOverridesRaw)
          deploymentOverrides = Array.isArray(parsedOverrides) ? parsedOverrides : []
        } catch {
          deploymentOverrides = []
        }
      }

      prefill = buildPrefillForTemplate(template.id, planPrefill.prefillData, {
        deploymentOverrides,
      })
    } else if (prefill) {
      template = resolveEmpMasterTemplateForEvent(template.id, readEventIdentityFromPrefill(prefill))
      if (!template) {
        return NextResponse.json({ error: 'Unknown templateId' }, { status: 400 })
      }
    }

    browser = await launchPuppeteerBrowser()
    const pdfBuffer = await renderTemplatePdf(request, template, prefill, browser)

    await browser.close()
    browser = null

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${template.filename.replace(/"/g, '\\"')}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('Error generating EMP master template PDF:', error)
    if (browser) {
      try {
        await browser.close()
      } catch {}
    }

    return NextResponse.json(
      { error: 'Failed to generate EMP master template PDF', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  let browser: Browser | null = null

  try {
    const authorized = await ensureAuthorizedAdmin()
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      templateIds?: unknown
      prefill?: {
        eventName?: string
        eventDate?: string
        templateFieldValues?: Record<string, Record<string, string>>
        templateTableCellValues?: Record<string, Record<string, string>>
        templateTablePageValues?: Record<string, Array<{
          fields?: Record<string, string>
          tableCells?: Record<string, string>
        }>>
      }
    }
    const templateIds = Array.isArray(body.templateIds)
      ? body.templateIds.filter((id): id is string => typeof id === 'string').map((id) => id.trim()).filter(Boolean)
      : []

    if (templateIds.length === 0) {
      return NextResponse.json({ error: 'No template IDs were provided.' }, { status: 400 })
    }

    const prefill = body.prefill || {}
    const uniqueTemplateIds = Array.from(new Set(templateIds))
    const selectedTemplateMap = new Map<string, EmpMasterTemplateDefinition>()
    uniqueTemplateIds.forEach((templateId) => {
      const template = resolveEmpMasterTemplateForEvent(templateId, {
        eventName: prefill.eventName,
      })
      if (template) {
        selectedTemplateMap.set(template.id, template)
      }
    })
    const selectedTemplates = Array.from(selectedTemplateMap.values())

    if (selectedTemplates.length === 0) {
      return NextResponse.json({ error: 'No valid templates were selected.' }, { status: 400 })
    }

    const zip = new JSZip()
    const usedNames = new Map<string, number>()
    browser = await launchPuppeteerBrowser()

    for (const template of selectedTemplates) {
      const prefillJson = buildPrefillForTemplate(template.id, prefill)
      const pdfBuffer = await renderTemplatePdf(request, template, prefillJson, browser)
      const currentCount = usedNames.get(template.filename) ?? 0
      usedNames.set(template.filename, currentCount + 1)
      const filename =
        currentCount === 0
          ? template.filename
          : template.filename.replace(/\.pdf$/i, `-${currentCount + 1}.pdf`)
      zip.file(filename, pdfBuffer)
    }

    const archive = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    })

    await browser.close()
    browser = null

    return new NextResponse(Buffer.from(archive) as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${getSafeArchiveFilename()}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    })
  } catch (error: any) {
    console.error('Error generating EMP master template archive:', error)
    if (browser) {
      try {
        await browser.close()
      } catch {}
    }
    return NextResponse.json(
      { error: 'Failed to generate EMP master template archive', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
