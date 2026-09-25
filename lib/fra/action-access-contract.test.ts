import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const hierarchy = readFileSync(join(process.cwd(), 'supabase/drafts/fra_client_hierarchy.sql'), 'utf8')
const workflow = readFileSync(join(process.cwd(), 'supabase/drafts/fra_action_workflow.sql'), 'utf8')

describe('FRA client access draft', () => {
  it('keeps client reads on narrow views, without client action/event table policies', () => {
    expect(hierarchy).toContain('CREATE VIEW public.fa_client_fra_action_board')
    expect(hierarchy).toContain('CREATE VIEW public.fa_client_store_directory')
    expect(hierarchy).not.toMatch(/CREATE POLICY .*client.* ON public\.fa_fra_actions/i)
    expect(hierarchy).not.toMatch(/CREATE POLICY .*client.* ON public\.fa_fra_action_events/i)
    const storeProjection = hierarchy.split('CREATE VIEW public.fa_client_store_directory')[1]?.split('WHERE EXISTS')[0]
    expect(storeProjection).not.toMatch(/s\.region|s\.route_sequence|s\.fire_risk_assessment_pdf_path/)
  })

  it('allows manager progression only through scoped service commands and KSS closure', () => {
    expect(workflow).toContain('fa_private.fra_assert_area_manager(p_actor,a.store_id)')
    expect(workflow).toContain('fa_private.fra_assert_kss_verifier(p_actor)')
    expect(workflow).toContain('FROM PUBLIC,anon,authenticated;')
    expect(workflow).toContain("bucket_id='fa-fra-action-evidence'")
  })
})
