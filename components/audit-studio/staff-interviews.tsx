"use client";
import { useState } from "react";
import { MessageSquare, Plus, ArrowUpRight } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import type { AuditDocument, StaffInterview, StaffInterviewAnswer, StudioTemplate } from "@/lib/audit-studio/types";
import { emptyInterviewAnswer, interviewPrompts, questionEarned } from "@/lib/audit-studio/staff-interviews";
import { InterviewPractical } from "./interview-practical";
import { practicalDefinition, interviewAssessment, newPracticalCheck } from "@/lib/audit-studio/interview-practical";
import { managerReferences } from "@/lib/audit-studio/manager-questions";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50 hover:bg-slate-50";
const field = "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 disabled:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700";
export function StaffInterviews({ doc, template, readOnly, open, onOpenChange, update, onQuestion, status }: {
  doc: AuditDocument; template: StudioTemplate; readOnly: boolean; open: boolean; onOpenChange: (open: boolean) => void;
  update: (change: (doc: AuditDocument) => AuditDocument) => void;
  onQuestion: (id: string) => void; status: string;
}) {
  const [selected, setSelected] = useState(0);
  const [remove, setRemove] = useState(false);
  const [topics, setTopics] = useState("all");
  const staff = doc.staffInterviews || [];
  const index = Math.min(selected, Math.max(0, staff.length - 1));
  const current = staff[index];
  const prompts = interviewPrompts(template);
  const changeStaff = (change: (s: StaffInterview) => StaffInterview) => update(d => ({
    ...d, staffInterviews: (d.staffInterviews || []).map(s => s.id === current?.id ? change(s) : s),
  }));
  const answer = (id: string, ask: string, patch: Partial<StaffInterviewAnswer>) => changeStaff(s => ({
    ...s, answers: { ...s.answers, [id]: { ...(s.answers[id] || { ...emptyInterviewAnswer(), asked: ask, sampledRisk: id === "risks", ...(practicalDefinition(id) ? {practical:newPracticalCheck()} : {}) }), ...patch } },
  }));
  const add = () => {
    const id = crypto.randomUUID();
    update(d => (d.staffInterviews || []).length >= 2 ? d : ({...d, staffInterviews: [...(d.staffInterviews || []), {id, colleague: "", role: "", answers: {}}]}));
    setSelected(staff.length); setRemove(false);
  };
  return <>
    <button type="button" className={`${button} mt-4 w-full`} onClick={() => onOpenChange(true)}>
      <MessageSquare size={17} /> Staff interviews <span className="ml-auto text-xs text-slate-500">{staff.length}/2</span>
    </button>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col bg-[#f5f6f1] text-[#17291f] sm:w-[640px] sm:max-w-[90vw]">
        <header className="shrink-0 border-b border-slate-200 bg-white p-5 pr-14">
          <SheetTitle>Ask a colleague</SheetTitle>
          <SheetDescription className="mt-2 text-slate-600">Choose one or two topics for one or two colleagues. Record what they say or demonstrate; you do not need to ask every topic.</SheetDescription>
          <p role="status" className="mt-2 text-xs text-slate-500">{status}</p>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6">
            Ask without prompting. A minor omission deducts 0.25 points; an incorrect answer deducts 0.5. An unsafe demonstration loses the full question score. Deductions apply once per colleague per audit question, capped at its points. Linked risk evidence is not deducted twice. Store conditions are assessed separately.

          </div>
          <div className="mb-4 flex flex-wrap gap-2" aria-label="Choose colleague">
            {staff.map((s, i) => <button key={s.id} type="button" className={`${button} ${index === i ? "!border-emerald-800 !bg-emerald-800 !text-white" : ""}`} aria-pressed={index === i} onClick={() => {setSelected(i); setRemove(false);}}>Colleague {i + 1}</button>)}
            {!readOnly && <button type="button" className={button} disabled={staff.length >= 2 || !prompts.length} onClick={add}><Plus size={16} />{staff.length >= 2 ? "Two colleagues added" : staff.length ? "Add second colleague" : "Add colleague"}</button>}
          </div>
          {!current && <p className="rounded-lg bg-white p-5 text-sm">No interviews recorded. Add a colleague to choose the questions you want to ask.</p>}
          {current && <>
            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">Colleague name or initials<input className={field} value={current.colleague} disabled={readOnly} onChange={e => changeStaff(s => ({...s, colleague: e.target.value}))} /></label>
                <label className="text-sm font-semibold">Role<input className={field} value={current.role} disabled={readOnly} onChange={e => changeStaff(s => ({...s, role: e.target.value}))} /></label>
              </div>
              <p className="mt-3 text-xs text-slate-500">{Object.keys(current.answers).length} topics recorded · {Object.entries(current.answers).filter(([id,a]) => interviewAssessment(a,id)).length} assessed. The remaining topics are optional.</p>
              {!readOnly && (remove ? <div className="mt-3 space-y-2 text-sm"><p>Remove this colleague and their recorded interview answers? Linked results will be recalculated.</p><button className={`${button} !text-red-700`} onClick={() => {update(d => ({...d, staffInterviews: d.staffInterviews?.filter(s => s.id !== current.id)})); setRemove(false);}}>Remove interview</button> <button className={button} onClick={() => setRemove(false)}>Keep interview</button></div> : <button className="mt-2 min-h-11 text-xs text-red-700 underline" onClick={() => setRemove(true)}>Remove this colleague</button>)}
            </div>
            <label className="mb-4 block text-sm font-semibold">Show topics<select className={field} value={topics} onChange={e => setTopics(e.target.value)}><option value="all">All available topics</option><option value="recorded">Recorded for this colleague</option></select></label>
            <div className="space-y-3">
              {prompts.filter(p => topics === "all" || current.answers[p.id]).map(p => {
                const a = current.answers[p.id];
                const assessment = interviewAssessment(a, p.id);
                const definition = practicalDefinition(p.id);
                const practicalActive = !!definition && (!a || !!a.practical);
                const refs = managerReferences(doc.site, p.questionId);
                const check = template.sections.flatMap(s => s.checks).find(q => q.id === p.questionId)!;
                return <details key={`${current.id}-${p.id}`} className="rounded-xl border border-slate-200 bg-white">
                  <summary className="cursor-pointer p-4 text-sm font-semibold"><span>{p.title}</span><span className={`ml-2 text-xs ${assessment === "gap" ? "text-red-700" : "text-slate-500"}`}>{assessment === "gap" ? "Gap identified" : assessment === "understood" ? "Understood" : assessment === "not-applicable" ? "N/A to colleague" : a ? "In progress" : "Not asked"}</span></summary>
                  <div className="space-y-4 border-t border-slate-100 p-4">
                    <p className="text-sm font-medium leading-6">{p.ask}</p>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6">
                      <p className="font-semibold">Score link · {check.id} · {check.weight} {check.weight === 1 ? "point" : "points"}</p>
                      <p>{check.question}</p>
                      <p className="mt-2">Current question score: {questionEarned(doc, template, check.id, check.weight)}/{check.weight}. Record the staff result below and assess any store conditions separately.</p>
                      {p.questionId !== "05.02" && <label className="mt-3 flex cursor-pointer items-start gap-2"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-emerald-700" checked={a?.sampledRisk || false} disabled={readOnly} onChange={e => answer(p.id,p.ask,{sampledRisk:e.target.checked})} /><span>Also use this topic for sampled-risk understanding (05.02, 2 points). This supplies evidence without a second deduction. Record the selected risks in that check.</span></label>}
                      {p.questionId !== "05.02" && a?.sampledRisk && <p className="mt-2 font-semibold">This sample supplies evidence for both checks. Any deduction is applied to {check.id} only, not again to 05.02.</p>}
                    </div>
                    {refs.length > 0 && <details className="rounded-lg bg-slate-50 p-3 text-sm"><summary className="cursor-pointer font-semibold">Manager reference — for the auditor</summary><p className="mt-2 text-xs text-slate-500">Verify against site records. Do not read the answer to the colleague.</p><dl className="mt-3 space-y-3">{refs.map(r => <div key={r.key}><dt className="font-medium">{r.question}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-slate-600">{r.answer || "Not recorded — confirm with the manager."}</dd></div>)}</dl></details>}
                    <label className="block text-sm font-semibold">Question asked<textarea rows={2} className={field} value={a?.asked ?? p.ask} disabled={readOnly} onChange={e => answer(p.id, p.ask, {asked: e.target.value})} /></label>
                    {practicalActive && <InterviewPractical promptId={p.id} answer={a} disabled={readOnly} onChange={practical => answer(p.id,p.ask,{practical})} />}
                    {!!definition && a && !a.practical && !readOnly && <button className={button} onClick={() => answer(p.id,p.ask,{practical:newPracticalCheck()})}>Add practical checklist to this interview</button>}
                    <label className="block text-sm font-semibold">{practicalActive ? "Additional colleague response (optional)" : "What did the colleague say or demonstrate?"}<textarea rows={3} className={field} placeholder="Record their answer, including any uncertainty or help needed." value={a?.reply || ""} disabled={readOnly} onChange={e => answer(p.id, p.ask, {reply: e.target.value})} /></label>
                    {!practicalActive && <fieldset><legend className="mb-2 text-sm font-semibold">Your assessment</legend><p className="mb-2 text-xs text-slate-500">Understood records this colleague’s result. Check the other requirements before marking the audit question Yes.</p><div className="grid gap-2 sm:grid-cols-3">{([['understood', 'Understood'], ['gap', 'Gap identified'], ['not-applicable', 'Not applicable']] as const).map(([value,label]) => <button type="button" key={value} disabled={readOnly} aria-pressed={assessment === value} className={`${button} ${assessment === value ? value === "gap" ? "!border-red-700 !bg-red-700 !text-white" : "!border-emerald-800 !bg-emerald-800 !text-white" : ""}`} onClick={() => answer(p.id,p.ask,{assessment:value})}>{label}</button>)}</div></fieldset>}
                    {assessment === "gap" && doc.interviewScoringVersion === "graded-v2" && <fieldset><legend className="mb-2 text-sm font-semibold">How serious was the gap?</legend><div className="grid gap-2">{([['minor','Minor omission — 0.25 points'],['incorrect','Incorrect answer — 0.5 points'],['unsafe','Unsafe demonstration — full question points']] as const).map(([value,label]) => <button type="button" key={value} disabled={readOnly} aria-pressed={a?.gapSeverity === value} className={`${button} ${a?.gapSeverity === value ? "!border-emerald-800 !bg-emerald-800 !text-white" : ""}`} onClick={() => answer(p.id,p.ask,{gapSeverity:value})}>{label}</button>)}</div><p className="mt-2 text-xs text-slate-600">Use the most serious gap for this colleague and question. Explain your assessment below.</p></fieldset>}
                    <label className="block text-sm font-semibold">{!practicalActive && assessment === "not-applicable" ? "Why does this not apply? (required)" : "Outcome / explanation"}<textarea rows={2} className={field} value={a?.outcome || ""} disabled={readOnly} onChange={e => answer(p.id,p.ask,{outcome:e.target.value})} /></label>
                    <button className={`${button} w-full`} onClick={() => { onOpenChange(false); onQuestion(p.questionId); }}>View audit check {p.questionId} <ArrowUpRight size={16} /></button>
                    {!readOnly && a && <button className="min-h-11 text-xs text-red-700 underline" onClick={() => { if (window.confirm("Clear this recorded answer? The linked audit result will be recalculated.")) changeStaff(s => {const answers = {...s.answers}; delete answers[p.id]; return {...s,answers};}); }}>Clear this answer</button>}
                  </div>
                </details>;
              })}
            </div>
          </>}
        </div>
        <footer className="shrink-0 border-t border-slate-200 bg-white p-4"><button className={`${button} w-full`} onClick={() => onOpenChange(false)}>Back to audit</button></footer>
      </SheetContent>
    </Sheet>
  </>;
}
