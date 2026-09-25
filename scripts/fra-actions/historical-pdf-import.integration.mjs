/** Isolated PostgreSQL-compatible tests. No remote connection is accepted. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID, createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'

if (!process.env.PGLITE_MODULE) throw new Error('PGLITE_MODULE is required')
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href)

test('historical PDF import is exact, idempotent, unknown-completion and scoped to its source', async () => {
  const db = new PGlite()
  try {
    const actor = randomUUID(), store = randomUUID(), instance = randomUUID(), publication = randomUUID()
    const pdfHash = 'a'.repeat(64)
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE SCHEMA fa_private;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE TABLE public.fa_profiles(id uuid PRIMARY KEY,role text,account_status text);
      CREATE TABLE public.fa_stores(id uuid PRIMARY KEY,fire_risk_assessment_pdf_path text);
      CREATE TABLE public.fa_audit_templates(id uuid PRIMARY KEY,category text);
      CREATE TABLE public.fa_audit_instances(id uuid PRIMARY KEY,store_id uuid,template_id uuid);
      CREATE TABLE public.fa_audit_responses(id uuid PRIMARY KEY,audit_instance_id uuid,response_json jsonb);
      CREATE TABLE public.fa_fra_publications(id uuid PRIMARY KEY,instance_id uuid,store_id uuid,pdf_path text,pdf_sha256 text,confirmed_at timestamptz);
      CREATE FUNCTION fa_private.get_user_role(p_id uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
        SELECT CASE WHEN account_status='active' THEN role ELSE 'pending' END FROM public.fa_profiles WHERE id=p_id $$;
      GRANT USAGE ON SCHEMA auth,fa_private TO anon,authenticated,service_role;
      GRANT EXECUTE ON FUNCTION auth.uid(),fa_private.get_user_role(uuid) TO anon,authenticated,service_role;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;`)
    await db.query("INSERT INTO fa_profiles VALUES($1,'admin','active')", [actor])
    await db.query("INSERT INTO fa_stores VALUES($1,'store/current.pdf')", [store])
    const template = randomUUID()
    await db.query("INSERT INTO fa_audit_templates VALUES($1,'fire_risk_assessment')", [template])
    await db.query('INSERT INTO fa_audit_instances VALUES($1,$2,$3)', [instance,store,template])
    await db.query("INSERT INTO fa_fra_publications VALUES($1,$2,$3,'fra/issued.pdf',$4,now())", [publication,instance,store,pdfHash])
    await db.exec(await readFile(new URL('../../supabase/drafts/fra_action_persistence.sql',import.meta.url),'utf8'))
    await db.exec('BEGIN; SET LOCAL ROLE service_role;')
    await assert.rejects(() => db.query('SELECT public.fa_fra_migrate_reviewed_action($1,$2)', [actor,randomUUID()]),/permission denied/i)
    await db.exec('ROLLBACK')
    await db.exec(await readFile(new URL('../../supabase/drafts/fra_historical_pdf_import.sql',import.meta.url),'utf8'))
    const source = { storeId:store,pdfSha256:pdfHash,page:12,rowOrdinal:1,wording:'Repair the fire door closer.' }
    const sourceKey = createHash('sha256').update(JSON.stringify(source)).digest('hex')
    const row = { ...source,sourceKey,pdfPath:'fra/issued.pdf',priority:'High',publicationId:publication,
      assessmentInstanceId:instance,provenance:'confirmed_publication_pdf',completionStatus:'unknown' }
    const importRow = async (value, by=actor) => {
      await db.exec('BEGIN; SET LOCAL ROLE service_role;')
      try {
        const id = (await db.query('SELECT public.fa_fra_import_historical_pdf_action($1,$2::jsonb) id',[by,JSON.stringify(value)])).rows[0].id
        await db.exec('COMMIT')
        return id
      } catch (error) { await db.exec('ROLLBACK'); throw error }
    }
    const id = await importRow(row)
    assert.equal(await importRow(row),id)
    const action = (await db.query('SELECT * FROM fa_fra_actions WHERE id=$1',[id])).rows[0]
    assert.equal(action.source_origin,'historical_pdf')
    assert.equal(action.status,'open')
    assert.equal(action.historical_completion_unknown,true)
    assert.equal(action.historical_pdf_reference_kind,'confirmed_publication_pdf')
    const event = (await db.query('SELECT event_type FROM fa_fra_action_events WHERE action_id=$1',[id])).rows[0]
    assert.equal(event.event_type,'historical_pdf_imported')
    await assert.rejects(() => importRow({...row,wording:'Different wording'}),/source key mismatch/i)
    await assert.rejects(() => importRow({...row,priority:'Low'}),/already imported with different/i)
    await assert.rejects(() => importRow({...row,pdfSha256:'b'.repeat(64)}),/source key mismatch/i)
    await assert.rejects(() => importRow(row,randomUUID()),/Active KSS reviewer/i)
  } finally { await db.close() }
})
