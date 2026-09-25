import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const access = readFileSync(join(process.cwd(), 'supabase/drafts/fra_store_access_service_only.sql'), 'utf8')
const workflow = readFileSync(join(process.cwd(), 'supabase/drafts/fra_action_workflow.sql'), 'utf8')

describe('FRA store access draft', () => {
  it('keeps store grants on a service-only table and fails closed on role activation', () => {
    expect(access).toContain('CREATE TABLE public.fa_fra_store_access')
    expect(access).toContain('REVOKE ALL ON public.fa_fra_store_access FROM PUBLIC, anon, authenticated')
    expect(access).toContain('Active FRA store assignment required before scoped role activation')
    expect(access).not.toMatch(/CREATE POLICY .* ON public\.fa_fra_store_access/i)
  })

  it('allows manager progression only for assigned stores and KSS closure', () => {
    expect(workflow).toContain('fa_private.fra_assert_area_manager(p_actor,a.store_id)')
    expect(workflow).toContain('fa_private.fra_assert_kss_verifier(p_actor)')
    expect(workflow).toContain("s.access_level='area_manager' AND s.is_active AND store.is_active")
    expect(workflow).toContain('FROM PUBLIC,anon,authenticated;')
    expect(workflow).toContain("bucket_id='fa-fra-action-evidence'")
  })
})
