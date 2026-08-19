import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  evaluateSchemaContract,
  requiredMigrationVersions,
} from './check-schema-contract.mjs'

function completeSnapshot() {
  return {
    migrations: new Set(['001', '002']),
    columns: new Set(['public.fa_profiles.account_status']),
    functions: new Set(['public.fa_generate_incident_reference']),
    policies: new Set(['public.fa_activity_log.Users can view activity logs:SELECT']),
    rlsTables: new Set(['public.fa_activity_log']),
    triggers: new Set(['public.fa_activity_log.fa_activity_log_append_only']),
    buckets: new Set(['fa-attachments']),
    privileges: new Set(),
  }
}

const contract = {
  requiredMigrations: ['001', '002'],
  columns: [{ schema: 'public', table: 'fa_profiles', names: ['account_status'] }],
  functions: [{ schema: 'public', name: 'fa_generate_incident_reference' }],
  policies: [{
    schema: 'public',
    table: 'fa_activity_log',
    name: 'Users can view activity logs',
    command: 'SELECT',
  }],
  forbiddenPolicies: [{
    schema: 'public',
    table: 'fa_activity_log',
    name: 'System can insert activity logs',
  }],
  rlsTables: [{ schema: 'public', table: 'fa_activity_log' }],
  triggers: [{
    schema: 'public',
    table: 'fa_activity_log',
    name: 'fa_activity_log_append_only',
  }],
  buckets: ['fa-attachments'],
  forbiddenPrivileges: [{
    role: 'authenticated',
    schema: 'public',
    table: 'fa_activity_log',
    privilege: 'INSERT',
  }],
}

describe('schema contract evaluator', () => {
  it('accepts a complete, hardened snapshot', () => {
    expect(evaluateSchemaContract(completeSnapshot(), contract)).toEqual([])
  })

  it('reports drift with actionable object names', () => {
    const snapshot = completeSnapshot()
    snapshot.migrations.delete('002')
    snapshot.columns.clear()
    snapshot.policies.add('public.fa_activity_log.System can insert activity logs:INSERT')
    snapshot.privileges.add('authenticated:INSERT:public.fa_activity_log')

    expect(evaluateSchemaContract(snapshot, contract)).toEqual(expect.arrayContaining([
      'missing migration 002',
      'missing column public.fa_profiles.account_status',
      'forbidden policy still present public.fa_activity_log.System can insert activity logs',
      'forbidden privilege granted authenticated:INSERT:public.fa_activity_log',
    ]))
  })

  it('discovers every SQL migration version without treating tests as migrations', async () => {
    const versions = await requiredMigrationVersions('supabase/migrations')

    expect(versions).toContain('001')
    expect(versions).toContain('20260819231543')
    expect(versions).not.toContain('account-lifecycle-controls.test.ts')
    expect(new Set(versions).size).toBe(versions.length)
  })

  it('keeps every contracted column tied to its defining migration', async () => {
    const repositoryContract = JSON.parse(
      await readFile(resolve('config/schema-contract.json'), 'utf8')
    )

    for (const relation of repositoryContract.columns) {
      expect(relation.sourceMigration, `${relation.schema}.${relation.table} source migration`).toBeTruthy()
      const sql = await readFile(
        resolve(repositoryContract.migrationDirectory, relation.sourceMigration),
        'utf8'
      )
      expect(sql).toMatch(new RegExp(`\\b${relation.table}\\b`, 'i'))

      for (const column of relation.names) {
        const escapedColumn = column.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const definitionPattern = new RegExp(
          `(?:ADD\\s+COLUMN(?:\\s+IF\\s+NOT\\s+EXISTS)?\\s+|^\\s*)${escapedColumn}\\s+`,
          'im'
        )
        expect(sql, `${relation.schema}.${relation.table}.${column}`).toMatch(definitionPattern)
      }
    }
  })
})
