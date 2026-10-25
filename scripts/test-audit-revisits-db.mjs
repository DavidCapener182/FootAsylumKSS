// Isolated PostgreSQL regression harness. Never connects to a remote database.
// Run with PGLITE_MODULE pointing to a locally available @electric-sql/pglite entry.
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(process.env.PGLITE_MODULE ? pathToFileURL(process.env.PGLITE_MODULE).href : '@electric-sql/pglite')
const db = new PGlite()
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema storage;
alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
create table auth.users(id uuid primary key);
create table public.fa_profiles(id uuid primary key references auth.users,role text,account_status text);
create table public.fa_store_audit_history(id uuid primary key,store_id uuid,kind text,visit_date date,percentage numeric,pdf_path text);
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit integer,allowed_mime_types text[]);
create table storage.objects(id uuid primary key,bucket_id text,name text);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant all on storage.objects to authenticated;
create policy broad_legacy_policy on storage.objects for all to authenticated using(true) with check(true);
grant select on public.fa_profiles,public.fa_store_audit_history to service_role;
insert into auth.users values('11111111-1111-4111-8111-111111111111'),('99999999-9999-4999-8999-999999999999');
insert into fa_profiles values('11111111-1111-4111-8111-111111111111','admin','active'),('99999999-9999-4999-8999-999999999999','area_manager','active');
insert into fa_store_audit_history values
 ('22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','H&S','2026-09-17',73.20,'original-audit-2.pdf'),
 ('44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333','H&S','2026-01-22',83.67,'original-audit-1.pdf');
`)
await db.exec(await readFile(new URL('../supabase/migrations/20261025173000_append_audit_revisits.sql', import.meta.url), 'utf8'))
const original = (await db.query('select * from fa_store_audit_history order by id')).rows
const parent = '22222222-2222-4222-8222-222222222222'
const actor = '11111111-1111-4111-8111-111111111111'
const id = '55555555-5555-4555-8555-555555555555'
const other = '66666666-6666-4666-8666-666666666666'
const path = `${parent}/77777777-7777-4777-8777-777777777777.pdf`
const hash = 'a'.repeat(64)
const append = (changes = {}) => {
 const p = { id, actor, parent, date: '2026-10-22', notes: 'Synthetic unresolved findings', path, hash, ...changes }
 return db.query('select (public.fa_append_audit_revisit($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)).*', [p.id,p.actor,p.parent,p.date,p.notes,p.path,p.hash,'application/pdf',100,'fictional.pdf'])
}
await db.exec('set role service_role')
assert.equal((await append()).rows[0].id, id)
assert.equal((await append({ path: `${parent}/88888888-8888-4888-8888-888888888888.pdf` })).rows[0].storage_path, path)
assert.equal((await append({ id: other, path: `${parent}/88888888-8888-4888-8888-888888888888.pdf` })).rows[0].id, id)
await assert.rejects(append({ notes: 'Attempted replacement' }), /conflicts/)
await assert.rejects(append({ actor: '99999999-9999-4999-8999-999999999999' }), /Active audit manager/)
await assert.rejects(append({ date: '2026-09-01' }), /predates/)
await assert.rejects(append({ parent: '99999999-9999-4999-8999-999999999999' }), /Original audit unavailable/)
await assert.rejects(append({ path: 'original-audit-2.pdf' }), /Invalid evidence path/)
await append({ id: other, date: '2026-10-23', path: `${parent}/88888888-8888-4888-8888-888888888888.pdf` })
assert.equal((await db.query('select count(*)::int as n from fa_audit_revisits')).rows[0].n, 2)
await assert.rejects(db.exec(`update fa_audit_revisits set notes='tamper' where id='${id}'`), /permission denied/)
await assert.rejects(db.exec(`delete from fa_audit_revisits where id='${id}'`), /permission denied/)
await db.exec('reset role')
await assert.rejects(db.exec(`update fa_audit_revisits set notes='owner tamper' where id='${id}'`), /append-only/)
await assert.rejects(db.exec(`delete from fa_store_audit_history where id='${parent}'`), /foreign key constraint/)
assert.deepEqual((await db.query('select * from fa_store_audit_history order by id')).rows, original)
await db.exec(`insert into storage.objects values('${id}','fa-audit-revisit-evidence','private.pdf')`)
for (const role of ['anon','authenticated']) {
 await db.exec(`set role ${role}`)
 await assert.rejects(db.query('select * from fa_audit_revisits'), /permission denied/)
 await assert.rejects(append(), /permission denied/)
 await db.exec('reset role')
}
await db.exec('set role authenticated')
assert.equal((await db.query('select * from storage.objects')).rows.length, 0)
await assert.rejects(db.exec(`insert into storage.objects values('${other}','fa-audit-revisit-evidence','tamper.pdf')`), /row-level security/)
await db.exec('reset role')
assert.equal((await db.query("select public from storage.buckets where id='fa-audit-revisit-evidence'")).rows[0].public, false)
console.log('PASS: migration executes; retry uniqueness, multiple revisits, metadata conflicts, roles, immutable rows, parent retention, private storage and restrictive-policy isolation verified on fictional local PostgreSQL.')
await db.close()
