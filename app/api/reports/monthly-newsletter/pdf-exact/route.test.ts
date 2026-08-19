import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mockRequireReportAccess = vi.fn()
const mockLaunchPuppeteerBrowser = vi.fn()

vi.mock('@/lib/reports/authorization', () => ({
  requireReportAccess: mockRequireReportAccess,
  reportPermissionErrorResponse: vi.fn((error: unknown) => {
    if (!(error instanceof Error) || error.message !== 'denied') return null
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }),
}))

vi.mock('@/lib/pdf/puppeteer-browser', () => ({
  launchPuppeteerBrowser: mockLaunchPuppeteerBrowser,
}))

describe('exact newsletter PDF authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects before launching a browser when report access is denied', async () => {
    mockRequireReportAccess.mockRejectedValue(new Error('denied'))
    const { POST } = await import('./route')
    const request = new NextRequest('http://localhost/api/reports/monthly-newsletter/pdf-exact', {
      method: 'POST',
      body: JSON.stringify({ html: '<main>private report</main>' }),
    })

    const response = await POST(request)

    expect(response.status).toBe(403)
    expect(mockRequireReportAccess).toHaveBeenCalledTimes(1)
    expect(mockLaunchPuppeteerBrowser).not.toHaveBeenCalled()
  })
})
