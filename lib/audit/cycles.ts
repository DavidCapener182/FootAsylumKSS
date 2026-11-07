/** Two scheduled visits per year, with 2026 as the numbering baseline.
 * Revisions/revisits retain their parent visit and do not consume a new pair.
 */
export const AUDIT_BASE_YEAR = 2026
export function auditSequence(year: number, round: number): number {
  return (year - AUDIT_BASE_YEAR) * 2 + round
}
export function auditLabel(year: number, round: number): string {
  if (round > 2) return `${year} revisit`
  return year >= AUDIT_BASE_YEAR ? `Audit ${auditSequence(year, round)}` : `${year} audit ${round}`
}
export function auditPairLabel(year: number): string {
  return `${year} · ${auditLabel(year, 1)} & ${auditLabel(year, 2)}`
}
