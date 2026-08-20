import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const sql = readFileSync('supabase/migrations/20260820094619_add_operational_workspace_models.sql', 'utf8')
const privilegeSql = readFileSync('supabase/migrations/20260820094712_harden_operational_workspace_privileges.sql', 'utf8')
const indexSql = readFileSync('supabase/migrations/20260820094848_index_operational_workspace_foreign_keys.sql', 'utf8')

describe('operational workspace migration', () => {
  it('adds typed scheduling, work verification, saved views and planning settings', () => {
    expect(sql).toContain('assigned_auditor_user_id')
    expect(sql).toContain('verification_status')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.fa_saved_views')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.fa_planning_settings')
  })
  it('explicitly revokes project-default mutation privileges from immutable history', () => {
    expect(privilegeSql).toContain('REVOKE ALL ON TABLE public.fa_report_versions FROM anon, authenticated')
    expect(privilegeSql).toContain('REVOKE ALL ON TABLE public.kss_plan_versions FROM anon, authenticated')
    expect(privilegeSql).toMatch(/GRANT SELECT, INSERT ON TABLE public\.kss_plan_versions TO authenticated/)
  })
  it('covers every foreign key added by the operational workspace', () => {
    for (const column of ['assigned_auditor_user_id', 'verified_by_user_id', 'generated_by_user_id', 'approved_by_user_id', 'parent_plan_id', 'created_by_user_id', 'resolved_by_user_id', 'user_id']) {
      expect(indexSql).toContain(`(${column})`)
    }
  })
  it('creates immutable report and plan version records', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.fa_report_versions')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.kss_plan_versions')
    expect(sql).not.toMatch(/ON public\.fa_report_versions FOR (?:UPDATE|DELETE)/)
    expect(sql).not.toMatch(/ON public\.kss_plan_versions FOR (?:UPDATE|DELETE|ALL)/)
    expect(sql).not.toMatch(/ON CONFLICT[\s\S]+kss_plan_versions/)
  })
  it('keeps new workspace tables unavailable to anonymous callers', () => {
    expect(sql).toMatch(/REVOKE ALL ON[\s\S]+FROM anon;/)
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY')
  })
  it('makes event-log retries idempotent and plan transitions atomic', () => {
    expect(sql).toContain('idx_emp_event_control_log_idempotency')
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.kss_transition_plan')
    expect(sql).toContain("p_status NOT IN ('draft', 'review', 'approved', 'published', 'archived')")
    expect(sql).toContain('FOR UPDATE')
    expect(sql).toContain('field_values')
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.kss_transition_plan[\s\S]+TO authenticated/)
  })
})
