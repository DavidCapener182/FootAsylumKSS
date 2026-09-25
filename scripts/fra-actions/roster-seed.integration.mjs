/** Isolated check of the pinned Footasylum roster seed; no remote database. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

if (!process.env.PGLITE_MODULE) throw new Error('PGLITE_MODULE is required')
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href)
const seed = await readFile(new URL('../../supabase/drafts/fra_footasylum_roster_seed.sql', import.meta.url), 'utf8')
const adminsSeed = await readFile(new URL('../../supabase/drafts/fra_client_admin_memberships_seed.sql', import.meta.url), 'utf8')
const valuesBlock = seed.split('INSERT INTO fra_seed_roster(store_id,store_code,area_name,manager_visible) VALUES')[1]?.split('DO $$')[0]
assert.ok(valuesBlock, 'Seed values missing')
const rows = [...valuesBlock.matchAll(/\('([0-9a-f-]{36})'::uuid,'(S\d{4})','(AREA[1-5])',(true|false)\)/g)]
  .map(match => ({ id: match[1], code: match[2], area: match[3], active: match[4] === 'true' }))
assert.equal(rows.length, 72)
assert.equal(rows.filter(row => row.active).length, 67)

async function setup() {
  const db = new PGlite()
  await db.exec(`CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
    CREATE TABLE fa_profiles(id uuid PRIMARY KEY,full_name text,role text,account_status text);
    CREATE TABLE fa_client_memberships(user_id uuid PRIMARY KEY,client_id uuid,access_level text,is_active boolean);
    CREATE TABLE fa_stores(id uuid PRIMARY KEY,store_code text,reporting_area text,is_active boolean);
    CREATE TABLE fa_clients(id uuid PRIMARY KEY,name text UNIQUE);
    CREATE TABLE fa_client_areas(id uuid PRIMARY KEY,client_id uuid,management_region_id uuid,name text);
    CREATE TABLE fa_client_store_memberships(store_id uuid PRIMARY KEY,client_id uuid,area_id uuid,manager_visible boolean);`)
  for (const row of rows) {
    await db.query('INSERT INTO fa_stores VALUES($1,$2,$3,$4)', [row.id,row.code,row.area,row.active])
  }
  return db
}

const valid = await setup()
try {
  await valid.exec(seed)
  const result = await valid.query('SELECT count(*)::int total, count(*) FILTER (WHERE manager_visible)::int manager_stores FROM fa_client_store_memberships')
  assert.deepEqual(result.rows, [{ total: 72, manager_stores: 67 }])
  await valid.exec(`INSERT INTO auth.users VALUES
    ('1eb36932-44ee-41ac-861d-39b2414d925b','hannah.lord@footasylum.com'),
    ('25903bcd-f26d-4bd4-a160-d663aba45d3b','toni.shaw@footasylum.com');
    INSERT INTO fa_profiles VALUES
    ('1eb36932-44ee-41ac-861d-39b2414d925b','Hannah Lord','client','active'),
    ('25903bcd-f26d-4bd4-a160-d663aba45d3b','Toni Shaw','client','active');`)
  await valid.exec(adminsSeed)
  const memberships = await valid.query('SELECT count(*)::int total, count(*) FILTER (WHERE is_active)::int active FROM fa_client_memberships')
  assert.deepEqual(memberships.rows, [{ total: 2, active: 0 }])
} finally { await valid.close() }

const drifted = await setup()
try {
  await drifted.query("UPDATE fa_stores SET reporting_area='AREA2' WHERE id=$1", [rows[0].id])
  await assert.rejects(() => drifted.exec(seed), /roster changed since seed review/i)
} finally { await drifted.close() }
console.log('FRA retail roster seed PGlite checks passed')
