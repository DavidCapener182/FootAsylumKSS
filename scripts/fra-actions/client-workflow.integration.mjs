import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
if (!process.env.PGLITE_MODULE) throw new Error('PGLITE_MODULE is required')
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href)
import { readFile } from 'node:fs/promises'
const db = new PGlite()
const root=new URL('../../supabase/drafts/', import.meta.url)
try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth; CREATE SCHEMA fa_private; CREATE SCHEMA storage;
 CREATE TYPE public.fa_user_role AS ENUM ('admin','ops','readonly','client','pending');
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 CREATE TABLE public.fa_profiles(id uuid PRIMARY KEY,role public.fa_user_role,account_status text);
 CREATE TABLE public.fa_stores(id uuid PRIMARY KEY,store_code text,store_name text,reporting_area_manager_name text,fire_risk_assessment_pdf_path text);
 CREATE TABLE public.fa_audit_templates(id uuid PRIMARY KEY,category text);
 CREATE TABLE public.fa_audit_instances(id uuid PRIMARY KEY,store_id uuid,template_id uuid);
 CREATE TABLE public.fa_audit_responses(id uuid PRIMARY KEY,audit_instance_id uuid,response_json jsonb);
 CREATE TABLE public.fa_fra_publications(id uuid PRIMARY KEY,instance_id uuid,store_id uuid,pdf_path text,pdf_sha256 text,confirmed_at timestamptz);
 CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text);
 CREATE FUNCTION fa_private.get_user_role(p_id uuid) RETURNS public.fa_user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
   SELECT CASE WHEN account_status='active' THEN role ELSE 'pending'::public.fa_user_role END FROM public.fa_profiles WHERE id=p_id $$;
 GRANT USAGE ON SCHEMA auth,fa_private,storage TO anon,authenticated,service_role;
 GRANT EXECUTE ON FUNCTION auth.uid(),fa_private.get_user_role(uuid) TO anon,authenticated,service_role;
 GRANT ALL ON ALL TABLES IN SCHEMA public,storage TO service_role;`)
 for(const file of ['fra_action_persistence.sql','fra_historical_pdf_import.sql','fra_confirmed_publication_actions.sql',
   'fra_client_roles.sql','fra_client_hierarchy.sql','fra_action_workflow.sql']) {
   await db.exec(await readFile(new URL(file,root),'utf8'))
 }

 const ids = { kss:'11111111-1111-4111-8111-111111111111', manager:'22222222-2222-4222-8222-222222222222', client:'33333333-3333-4333-8333-333333333333', outsider:'44444444-4444-4444-8444-444444444444', candidate:'55555555-5555-4555-8555-555555555555', area2Manager:'66666666-6666-4666-8666-666666666666', legacyClient:'77777777-7777-4777-8777-777777777777', pending:'88888888-1111-4111-8111-888888888888', kssOps:'99999999-1111-4111-8111-999999999999', store1:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', store2:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', clientId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc', region:'dddddddd-dddd-4ddd-8ddd-dddddddddddd', area1:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', area2:'ffffffff-ffff-4fff-8fff-ffffffffffff', action1:'11111111-aaaa-4aaa-8aaa-111111111111', action2:'22222222-bbbb-4bbb-8bbb-222222222222', instance:'99999999-9999-4999-8999-999999999999', publication:'88888888-8888-4888-8888-888888888888' };
 await db.query(`INSERT INTO fa_profiles(id,role,account_status) VALUES ($1,'admin','active'),($2,'area_manager','active'),($3,'client_admin','active'),($4,'area_manager','active')`,[ids.kss,ids.manager,ids.client,ids.outsider]);
 await db.query("INSERT INTO fa_profiles(id,role,account_status) VALUES ($1,'readonly','active')",[ids.candidate]);
 await db.query(`INSERT INTO fa_profiles(id,role,account_status) VALUES
   ($1,'area_manager','active'),($2,'client','active'),($3,'pending','active'),($4,'ops','active')`,
   [ids.area2Manager,ids.legacyClient,ids.pending,ids.kssOps]);
 await assert.rejects(() => db.query("UPDATE fa_profiles SET role='area_manager' WHERE id=$1",[ids.candidate]),/Active client membership required/);
 await db.query(`INSERT INTO fa_stores(id,store_code,store_name,reporting_area_manager_name) VALUES ($1,'S1','Store One','Manager One'),($2,'S2','Store Two','Manager Two')`,[ids.store1,ids.store2]);
 await db.query(`INSERT INTO fa_clients(id,name) VALUES ($1,'Footasylum')`,[ids.clientId]);
 await db.query(`INSERT INTO fa_client_management_regions(id,client_id,name) VALUES ($1,$2,'North')`,[ids.region,ids.clientId]);
 await db.query(`INSERT INTO fa_client_areas(id,client_id,management_region_id,name) VALUES ($1,$2,$3,'AREA1'),($4,$2,$3,'AREA2')`,[ids.area1,ids.clientId,ids.region,ids.area2]);
 await db.query(`INSERT INTO fa_client_store_memberships(store_id,client_id,area_id,manager_visible) VALUES ($1,$3,$4,true),($2,$3,$5,false)`,[ids.store1,ids.store2,ids.clientId,ids.area1,ids.area2]);
 await db.query(`INSERT INTO fa_client_memberships(user_id,client_id,access_level,is_active) VALUES
   ($1,$3,'area_manager',true),($2,$3,'client_admin',true),($4,$3,'area_manager',true),
   ($5,$3,'client_admin',true),($6,$3,'client_admin',true)`,[ids.manager,ids.client,ids.clientId,ids.area2Manager,ids.legacyClient,ids.pending]);
 await db.query(`INSERT INTO fa_client_area_assignments(user_id,client_id,area_id) VALUES ($1,$2,$3),($4,$2,$5)`,[ids.manager,ids.clientId,ids.area1,ids.area2Manager,ids.area2]);
 await db.query(`INSERT INTO fa_audit_instances(id,store_id) VALUES ($1,$2)`,[ids.instance,ids.store1]);
 await db.query(`INSERT INTO fa_fra_publications(id,instance_id,store_id,pdf_path,pdf_sha256,confirmed_at) VALUES ($1,$2,$3,'fra/a.pdf',$4,now())`,[ids.publication,ids.instance,ids.store1,'c'.repeat(64)]);
 await db.exec(`ALTER TABLE fa_fra_actions DISABLE TRIGGER USER`);
 await db.query(`INSERT INTO fa_fra_actions(id,store_id,source_origin,source_key,publication_action_snapshot,assessment_instance_id,publication_id,pdf_path,pdf_sha256,pdf_page,pdf_row_ordinal,recommendation,priority,created_by) VALUES
 ($1,$3,'confirmed_publication',$5,'{}'::jsonb,$7,$8,'fra/a.pdf',$9,2,1,'Repair fire door','High',$10),
 ($2,$4,'confirmed_publication',$6,'{}'::jsonb,$7,$8,'fra/b.pdf',$9,3,1,'Clear gangway','Medium',$10)`,[ids.action1,ids.action2,ids.store1,ids.store2,'a'.repeat(64),'b'.repeat(64),ids.instance,ids.publication,'c'.repeat(64),ids.kss]);
 await db.exec(`ALTER TABLE fa_fra_actions ENABLE TRIGGER USER`);
 await db.query(`INSERT INTO fa_fra_action_events(action_id,event_type,actor_id,resulting_version,payload)
   VALUES($1,'publication_action_created',$2,1,'{}'::jsonb)`,[ids.action1,ids.kss]);
 async function asUser(user,sql,params=[]) { await db.exec('BEGIN; SET LOCAL ROLE authenticated;'); try { await db.query(`SELECT set_config('request.jwt.claim.sub',$1,true)`,[user]); const r=await db.query(sql,params); await db.exec('COMMIT'); return r.rows } catch(e){ await db.exec('ROLLBACK'); throw e } }
 async function asAnon(sql) { await db.exec('BEGIN; SET LOCAL ROLE anon;'); try { const r=await db.query(sql); await db.exec('COMMIT'); return r.rows } catch(e){ await db.exec('ROLLBACK'); throw e } }
 const idsFrom = async (user,table,column='id') => (await asUser(user,`SELECT ${column} FROM ${table} ORDER BY ${column}`)).map(row=>row[column]);
 const board='fa_client_fra_action_board', directory='fa_client_store_directory';
 // Direct SQL/RLS matrix: client views are scoped; internal action rows are KSS-only.
 const scopedCases = [
   [ids.client,[ids.action1,ids.action2],[ids.store1,ids.store2]],
   [ids.manager,[ids.action1],[ids.store1]],
   [ids.area2Manager,[],[]], // Assigned AREA2 store is archived/manager_hidden.
   [ids.outsider,[],[]], [ids.legacyClient,[],[]], [ids.pending,[],[]],
   [ids.kss,[],[]], [ids.kssOps,[],[]], [ids.candidate,[],[]],
 ];
 for(const [user,actions,stores] of scopedCases) {
   assert.deepEqual(await idsFrom(user,board),actions,`board scope for ${user}`);
   assert.deepEqual(await idsFrom(user,directory),stores,`directory scope for ${user}`);
 }
 for(const user of [ids.kss,ids.kssOps,ids.candidate]) {
   assert.deepEqual(await idsFrom(user,'fa_fra_actions'),[ids.action1,ids.action2],`KSS action read for ${user}`);
   assert.deepEqual((await asUser(user,'SELECT action_id FROM fa_fra_action_events')).map(row=>row.action_id),[ids.action1]);
 }
 for(const user of [ids.client,ids.manager,ids.area2Manager,ids.outsider,ids.legacyClient,ids.pending]) {
   assert.deepEqual(await idsFrom(user,'fa_fra_actions'),[],`raw action denied for ${user}`);
   assert.deepEqual(await idsFrom(user,'fa_fra_action_events'),[],`raw event denied for ${user}`);
   await assert.rejects(()=>asUser(user,'SELECT pdf_path FROM fa_client_fra_action_board'),/column .*pdf_path.* does not exist/i);
   await assert.rejects(()=>asUser(user,'SELECT * FROM fa_stores'),/permission denied/i);
 }
 const expectedBoardColumns=['created_at','id','pdf_page','priority','recommendation','source_origin','status','store_id','version'];
 assert.deepEqual((await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='fa_client_fra_action_board' ORDER BY column_name")).rows.map(row=>row.column_name),expectedBoardColumns);
 assert.deepEqual((await asUser(ids.client,'SELECT store_id FROM fa_client_store_memberships ORDER BY store_id')).map(row=>row.store_id),[ids.store1,ids.store2]);
 assert.deepEqual((await asUser(ids.manager,'SELECT store_id FROM fa_client_store_memberships ORDER BY store_id')).map(row=>row.store_id),[ids.store1]);
 assert.deepEqual((await asUser(ids.area2Manager,'SELECT store_id FROM fa_client_store_memberships ORDER BY store_id')).map(row=>row.store_id),[]);
 assert.deepEqual((await asUser(ids.manager,'SELECT area_id FROM fa_client_area_assignments')).map(row=>row.area_id),[ids.area1]);
 assert.deepEqual((await asUser(ids.area2Manager,'SELECT area_id FROM fa_client_area_assignments')).map(row=>row.area_id),[ids.area2]);
 for(const user of [ids.outsider,ids.legacyClient,ids.pending,ids.kss]) {
   assert.deepEqual(await asUser(user,'SELECT user_id FROM fa_client_memberships'),[]);
   assert.deepEqual(await asUser(user,'SELECT area_id FROM fa_client_area_assignments'),[]);
   assert.deepEqual(await asUser(user,'SELECT store_id FROM fa_client_store_memberships'),[]);
 }
 await assert.rejects(()=>asAnon('SELECT id FROM fa_client_fra_action_board'),/permission denied/i);
 await assert.rejects(()=>asAnon('SELECT id FROM fa_fra_actions'),/permission denied/i);
 await db.query('UPDATE fa_client_store_memberships SET manager_visible=true WHERE store_id=$1',[ids.store2]);
 assert.deepEqual(await idsFrom(ids.area2Manager,board),[ids.action2]);
 assert.deepEqual(await idsFrom(ids.manager,board),[ids.action1]);
 await db.query('UPDATE fa_client_store_memberships SET manager_visible=false WHERE store_id=$1',[ids.store2]);
 for(const user of [ids.client,ids.manager,ids.area2Manager,ids.legacyClient,ids.pending]) {
   await assert.rejects(()=>asUser(user,"UPDATE fa_fra_actions SET status='verified_closed' WHERE id=$1",[ids.action1]),/permission denied/i);
   await assert.rejects(()=>asUser(user,'UPDATE fa_client_memberships SET is_active=false WHERE user_id=$1',[ids.manager]),/permission denied/i);
   await assert.rejects(()=>asUser(user,'INSERT INTO fa_fra_action_events(action_id,event_type,actor_id,resulting_version,payload) VALUES($1,\'acknowledged\',$2,2,\'{}\'::jsonb)',[ids.action1,user]),/permission denied/i);
   await assert.rejects(()=>asUser(user,'SELECT * FROM fa_fra_acknowledge_action($1,$2,1)',[user,ids.action1]),/permission denied/i);
 }
 assert.deepEqual((await asUser(ids.manager,'SELECT id FROM fa_client_fra_action_board ORDER BY id')).map(x=>x.id),[ids.action1]);
 assert.deepEqual((await asUser(ids.client,'SELECT id FROM fa_client_fra_action_board ORDER BY id')).map(x=>x.id),[ids.action1,ids.action2]);
 assert.deepEqual(await asUser(ids.outsider,'SELECT id FROM fa_client_fra_action_board ORDER BY id'),[]);
 await assert.rejects(() => asUser(ids.manager,'SELECT pdf_path FROM fa_client_fra_action_board'),/column .*pdf_path.* does not exist/i);
 assert.deepEqual((await asUser(ids.manager,'SELECT id FROM fa_client_store_directory ORDER BY id')).map(x=>x.id),[ids.store1]);
 assert.deepEqual((await asUser(ids.client,'SELECT id FROM fa_client_store_directory ORDER BY id')).map(x=>x.id),[ids.store1,ids.store2]);
 assert.deepEqual((await asUser(ids.manager,'SELECT store_id FROM fa_client_store_memberships ORDER BY store_id')).map(x=>x.store_id),[ids.store1]);
 assert.deepEqual((await asUser(ids.manager,'SELECT area_id FROM fa_client_area_assignments')).map(x=>x.area_id),[ids.area1]);
 assert.deepEqual(await asUser(ids.manager,'SELECT id FROM fa_fra_actions'),[]);
 async function service(sql,params=[]) { await db.exec('BEGIN; SET LOCAL ROLE service_role;'); try { const r=await db.query(sql,params); await db.exec('COMMIT'); return r.rows } catch(e){ await db.exec('ROLLBACK'); throw e } }
 assert.deepEqual(await service('SELECT * FROM fa_fra_acknowledge_action($1,$2,1)',[ids.manager,ids.action1]),[{status:'acknowledged',version:2}]);
 assert.deepEqual(await service(`SELECT * FROM fa_fra_set_action_approach($1,$2,2,'make_safe',NULL,NULL,'Door released and checked')`,[ids.manager,ids.action1]),[{status:'work_completed',version:3}]);
 const path = ids.action1 + '/12345678-1234-4234-8234-123456789abc.pdf';
 await db.query(`INSERT INTO storage.objects(bucket_id,name) VALUES ('fa-fra-action-evidence',$1)`,[path]);
 assert.deepEqual(await service('SELECT * FROM fa_fra_submit_action_evidence($1,$2,3,$3,$4)',[ids.manager,ids.action1,path,'Photograph attached']),[{status:'awaiting_verification',version:4}]);
 for(const user of [ids.kss,ids.kssOps]) {
   assert.deepEqual((await asUser(user,'SELECT action_id FROM fa_fra_action_evidence')).map(row=>row.action_id),[ids.action1]);
 }
 for(const user of [ids.client,ids.manager,ids.area2Manager,ids.legacyClient,ids.pending,ids.outsider]) {
   assert.deepEqual(await asUser(user,'SELECT action_id FROM fa_fra_action_evidence'),[]);
 }
 await assert.rejects(()=>asAnon('SELECT action_id FROM fa_fra_action_evidence'),/permission denied/i);
 await assert.rejects(() => service('SELECT * FROM fa_fra_verify_close_action($1,$2,4,$3)',[ids.client,ids.action1,'Looks good']),/Active KSS admin or ops verifier required/);
 assert.deepEqual(await service('SELECT * FROM fa_fra_verify_close_action($1,$2,4,$3)',[ids.kss,ids.action1,'Evidence checked']),[{status:'verified_closed',version:5}]);
 await assert.rejects(() => service('SELECT * FROM fa_fra_acknowledge_action($1,$2,1)',[ids.manager,ids.action1]),/changed; reload/);
 await assert.rejects(() => service('SELECT * FROM fa_fra_acknowledge_action($1,$2,1)',[ids.manager,ids.action2]),/not assigned to this store/);
 await db.query("UPDATE fa_profiles SET account_status='suspended' WHERE id=$1",[ids.manager]);
 assert.deepEqual(await asUser(ids.manager,'SELECT id FROM fa_client_fra_action_board'),[]);
 assert.deepEqual(await asUser(ids.manager,'SELECT store_id FROM fa_client_store_memberships'),[]);
 assert.deepEqual(await asUser(ids.manager,'SELECT area_id FROM fa_client_area_assignments'),[]);
 await assert.rejects(() => service('SELECT * FROM fa_fra_acknowledge_action($1,$2,1)',[ids.manager,ids.action2]),/not assigned to this store/);
 await db.query("UPDATE fa_profiles SET account_status='active' WHERE id=$1",[ids.manager]);
 await db.query('UPDATE fa_client_memberships SET is_active=false WHERE user_id=$1',[ids.manager]);
 assert.deepEqual(await asUser(ids.manager,'SELECT store_id FROM fa_client_store_memberships'),[]);
 assert.deepEqual(await asUser(ids.manager,'SELECT area_id FROM fa_client_area_assignments'),[]);
 assert.deepEqual(await asUser(ids.manager,'SELECT id FROM fa_client_fra_action_board'),[]);

 console.log('FRA scoped access and workflow PGlite checks passed')
} finally { await db.close() }
