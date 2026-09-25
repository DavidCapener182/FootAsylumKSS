import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

if (!process.env.PGLITE_MODULE) throw new Error('PGLITE_MODULE is required')
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href)
const db = new PGlite()
const ids = {
  admin: '11111111-1111-4111-8111-111111111111',
  ops: '22222222-2222-4222-8222-222222222222',
  readonly: '33333333-3333-4333-8333-333333333333',
  area: '44444444-4444-4444-8444-444444444444',
  clientAdmin: '55555555-5555-4555-8555-555555555555',
  legacyClient: '66666666-6666-4666-8666-666666666666',
  suspendedAdmin: '77777777-7777-4777-8777-777777777777',
}
const tables = ['fa_fra_photo_comments', 'fa_hs_incidents', 'fa_hs_claims', 'fa_hs_sites', 'fa_hs_monthly_summary']

try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE SCHEMA fa_private;
    CREATE TYPE public.fa_user_role AS ENUM ('admin','ops','readonly','client','client_admin','area_manager','pending');
    CREATE TABLE public.fa_profiles (id uuid PRIMARY KEY, role public.fa_user_role, account_status text NOT NULL);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    CREATE FUNCTION fa_private.get_user_role(user_id uuid) RETURNS public.fa_user_role
    LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
      SELECT CASE WHEN p.account_status = 'active' THEN p.role ELSE 'pending'::public.fa_user_role END
      FROM public.fa_profiles p WHERE p.id = user_id
    $$;
    GRANT USAGE ON SCHEMA public, auth, fa_private TO anon, authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
    GRANT EXECUTE ON FUNCTION fa_private.get_user_role(uuid) TO authenticated;
  `)
  for (const table of tables) {
    await db.exec(`CREATE TABLE public.${table} (id integer PRIMARY KEY); INSERT INTO public.${table} VALUES (1);
      ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;
      GRANT SELECT ON public.${table} TO anon, authenticated;
      CREATE POLICY existing_any_user_read ON public.${table} FOR SELECT TO anon, authenticated USING (true);`)
  }
  for (const [name, id] of Object.entries(ids)) {
    const role = name === 'clientAdmin' ? 'client_admin' : name === 'legacyClient' ? 'client' : name === 'suspendedAdmin' ? 'admin' : name === 'area' ? 'area_manager' : name
    await db.query('INSERT INTO public.fa_profiles VALUES ($1,$2,$3)', [id, role, name === 'suspendedAdmin' ? 'suspended' : 'active'])
  }
  await db.exec(await readFile(new URL('../../supabase/drafts/fra_scoped_role_read_closure.sql', import.meta.url), 'utf8'))

  for (const [name, id] of Object.entries(ids)) {
    for (const table of tables) {
      await db.exec(`BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub = '${id}';`)
      const result = await db.query(`SELECT count(*)::int AS count FROM public.${table}`)
      await db.exec('ROLLBACK')
      assert.equal(result.rows[0].count, ['admin', 'ops', 'readonly'].includes(name) ? 1 : 0, `${name} ${table}`)
    }
  }
  for (const table of tables) {
    await db.exec('BEGIN; SET LOCAL ROLE anon;')
    await assert.rejects(() => db.query(`SELECT * FROM public.${table}`), /permission denied/)
    await db.exec('ROLLBACK')
  }
  console.log('scoped-role source read closure: PASS')
} finally {
  await db.close()
}
