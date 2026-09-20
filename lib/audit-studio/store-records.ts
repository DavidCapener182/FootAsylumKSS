import 'server-only';
import {createClient} from '@/lib/supabase/server';
import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { bundle, StudioError, readStored, uuid } from './server';
import type { PreviousAction } from './types';

export async function previousStoreActions(id: string): Promise<PreviousAction[]> {
 const b = await bundle(id), client = createAdminSupabaseClient();
 const {data: actions,error} = await client.from('fa_store_actions').select('id,title,description,status,source_audit_date,source_pdf_path,created_at')
  .eq('store_id',b.audit.store_id).order('created_at',{ascending:false}).limit(200);
 if(error) throw new StudioError('Previous store actions could not be loaded.',503);
 const result: PreviousAction[] = (actions||[]).filter(a => (a.source_audit_date || a.created_at.slice(0,10)) <= b.audit.document.site.visitDate)
  .map(a => ({id:`hs:${a.id}`,kind:'H&S',title:a.title,detail:a.description||'',date:a.source_audit_date||a.created_at.slice(0,10),status:a.status,reportPath:a.source_pdf_path||undefined}));
 const fra = await client.from('fa_fra_publications').select('instance_id,pdf_path,confirmed_at').eq('store_id',b.audit.store_id)
  .not('confirmed_at','is',null).lt('confirmed_at',`${b.audit.document.site.visitDate}T23:59:59.999Z`).order('confirmed_at',{ascending:false}).limit(1).maybeSingle();
 if(fra.error) throw new StudioError('Previous FRA actions could not be loaded.',503);
 if(fra.data) {
  const {mapHSAuditToFRAData} = await import('@/app/actions/fra-reports');
  const data = await mapHSAuditToFRAData(fra.data.instance_id, {supabase:client as any,userId:b.audit.created_by});
  for(const item of data.actionPlanItems || []) {
   const title=String(item.recommendation || '').trim();
   if(!title) continue;
   result.push({id:`fra:${fra.data.instance_id}:${createHash('sha256').update(title).digest('hex').slice(0,16)}`,kind:'FRA',title,detail:item.dueNote||'',date:fra.data.confirmed_at!.slice(0,10),status:item.priority,reportPath:fra.data.pdf_path});
  }
 }
 return result;
}

export async function publishToStore(id: string, value: unknown, user: {id:string}) {
 const input = value as {storeId?:unknown};
 const storeId = uuid.parse(input?.storeId);
 const b = await bundle(id);
 if(b.audit.store_id !== storeId || b.audit.status !== 'completed' || b.audit.document.purpose !== 'store' || !b.audit.pdf_path || !b.audit.pdf_sha256)
  throw new StudioError('Complete a store audit before saving it to this store.',409);
 const client=createAdminSupabaseClient();
 const bytes=await readStored(b.audit.pdf_path);
 if(createHash('sha256').update(bytes).digest('hex')!==b.audit.pdf_sha256) throw new StudioError('The saved PDF did not pass its integrity check.',503);
 const target=`store/${storeId}/audit-studio-${id}.pdf`;
 // Stable content-addressed audit identity makes retries safe; never overwrite a report.
 const storage=client.storage.from('fa-attachments');
 const old=await storage.download(target);
 if(old.data) {
  if(createHash('sha256').update(Buffer.from(await old.data.arrayBuffer())).digest('hex')!==b.audit.pdf_sha256) throw new StudioError('A different report already uses this audit reference.',409);
 } else {
  const uploaded=await storage.upload(target,bytes,{contentType:'application/pdf',upsert:false});
  if(uploaded.error) {
   const retry=await storage.download(target);
   if(!retry.data || createHash('sha256').update(Buffer.from(await retry.data.arrayBuffer())).digest('hex')!==b.audit.pdf_sha256) throw new StudioError('The report could not be saved to the store.',503);
  }
 }
 const check=await storage.download(target);
 if(!check.data || createHash('sha256').update(Buffer.from(await check.data.arrayBuffer())).digest('hex')!==b.audit.pdf_sha256) throw new StudioError('The store PDF could not be verified.',503);
 const {error}=await createClient().rpc('fa_publish_studio_audit',{p_audit:id,p_store:storeId,p_user:user.id,p_path:target,p_hash:b.audit.pdf_sha256});
 if(error) {
  const allowed=['A newer store audit already exists','Three visits already recorded this year; create a linked revision for a correction','Revise the latest published report'];
  throw new StudioError(allowed.find(m=>error.message.includes(m))||'The store record was not updated. Retry or contact an administrator.',409);
 }
 for(const p of ['/audit-tracker','/dashboard','/actions',`/stores/${storeId}`]) revalidatePath(p);
 return bundle(id);
}
