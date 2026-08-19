import { describe, expect, it } from 'vitest'
import { INCIDENT_LIST_PAGE_SIZE, presentIncidentList } from './query-service'

function incident(overrides: Record<string, unknown> = {}) {
  return {
    id: 'incident-1',
    reference_no: 'FA-2026-0001',
    source_reference: null,
    store_id: 'store-1',
    reported_by_user_id: 'profile-1',
    assigned_investigator_user_id: 'profile-2',
    incident_category: 'slip_trip',
    severity: 'medium',
    summary: 'Customer slipped near the entrance',
    description: null,
    occurred_at: '2026-08-19T10:00:00.000Z',
    reported_at: '2026-08-19T11:00:00.000Z',
    persons_involved: { person_type: 'Public' },
    injury_details: null,
    witnesses: null,
    riddor_reportable: false,
    status: 'open',
    target_close_date: null,
    closed_at: null,
    closure_summary: null,
    ...overrides,
  }
}

const stores = [{ id: 'store-1', store_name: 'Arndale', store_code: '001' }]
const profiles = [
  { id: 'profile-1', full_name: 'Reporter One' },
  { id: 'profile-2', full_name: 'Investigator Two' },
]

describe('presentIncidentList', () => {
  it('validates and enriches incident DTOs', () => {
    const result = presentIncidentList({
      activeRows: [incident()],
      archiveRows: [],
      legacyClosedRows: [],
      stores,
      profiles,
    })

    expect(result.open.items[0]).toMatchObject({
      id: 'incident-1',
      source: 'active',
      fa_stores: { store_name: 'Arndale', store_code: '001' },
      reporter: { full_name: 'Reporter One' },
      investigator: { full_name: 'Investigator Two' },
    })
  })

  it('rejects malformed database rows instead of returning partial data', () => {
    expect(() => presentIncidentList({
      activeRows: [{ id: 'missing-reference' }],
      archiveRows: [],
      legacyClosedRows: [],
    })).toThrow(/Invalid active incident data: reference_no/)
  })

  it('deduplicates legacy closed rows while preferring the archive record', () => {
    const archived = incident({ id: 'closed-1', status: 'closed', summary: 'Archived truth' })
    const legacy = incident({ id: 'closed-1', status: 'closed', summary: 'Legacy duplicate' })
    const result = presentIncidentList({
      activeRows: [],
      archiveRows: [archived],
      legacyClosedRows: [legacy],
    })

    expect(result.allClosedIncidents).toHaveLength(1)
    expect(result.allClosedIncidents[0]).toMatchObject({ source: 'archive', summary: 'Archived truth' })
  })

  it('applies cross-record search before display pagination', () => {
    const activeRows = Array.from({ length: INCIDENT_LIST_PAGE_SIZE + 7 }, (_, index) => incident({
      id: `incident-${String(index).padStart(3, '0')}`,
      reference_no: `FA-2026-${String(index).padStart(4, '0')}`,
      summary: `Ordinary incident ${index}`,
      occurred_at: new Date(Date.UTC(2026, 7, 19, 12, 0, index)).toISOString(),
    }))
    const targetId = `incident-${String(INCIDENT_LIST_PAGE_SIZE + 5).padStart(3, '0')}`
    const result = presentIncidentList({
      activeRows,
      archiveRows: [],
      legacyClosedRows: [],
      investigations: [{
        incident_id: targetId,
        status: 'complete',
        root_cause: 'Unique escalator defect',
        recommendations: null,
      }],
      filters: { q: 'escalator defect' },
    })

    expect(result.open.total).toBe(1)
    expect(result.open.items.map((row) => row.id)).toEqual([targetId])
  })

  it('returns deterministic page metadata without truncating the filtered result', () => {
    const activeRows = Array.from({ length: INCIDENT_LIST_PAGE_SIZE + 3 }, (_, index) => incident({
      id: `incident-${index}`,
      reference_no: `FA-2026-${index}`,
      occurred_at: new Date(Date.UTC(2026, 7, 19, 12, 0, index)).toISOString(),
    }))
    const result = presentIncidentList({
      activeRows,
      archiveRows: [],
      legacyClosedRows: [],
      openPage: '2',
    })

    expect(result.allOpenIncidents).toHaveLength(INCIDENT_LIST_PAGE_SIZE + 3)
    expect(result.open).toMatchObject({
      page: 2,
      pageCount: 2,
      total: INCIDENT_LIST_PAGE_SIZE + 3,
      from: INCIDENT_LIST_PAGE_SIZE + 1,
      to: INCIDENT_LIST_PAGE_SIZE + 3,
      hasPreviousPage: true,
      hasNextPage: false,
    })
    expect(result.open.items).toHaveLength(3)
  })

  it('applies severity, store, fiscal-year and date filters consistently', () => {
    const result = presentIncidentList({
      activeRows: [
        incident({ id: 'match', reference_no: 'MATCH', severity: 'high', occurred_at: '2026-08-19T10:00:00Z' }),
        incident({ id: 'wrong-severity', reference_no: 'LOW', severity: 'low', occurred_at: '2026-08-19T10:00:00Z' }),
        incident({ id: 'wrong-year', reference_no: 'OLD', severity: 'high', occurred_at: '2025-01-15T10:00:00Z' }),
      ],
      archiveRows: [],
      legacyClosedRows: [],
      filters: {
        store_id: 'store-1',
        severity: 'high',
        year: '2026',
        date_from: '2026-08-01',
        date_to: '2026-08-31',
      },
    })

    expect(result.open.items.map((row) => row.id)).toEqual(['match'])
  })
})
