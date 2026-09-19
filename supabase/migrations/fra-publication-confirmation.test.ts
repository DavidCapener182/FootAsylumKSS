import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260919103000_fix_fra_publication_audit_actor.sql'),
  'utf8'
)

describe('FRA publication confirmation audit actor', () => {
  it('binds the authorised reviewer before writing the audited store row', () => {
    expect(migration).toContain("set_config('request.jwt.claim.sub', confirming_user::text, true)")
    expect(migration).toMatch(/IF NOT EXISTS[\s\S]*FROM public\.fa_profiles[\s\S]*id = confirming_user/)
    expect(migration.indexOf("set_config('request.jwt.claim.sub'"))
      .toBeLessThan(migration.indexOf('UPDATE public.fa_stores'))
  })

  it('remains restricted to the service role', () => {
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon, authenticated/)
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION[\s\S]*TO service_role/)
  })
})
