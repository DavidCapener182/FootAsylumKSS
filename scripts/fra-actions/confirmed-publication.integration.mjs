/** Isolated PGlite integration; never connects to a remote database. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

if (!process.env.PGLITE_MODULE) throw new Error('PGLITE_MODULE is required')
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href)
const db = new PGlite()
const root = new URL('../../supabase/drafts/', import.meta.url)
const ids = {
  kss: '11111111-1111-4111-8111-111111111111', store: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  template: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', instance: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  publication: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', remedial: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  routine: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
}

try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE SCHEMA fa_private;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE TABLE public.fa_profiles(id uuid PRIMARY KEY,role text,account_status text);
    CREATE TABLE public.fa_stores(id uuid PRIMARY KEY);
    CREATE TABLE public.fa_audit_templates(id uuid PRIMARY KEY,category text);
    CREATE TABLE public.fa_audit_instances(id uuid PRIMARY KEY,store_id uuid,template_id uuid);
    CREATE TABLE public.fa_audit_responses(id uuid PRIMARY KEY,audit_instance_id uuid,response_json jsonb);
    CREATE TABLE public.fa_fra_publications(id uuid PRIMARY KEY,instance_id uuid,store_id uuid,pdf_path text,pdf_sha256 text,confirmed_at timestamptz);
    CREATE FUNCTION fa_private.get_user_role(p_id uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
      SELECT CASE WHEN account_status='active' THEN role ELSE 'pending' END FROM public.fa_profiles WHERE id=p_id $$;
    CREATE FUNCTION public.fa_confirm_fra_publication(publication_id uuid,confirming_user uuid,assessment_time timestamptz)
      RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
      BEGIN UPDATE public.fa_fra_publications SET confirmed_at=now() WHERE id=publication_id AND confirmed_at IS NULL; END $$;
    GRANT USAGE ON SCHEMA auth,fa_private TO anon,authenticated,service_role;
    GRANT EXECUTE ON FUNCTION auth.uid(),fa_private.get_user_role(uuid) TO anon,authenticated,service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;`)
  await db.exec(await readFile(new URL('fra_action_persistence.sql', root), 'utf8'))
  await db.exec(await readFile(new URL('fra_confirmed_publication_actions.sql', root), 'utf8'))
  await db.query(`INSERT INTO fa_profiles VALUES ($1,'admin','active')`, [ids.kss])
  await db.query(`INSERT INTO fa_stores VALUES ($1)`, [ids.store])
  await db.query(`INSERT INTO fa_audit_templates VALUES ($1,'fire_risk_assessment')`, [ids.template])
  await db.query(`INSERT INTO fa_audit_instances VALUES ($1,$2,$3)`, [ids.instance, ids.store, ids.template])
  const remedial = { sourceActionId: ids.remedial, kind: 'remedial', recommendation: 'Repair fire door', priority: 'High' }
  const routine = { sourceActionId: ids.routine, kind: 'routine', recommendation: 'Continue weekly checks', priority: 'Low' }
  const snapshot = { version: 1, instanceId: ids.instance, storeId: ids.store, approvedBy: ids.kss,
    approvedAt: '2026-09-25T12:00:00.000Z', pdfRows: [remedial, routine], trackingRows: [remedial], fingerprint: 'f'.repeat(64) }
  await db.query(`INSERT INTO fa_fra_approved_action_plans(instance_id,store_id,snapshot,fingerprint,approved_by,approved_at)
    VALUES ($1,$2,$3::jsonb,$4,$5,$6)`, [ids.instance, ids.store, JSON.stringify(snapshot), snapshot.fingerprint, ids.kss, snapshot.approvedAt])
  await db.query(`INSERT INTO fa_fra_publications(id,instance_id,store_id,pdf_path,pdf_sha256,action_snapshot,pdf_action_fingerprint)
    VALUES ($1,$2,$3,'fra/issued.pdf',$4,$5::jsonb,$6)`, [ids.publication, ids.instance, ids.store, 'a'.repeat(64), JSON.stringify(snapshot), snapshot.fingerprint])
  const invalidPublication = '12345678-1234-4234-8234-123456789abc'
  const invalidSnapshot = { ...snapshot, trackingRows: [routine] }
  await db.query(`INSERT INTO fa_fra_publications(id,instance_id,store_id,pdf_path,pdf_sha256,action_snapshot,pdf_action_fingerprint)
    VALUES ($1,$2,$3,'fra/invalid.pdf',$4,$5::jsonb,$6)`, [invalidPublication, ids.instance, ids.store, 'b'.repeat(64), JSON.stringify(invalidSnapshot), snapshot.fingerprint])
  await assert.rejects(() => db.query(`SELECT fa_confirm_fra_publication_with_actions($1,$2,now())`, [invalidPublication, ids.kss]),
    /Tracked actions must exactly match remedial PDF rows/)
  assert.equal((await db.query(`SELECT confirmed_at FROM fa_fra_publications WHERE id=$1`, [invalidPublication])).rows[0].confirmed_at, null)
  const call = () => db.query(`SELECT fa_confirm_fra_publication_with_actions($1,$2,now())`, [ids.publication, ids.kss])
  await call()
  await call()
  const actions = (await db.query(`SELECT source_action_id,recommendation FROM fa_fra_actions ORDER BY recommendation`)).rows
  assert.deepEqual(actions, [{ source_action_id: ids.remedial, recommendation: 'Repair fire door' }])
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM fa_fra_action_events WHERE event_type='publication_action_created'`)).rows[0].n, 1)
  assert.ok((await db.query(`SELECT confirmed_at FROM fa_fra_publications WHERE id=$1`, [ids.publication])).rows[0].confirmed_at)
  await assert.rejects(() => db.query(`UPDATE fa_fra_publications SET pdf_action_fingerprint=$1 WHERE id=$2`, ['0'.repeat(64), ids.publication]), /cannot be changed/)
  console.log('FRA approved-publication PGlite checks passed')
} finally { await db.close() }
