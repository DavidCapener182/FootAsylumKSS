import {describe,it,expect} from 'vitest'
import {compareAudits,auditMovement,halfYearLabel} from './audit-comparison'
const store={compliance_audit_1_date:'2026-02-01',compliance_audit_1_overall_pct:90,compliance_audit_2_date:'2026-09-01',compliance_audit_2_overall_pct:93.94}
describe('half-year audit comparison',()=>{
 it('compares completed slots in percentage points',()=>{expect(compareAudits(store,'2026','2026-09-13').auditChange).toBe(3.94)})
 it('does not treat a planned date with no score as completed',()=>{expect(compareAudits({...store,compliance_audit_2_overall_pct:null},'2026','2026-09-13').auditChange).toBeNull()})
 it('does not leak second-half results into first-half reports',()=>{expect(compareAudits(store,'2026','2026-06-30').audit2Score).toBeNull()})
 it('excludes old-year audits and future results',()=>{expect(compareAudits(store,'2027','2027-12-31').audit1Score).toBeNull();expect(compareAudits(store,'2026','2026-08-31').auditChange).toBeNull()})
 it('accepts zero and detects unchanged and declined results',()=>{expect(compareAudits({...store,compliance_audit_2_overall_pct:0},'2026','2026-09-13').auditChange).toBe(-90);expect(auditMovement(0)).toBe('Unchanged');expect(auditMovement(-1)).toBe('Declined');expect(auditMovement(null)).toBe('Awaiting comparison')})
 it('labels both reporting halves',()=>{expect(halfYearLabel('2026-01')).toBe('First Half 2026');expect(halfYearLabel('2026-09')).toBe('Second Half 2026')})
})
