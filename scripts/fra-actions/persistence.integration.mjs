/** Isolated PostgreSQL tests. Never accepts a database URL or connects remotely.
 * PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node --test scripts/fra-actions/persistence.integration.mjs
 * Runtime used during authoring: @electric-sql/pglite 0.5.8 in /private/tmp only.
 */
import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID, createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { toHistoricalReviewInput, validateHistoricalActionReview, toLegacySourceInvestigationInput } from './historical-review.mjs'

if (!process.env.PGLITE_MODULE) throw new Error('Set PGLITE_MODULE to a locally installed PGlite module; no tests were executed')
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href)
const db = new PGlite()
const ids = Object.fromEntries(['admin','ops','client','suspended','readonly','store','otherStore','template','hsTemplate','instance','hsInstance','publication'].map(k => [k,randomUUID()]))
const hash = 'a'.repeat(64)
const sourceItem = { recommendation:'Repair the fire door closer.', priority:'High' }
const sourceItemJson = JSON.stringify(sourceItem)
const sourceItemSha256 = createHash('sha256').update(sourceItemJson).digest('hex')
const responseIds = Array.from({length:300},()=>randomUUID())
let count = 0
const candidate = (patch = {}) => {
  const responseId=responseIds[count++]
  return { stagingKey:`${ids.instance}:${responseId}:1`,storeId:ids.store,
    assessmentInstanceId:ids.instance,responseId,sourceJsonPath:'fra_extracted_data.actionPlanItems[0]',sourceOrdinal:1,
    sourceItemJson,sourceItemSha256,recommendation:sourceItem.recommendation,priority:sourceItem.priority,
    publicationId:ids.publication,confirmedPdfPath:'fra/issued.pdf',confirmedPdfSha256:hash,...patch }
}
function ui(c, patch = {}) {
  return { stagingKey:c.stagingKey,storeId:c.storeId,sourceItemSha256:c.sourceItemSha256,
    decision:'open_migrate',reviewerId:ids.admin,reviewedAt:new Date().toISOString(),comment:'Checked issued row and current maintenance evidence',
    missingEvidenceReason:'',issuedPdfPath:c.confirmedPdfPath,issuedPdfSha256:c.confirmedPdfSha256,
    issuedPdfPage:'12',issuedPdfRow:String(count),issuedActionText:'Repair the fire door closer.',
    pdfIdentityChecked:true,actionTextMatched:true,fraOrigin:'confirmed',actionKind:'remedial',completion:'open',
    completionEvidenceChecked:true,completionEvidenceRef:'Maintenance register 2026-09-25 row 4',
    duplicateDisposition:'new',linkedActionId:'',priority:'High',priorityAndTargetChecked:true,targetDate:'',targetDateEvidenceRef:'',...patch }
}
async function asRole(role, actor, fn) {
  await db.exec(`BEGIN; SET LOCAL ROLE ${role};`)
  try {
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[actor || ''])
    const result=await fn()
    await db.exec('COMMIT')
    return result
  } catch(error) { await db.exec('ROLLBACK'); throw error }
}
async function record(c, r, {actor=ids.admin,key=randomUUID(),previous=null}={}) {
  return asRole('service_role',null,async()=> (await db.query(
    'SELECT public.fa_fra_record_historical_review($1,$2::jsonb,$3::jsonb,$4,$5) id',
    [actor,JSON.stringify(c),JSON.stringify(r),key,previous])).rows[0].id)
}
async function migrate(reviewId, actor=ids.admin) {
  return asRole('service_role',null,async()=> (await db.query('SELECT public.fa_fra_migrate_reviewed_action($1,$2) id',[actor,reviewId])).rows[0].id)
}
before(async()=> {
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
    GRANT USAGE ON SCHEMA auth,fa_private TO anon,authenticated,service_role;
    GRANT EXECUTE ON FUNCTION auth.uid(),fa_private.get_user_role(uuid) TO anon,authenticated,service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;`)
  for(const role of ['admin','ops','client','readonly','suspended']) await db.query('INSERT INTO fa_profiles VALUES($1,$2,$3)',[ids[role],role==='suspended'?'admin':role,role==='suspended'?'suspended':'active'])
  for(const store of [ids.store,ids.otherStore]) await db.query('INSERT INTO fa_stores VALUES($1)',[store])
  await db.query("INSERT INTO fa_audit_templates VALUES($1,'fire_risk_assessment'),($2,'health_safety')",[ids.template,ids.hsTemplate])
  await db.query('INSERT INTO fa_audit_instances VALUES($1,$2,$3),($4,$2,$5)',[ids.instance,ids.store,ids.template,ids.hsInstance,ids.hsTemplate])
  await db.query("INSERT INTO fa_fra_publications VALUES($1,$2,$3,'fra/issued.pdf',$4,now())",[ids.publication,ids.instance,ids.store,hash])
  for(const responseId of responseIds) await db.query('INSERT INTO fa_audit_responses VALUES($1,$2,$3::jsonb)',
    [responseId,ids.instance,JSON.stringify({fra_extracted_data:{actionPlanItems:[sourceItem]}})])
  await db.exec(await readFile(new URL('../../supabase/drafts/fra_action_persistence.sql',import.meta.url),'utf8'))
  // Exercise the dormant historical commands in isolation. Production draft
  // deliberately withholds these grants pending all live activation gates.
  await db.exec(`GRANT EXECUTE ON FUNCTION public.fa_fra_record_historical_review(uuid,jsonb,jsonb,uuid,uuid),
    public.fa_fra_migrate_reviewed_action(uuid,uuid) TO service_role`)
})
after(async()=>db.close())

test('canonical UI adapter -> SQL review -> one immutable action and event, exact source hash parity',async()=> {
  const c=candidate(); const r=toHistoricalReviewInput(ui(c),c)
  const validated=validateHistoricalActionReview(r,c)
  const reviewId=await record(c,r); const actionId=await migrate(reviewId)
  assert.equal((await db.query('SELECT migration_eligible FROM fa_fra_historical_reviews WHERE id=$1',[reviewId])).rows[0].migration_eligible,true)
  assert.equal(await migrate(reviewId),actionId)
  const a=(await db.query('SELECT * FROM fa_fra_actions WHERE id=$1',[actionId])).rows[0]
  assert.equal(a.source_key,validated.sourceKey); assert.equal(a.status,'open'); assert.equal(a.source_review_id,reviewId)
  assert.equal((await db.query('SELECT count(*)::int n FROM fa_fra_action_events WHERE action_id=$1',[actionId])).rows[0].n,1)
})

test('needs_evidence saves without PDF/completion; server derives actor/time; cannot migrate',async()=> {
  const c=candidate({publicationId:null,confirmedPdfPath:null,confirmedPdfSha256:null})
  const r=toHistoricalReviewInput(ui(c,{decision:'needs_evidence',missingEvidenceReason:'Issued PDF not located',pdfIdentityChecked:false,actionTextMatched:false,completionEvidenceChecked:false}),c)
  delete r.issuedFra; delete r.checks; delete r.completionEvidenceRef
  r.reviewerUserId=ids.client;r.reviewedAt='1900-01-01'
  const reviewId=await record(c,r)
  const saved=(await db.query('SELECT reviewed_by,review_data,migration_eligible FROM fa_fra_historical_reviews WHERE id=$1',[reviewId])).rows[0]
  assert.equal(saved.migration_eligible,false)
  assert.equal(saved.reviewed_by,ids.admin);assert.equal(saved.review_data.reviewerUserId,ids.admin);assert.notEqual(saved.review_data.reviewedAt,r.reviewedAt)
  await assert.rejects(()=>migrate(reviewId),/Only Open/)
})

test('all non-migration decisions persist honestly and never create tracked actions',async()=> {
  const original=candidate();const existing=await migrate(await record(original,toHistoricalReviewInput(ui(original),original)))
  const settings=[
    {decision:'closed_archive',completion:'closed'},
    {decision:'routine_exclude',actionKind:'routine',completion:'unknown',completionEvidenceChecked:false},
    {decision:'duplicate_link',duplicateDisposition:'link_existing',linkedActionId:existing},
    {decision:'not_fra_exclude',fraOrigin:'not_fra',pdfIdentityChecked:false,actionTextMatched:false},
  ]
  for(const patch of settings) {
    const c=candidate();const r=toHistoricalReviewInput(ui(c,patch),c)
    if(patch.decision==='not_fra_exclude')delete r.issuedFra
    validateHistoricalActionReview(r,c)
    const reviewId=await record(c,r)
    assert.equal((await db.query('SELECT migration_eligible FROM fa_fra_historical_reviews WHERE id=$1',[reviewId])).rows[0].migration_eligible,false)
    await assert.rejects(()=>migrate(reviewId),/Only Open/)
  }
})

test('every missing open gate, string boolean, mismatched issued PDF and impossible date is rejected',async()=> {
  for(const check of ['issuedPdfVerified','fraOriginVerified','remedialVerified','outstandingVerified','completionEvidenceChecked','duplicateChecked','priorityAndTargetChecked']) {
    const c=candidate();const r=toHistoricalReviewInput(ui(c),c);r.checks[check]=false
    await assert.rejects(()=>record(c,r),/Required evidence check/)
  }
  for(const corrupt of [r=>r.checks.issuedPdfVerified='true',r=>r.issuedFra.pdfSha256='c'.repeat(64),r=>r.issuedFra.page=0,
    r=>{r.targetDate='2026-02-31';r.targetDateEvidenceRef='reviewed source'},r=>r.completionEvidenceRef='',
    r=>r.checks.completedVerified=true,r=>r.checks.routineVerified=true,r=>r.checks.notFraOriginVerified=true,
    r=>r.duplicateDisposition='link_existing',r=>r.duplicateOfFraActionId=randomUUID()]) {
    const c=candidate();const r=toHistoricalReviewInput(ui(c),c);corrupt(r)
    await assert.rejects(()=>record(c,r))
  }
})

test('source identities and duplicate link cannot cross stores or non-FRA assessments',async()=> {
  for(const patch of [{storeId:ids.otherStore},{assessmentInstanceId:ids.hsInstance,publicationId:null}]) {
    const c=candidate(patch);await assert.rejects(()=>record(c,toHistoricalReviewInput(ui(c),c)),/Source must be an FRA/)
  }
  const c=candidate();const r=toHistoricalReviewInput(ui(c),c);r.sourceItemSha256='c'.repeat(64)
  await assert.rejects(()=>record(c,r),/Candidate identity/)
})

test('stored response, path, ordinal, and serialized item are bound before review',async()=> {
  const cases=[
    [{responseId:randomUUID()},/source path or staging identity/],
    [{sourceJsonPath:'fra_extracted_data.actionPlanItems[1]'},/source path or staging identity/],
    [{sourceOrdinal:2},/source path or staging identity/],
    [{sourceItemSha256:'c'.repeat(64)},/serialization hash mismatch/],
    [{sourceItemJson:JSON.stringify({recommendation:'Fabricated',priority:'High'})},/serialization hash mismatch/],
    [{sourceItemJson:undefined},/source identity required/],
  ]
  for(const [patch,pattern] of cases) {
    const c=candidate(patch);await assert.rejects(()=>record(c,toHistoricalReviewInput(ui(c),c)),pattern)
  }
  const c=candidate();const tampered={...c,sourceItemJson:JSON.stringify({recommendation:'Fabricated',priority:'High'})}
  tampered.sourceItemSha256=createHash('sha256').update(tampered.sourceItemJson).digest('hex')
  await assert.rejects(()=>record(tampered,toHistoricalReviewInput(ui(tampered),tampered)),/action item changed/)
  const missing=candidate();missing.responseId=randomUUID();missing.stagingKey=`${missing.assessmentInstanceId}:${missing.responseId}:1`
  await assert.rejects(()=>record(missing,toHistoricalReviewInput(ui(missing),missing)),/Stored FRA response missing/)
  const wrongInstance=candidate({assessmentInstanceId:ids.hsInstance,publicationId:null})
  await assert.rejects(()=>record(wrongInstance,toHistoricalReviewInput(ui(wrongInstance),wrongInstance)),/Source must be an FRA/)
})

test('changed stored response after review blocks migration',async()=> {
  const c=candidate();const reviewId=await record(c,toHistoricalReviewInput(ui(c),c))
  await db.query('UPDATE fa_audit_responses SET response_json=$1::jsonb WHERE id=$2',
    [JSON.stringify({fra_extracted_data:{actionPlanItems:[{recommendation:'Changed',priority:'High'}]}}),c.responseId])
  try {await assert.rejects(()=>migrate(reviewId),/action item changed/)}
  finally {await db.query('UPDATE fa_audit_responses SET response_json=$1::jsonb WHERE id=$2',
    [JSON.stringify({fra_extracted_data:{actionPlanItems:[sourceItem]}}),c.responseId])}
})

test('idempotency, optimistic review chaining and superseded review blocks',async()=> {
  const c=candidate();const r=toHistoricalReviewInput(ui(c),c);const key=randomUUID()
  const first=await record(c,r,{key});assert.equal(await record(c,r,{key}),first)
  await assert.rejects(()=>record(c,{...r,reason:'changed'},{key}),/Idempotency/)
  await assert.rejects(()=>record(c,r),/version conflict/)
  const next=await record(c,{...r,decision:'needs_evidence',missingEvidenceReason:'Further check needed'},{previous:first})
  await assert.rejects(()=>migrate(first),/superseded/)
  await assert.rejects(()=>migrate(next),/Only Open/)
})

test('same issued PDF row cannot migrate twice under a different extraction key; failed insert leaves no event',async()=> {
  const c=candidate();const r=toHistoricalReviewInput(ui(c),c);await migrate(await record(c,r))
  const duplicate=candidate()
  const d={...r,stagingKey:duplicate.stagingKey,caseId:'fra-action:'+duplicate.stagingKey}
  const reviewId=await record(duplicate,d)
  const before=(await db.query('SELECT count(*)::int n FROM fa_fra_action_events')).rows[0].n
  await assert.rejects(()=>migrate(reviewId),/duplicate key/)
  assert.equal((await db.query('SELECT count(*)::int n FROM fa_fra_action_events')).rows[0].n,before)
})

test('client/anon/suspended/readonly cannot call mutation RPCs or directly write; service cannot impersonate client',async()=> {
  const c=candidate();const r=toHistoricalReviewInput(ui(c),c)
  for(const actor of [ids.client,ids.suspended,ids.readonly]) {
    await assert.rejects(()=>asRole('authenticated',actor,()=>db.query('SELECT public.fa_fra_record_historical_review($1,$2,$3,$4)',[ids.admin,c,r,randomUUID()])),/permission denied/)
    await assert.rejects(()=>asRole('authenticated',actor,()=>db.exec("UPDATE fa_fra_actions SET status='verified_closed'")),/permission denied/)
    await assert.rejects(()=>record(c,r,{actor}),/Active KSS/)
  }
  await assert.rejects(()=>asRole('anon',null,()=>db.exec('SELECT * FROM fa_fra_actions')),/permission denied/)
})

test('RLS allows KSS action reads, denies client/suspended rows, and hides review records from readonly',async()=> {
  for(const actor of [ids.client,ids.suspended]) {
    const rows=await asRole('authenticated',actor,()=>db.query('SELECT * FROM fa_fra_actions'))
    assert.equal(rows.rows.length,0)
  }
  for(const actor of [ids.admin,ids.ops,ids.readonly]) {
    const rows=await asRole('authenticated',actor,()=>db.query('SELECT * FROM fa_fra_actions'))
    assert.ok(rows.rows.length>0)
  }
  assert.equal((await asRole('authenticated',ids.readonly,()=>db.query('SELECT * FROM fa_fra_historical_reviews'))).rows.length,0)
})

test('history and action provenance reject UPDATE/DELETE even through privileged ordinary SQL',async()=> {
  for(const table of ['fa_fra_historical_reviews','fa_fra_action_events','fa_fra_actions']) {
    await assert.rejects(()=>db.exec(`DELETE FROM ${table}`),/immutable/)
  }
  await assert.rejects(()=>db.exec("UPDATE fa_fra_actions SET status='verified_closed'"),/immutable/)
  await assert.rejects(()=>asRole('service_role',null,()=>db.exec('DELETE FROM fa_fra_action_events')),/permission denied/)
})

test('Queue B adapter saves source-only investigation without action creation, idempotently',async()=> {
  const data=toLegacySourceInvestigationInput({storeId:ids.store,status:'needs_source',reviewerId:ids.admin,
    reviewedAt:new Date().toISOString(),notes:'Requested missing issued report',evidenceRef:'Missing source PDF',pdfPath:'',pdfSha256:''})
  const key=randomUUID();const before=(await db.query('SELECT count(*)::int n FROM fa_fra_actions')).rows[0].n
  const save=()=>asRole('service_role',null,()=>db.query('SELECT public.fa_fra_record_source_investigation($1,$2,$3,$4) id',[ids.admin,ids.store,data,key]))
  const first=(await save()).rows[0].id;assert.equal((await save()).rows[0].id,first)
  assert.equal((await db.query('SELECT count(*)::int n FROM fa_fra_actions')).rows[0].n,before)
  await assert.rejects(()=>db.exec('DELETE FROM fa_fra_source_investigations'),/immutable/)
})

test('Queue B located/verified states need a real PDF identity and verified state requires explicit check',async()=> {
  const base={caseId:'legacy-store:'+ids.store,storeId:ids.store,notes:'Checked archive',evidenceRef:'Archive report',
    status:'pdf_located',issuedFra:{pdfPath:'archive/issued.pdf',pdfSha256:hash},issuedPdfVerified:false}
  const save=data=>asRole('service_role',null,()=>db.query('SELECT public.fa_fra_record_source_investigation($1,$2,$3,$4)',[ids.admin,ids.store,data,randomUUID()]))
  await save(base)
  await assert.rejects(()=>save({...base,status:'source_verified'}),/check constraint/)
  await save({...base,status:'source_verified',issuedPdfVerified:true})
  await assert.rejects(()=>save({...base,issuedFra:{pdfPath:'',pdfSha256:''}}),/check constraint/)
})

test('publication changes after review block migration; revocation also blocks a fresh command',async()=> {
  const c=candidate();const reviewId=await record(c,toHistoricalReviewInput(ui(c),c))
  await db.query("UPDATE fa_fra_publications SET pdf_sha256=$1 WHERE id=$2",['c'.repeat(64),ids.publication])
  try {await assert.rejects(()=>migrate(reviewId),/changed after review/)}
  finally {await db.query('UPDATE fa_fra_publications SET pdf_sha256=$1 WHERE id=$2',[hash,ids.publication])}
  await assert.rejects(()=>migrate(reviewId,ids.suspended),/Active KSS/)
})

test('schema reserves new issuance provenance but rejects it until the atomic publication command exists',async()=> {
  await assert.rejects(()=>asRole('service_role',null,()=>db.query(`INSERT INTO fa_fra_actions
    (source_origin,store_id,publication_id,assessment_instance_id,publication_action_snapshot,source_key,pdf_path,pdf_sha256,recommendation,priority,created_by)
    VALUES('confirmed_publication',$1,$2,$3,'{}',$4,'fra/issued.pdf',$4,'Issued action','High',$5)`,
    [ids.store,ids.publication,ids.instance,hash,ids.admin])),/Publication action command not installed/)
})

test('RPCs are invoker-only, fixed search_path, and no PUBLIC/anon/authenticated EXECUTE',async()=> {
  const funcs=(await db.query("SELECT proname,prosecdef,proconfig,has_function_privilege('authenticated',oid,'EXECUTE') client_execute FROM pg_proc WHERE proname IN ('fa_fra_record_historical_review','fa_fra_migrate_reviewed_action','fa_fra_record_source_investigation')")).rows
  assert.equal(funcs.length,3)
  for(const f of funcs) {assert.equal(f.prosecdef,false);assert.equal(f.client_execute,false);assert.ok(f.proconfig.includes('search_path=""'))}
})

test('migration eligibility is generated and cannot be supplied, even by privileged SQL',async()=> {
  const metadata=(await db.query("SELECT is_generated,generation_expression FROM information_schema.columns WHERE table_schema='public' AND table_name='fa_fra_historical_reviews' AND column_name='migration_eligible'")).rows[0]
  assert.equal(metadata.is_generated,'ALWAYS');assert.match(metadata.generation_expression,/open_migrate/)
  await assert.rejects(()=>db.exec("INSERT INTO fa_fra_historical_reviews(migration_eligible) VALUES(true)"),/non-DEFAULT|generated column/)
})
