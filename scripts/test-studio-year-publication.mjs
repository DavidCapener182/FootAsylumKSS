// Isolated PostgreSQL: exercises the exact deployed publication function, no live writes.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db = new PGlite();
const actor='11111111-1111-4111-8111-111111111111', store='22222222-2222-4222-8222-222222222222';
await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
create table auth.users(id uuid primary key); insert into auth.users values('${actor}');
create function auth.uid() returns uuid language sql as $$select '${actor}'::uuid$$;
create table fa_profiles(id uuid, role text,account_status text); insert into fa_profiles values('${actor}','admin','active');
create table fa_stores(id uuid primary key,is_active boolean,total_audits_to_date int,updated_at timestamptz,
${[1,2,3].map(n=>`compliance_audit_${n}_date date,compliance_audit_${n}_overall_pct numeric,compliance_audit_${n}_pdf_path text,action_plan_${n}_sent boolean`).join(',')},
compliance_audit_2_planned_date date,compliance_audit_2_assigned_manager_user_id uuid,
fire_risk_assessment_date date,fire_risk_assessment_pct numeric,fire_risk_assessment_pdf_path text);
create table fa_audit_studio_audits(id uuid primary key,store_id uuid,status text,document jsonb,result jsonb,pdf_path text,pdf_sha256 text,parent_id uuid,template_version text);
create table fa_audit_studio_templates(version text,definition jsonb);
create table fa_audit_studio_findings(audit_id uuid,question_id text,note text,action jsonb);
create table fa_store_actions(store_id uuid,title text,description text,priority text,status text,created_by_user_id uuid,due_date date,source_audit_date date,source_audit_number int,source_pdf_path text,source_finding_key text,ai_generated boolean);
insert into fa_stores(id,is_active,total_audits_to_date,compliance_audit_1_date,compliance_audit_1_overall_pct,compliance_audit_1_pdf_path,compliance_audit_2_date,compliance_audit_2_overall_pct,compliance_audit_2_pdf_path) values('${store}',true,2,'2026-01-22',90,'2026-first.pdf','2026-09-17',92,'2026-second.pdf');`);
await db.exec(readFileSync('supabase/migrations/20260920020230_audit_studio_store_publication_history.sql','utf8'));
await db.exec(readFileSync('supabase/migrations/20260920021630_audit_studio_publication_numbering_fix.sql','utf8'));
async function publish(i,date,expectedYear,expectedRound) {
 const id=`33333333-3333-4333-8333-${String(i).padStart(12,'0')}`, path=`store/${store}/audit-studio-${id}.pdf`;
 await db.query("insert into fa_audit_studio_audits(id,store_id,status,document,result,pdf_path,pdf_sha256) values($1,$2,'completed',$3,$4,'studio.pdf','hash')",[id,store,JSON.stringify({purpose:'store',site:{visitDate:date}}),JSON.stringify({percentage:95})]);
 const args=[id,store,actor,path,'hash'];
 const first=await db.query('select * from fa_publish_studio_audit($1,$2,$3,$4,$5)',args);
 assert.equal(first.rows[0].audit_year,expectedYear); assert.equal(first.rows[0].audit_number,expectedRound);
 await db.query('select * from fa_publish_studio_audit($1,$2,$3,$4,$5)',args);
 assert.equal((await db.query('select count(*)::int as n from fa_audit_studio_publications where audit_id=$1',[id])).rows[0].n,1);
 const row=(await db.query('select * from fa_stores where id=$1',[store])).rows[0];
 assert.equal(Number(row[`compliance_audit_${expectedRound}_overall_pct`]),95);
 assert.equal(row[`compliance_audit_${expectedRound}_pdf_path`],path);
 if(expectedRound===1) assert.equal(row.compliance_audit_2_date,null);
}
await publish(1,'2027-01-20',2027,1); // displayed Audit 3
await publish(2,'2027-08-20',2027,2); // displayed Audit 4
await publish(3,'2028-01-20',2028,1); // displayed Audit 5
const history=(await db.query("select audit_year,audit_number from fa_store_audit_history where kind='H&S' order by audit_year,audit_number")).rows;
assert.deepEqual(history.map(r=>[r.audit_year,r.audit_number]),[[2026,1],[2026,2],[2027,1],[2027,2],[2028,1]]);
assert.equal((await db.query('select total_audits_to_date from fa_stores')).rows[0].total_audits_to_date,5);
console.log('PASS: 2027 first/second and 2028 first publication, score/PDF, retained 2026/2027 history, retry deduplication and total count.');
await db.close();
