import { describe, expect, it } from 'vitest'
import { auditLabel, auditPairLabel, auditSequence } from './cycles'
import { cycleRecords } from './cycle-records'
import type { AuditRow } from '@/components/audit/audit-table-helpers'

describe('continuous annual pairs', () => {
  it.each([[2026,1,1],[2026,2,2],[2027,1,3],[2027,2,4],[2028,1,5],[2028,2,6],[2035,2,20]])('maps %i round %i to Audit %i', (year, round, number) => {
    expect(auditSequence(year, round)).toBe(number)
    expect(auditLabel(year, round)).toBe(`Audit ${number}`)
  })
  it('does not consume next year’s first number for a third visit', () => expect(auditLabel(2026,3)).toBe('2026 revisit'))
  it('labels the pair', () => expect(auditPairLabel(2027)).toBe('2027 · Audit 3 & Audit 4'))
  it('keeps prior years while current slots override stale snapshots', () => {
    const history = [{id:'old',store_id:'s',audit_year:2026,audit_number:1,visit_date:'2026-01-10',percentage:90,pdf_path:'old.pdf'},
      {id:'stale',store_id:'s',audit_year:2027,audit_number:1,visit_date:'2027-01-10',percentage:80,pdf_path:'stale.pdf'}]
    const store = {id:'s',compliance_audit_1_date:'2027-01-10',compliance_audit_1_overall_pct:95,compliance_audit_1_pdf_path:'new.pdf'} as AuditRow
    const result = cycleRecords([store],history)
    expect(result).toHaveLength(2)
    expect(result.find(record => record.audit_year === 2026)?.pdf_path).toBe('old.pdf')
    expect(result.find(record => record.audit_year === 2027)).toMatchObject({percentage:95,pdf_path:'new.pdf'})
  })
})
