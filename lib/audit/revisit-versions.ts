/** A replacement is another immutable row; only chain tips are current evidence. */
export type VersionedRevisit = { id: string; replaces_id?: string | null }
export function currentRevisitEvidence<T extends VersionedRevisit>(rows: T[]): T[] {
  const replaced = new Set(rows.map(row => row.replaces_id).filter(Boolean))
  return rows.filter(row => !replaced.has(row.id))
}
export function previousRevisitVersions<T extends VersionedRevisit>(current: T, rows: T[]): T[] {
  const byId = new Map(rows.map(row => [row.id, row]))
  const previous: T[] = [], seen = new Set([current.id])
  let id = current.replaces_id
  while (id && !seen.has(id)) {
    const row = byId.get(id)
    if (!row) break
    seen.add(id); previous.push(row); id = row.replaces_id
  }
  return previous
}
