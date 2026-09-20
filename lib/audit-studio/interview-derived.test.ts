import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { emptyDocument, emptyResponse, TEMPLATE } from "./template";
import { effectiveResponse, withCurrentInterviewScoring, toStoredInterviewDocument, fromStoredInterviewDocument } from "./staff-interviews";
import { newPracticalCheck, practicalDefinition } from "./interview-practical";
import { scoreAudit, completionIssues } from "./scoring";
import { validateDocument } from "./validation";
import type { StaffInterviewAnswer } from "./types";
function sample(topic: string, gap = false): StaffInterviewAnswer {
  const practical = newPracticalCheck();
  practical.context = "Selected task"; practical.reference = "Verified site arrangements";
  practicalDefinition(topic)!.criteria.forEach((c, i) => practical.checks[c.id] = {result: gap && i === 0 ? "gap" : "met", note: gap && i === 0 ? "Unable to explain the control" : ""});
  return {asked: "Explain and demonstrate the selected task",reply:"",assessment:null,outcome:"",practical};
}
function doc() {
  const d = withCurrentInterviewScoring(emptyDocument());
  delete d.optionalStaffSampling; // Historical mandatory-sampling reports retain their rules.
  TEMPLATE.sections.flatMap(s=>s.checks).forEach(q=>d.responses[q.id]={...emptyResponse(),answer:"yes"});
  return d;
}
function colleague(answers: Record<string, StaffInterviewAnswer>) {
  return {id:randomUUID(),colleague:"Colleague A",role:"Sales assistant",answers};
}
describe("Interview-derived staff understanding", () => {
  it("ignores standalone Yes, No, manager information and old practical notes without staff answers", () => {
    const d=doc();d.site.localRisks="Manager says everyone understands";
    d.responses['05.02'].practicalCheck={checked:"Risks discussed",outcome:"Satisfactory"};
    expect(effectiveResponse(d,TEMPLATE,'05.02').answer).toBeNull();
    d.responses['06.03'].answer='no';
    expect(effectiveResponse(d,TEMPLATE,'06.03').answer).toBeNull();
    expect(scoreAudit(TEMPLATE,d)).toMatchObject({outcome:'Pending',answered:55});
    expect(completionIssues(TEMPLATE,d).some(i=>i.questionId==='05.02'&&i.message.includes('two selected risks'))).toBe(true);
  });
  it("derives Yes for emergency understanding from complete staff answers, without a manual answer", () => {
    const d=doc();d.responses['06.03'].answer=null;
    d.staffInterviews=[colleague({assembly:sample('assembly')})];
    expect(effectiveResponse(d,TEMPLATE,'06.03')).toMatchObject({answer:'yes',verified:true});
    d.staffInterviews[0].answers.assembly.practical!.reference='';
    expect(effectiveResponse(d,TEMPLATE,'06.03').answer).toBeNull();
  });
  it("requires two distinct sampled risks, not two people answering the same risk", () => {
    const d=doc();d.staffInterviews=[colleague({handling:{...sample('handling'),sampledRisk:true}}),colleague({handling:{...sample('handling'),sampledRisk:true}})];
    expect(effectiveResponse(d,TEMPLATE,'05.02').answer).toBeNull();
    d.staffInterviews[1].answers['product-use']={...sample('product-use'),sampledRisk:true};
    expect(effectiveResponse(d,TEMPLATE,'05.02').answer).toBe('yes');
  });
  it("accepts the direct two-risk checklist and never awards a pass for all-N/A or incomplete samples", () => {
    const d=doc();d.staffInterviews=[colleague({risks:sample('risks')})];
    expect(effectiveResponse(d,TEMPLATE,'05.02').answer).toBe('yes');
    Object.values(d.staffInterviews[0].answers.risks.practical!.checks).forEach(c=>{c.result='na';c.note='Not applicable to this colleague';});
    expect(effectiveResponse(d,TEMPLATE,'05.02').answer).toBeNull();
  });
  it("deducts half a point per colleague with an incorrect answer", () => {
    const d=doc();d.staffInterviews=[colleague({assembly:sample('assembly',true),risks:sample('risks')}),colleague({assembly:sample('assembly')})];
    expect(effectiveResponse(d,TEMPLATE,'06.03').answer).toBe('no');
    expect(scoreAudit(TEMPLATE,d).earned).toBe(111.5);
    d.staffInterviews[1].answers.assembly=sample('assembly',true);
    expect(scoreAudit(TEMPLATE,d).earned).toBe(111);
    expect(completionIssues(TEMPLATE,d).some(i=>i.questionId==='06.03'&&i.message.includes('action'))).toBe(true);
  });
  it("requires a reason to skip an unasked check and does not let N/A hide an interview gap", () => {
    const d=doc();d.responses['06.03'].answer='na';
    expect(effectiveResponse(d,TEMPLATE,'06.03').answer).toBeNull();
    d.responses['06.03'].naReason='Other topics selected this visit';
    expect(effectiveResponse(d,TEMPLATE,'06.03').answer).toBe('na');
    d.staffInterviews=[colleague({assembly:sample('assembly',true)})];
    expect(effectiveResponse(d,TEMPLATE,'06.03').answer).toBe('no');
  });
  it("stores the calculated answers and returns to unanswered when the interviews are removed", () => {
    const d=doc();d.staffInterviews=[colleague({assembly:sample('assembly'),risks:sample('risks')})];
    const loaded=fromStoredInterviewDocument(toStoredInterviewDocument(d,TEMPLATE));
    expect(validateDocument(loaded,TEMPLATE)).toEqual(d);
    loaded.staffInterviews=[];
    const stored=toStoredInterviewDocument(loaded,TEMPLATE);
    expect(stored.responses['05.02'].answer).toBeNull();
    expect(stored.responses['06.03'].answer).toBeNull();
  });
  it("keeps mixed physical checks auditor-led and preserves the rules of older frozen documents", () => {
    const d=doc();d.responses['09.01'].answer='no';d.staffInterviews=[colleague({handling:sample('handling')})];
    expect(effectiveResponse(d,TEMPLATE,'09.01').answer).toBe('no');
    delete d.interviewScoringVersion;
    expect(effectiveResponse(d,TEMPLATE,'05.02').answer).toBe('yes');
  });
});
