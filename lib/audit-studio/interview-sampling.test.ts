import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { TEMPLATE, emptyDocument, emptyResponse } from "./template";
import { newPracticalCheck, practicalDefinition } from "./interview-practical";
import { effectiveResponse, interviewIssues, interviewPrompts, interviewReportDocument, fromStoredInterviewDocument, toStoredInterviewDocument } from "./staff-interviews";
import { scoreAudit, completionIssues } from "./scoring";
import { validateDocument } from "./validation";
import type { StaffInterviewAnswer } from "./types";
function sample(id: string, gap = false): StaffInterviewAnswer {
  const practical = newPracticalCheck(); practical.context = "Selected mock task"; practical.reference = "Verified mock site assessment";
  practicalDefinition(id)!.criteria.forEach((c,i) => practical.checks[c.id] = { result: gap && !i ? "gap" : "met", note: gap && !i ? "Colleague could not explain this control." : "" });
  return {asked:"Show me the selected task",reply:"",assessment:null,outcome:"",practical};
}
function fixture() {
  const doc=emptyDocument();
  TEMPLATE.sections.flatMap(s=>s.checks).forEach(q=>doc.responses[q.id]={...emptyResponse(),answer:"yes"});
  doc.staffInterviews=[{id:randomUUID(),colleague:"Mock A",role:"Sales",answers:{handling:sample("handling",true)}}];
  return doc;
}
describe("Selective colleague sampling",()=>{
  it("offers checklists for every interview topic with valid scoring links",()=>{
    expect(interviewPrompts(TEMPLATE)).toHaveLength(17);
    for(const p of interviewPrompts(TEMPLATE)) expect(practicalDefinition(p.id)?.criteria.length).toBeGreaterThan(0);
  });
  it("one topic for one colleague is sufficient; unasked topics do not block or deduct",()=>{
    const d=fixture(); expect(interviewIssues(d,TEMPLATE)).toEqual([]);
    expect(scoreAudit(TEMPLATE,d).earned).toBe(108);
    expect(effectiveResponse(d,TEMPLATE,"09.01").answer).toBe("no");
    expect(effectiveResponse(d,TEMPLATE,"05.02").answer).toBe("yes");
    expect(completionIssues(TEMPLATE,d).some(i=>i.questionId==="09.01" && i.message.includes("action"))).toBe(true);
    d.staffInterviews![0].answers.handling=sample("handling");
    expect(scoreAudit(TEMPLATE,d).earned).toBe(112);
  });
  it("sampled-risk failure is shared once, even with two colleagues and multiple failed topics",()=>{
    const d=fixture();d.staffInterviews![0].answers.handling.sampledRisk=true;
    expect(scoreAudit(TEMPLATE,d).earned).toBe(106); // handling 4 and sampled understanding 2
    d.staffInterviews!.push({...d.staffInterviews![0],id:randomUUID(),colleague:"Mock B",answers:{handling:{...sample("handling"),sampledRisk:true}}});
    expect(scoreAudit(TEMPLATE,d).earned).toBe(106); // one pass cannot cancel another gap
    d.staffInterviews![1].answers.spills={...sample("spills",true),sampledRisk:true};
    expect(scoreAudit(TEMPLATE,d).earned).toBe(104); // spills 2; understanding is not deducted twice
    expect(effectiveResponse(d,TEMPLATE,"05.02").answer).toBe("no");
    const projected=interviewReportDocument(d,TEMPLATE);
    expect(projected.responses["05.02"].note).toContain("Moving stock");
    expect(projected.responses["05.02"].note).toContain("Dealing with a spill");
    expect(validateDocument(fromStoredInterviewDocument(toStoredInterviewDocument(d,TEMPLATE)),TEMPLATE)).toEqual(d);
    expect(toStoredInterviewDocument(d,TEMPLATE).responses["05.02"].answer).toBe("no");
  });
  it("does not create passes from incomplete, all-N/A or unasked samples; removal restores the source answer",()=>{
    const d=fixture();const a=d.staffInterviews![0].answers.handling;
    a.sampledRisk=true;a.practical!.checks.plan.result=null;
    expect(scoreAudit(TEMPLATE,d).outcome).toBe("Pending");
    d.responses["05.02"].answer=null;
    expect(effectiveResponse(d,TEMPLATE,"05.02").answer).toBeNull();
    d.staffInterviews![0].answers.handling=sample("handling",true);
    expect(effectiveResponse(d,TEMPLATE,"05.02").answer).toBeNull();
    d.staffInterviews![0].answers.handling={...sample("handling",true),sampledRisk:true};
    expect(effectiveResponse(d,TEMPLATE,"05.02").answer).toBe("no");
    d.staffInterviews=[];
    expect(effectiveResponse(d,TEMPLATE,"09.01").answer).toBe("yes");
    expect(effectiveResponse(d,TEMPLATE,"05.02").answer).toBeNull();
  });
});
