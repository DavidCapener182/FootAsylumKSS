import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260819230804_atomic_incident_references.sql'),
  'utf8'
)

describe('atomic incident reference migration', () => {
  it('uses an atomic upsert counter rather than MAX during allocation', () => {
    const functionBody = migration.split('CREATE OR REPLACE FUNCTION')[1] || ''

    expect(functionBody).toContain('ON CONFLICT (incident_year) DO UPDATE')
    expect(functionBody).toContain('last_value = public.fa_incident_reference_counters.last_value + 1')
    expect(functionBody).toContain('RETURNING last_value INTO next_value')
    expect(functionBody.toUpperCase()).not.toContain('MAX(')
  })

  it('keeps the counter private and constrains RPC execution', () => {
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY')
    expect(migration).toContain('REVOKE ALL ON TABLE public.fa_incident_reference_counters FROM PUBLIC, anon, authenticated')
    expect(migration).toContain("IF auth.uid() IS NULL THEN")
    expect(migration).toContain('SET search_path = \'\'')
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.fa_generate_incident_reference() FROM PUBLIC, anon')
    expect(migration).toMatch(
      /COALESCE\([\s\S]*fa_private\.get_user_role\(auth\.uid\(\)\)[\s\S]*'pending'::public\.fa_user_role[\s\S]*\) NOT IN/
    )
    expect(migration).toContain("'admin'::public.fa_user_role")
    expect(migration).toContain("'ops'::public.fa_user_role")
    expect(migration).toContain('Incident management permission required')
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.fa_generate_incident_reference() TO authenticated')
    expect(migration).not.toContain(
      'GRANT EXECUTE ON FUNCTION public.fa_generate_incident_reference() TO authenticated, service_role'
    )
  })
})
