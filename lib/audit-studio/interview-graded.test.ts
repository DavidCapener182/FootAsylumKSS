import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { emptyDocument, emptyResponse, TEMPLATE } from './template';
import { questionEarned, staffDeduction, withCurrentInterviewScoring, toStoredInterviewDocument, fromStoredInterviewDocument, interviewIssues } from './staff-interviews';
import { validateDocument } from './validation';
import { scoreAudit, completionIssues } from './scoring';
import type { StaffInterviewAnswer } from './types';
const answer = (gapSeverity: StaffInterviewAnswer['gapSeverity']): StaffInterviewAnswer => ({asked:'Explain the task',reply:'Cannot explain the method',assessment:'gap',gapSeverity,outcome:'Brief and independently recheck',sampledRisk:true});
function fixture() {
 const d=withCurrentInterviewScoring(emptyDocument());
 for(const q of TEMPLATE.sections.flatMap(s=>s.checks)) d.responses[q.id]={...emptyResponse(),answer:'yes',verified:true};
 d.staffInterviews=[{id:randomUUID(),colleague:'Jane',role:'Sales assistant',answers:{height:answer('incorrect')}}];
 return d;
}
describe('Fixed staff deductions',()=>{
 it('deducts 0.25 or 0.5 rather than a proportion of a 3-point check',()=>{
  const d=fixture();expect(questionEarned(d,TEMPLATE,'12.01',3)).toBe(2.5);
  d.staffInterviews![0].answers.height.gapSeverity='minor';expect(questionEarned(d,TEMPLATE,'12.01',3)).toBe(2.75);
 });
 it('adds two colleagues, caps at available points, and ignores passing colleagues',()=>{
  const d=fixture();d.staffInterviews!.push({id:randomUUID(),colleague:'Alex',role:'Stock assistant',answers:{height:answer('incorrect')}});
  expect(questionEarned(d,TEMPLATE,'12.01',3)).toBe(2);
  expect(staffDeduction(d,TEMPLATE,'12.01',0.5)).toBe(0.5);
  d.staffInterviews![1].answers.height.assessment='understood';expect(questionEarned(d,TEMPLATE,'12.01',3)).toBe(2.5);
 });
 it('takes the most serious gap once for a colleague across prompts for the same audit question',()=>{
  const d=fixture();d.staffInterviews![0].answers={assembly:answer('minor'),evacuation:answer('incorrect')};
  expect(questionEarned(d,TEMPLATE,'06.03',2)).toBe(1.5);
 });
 it('does not deduct again under 05.02 for linked risk evidence',()=>{
  const d=fixture();d.staffInterviews![0].answers.handling=answer('minor');
  expect(questionEarned(d,TEMPLATE,'05.02',2)).toBe(2);
  expect(questionEarned(d,TEMPLATE,'09.01',4)).toBe(3.75);
  expect(questionEarned(d,TEMPLATE,'12.01',3)).toBe(2.5);
 });
 it('retains full deductions for unsafe demonstrations and failed store arrangements',()=>{
  const d=fixture();d.staffInterviews![0].answers.height.gapSeverity='unsafe';expect(questionEarned(d,TEMPLATE,'12.01',3)).toBe(0);
  d.staffInterviews![0].answers.height.gapSeverity='minor';d.responses['12.01'].answer='no';expect(questionEarned(d,TEMPLATE,'12.01',3)).toBe(0);
 });
 it('keeps unasked understanding checks pending and requires severity, explanation and follow-up',()=>{
  const d=fixture();expect(questionEarned(d,TEMPLATE,'06.03',2)).toBe(0);
  delete d.staffInterviews![0].answers.height.gapSeverity;
  expect(interviewIssues(d,TEMPLATE).some(i=>i.message.includes('severity'))).toBe(true);
  expect(completionIssues(TEMPLATE,d).some(i=>i.questionId==='12.01' && i.message.includes('action'))).toBe(true);
 });
 it('preserves fractional scores and source answers across validation and storage round trips',()=>{
  const d=fixture();const restored=fromStoredInterviewDocument(toStoredInterviewDocument(validateDocument(d,TEMPLATE),TEMPLATE));
  expect(restored.responses['12.01'].answer).toBe('yes');
  expect(questionEarned(restored,TEMPLATE,'12.01',3)).toBe(2.5);
  expect(scoreAudit(TEMPLATE,restored).earned).toBe(scoreAudit(TEMPLATE,d).earned);
 });
 it('preserves historical all-or-nothing scoring for frozen derived-v1 documents',()=>{
  const d=fixture();d.interviewScoringVersion='derived-v1';expect(questionEarned(d,TEMPLATE,'12.01',3)).toBe(0);
 });
});
