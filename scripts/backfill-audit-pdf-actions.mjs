import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import nextEnv from '@next/env'
import { parsePdfFlaggedItems,auditDateFromCover,coverMatchesStore,sixMonthsAfter,pdfFindingActionRow } from '../lib/audit/pdf-flagged-items.ts'
import {matchCanonicalStoreActionQuestion} from '../lib/store-action-titles.ts'
nextEnv.loadEnvConfig(process.cwd())
const root='output/audit-pdf-actions-2026-09-06', apply=process.argv.includes('--apply')
const actor='091f7f25-9edb-4120-8d50-cfa4070f1352'
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false},global:{fetch:(url,opts)=>fetch(url,{...opts,signal:AbortSignal.timeout(60000)})}})
if(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname!=='fwnzpafwfaiynrclwtnh.supabase.co') throw Error('Wrong project')
const inventory=JSON.parse(fs.readFileSync(root+'/inventory.json'))
const {data:stores,error:se}=await db.from('fa_stores').select('id,store_name,store_code,postcode,compliance_audit_1_pdf_path,compliance_audit_2_pdf_path,compliance_audit_1_date,compliance_audit_2_date')
if(se)throw se
const {data:existing,error:ae}=await db.from('fa_store_actions').select('*');if(ae)throw ae
const byStore=new Map(stores.map(s=>[s.id,s]))
const normal=s=>(matchCanonicalStoreActionQuestion(s,s)||s).replace(/[^a-z0-9]/gi,'').toLowerCase()
const key=r=>`${r.store_id}|${r.source_audit_date}|${r.source_finding_key}`
const existingKeys=new Set(existing.filter(x=>x.source_finding_key).map(key)), claimed=new Set()
const manifest={createdAt:new Date().toISOString(),apply,insert:[],link:[],skipped:[],review:[],receipts:[]}
for(const job of inventory.filter(job => job.auditNumber === 2)){
 try{
  const store=byStore.get(job.storeId)
  if(!store || store[`compliance_audit_${job.auditNumber}_pdf_path`]!==job.path)throw Error('Linked PDF changed')
  if(job.error)throw Error(job.error)
  const {cover,findings}=parsePdfFlaggedItems(JSON.parse(fs.readFileSync(job.cache)))
  const auditDate=auditDateFromCover(cover)
  if(!coverMatchesStore(cover,store.store_name,store.store_code,store.postcode))throw Error('PDF identity does not match the store; needs manual reconciliation')
  const other=job.auditNumber===1?2:1
  if(store[`compliance_audit_${other}_date`]===auditDate && store[`compliance_audit_${job.auditNumber}_date`]!==auditDate)throw Error('PDF date belongs to the other audit slot')
  const receipt={store_id:job.storeId,audit_number:job.auditNumber,pdf_path:job.path,audit_date:auditDate,status:'imported',finding_count:findings.length,error:null,created_by_user_id:actor}
  for(const finding of findings){
   const row=pdfFindingActionRow(finding,{storeId:job.storeId,auditNumber:job.auditNumber,auditDate,filePath:job.path,userId:actor,activeUntil:sixMonthsAfter(auditDate)})
   if(existingKeys.has(key(row))){manifest.skipped.push({store:job.storeName,key:key(row)});continue}
   const candidates=existing.filter(e=>e.store_id===job.storeId && !e.source_finding_key && !claimed.has(e.id) && normal(e.title)===normal(finding.question)).filter(e=>{
    const observedDate=e.created_at.slice(0,10)
    const previousDates=inventory.filter(j=>j.storeId===job.storeId&&j.auditDate&&j.auditDate<=observedDate).map(j=>j.auditDate).sort()
    const context=finding.observation.replace(/\s+/g,' ').trim()
    return observedDate >= auditDate && (previousDates.at(-1)===job.auditDate || Boolean(context.length>30 && String(e.source_flagged_item).includes(context)))
   })
   if(candidates.length>=1){
    candidates.sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id))
    const original=candidates[0];claimed.add(original.id)
    manifest.link.push({id:original.id,store:job.storeName,before:original,patch:{source_audit_date:row.source_audit_date,source_audit_number:row.source_audit_number,source_pdf_path:row.source_pdf_path,source_page:row.source_page,source_finding_key:row.source_finding_key,active_until:row.active_until,...(job.auditNumber===1 && !['complete','cancelled'].includes(original.status)?{status:'complete',completed_at:new Date().toISOString(),completion_notes:'First-audit action completed and archived at David Capener’s request on 6 September 2026.'}:{})}})
   }else{
    if(job.auditNumber===1){row.status='complete';row.completed_at=new Date().toISOString();row.completion_notes='First-audit finding imported into completed history at David Capener’s request on 6 September 2026.'}
    manifest.insert.push({store:job.storeName,row})
   }
   existingKeys.add(key(row))
  }
  manifest.receipts.push(receipt)
 }catch(e){manifest.review.push({...job,reason:e.message});manifest.receipts.push({store_id:job.storeId,audit_number:job.auditNumber,pdf_path:job.path,status:'needs_review',finding_count:0,error:e.message,created_by_user_id:actor})}
}
fs.writeFileSync(root+(apply?'/apply-manifest.json':'/dry-run.json'),JSON.stringify(manifest,null,2))
console.log(JSON.stringify({apply,insert:manifest.insert.length,link:manifest.link.length,skipped:manifest.skipped.length,firstAuditCompleted:manifest.insert.filter(x=>x.row.status==='complete').length,currentSecondAudit:manifest.insert.filter(x=>x.row.status==='open'&&x.row.active_until>new Date().toISOString().slice(0,10)).length,review:manifest.review.map(r=>({store:r.storeName,audit:r.auditNumber,reason:r.reason}))},null,2))
if(apply){
 const results=[]
 for(const item of manifest.link){const {data,error}=await db.from('fa_store_actions').update(item.patch).eq('id',item.id).eq('updated_at',item.before.updated_at).is('source_finding_key',null).select('id');if(error||data.length!==1)throw Error(error?.message||'Existing action changed; stopping');results.push({operation:'link',id:item.id});fs.writeFileSync(root+'/applied.json',JSON.stringify(results,null,2))}
 for(let i=0;i<manifest.insert.length;i+=40){const {data,error}=await db.from('fa_store_actions').insert(manifest.insert.slice(i,i+40).map(x=>x.row)).select('id,store_id,source_audit_date,source_finding_key');if(error)throw error;results.push(...data.map(row=>({operation:'insert',...row})));fs.writeFileSync(root+'/applied.json',JSON.stringify(results,null,2))}
 const {error}=await db.from('fa_audit_pdf_imports').upsert(manifest.receipts,{onConflict:'store_id,pdf_path'});if(error)throw error
 console.log('Applied',results.length,'action links/inserts and',manifest.receipts.length,'import receipts')
}
