import { describe,it,expect } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdirSync,writeFileSync } from "node:fs";
import { newPracticalCheck, practicalDefinition, interviewAssessment } from "./interview-practical";
import { TEMPLATE,emptyDocument,emptyResponse } from "./template";
import { validateDocument } from "./validation";
import { scoreAudit,completionIssues } from "./scoring";
import { interviewIssues,interviewReportDocument,toStoredInterviewDocument,fromStoredInterviewDocument } from "./staff-interviews";
import { generateReport } from "./report";
import type { StaffInterviewAnswer, AuditBundle,AuditRecord } from "./types";
function practical(id:string):StaffInterviewAnswer {
 const p=newPracticalCheck();p.context="MOCK — selected product / ladder and task";p.reference="MOCK — manufacturer instructions and site assessment";
 for (const c of practicalDefinition(id)!.criteria) p.checks[c.id]={result:"met",note:""};
 return {asked:"MOCK — explain and demonstrate the task",reply:"",assessment:null,outcome:"",practical:p};
}
function fixture() {
 const d=emptyDocument({storeName:"MOCK practical interviews",storeCode:"MOCK",visitDate:"2026-09-20",auditor:"Example auditor"});
 for (const q of TEMPLATE.sections.flatMap(s=>s.checks)) d.responses[q.id]={...emptyResponse(),answer:"yes"};
 d.staffInterviews=[{id:randomUUID(),colleague:"MOCK colleague",role:"Sales assistant",answers:{"product-use":practical("product-use"),"product-storage":practical("product-storage"),height:practical("height")}}];
 return d;
}
describe("Practical interview checklists",()=>{
 it("derives a pass only after every criterion is assessed and never trusts a manual pass",()=>{
  const a=practical("height");expect(interviewAssessment(a,"height")).toBe("understood");
  a.practical!.checks.setup.result=null;a.assessment="understood";
  expect(interviewAssessment(a,"height")).toBeNull();
  a.practical!.checks.setup.result="gap";expect(interviewAssessment(a,"height")).toBe("gap");
 });
 it("maps use, storage and retrieval to their own audit checks without double charging",()=>{
  const d=fixture(),answers=d.staffInterviews![0].answers;
  answers["product-use"].practical!.checks.ppe={result:"gap",note:"MOCK — omitted the specified eye protection"};
  answers["product-storage"].practical!.checks["put-away"]={result:"gap",note:"MOCK — left product outside designated storage"};
  answers.height.practical!.checks.setup={result:"gap",note:"MOCK — attempted to climb with the lock disengaged; demonstration stopped"};
  const projected=interviewReportDocument(d,TEMPLATE);
  for(const id of ["10.01","10.02","12.01"]) expect(projected.responses[id].answer).toBe("no");
  expect(projected.responses["10.03"].answer).toBe("yes");
  expect(scoreAudit(TEMPLATE,d).earned).toBe(107);
  d.staffInterviews!.push({...d.staffInterviews![0],id:randomUUID(),colleague:"MOCK colleague two"});
  expect(scoreAudit(TEMPLATE,d).earned).toBe(107);
  expect(completionIssues(TEMPLATE,d).filter(i=>["10.01","10.02","12.01"].includes(i.questionId))).toHaveLength(3);
 });
 it("keeps incomplete checklists pending and requires explanations for missed and N/A items",()=>{
  const d=fixture(), a=d.staffInterviews![0].answers["product-use"];
  a.practical!.checks.ppe.result=null;
  expect(scoreAudit(TEMPLATE,d).outcome).toBe("Pending");
  a.practical!.checks.ppe.result="na";
  expect(interviewIssues(d,TEMPLATE)[0].message).toContain("N/A");
  a.practical!.checks.ppe.note="MOCK — verified label and assessment require no PPE for this task";
  expect(interviewIssues(d,TEMPLATE)).toHaveLength(0);
  a.practical!.checks.ppe.result="gap";a.practical!.checks.ppe.note="";
  expect(interviewIssues(d,TEMPLATE)[0].message).toContain("missed item");
 });
 it("keeps all N/A distinct from passing and preserves legacy interview findings",()=>{
  const a=practical("height");for(const c of Object.values(a.practical!.checks)){c.result="na";c.note="Not part of this colleague’s work";}
  expect(interviewAssessment(a,"height")).toBe("not-applicable");
  const old={asked:"Existing question",reply:"Existing response",assessment:"gap" as const,outcome:"Existing finding"};
  expect(interviewAssessment(old,"height")).toBe("gap");
  expect(interviewAssessment({...old,practical:newPracticalCheck()},"height")).toBe("gap");
 });
 it("rejects forged checklist IDs and unsupported versions, while round-tripping saved checklist records",()=>{
  const d=fixture();expect(validateDocument(fromStoredInterviewDocument(toStoredInterviewDocument(d,TEMPLATE)),TEMPLATE)).toEqual(d);
  const a=d.staffInterviews![0].answers.height;a.practical!.checks.fake={result:"met",note:""};
  expect(()=>validateDocument(d,TEMPLATE)).toThrow("Unknown practical");delete a.practical!.checks.fake;
  expect(()=>validateDocument(JSON.parse(JSON.stringify(d).replace('practical-v1','practical-v999')),TEMPLATE)).toThrow();
 });
 it("records individual observations, explanations and calculated outcomes in the PDF",async()=>{
  const d=fixture();const a=d.staffInterviews![0].answers.height;
  a.practical!.checks.setup={result:"gap",note:"MOCK — locking brace was not engaged; stopped before climbing"};
  for (const id of ["climbing","retrieval"]) a.practical!.checks[id]={result:"not-observed",note:"Stopped after the setup gap; no climb or retrieval attempted."};
  expect(interviewIssues(d,TEMPLATE)).toHaveLength(0);
  d.responses["12.01"].action={text:"MOCK — brief colleague and independently recheck ladder setup",owner:"Store manager",dueDate:"2026-09-21"};
  const projected=interviewReportDocument(d,TEMPLATE);
  expect(projected.responses["12.01"].note).toContain("Missed: Set up on a firm, level surface");
  expect(projected.responses["12.01"].note).toContain("Auditor assessment: Gap identified");
  const b:AuditBundle={audit:{id:randomUUID(),document:d,template_version:TEMPLATE.version} as AuditRecord,template:TEMPLATE,evidence:[]};
  const pdf=await generateReport(b,async()=>{throw new Error("Unexpected evidence");});
  mkdirSync("/tmp/audit-studio-qa",{recursive:true});writeFileSync("/tmp/audit-studio-qa/practical-interview-checklists.pdf",pdf);
  expect(pdf.length).toBeGreaterThan(10000);
 });
});
