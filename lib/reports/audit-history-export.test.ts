import { describe, expect, it } from 'vitest'

import {
  buildAuditHistoryCsv,
  type AuditInstanceHistoryRow,
  type StoreActionHistoryRow,
} from '@/lib/reports/audit-history-export'

describe('audit history CSV', () => {
  it('exports authoritative audit instances and store actions as distinct record types', () => {
    const audits: AuditInstanceHistoryRow[] = [
      {
        id: 'audit-1',
        template_id: 'template-1',
        store_id: 'store-1',
        conducted_by_user_id: 'user-1',
        conducted_at: '2026-08-18T10:00:00.000Z',
        overall_score: 92.5,
        status: 'completed',
        created_at: '2026-08-18T09:00:00.000Z',
        updated_at: '2026-08-18T11:00:00.000Z',
        fa_audit_templates: {
          id: 'template-1',
          title: 'Footasylum H&S Audit',
          category: 'footasylum_audit',
          is_active: true,
        },
        fa_stores: {
          id: 'store-1',
          store_code: '001',
          store_name: 'Manchester Arndale',
          region: 'A1',
          city: 'Manchester',
          is_active: true,
        },
      },
    ]
    const actions: StoreActionHistoryRow[] = [
      {
        id: 'action-1',
        store_id: 'store-1',
        title: '=HYPERLINK("https://example.test")',
        description: 'Close the finding',
        source_flagged_item: 'Fire door held open',
        priority_summary: 'Fire door and escape route controls',
        priority: 'high',
        status: 'open',
        due_date: '2026-09-01',
        completed_at: null,
        completion_notes: null,
        ai_generated: false,
        created_by_user_id: 'user-1',
        created_at: '2026-08-18T11:05:00.000Z',
        updated_at: '2026-08-18T11:05:00.000Z',
        fa_stores: audits[0].fa_stores,
      },
    ]

    const csv = buildAuditHistoryCsv(audits, actions)
    const lines = csv.slice(1).split('\r\n')

    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('"Record Type"')
    expect(lines[0]).toContain('"Audit Instance ID"')
    expect(lines[0]).toContain('"Store Action ID"')
    expect(lines[1]).toContain('"Audit Instance"')
    expect(lines[1]).toContain('"audit-1"')
    expect(lines[1]).toContain('"Footasylum H&S Audit"')
    expect(lines[2]).toContain('"Store Action"')
    expect(lines[2]).toContain('"action-1"')
    expect(lines[2]).toContain('"\'=HYPERLINK(""https://example.test"")"')
  })
})
