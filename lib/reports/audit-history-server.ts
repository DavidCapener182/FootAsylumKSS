import { requirePermission } from '@/lib/permissions'
import {
  buildAuditHistoryCsv,
  type AuditInstanceHistoryRow,
  type StoreActionHistoryRow,
} from '@/lib/reports/audit-history-export'

const EXPORT_PAGE_SIZE = 1000

type PageResult<T> = {
  data: T[] | null
  error: { message?: string } | null
}

async function fetchAllPages<T>(
  label: string,
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<T[]> {
  const rows: T[] = []

  for (let from = 0; ; from += EXPORT_PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + EXPORT_PAGE_SIZE - 1)
    if (error) {
      throw new Error(`Failed to export ${label}: ${error.message || 'Unknown database error'}`)
    }

    const page = data || []
    rows.push(...page)
    if (page.length < EXPORT_PAGE_SIZE) break
  }

  return rows
}

export async function exportAuditHistoryCsv(): Promise<Response> {
  const { supabase } = await requirePermission('exportReports')

  const [auditInstances, storeActions] = await Promise.all([
    fetchAllPages<AuditInstanceHistoryRow>('audit instances', (from, to) =>
      supabase
        .from('fa_audit_instances')
        .select(`
          id,
          template_id,
          store_id,
          conducted_by_user_id,
          conducted_at,
          overall_score,
          status,
          created_at,
          updated_at,
          fa_audit_templates (
            id,
            title,
            category,
            is_active
          ),
          fa_stores (
            id,
            store_code,
            store_name,
            region,
            city,
            is_active
          )
        `)
        .order('conducted_at', { ascending: false })
        .range(from, to) as unknown as PromiseLike<PageResult<AuditInstanceHistoryRow>>
    ),
    fetchAllPages<StoreActionHistoryRow>('store actions', (from, to) =>
      supabase
        .from('fa_store_actions')
        .select(`
          id,
          store_id,
          title,
          description,
          source_flagged_item,
          priority_summary,
          priority,
          status,
          due_date,
          completed_at,
          completion_notes,
          ai_generated,
          created_by_user_id,
          created_at,
          updated_at,
          fa_stores (
            id,
            store_code,
            store_name,
            region,
            city,
            is_active
          )
        `)
        .order('created_at', { ascending: false })
        .range(from, to) as unknown as PromiseLike<PageResult<StoreActionHistoryRow>>
    ),
  ])

  const csv = buildAuditHistoryCsv(auditInstances, storeActions)
  const date = new Date().toISOString().slice(0, 10)

  return new Response(csv, {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="safehub-audit-history-${date}.csv"`,
    },
  })
}
