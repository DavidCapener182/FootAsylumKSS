import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

if (!process.env.PGLITE_MODULE) throw new Error('PGLITE_MODULE is required')
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href)
const db = new PGlite()
const users = {
  admin: '11111111-1111-4111-8111-111111111111',
  ops: '22222222-2222-4222-8222-222222222222',
  area_manager: '33333333-3333-4333-8333-333333333333',
  client_admin: '44444444-4444-4444-8444-444444444444',
  client: '55555555-5555-4555-8555-555555555555',
  suspended_ops: '66666666-6666-4666-8666-666666666666',
}
const sourceTables = ['fa_fra_photo_comments', 'fa_audit_instances', 'fa_audit_responses', 'fa_audit_media']

try {
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth; CREATE SCHEMA fa_private; CREATE SCHEMA storage;
    CREATE TYPE public.fa_user_role AS ENUM ('admin','ops','readonly','client','client_admin','area_manager','pending');
    CREATE TABLE public.fa_profiles(id uuid PRIMARY KEY, role public.fa_user_role, account_status text NOT NULL);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    CREATE FUNCTION fa_private.get_user_role(user_id uuid) RETURNS public.fa_user_role LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
      SELECT CASE WHEN account_status='active' THEN role ELSE 'pending'::public.fa_user_role END
      FROM public.fa_profiles WHERE id=user_id $$;
    GRANT USAGE ON SCHEMA public, auth, fa_private, storage TO authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid(), fa_private.get_user_role(uuid) TO authenticated;`)
  for (const table of sourceTables) {
    await db.exec(`CREATE TABLE public.${table}(id integer PRIMARY KEY, owner_id uuid, detail text);
      INSERT INTO public.${table} VALUES (1,'${users.area_manager}','existing');
      ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;
      GRANT SELECT, INSERT, UPDATE, DELETE ON public.${table} TO authenticated;
      CREATE POLICY legacy_owner_all ON public.${table} FOR ALL TO authenticated
        USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());`)
  }
  await db.exec(`CREATE TABLE storage.objects(id integer PRIMARY KEY, bucket_id text, owner_id uuid, detail text);
    INSERT INTO storage.objects VALUES (1,'fa-attachments','${users.area_manager}','existing');
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;
    CREATE POLICY legacy_storage_owner_all ON storage.objects FOR ALL TO authenticated
      USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());`)
  for (const [name, id] of Object.entries(users)) {
    await db.query('INSERT INTO public.fa_profiles VALUES ($1,$2,$3)', [id, name === 'suspended_ops' ? 'ops' : name, name === 'suspended_ops' ? 'suspended' : 'active'])
  }
  await db.exec(await readFile(new URL('../../supabase/drafts/fra_scoped_role_write_closure.sql', import.meta.url), 'utf8'))

  for (const [name, id] of Object.entries(users)) {
    const allowed = name === 'admin' || name === 'ops'
    await db.exec(`BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='${id}';`)
    for (const table of sourceTables) {
      const rowId = Object.keys(users).indexOf(name) + 10
      if (allowed) {
        await db.query(`INSERT INTO public.${table} VALUES ($1,$2,'new')`, [rowId, id])
        assert.equal((await db.query(`UPDATE public.${table} SET detail='updated' WHERE id=$1`, [rowId])).affectedRows, 1)
        assert.equal((await db.query(`DELETE FROM public.${table} WHERE id=$1`, [rowId])).affectedRows, 1)
      } else {
        await db.exec('SAVEPOINT blocked_write')
        await assert.rejects(() => db.query(`INSERT INTO public.${table} VALUES ($1,$2,'new')`, [rowId, id]), /row-level security/)
        await db.exec('ROLLBACK TO SAVEPOINT blocked_write')
        if (name === 'area_manager') {
          assert.equal((await db.query(`UPDATE public.${table} SET detail='tampered' WHERE id=1`)).affectedRows, 0)
          assert.equal((await db.query(`DELETE FROM public.${table} WHERE id=1`)).affectedRows, 0)
        }
      }
    }
    if (allowed) {
      await db.query('INSERT INTO storage.objects VALUES ($1,$2,$3,$4)', [Object.keys(users).indexOf(name)+10, 'fa-attachments', id, 'new'])
    } else {
      await db.exec('SAVEPOINT blocked_write')
      await assert.rejects(() => db.query('INSERT INTO storage.objects VALUES ($1,$2,$3,$4)', [Object.keys(users).indexOf(name)+10, 'fa-attachments', id, 'new']), /row-level security/)
      await db.exec('ROLLBACK TO SAVEPOINT blocked_write')
      if (name === 'area_manager') {
        assert.equal((await db.query("UPDATE storage.objects SET detail='tampered' WHERE id=1")).affectedRows, 0)
        assert.equal((await db.query('DELETE FROM storage.objects WHERE id=1')).affectedRows, 0)
        await db.query('INSERT INTO storage.objects VALUES (100,$1,$2,$3)', ['other-product', id, 'allowed-by-existing-policy'])
      }
    }
    await db.exec('ROLLBACK')
  }
  console.log('scoped-role operational write closure: PASS')
} finally {
  await db.close()
}
