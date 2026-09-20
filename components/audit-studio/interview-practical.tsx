"use client";
import type { StaffInterviewAnswer } from "@/lib/audit-studio/types";
import { interviewAssessment, newPracticalCheck, practicalDefinition } from "@/lib/audit-studio/interview-practical";
type Practical = NonNullable<StaffInterviewAnswer["practical"]>;
const field = "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 disabled:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700";
export function InterviewPractical({promptId, answer, disabled, onChange}: {
  promptId:string; answer?:StaffInterviewAnswer; disabled:boolean; onChange:(check:Practical)=>void;
}) {
  const definition=practicalDefinition(promptId);
  if (!definition) return null;
  const value=answer?.practical || newPracticalCheck();
  const assessment=interviewAssessment({...answer, asked:answer?.asked || "", reply:answer?.reply || "", outcome:answer?.outcome || "", assessment:null, practical:value},promptId);
  const assessed=definition.criteria.filter(c=>value.checks[c.id]?.result).length;
  const change=(id:string, patch:Partial<Practical["checks"][string]>) => onChange({...value, checks:{...value.checks,[id]:{...(value.checks[id] || {result:null,note:""}),...patch}}});
  return <fieldset className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 sm:p-4">
    <legend className="px-1 text-sm font-semibold">Practical checklist</legend>
    <p className="text-sm leading-6 text-slate-700">{definition.guidance}</p>
    <label className="block text-sm font-semibold">{definition.contextLabel}<input value={value.context} disabled={disabled} className={field} onChange={e=>onChange({...value,context:e.target.value})}/></label>
    <label className="block text-sm font-semibold">{definition.referenceLabel}<textarea rows={2} value={value.reference} disabled={disabled} className={field} onChange={e=>onChange({...value,reference:e.target.value})}/></label>
    <p className="text-xs leading-5 text-slate-600">Tick what they explained or demonstrated correctly. Mark a missed step explicitly. Unticked items remain unassessed; explain every Missed or N/A choice. If you stop for a gap, use Not demonstrated for the remaining steps.</p>
    <div className="space-y-3">{definition.criteria.map(c=>{
      const record=value.checks[c.id];
      return <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-3">
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6">
          <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-emerald-700" disabled={disabled} checked={record?.result === "met"} onChange={e=>change(c.id,{result:e.target.checked ? "met" : null})} />
          <span>{c.label}</span>
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`mr-auto text-xs font-semibold ${record?.result === "met" ? "text-emerald-800" : record?.result === "gap" ? "text-red-700" : "text-slate-500"}`}>{record?.result === "met" ? "Correct" : record?.result === "gap" ? "Missed" : record?.result === "na" ? "Not applicable" : record?.result === "not-observed" ? "Not demonstrated" : "Not assessed"}</span>
          {([['gap','Missed'],['na','N/A'],['not-observed','Not demonstrated']] as const).map(([result,label])=><button key={result} type="button" aria-label={`${label}: ${c.label}`} aria-pressed={record?.result === result} disabled={disabled} className={`min-h-11 rounded-lg border px-3 text-xs font-semibold disabled:opacity-50 ${record?.result === result ? result === "gap" ? "border-red-700 bg-red-700 text-white" : "border-slate-600 bg-slate-600 text-white" : "border-slate-300 bg-white text-slate-700"}`} onClick={()=>change(c.id,{result:record?.result === result ? null : result})}>{label}</button>)}
        </div>
        {(record?.result === "gap" || record?.result === "na" || record?.result === "not-observed" || record?.note) && <label className="mt-3 block text-xs font-semibold">{record?.result === "gap" ? "What did they miss or do incorrectly?" : record?.result === "na" ? "Why does this not apply?" : record?.result === "not-observed" ? "Which gap stopped the demonstration?" : "Observation note"}<textarea rows={2} aria-label={`Explanation: ${c.label}`} className={field} disabled={disabled} value={record?.note || ""} onChange={e=>change(c.id,{note:e.target.value})}/></label>}
      </div>;
    })}</div>
    <div role="status" className="rounded-lg bg-white p-3 text-sm">
      <strong className={assessment === "gap" ? "text-red-700" : "text-emerald-900"}>{assessment === "gap" ? "Gap identified — linked audit check is No" : assessment === "understood" ? "Practical check passed" : assessment === "not-applicable" ? "Not applicable to this colleague" : "Practical check incomplete"}</strong>
      <p className="mt-1 text-xs text-slate-600">{assessed}/{definition.criteria.length} items assessed. These results feed into the linked audit check.</p>
    </div>
  </fieldset>;
}
