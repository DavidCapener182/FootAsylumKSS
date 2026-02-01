import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import JSZip from 'jszip'

const mockUser = { id: 'user-1', email: 'test@test.com' }
const mockFraData = {
  premises: 'Test Store',
  clientName: 'Test Client',
  address: '123 Test St',
  responsiblePerson: 'Responsible',
  ultimateResponsiblePerson: 'Ultimate',
  appointedPerson: 'Appointed',
  assessorName: 'Assessor',
  assessmentDate: '2026-01-01',
  assessmentStartTime: null,
  assessmentEndTime: null,
  buildDate: '2020',
  propertyType: 'Retail',
  description: 'Test premises',
  numberOfFloors: '1',
  floorArea: '100',
  floorAreaComment: null,
  occupancy: '50',
  occupancyComment: null,
  operatingHours: '9-5',
  operatingHoursComment: null,
  sleepingRisk: 'None',
  internalFireDoors: 'FD30',
  historyOfFires: 'None',
  fireAlarmDescription: 'Test',
  fireAlarmPanelLocation: 'Reception',
  emergencyLightingDescription: 'Test',
  fireExtinguishersDescription: 'Test',
  hasSprinklers: false,
  sprinklerDescription: '',
  sprinklerClearance: '',
  sourcesOfIgnition: ['Electrical'],
  sourcesOfFuel: ['Stock'],
  sourcesOfOxygen: ['Normal'],
  peopleAtRisk: ['Staff'],
  significantFindings: ['None'],
  recommendedControls: ['Maintain'],
  riskRatingLikelihood: 'Normal' as const,
  riskRatingConsequences: 'Moderate Harm' as const,
  summaryOfRiskRating: 'Acceptable',
  actionPlanItems: [] as { recommendation: string; priority: string; dueNote?: string }[],
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    },
    storage: {
      from: vi.fn(() => ({
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    },
  })),
}))

vi.mock('@/app/actions/fra-reports', () => ({
  mapHSAuditToFRAData: vi.fn().mockResolvedValue(mockFraData),
}))

describe('FRA DOCX generate-docx route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a valid DOCX binary with correct headers', async () => {
    const { GET } = await import('./route')
    const url = 'http://localhost/api/fra-reports/generate-docx?instanceId=test-instance-123&t=0'
    const request = new NextRequest(url)
    const response = await GET(request)
    const buffer = Buffer.from(await response.arrayBuffer())

    expect(response.status).toBe(200)
    const contentType = response.headers.get('Content-Type')
    expect(contentType).toContain('wordprocessingml')
    expect(contentType).toContain('application/vnd.openxmlformats')

    expect(buffer.length).toBeGreaterThan(10240)
    expect(buffer[0]).toBe(0x50) // P
    expect(buffer[1]).toBe(0x4b) // K
  })

  it('contains tables and build stamp (section model output)', async () => {
    const { GET } = await import('./route')
    const url = 'http://localhost/api/fra-reports/generate-docx?instanceId=test-instance-123&t=0'
    const request = new NextRequest(url)
    const response = await GET(request)
    const buffer = Buffer.from(await response.arrayBuffer())

    const zip = await JSZip.loadAsync(buffer)
    const docXml = await zip.file('word/document.xml')?.async('string')
    expect(docXml).toBeTruthy()

    // Tables: section model produces TOC, travel distances, fire resistance, action plan, etc.
    const tableCount = (docXml!.match(/<w:tbl/g) || []).length
    expect(tableCount).toBeGreaterThanOrEqual(2)

    // Build stamp: proves section model ran (not PDF text dump)
    expect(docXml).toContain('Generated:')
    expect(docXml).toContain('Build:')
    expect(docXml).toContain('test-instance-123')

    // Multiple sections (w:sectPr): hard layout boundaries, not soft PageBreaks
    const sectPrCount = (docXml!.match(/<w:sectPr/g) || []).length
    expect(sectPrCount).toBeGreaterThanOrEqual(2)
  })

  it('returns Content-Disposition with filename', async () => {
    const { GET } = await import('./route')
    const url = 'http://localhost/api/fra-reports/generate-docx?instanceId=test-instance-456&t=0'
    const request = new NextRequest(url)
    const response = await GET(request)
    const cd = response.headers.get('Content-Disposition')

    expect(cd).toBeTruthy()
    expect(cd).toContain('attachment')
    expect(cd).toContain('FRA-')
    expect(cd).toContain('.docx')
  })

  it('returns 401 when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockReturnValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      storage: { from: vi.fn() },
    } as any)

    const { GET } = await import('./route')
    const url = 'http://localhost/api/fra-reports/generate-docx?instanceId=test&t=0'
    const request = new NextRequest(url)
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 400 when instanceId is missing', async () => {
    const { GET } = await import('./route')
    const url = 'http://localhost/api/fra-reports/generate-docx?t=0'
    const request = new NextRequest(url)
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('instanceId')
  })
})
