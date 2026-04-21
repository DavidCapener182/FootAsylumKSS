import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('034_repair_store_crm_tables.sql', () => {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
  const repairSql = readFileSync(
    path.join(migrationsDir, '034_repair_store_crm_tables.sql'),
    'utf8',
  )
  const hardeningSql = readFileSync(
    path.join(migrationsDir, '029_harden_client_profile_and_crm_access.sql'),
    'utf8',
  )
  const cleanupSql = readFileSync(
    path.join(migrationsDir, '035_remove_reintroduced_store_crm_client_policies.sql'),
    'utf8',
  )

  it('does not recreate CRM client policies removed by hardening', () => {
    const removedClientPolicies = [
      'Client can view store contacts',
      'Client can view store notes',
      'Client can view store contact tracker',
    ]

    for (const policyName of removedClientPolicies) {
      expect(hardeningSql).toContain(`DROP POLICY IF EXISTS "${policyName}"`)
      expect(repairSql).not.toContain(policyName)
    }
  })

  it('drops the reintroduced CRM client policies for already-migrated databases', () => {
    const removedClientPolicies = [
      'Client can view store contacts',
      'Client can view store notes',
      'Client can view store contact tracker',
    ]

    for (const policyName of removedClientPolicies) {
      expect(cleanupSql).toContain(`DROP POLICY IF EXISTS "${policyName}"`)
    }
  })
})
