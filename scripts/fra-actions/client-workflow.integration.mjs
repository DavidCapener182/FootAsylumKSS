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

 const ids = { kss:'11111111-1111-4111-8111-111111111111', manager:'22222222-2222-4222-8222-222222222222', client:'33333333-3333-4333-8333-333333333333', outsider:'44444444-4444-4444-8444-444444444444', candidate:'55555555-5555-4555-8555-555555555555', store1:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', store2:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', clientId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc', region:'dddddddd-dddd-4ddd-8ddd-dddddddddddd', area1:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', area2:'ffffffff-ffff-4fff-8fff-ffffffffffff', action1:'11111111-aaaa-4aaa-8aaa-111111111111', action2:'22222222-bbbb-4bbb-8bbb-222222222222', instance:'99999999-9999-4999-8999-999999999999', publication:'88888888-8888-4888-8888-888888888888' };
 await db.query(`INSERT INTO fa_profiles(id,role,account_status) VALUES ($1,'admin','active'),($2,'area_manager','active'),($3,'client_admin','active'),($4,'area_manager','active')`,[ids.kss,ids.manager,ids.client,ids.outsider]);
 await db.query("INSERT INTO fa_profiles(id,role,account_status) VALUES ($1,'readonly','active')",[ids.candidate]);
 await assert.rejects(() => db.query("UPDATE fa_profiles SET role='area_manager' WHERE id=$1",[ids.candidate]),/Active client membership required/);
 await db.query(`INSERT INTO fa_stores(id,store_code,store_name,reporting_area_manager_name) VALUES ($1,'S1','Store One','Manager One'),($2,'S2','Store Two','Manager Two')`,[ids.store1,ids.store2]);
 await db.query(`INSERT INTO fa_clients(id,name) VALUES ($1,'Footasylum')`,[ids.clientId]);
 await db.query(`INSERT INTO fa_client_management_regions(id,client_id,name) VALUES ($1,$2,'North')`,[ids.region,ids.clientId]);
 await db.query(`INSERT INTO fa_client_areas(id,client_id,management_region_id,name) VALUES ($1,$2,$3,'AREA1'),($4,$2,$3,'AREA2')`,[ids.area1,ids.clientId,ids.region,ids.area2]);
 await db.query(`INSERT INTO fa_client_store_memberships(store_id,client_id,area_id,manager_visible) VALUES ($1,$3,$4,true),($2,$3,$5,false)`,[ids.store1,ids.store2,ids.clientId,ids.area1,ids.area2]);
 await db.query(`INSERT INTO fa_client_memberships(user_id,client_id,access_level,is_active) VALUES ($1,$3,'area_manager',true),($2,$3,'client_admin',true)`,[ids.manager,ids.client,ids.clientId]);
 await db.query(`INSERT INTO fa_client_area_assignments(user_id,client_id,area_id) VALUES ($1,$2,$3)`,[ids.manager,ids.clientId,ids.area1]);
 await db.query(`INSERT INTO fa_audit_instances(id,store_id) VALUES ($1,$2)`,[ids.instance,ids.store1]);
 await db.query(`INSERT INTO fa_fra_publications(id,instance_id,store_id,pdf_path,pdf_sha256,confirmed_at) VALUES ($1,$2,$3,'fra/a.pdf',$4,now())`,[ids.publication,ids.instance,ids.store1,'c'.repeat(64)]);
 await db.exec(`ALTER TABLE fa_fra_actions DISABLE TRIGGER USER`);
 await db.query(`INSERT INTO fa_fra_actions(id,store_id,source_origin,source_key,publication_action_snapshot,assessment_instance_id,publication_id,pdf_path,pdf_sha256,pdf_page,pdf_row_ordinal,recommendation,priority,created_by) VALUES
 ($1,$3,'confirmed_publication',$5,'{}'::jsonb,$7,$8,'fra/a.pdf',$9,2,1,'Repair fire door','High',$10),
 ($2,$4,'confirmed_publication',$6,'{}'::jsonb,$7,$8,'fra/b.pdf',$9,3,1,'Clear gangway','Medium',$10)`,[ids.action1,ids.action2,ids.store1,ids.store2,'a'.repeat(64),'b'.repeat(64),ids.instance,ids.publication,'c'.repeat(64),ids.kss]);
 await db.exec(`ALTER TABLE fa_fra_actions ENABLE TRIGGER USER`);
 async function asUser(user,sql,params=[]) { await db.exec('BEGIN; SET LOCAL ROLE authenticated;'); try { await db.query(`SELECT set_config('request.jwt.claim.sub',$1,true)`,[user]); const r=await db.query(sql,params); await db.exec('COMMIT'); return r.rows } catch(e){ await db.exec('ROLLBACK'); throw e } }
 assert.deepEqual((await asUser(ids.manager,'SELECT id FROM fa_client_fra_action_board ORDER BY id')).map(x=>x.id),[ids.action1]);
 assert.deepEqual((await asUser(ids.client,'SELECT id FROM fa_client_fra_action_board ORDER BY id')).map(x=>x.id),[ids.action1,ids.action2]);
 assert.deepEqual(await asUser(ids.outsider,'SELECT id FROM fa_client_fra_action_board ORDER BY id'),[]);
 await assert.rejects(() => asUser(ids.manager,'SELECT pdf_path FROM fa_client_fra_action_board'),/column .*pdf_path.* does not exist/i);
 assert.deepEqual((await asUser(ids.manager,'SELECT id FROM fa_client_store_directory ORDER BY id')).map(x=>x.id),[ids.store1]);
 assert.deepEqual((await asUser(ids.client,'SELECT id FROM fa_client_store_directory ORDER BY id')).map(x=>x.id),[ids.store1,ids.store2]);
 assert.deepEqual(await asUser(ids.manager,'SELECT id FROM fa_fra_actions'),[]);
 async function service(sql,params=[]) { await db.exec('BEGIN; SET LOCAL ROLE service_role;'); try { const r=await db.query(sql,params); await db.exec('COMMIT'); return r.rows } catch(e){ await db.exec('ROLLBACK'); throw e } }
 assert.deepEqual(await service('SELECT * FROM fa_fra_acknowledge_action($1,$2,1)',[ids.manager,ids.action1]),[{status:'acknowledged',version:2}]);
 assert.deepEqual(await service(`SELECT * FROM fa_fra_set_action_approach($1,$2,2,'make_safe',NULL,NULL,'Door released and checked')`,[ids.manager,ids.action1]),[{status:'work_completed',version:3}]);
 const path = ids.action1 + '/12345678-1234-4234-8234-123456789abc.pdf';
 await db.query(`INSERT INTO storage.objects(bucket_id,name) VALUES ('fa-fra-action-evidence',$1)`,[path]);
 assert.deepEqual(await service('SELECT * FROM fa_fra_submit_action_evidence($1,$2,3,$3,$4)',[ids.manager,ids.action1,path,'Photograph attached']),[{status:'awaiting_verification',version:4}]);
 await assert.rejects(() => service('SELECT * FROM fa_fra_verify_close_action($1,$2,4,$3)',[ids.client,ids.action1,'Looks good']),/Active KSS admin or ops verifier required/);
 assert.deepEqual(await service('SELECT * FROM fa_fra_verify_close_action($1,$2,4,$3)',[ids.kss,ids.action1,'Evidence checked']),[{status:'verified_closed',version:5}]);
 await assert.rejects(() => service('SELECT * FROM fa_fra_acknowledge_action($1,$2,1)',[ids.manager,ids.action1]),/changed; reload/);
 await assert.rejects(() => service('SELECT * FROM fa_fra_acknowledge_action($1,$2,1)',[ids.manager,ids.action2]),/not assigned to this store/);
 await db.query("UPDATE fa_profiles SET account_status='suspended' WHERE id=$1",[ids.manager]);
 assert.deepEqual(await asUser(ids.manager,'SELECT id FROM fa_client_fra_action_board'),[]);
 await assert.rejects(() => service('SELECT * FROM fa_fra_acknowledge_action($1,$2,1)',[ids.manager,ids.action2]),/not assigned to this store/);

 console.log('FRA scoped access and workflow PGlite checks passed')
} finally { await db.close() }
