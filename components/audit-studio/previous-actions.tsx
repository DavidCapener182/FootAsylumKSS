'use client';
import {useState} from 'react';
import type {AuditDocument, PreviousAction, PreviousActionReview} from '@/lib/audit-studio/types';

export function PreviousActions({auditId,document,disabled,onChange}:{auditId:string;document:AuditDocument;disabled:boolean;onChange:(reviews:PreviousActionReview[])=>void}) {
 const [available,setAvailable]=useState<PreviousAction[]>([]),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState('');
 const selected=document.previousActionReviews || [];
 const load=async()=>{setBusy(true);setError('');try{
  const r=await fetch(`/api/audit-studio/audits/${auditId}/previous-actions`,{cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error||'Could not load actions');setAvailable(data);setLoaded(true);
 }catch(e){setError(e instanceof Error?e.message:'Could not load actions');}finally{setBusy(false);}};
 return <div className="my-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
  <div className="flex flex-wrap items-center justify-between gap-3"><h4 className="font-semibold">Previous H&amp;S and FRA actions</h4>{!disabled&&<button type="button" onClick={load} disabled={busy} className="rounded-lg border bg-white px-3 py-2 text-sm font-medium">{busy?'Loading…':'Load store actions'}</button>}</div>
  <p className="mt-2 text-xs text-slate-600">Choose the actions to revisit. Check archived reports too if their actions have not been linked here.</p>
  {error&&<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  {loaded&&available.length===0&&<p className="mt-3 text-sm">No linked actions were found. Check the previous reports before recording your answer.</p>}
  {available.filter(a=>!selected.some(s=>s.id===a.id)).map(a=><label key={a.id} className="mt-3 flex items-start gap-3 rounded-lg border bg-white p-3 text-sm"><input type="checkbox" className="mt-1 h-4 w-4" disabled={disabled} onChange={()=>onChange([...selected,{...a,outcome:null,note:''}])}/><span><strong>{a.kind} · {a.date}</strong><br/>{a.title}<br/><span className="text-slate-500">{a.status}</span></span></label>)}
  {selected.map(a=><fieldset key={a.id} className="mt-4 rounded-lg border bg-white p-3"><legend className="px-1 text-sm font-semibold">{a.kind} · {a.date}</legend><p className="text-sm font-medium">{a.title}</p>{a.detail&&a.detail!==a.title&&<p className="mt-1 whitespace-pre-line text-sm text-slate-600">{a.detail}</p>}
   <div className="my-3 flex flex-wrap gap-3">{([['improved','Improved / still effective'],['not-improved','Not improved'],['not-applicable','Not applicable']] as const).map(([value,label])=><label key={value} className="flex items-center gap-2 text-sm"><input type="radio" name={`review-${a.id}`} disabled={disabled} checked={a.outcome===value} onChange={()=>onChange(selected.map(r=>r.id===a.id?{...r,outcome:value}:r))}/>{label}</label>)}</div>
   <label className="text-sm font-medium">What did you check and find?<textarea disabled={disabled} className="mt-1 w-full rounded-lg border p-3 font-normal" rows={2} value={a.note} onChange={e=>onChange(selected.map(r=>r.id===a.id?{...r,note:e.target.value}:r))}/></label>
   {!disabled&&<button type="button" className="mt-2 text-xs text-slate-600 underline" onClick={()=>onChange(selected.filter(r=>r.id!==a.id))}>Remove from this visit’s sample</button>}
  </fieldset>)}
 </div>;
}
