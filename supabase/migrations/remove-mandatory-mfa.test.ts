import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260820084101_remove_mandatory_mfa.sql'),
  'utf8'
)

describe('optional authenticator migration', () => {
  it('resolves every active profile to its stored role without inspecting AAL', () => {
    const roleHelper = migration.match(
      /CREATE OR REPLACE FUNCTION fa_private\.get_user_role[\s\S]*?\n\$\$;/
    )?.[0]

    expect(roleHelper).toBeTruthy()
    expect(roleHelper).toContain("profile.account_status = 'active'")
    expect(roleHelper).toContain('THEN profile.role')
    expect(roleHelper).not.toMatch(/auth\.jwt|aal1|aal2/i)
  })

  it('keeps account administration authenticated and active-admin-only without an AAL gate', () => {
    const accessFunction = migration.match(
      /CREATE OR REPLACE FUNCTION public\.fa_admin_change_user_access[\s\S]*?\n\$function\$;/
    )?.[0]

    expect(accessFunction).toBeTruthy()
    expect(accessFunction).toContain('actor_id uuid := auth.uid()')
    expect(accessFunction).toContain("actor_profile.role <> 'admin'")
    expect(accessFunction).toContain("actor_profile.account_status <> 'active'")
    expect(accessFunction).toContain('final active administrator cannot be demoted')
    expect(accessFunction).not.toMatch(/auth\.jwt|aal1|aal2|multi-factor/i)
  })
})
