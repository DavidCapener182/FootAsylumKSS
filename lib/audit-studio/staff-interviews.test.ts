import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { TEMPLATE, emptyDocument, emptyResponse } from "./template";
import { scoreAudit, completionIssues } from "./scoring";
import { validateDocument } from "./validation";
import { effectiveResponse, interviewReportDocument, toStoredInterviewDocument, fromStoredInterviewDocument, interviewIssues } from "./staff-interviews";
import { changesBetween } from "./conflicts";
import { generateReport } from "./report";
import type { AuditBundle, AuditRecord, StaffInterview } from "./types";
function staff(assessment: "understood" | "gap" = "gap"): StaffInterview {
  return {id:randomUUID(),colleague:"MOCK colleague",role:"Sales assistant",answers:{assembly:{asked:"Where is the assembly point?",reply:assessment === "gap" ? "The delivery entrance." : "Point A by the car park gate.",assessment,outcome:"Compared with the verified manager reference: point A."}}};
}
function allYes() {
  const d = emptyDocument({ storeName: "MOCK staff interview", storeCode: "MOCK", auditor: "Example auditor", visitDate: "2026-09-20", assemblyPoint: "Point A by the car park gate" });
  for (const q of TEMPLATE.sections.flatMap(s => s.checks)) d.responses[q.id] = {...emptyResponse(),answer:"yes"};
  return d;
}
describe("Staff interview integration", () => {
  it("deducts the linked check once even with two gaps; a pass cannot cancel a gap", () => {
    const d = allYes(); d.staffInterviews = [staff(),staff()];
    const weight = TEMPLATE.sections.flatMap(s => s.checks).find(q=>q.id==="06.03")!.weight;
    expect(scoreAudit(TEMPLATE,d).earned).toBe(112-weight);
    d.staffInterviews[1] = staff("understood");
    expect(scoreAudit(TEMPLATE,d).earned).toBe(112-weight);
    expect(d.responses["06.03"].answer).toBe("yes");
    expect(effectiveResponse(d,TEMPLATE,"06.03").answer).toBe("no");
  });
  it("does not auto-pass unanswered or existing failed checks", () => {
    const d = emptyDocument(); d.staffInterviews=[staff("understood")];
    expect(effectiveResponse(d,TEMPLATE,"06.03").answer).toBeNull();
    d.responses["06.03"]={...emptyResponse(),answer:"no",note:"Separate finding"};
    expect(effectiveResponse(d,TEMPLATE,"06.03").answer).toBe("no");
  });
  it("requires action details and complete interview records before completion", () => {
    const d=allYes();d.staffInterviews=[staff()];
    expect(completionIssues(TEMPLATE,d).filter(i=>i.questionId==="06.03").map(i=>i.message)).toEqual(["Add the action, owner and due date."]);
    d.staffInterviews[0].answers.assembly.reply="";
    expect(interviewIssues(d,TEMPLATE)).toHaveLength(1);
    d.staffInterviews[0].answers.assembly.assessment="not-applicable";
    d.staffInterviews[0].answers.assembly.outcome="";
    expect(interviewIssues(d,TEMPLATE)[0].message).toContain("explain why");
  });
  it("caps at two, rejects duplicate staff and unknown question mappings", () => {
    const d=allYes();d.staffInterviews=[staff(),staff()];
    expect(validateDocument(d,TEMPLATE).staffInterviews).toHaveLength(2);
    d.staffInterviews.push(staff()); expect(()=>validateDocument(d,TEMPLATE)).toThrow();
    d.staffInterviews=[staff()];d.staffInterviews.push(d.staffInterviews[0]);expect(()=>validateDocument(d,TEMPLATE)).toThrow("Duplicate");
    d.staffInterviews=[staff()];d.staffInterviews[0].answers.unknown=d.staffInterviews[0].answers.assembly;
    expect(()=>validateDocument(d,TEMPLATE)).toThrow("Unknown");
  });
  it("round-trips server projections without duplicating notes and restores original responses after clearing a gap", () => {
    const d=allYes();d.responses["06.03"].note="Original auditor note";d.staffInterviews=[staff()];
    const stored=toStoredInterviewDocument(d,TEMPLATE);
    expect(stored.responses["06.03"].answer).toBe("no");
    expect(stored.responses["06.03"].note).toContain("The delivery entrance.");
    const loaded=fromStoredInterviewDocument(JSON.parse(JSON.stringify(stored)));
    expect(validateDocument(loaded,TEMPLATE)).toEqual(d);
    expect(toStoredInterviewDocument(loaded,TEMPLATE)).toEqual(stored);
    loaded.staffInterviews=[];
    expect(effectiveResponse(loaded,TEMPLATE,"06.03").answer).toBe("yes");
    expect(effectiveResponse(loaded,TEMPLATE,"06.03").note).toBe("Original auditor note");
    expect(changesBetween(d,loaded,TEMPLATE).some(c=>c.label==="Staff interviews")).toBe(true);
  });
  it("retains older audits and links both colleagues to the PDF findings", async () => {
    const d=allYes();expect(fromStoredInterviewDocument(d)).toEqual(d);
    d.staffInterviews=[staff(),staff("understood")];d.staffInterviews[1].colleague="MOCK colleague two";
    d.responses["06.03"].action={text:"Brief and recheck assembly point knowledge",owner:"Store manager",dueDate:"2026-09-21"};
    expect(interviewReportDocument(d,TEMPLATE).responses["06.03"].note).toContain("MOCK colleague two");
    const b: AuditBundle={audit:{id:randomUUID(),document:d,template_version:TEMPLATE.version} as AuditRecord,template:TEMPLATE,evidence:[]};
    const bytes=await generateReport(b,async()=>{throw new Error("Unexpected file");});
    mkdirSync("/tmp/audit-studio-qa",{recursive:true});writeFileSync("/tmp/audit-studio-qa/staff-interviews.pdf",bytes);
    expect(bytes.length).toBeGreaterThan(10000);
  });
});
