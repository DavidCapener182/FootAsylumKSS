import pg from 'pg'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const { Client } = pg

function columnKey(schema, table, column) {
  return `${schema}.${table}.${column}`
}

function relationKey(schema, table) {
  return `${schema}.${table}`
}

function functionKey(schema, name) {
  return `${schema}.${name}`
}

function policyKey(schema, table, name, command) {
  return `${schema}.${table}.${name}:${command}`
}

function triggerKey(schema, table, name) {
  return `${schema}.${table}.${name}`
}

function privilegeKey(role, schema, table, privilege) {
  return `${role}:${privilege}:${schema}.${table}`
}

export async function requiredMigrationVersions(directory) {
  const filenames = await readdir(resolve(directory))
  const versions = filenames
    .map((filename) => filename.match(/^([0-9]+)_.+\.sql$/)?.[1])
    .filter(Boolean)
  const duplicates = versions.filter((version, index) => versions.indexOf(version) !== index)

  if (duplicates.length > 0) {
    throw new Error(`Duplicate migration versions in ${directory}: ${[...new Set(duplicates)].join(', ')}`)
  }
  if (versions.length === 0) {
    throw new Error(`No SQL migrations found in ${directory}`)
  }

  return versions.sort()
}

export async function loadSchemaContract(contractPath = 'config/schema-contract.json') {
  const parsed = JSON.parse(await readFile(resolve(contractPath), 'utf8'))
  return {
    ...parsed,
    requiredMigrations: await requiredMigrationVersions(parsed.migrationDirectory),
  }
}

export function evaluateSchemaContract(snapshot, contract) {
  const failures = []

  for (const version of contract.requiredMigrations) {
    if (!snapshot.migrations.has(version)) failures.push(`missing migration ${version}`)
  }

  for (const relation of contract.columns) {
    for (const column of relation.names) {
      const key = columnKey(relation.schema, relation.table, column)
      if (!snapshot.columns.has(key)) failures.push(`missing column ${key}`)
    }
  }

  for (const fn of contract.functions) {
    const key = functionKey(fn.schema, fn.name)
    if (!snapshot.functions.has(key)) failures.push(`missing function ${key}`)
  }

  for (const policy of contract.policies) {
    const key = policyKey(policy.schema, policy.table, policy.name, policy.command)
    if (!snapshot.policies.has(key)) failures.push(`missing policy ${key}`)
  }

  for (const policy of contract.forbiddenPolicies) {
    const prefix = `${policy.schema}.${policy.table}.${policy.name}:`
    if ([...snapshot.policies].some((value) => value.startsWith(prefix))) {
      failures.push(`forbidden policy still present ${policy.schema}.${policy.table}.${policy.name}`)
    }
  }

  for (const table of contract.rlsTables) {
    const key = relationKey(table.schema, table.table)
    if (!snapshot.rlsTables.has(key)) failures.push(`RLS is not enabled on ${key}`)
  }

  for (const trigger of contract.triggers) {
    const key = triggerKey(trigger.schema, trigger.table, trigger.name)
    if (!snapshot.triggers.has(key)) failures.push(`missing trigger ${key}`)
  }

  for (const bucket of contract.buckets) {
    if (!snapshot.buckets.has(bucket)) failures.push(`missing storage bucket ${bucket}`)
  }

  for (const privilege of contract.forbiddenPrivileges) {
    const key = privilegeKey(
      privilege.role,
      privilege.schema,
      privilege.table,
      privilege.privilege
    )
    if (snapshot.privileges.has(key)) failures.push(`forbidden privilege granted ${key}`)
  }

  return failures
}

async function readDatabaseSnapshot(client, contract) {
  const migrations = await client.query(
    'select version::text from supabase_migrations.schema_migrations'
  )
  const columns = await client.query(
    `select table_schema, table_name, column_name
       from information_schema.columns`
  )
  const functions = await client.query(
    `select namespace.nspname as function_schema, procedure.proname as function_name
       from pg_catalog.pg_proc as procedure
       join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace`
  )
  const policies = await client.query(
    `select schemaname, tablename, policyname, cmd
       from pg_catalog.pg_policies`
  )
  const rlsTables = await client.query(
    `select namespace.nspname as table_schema, relation.relname as table_name
       from pg_catalog.pg_class as relation
       join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
      where relation.relkind in ('r', 'p')
        and relation.relrowsecurity`
  )
  const triggers = await client.query(
    `select namespace.nspname as table_schema,
            relation.relname as table_name,
            trigger.tgname as trigger_name
       from pg_catalog.pg_trigger as trigger
       join pg_catalog.pg_class as relation on relation.oid = trigger.tgrelid
       join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
      where not trigger.tgisinternal`
  )
  const buckets = await client.query('select id::text from storage.buckets')
  const privileges = await client.query(
    `select requested.role_name,
            requested.schema_name,
            requested.table_name,
            requested.privilege_name,
            case
              when pg_catalog.to_regclass(
                pg_catalog.format('%I.%I', requested.schema_name, requested.table_name)
              ) is null then false
              else pg_catalog.has_table_privilege(
                requested.role_name,
                pg_catalog.to_regclass(
                  pg_catalog.format('%I.%I', requested.schema_name, requested.table_name)
                ),
                requested.privilege_name
              )
            end as is_granted
       from pg_catalog.jsonb_to_recordset($1::jsonb) as requested(
         role_name text,
         schema_name text,
         table_name text,
         privilege_name text
       )`,
    [JSON.stringify(contract.forbiddenPrivileges.map((privilege) => ({
      role_name: privilege.role,
      schema_name: privilege.schema,
      table_name: privilege.table,
      privilege_name: privilege.privilege,
    })))]
  )

  return {
    migrations: new Set(migrations.rows.map((row) => row.version)),
    columns: new Set(columns.rows.map((row) => columnKey(
      row.table_schema,
      row.table_name,
      row.column_name
    ))),
    functions: new Set(functions.rows.map((row) => functionKey(
      row.function_schema,
      row.function_name
    ))),
    policies: new Set(policies.rows.map((row) => policyKey(
      row.schemaname,
      row.tablename,
      row.policyname,
      row.cmd
    ))),
    rlsTables: new Set(rlsTables.rows.map((row) => relationKey(
      row.table_schema,
      row.table_name
    ))),
    triggers: new Set(triggers.rows.map((row) => triggerKey(
      row.table_schema,
      row.table_name,
      row.trigger_name
    ))),
    buckets: new Set(buckets.rows.map((row) => row.id)),
    privileges: new Set(
      privileges.rows
        .filter((row) => row.is_granted)
        .map((row) => privilegeKey(
          row.role_name,
          row.schema_name,
          row.table_name,
          row.privilege_name
        ))
    ),
  }
}

export async function checkSchemaContract({
  connectionString = process.env.SUPABASE_SCHEMA_CONTRACT_DATABASE_URL,
  contractPath = process.env.SCHEMA_CONTRACT_PATH || 'config/schema-contract.json',
} = {}) {
  if (!connectionString) {
    throw new Error(
      'SUPABASE_SCHEMA_CONTRACT_DATABASE_URL is required. Supply a PostgreSQL connection URL with read access to Supabase migration metadata, catalogs, and storage.buckets.'
    )
  }

  const contract = await loadSchemaContract(contractPath)
  const client = new Client({
    connectionString,
    application_name: 'footasylum-schema-contract',
    connectionTimeoutMillis: 10_000,
    query_timeout: 20_000,
  })

  await client.connect()
  try {
    await client.query('begin transaction read only')
    await client.query("set local statement_timeout = '20s'")
    const snapshot = await readDatabaseSnapshot(client, contract)
    const failures = evaluateSchemaContract(snapshot, contract)
    await client.query('rollback')

    if (failures.length > 0) {
      throw new Error(`Schema contract failed (${failures.length}):\n- ${failures.join('\n- ')}`)
    }

    console.log(
      `Schema contract passed: ${contract.requiredMigrations.length} migrations, ${contract.columns.length} table contracts, ${contract.functions.length} functions, ${contract.policies.length} policies, and ${contract.buckets.length} storage buckets.`
    )
  } catch (error) {
    try {
      await client.query('rollback')
    } catch {
      // The connection may already be closed after a database-level error.
    }
    throw error
  } finally {
    await client.end()
  }
}

const isDirectExecution = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href

if (isDirectExecution) {
  checkSchemaContract().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
