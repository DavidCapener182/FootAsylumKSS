import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
const sql = readFileSync(new URL('./20261025173000_append_audit_revisits.sql', import.meta.url), 'utf8')
describe('revisit schema security contract', () => {
  it('isolates append-only rows behind server-only grants, RLS and a restricted foreign key', () => {
    expect(sql).toContain('references public.fa_store_audit_history(id) on delete restrict')
    expect(sql).toContain('enable row level security')
    expect(sql).toContain('revoke all on public.fa_audit_revisits from public,anon,authenticated,service_role')
    expect(sql).toContain('grant select,insert on public.fa_audit_revisits to service_role')
    expect(sql).toContain('before update or delete on public.fa_audit_revisits')
  })
  it('deduplicates both submission keys and same parent/date/content at the database boundary', () => {
    expect(sql).toContain('id uuid primary key')
    expect(sql).toContain('unique(original_history_id,revisit_date,file_sha256)')
    expect(sql).toContain('on conflict do nothing returning * into result')
    expect(sql).toContain('result.original_history_id is distinct from p_history')
    expect(sql).toContain('result.notes is distinct from p_notes')
  })
  it('requires active audit managers for a server-only invoker RPC with fixed search path', () => {
    expect(sql).toContain("role in ('admin','ops') and account_status='active'")
    expect(sql).toContain("security invoker set search_path=''")
    expect(sql).not.toMatch(/security definer/i)
    expect(sql).toContain('from public,anon,authenticated;\ngrant execute')
  })
  it('creates private evidence storage and excludes direct user reads, writes and replacements', () => {
    expect(sql).toContain("'fa-audit-revisit-evidence','fa-audit-revisit-evidence',false")
    expect(sql).toContain('as restrictive for all to public')
    expect(sql).toContain("with check(bucket_id <> 'fa-audit-revisit-evidence')")
  })
  it('does not mutate existing audit, store, visit or action data or delete original files', () => {
    expect(sql).not.toMatch(/(?:update|delete from|insert into|alter table) public\.(?:fa_stores|fa_store_audit_history|fa_store_actions|fa_audit_studio_audits)\b/i)
    expect(sql).not.toMatch(/delete from storage|update storage/i)
  })
})
