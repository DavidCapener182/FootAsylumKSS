import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { HistoricalReviewClient } from '@/components/fra/historical-review-client'
import type { HistoricalReviewInventory } from '@/components/fra/historical-review-model'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

/** Local KSS review only. This untracked inventory must never be served by production. */
export default async function FraActionHistoryPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  const { session } = await requireRole(['admin', 'ops'])
  const path = join(process.cwd(), 'output', 'fra-action-migration-inventory-2026-09-25.json')
  const raw = await readFile(path, 'utf8').catch(() => null)
  if (!raw) notFound()
  const inventory = JSON.parse(raw) as HistoricalReviewInventory
  if (inventory.projectId !== 'fwnzpafwfaiynrclwtnh'
    || !Array.isArray(inventory.candidateActions)
    || !Array.isArray(inventory.storeInventory)
    || !Array.isArray(inventory.assessmentInventory)) notFound()

  return <HistoricalReviewClient inventory={inventory} reviewerId={session.user.id} />
}
