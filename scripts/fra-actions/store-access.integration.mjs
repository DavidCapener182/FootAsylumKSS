import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

if (!process.env.PGLITE_MODULE) throw new Error('PGLITE_MODULE is required')
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href)
const db = new PGlite()
const ids = {
  manager: '11111111-1111-4111-8111-111111111111',
  client: '22222222-2222-4222-8222-222222222222',
  active: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  inactive: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
}
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE TYPE fa_user_role AS ENUM ('admin','ops','client','client_admin','area_manager');
    CREATE TABLE fa_profiles(id uuid PRIMARY KEY, role fa_user_role);
    CREATE TABLE fa_stores(id uuid PRIMARY KEY, is_active boolean NOT NULL);`)
  await db.exec(await readFile(new URL('../../supabase/drafts/fra_store_access_service_only.sql', import.meta.url), 'utf8'))
  await db.query('INSERT INTO fa_stores VALUES ($1,true),($2,false)', [ids.active, ids.inactive])
  await db.query("INSERT INTO fa_profiles VALUES ($1,'client'),($2,'client')", [ids.manager, ids.client])
  await assert.rejects(() => db.query("UPDATE fa_profiles SET role='area_manager' WHERE id=$1", [ids.manager]), /Active FRA store assignment required/)
  await db.query("INSERT INTO fa_fra_store_access(user_id,store_id,access_level,is_active) VALUES ($1,$2,'area_manager',true),($3,$4,'client_admin',true)", [ids.manager, ids.active, ids.client, ids.inactive])
  await db.query("UPDATE fa_profiles SET role='area_manager' WHERE id=$1", [ids.manager])
  await db.query("UPDATE fa_profiles SET role='client_admin' WHERE id=$1", [ids.client])
  await db.exec('BEGIN; SET LOCAL ROLE authenticated;')
  await assert.rejects(() => db.query('SELECT * FROM fa_fra_store_access'), /permission denied/)
  await db.exec('ROLLBACK')
  await db.query("UPDATE fa_profiles SET role='client' WHERE id=$1", [ids.manager])
  await db.query('UPDATE fa_fra_store_access SET is_active=false WHERE user_id=$1', [ids.manager])
  await assert.rejects(() => db.query("UPDATE fa_profiles SET role='area_manager' WHERE id=$1", [ids.manager]), /Active FRA store assignment required/)
  console.log('service-only FRA store access: PASS')
} finally {
  await db.close()
}
