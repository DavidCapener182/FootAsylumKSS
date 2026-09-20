import {describe, expect, it} from 'vitest';
import {randomUUID} from 'node:crypto';
import {emptyDocument, emptyResponse, TEMPLATE} from './template';
import {withCurrentInterviewScoring, effectiveResponse, interviewIssues, staffDeduction, toStoredInterviewDocument, fromStoredInterviewDocument} from './staff-interviews';
import {newPracticalCheck, interviewAssessment} from './interview-practical';
import {completionIssues, scoreAudit} from './scoring';
import {validateDocument} from './validation';

const makeDoc = () => {
  const d = withCurrentInterviewScoring(emptyDocument());
  for (const q of TEMPLATE.sections.flatMap(s => s.checks)) d.responses[q.id] = {...emptyResponse(), answer:'yes'};
  return d;
};
describe('Optional staff sampling', () => {
  it('excludes unasked knowledge checks without awarding points or blocking completion', () => {
    const d = makeDoc();
    for (const id of ['05.02','06.03']) expect(effectiveResponse(d,TEMPLATE,id)).toMatchObject({answer:'na',verified:true,naReason:'Not asked this visit'});
    expect(completionIssues(TEMPLATE,d).filter(i => ['05.02','06.03','staff-interviews'].includes(i.questionId))).toEqual([]);
    const score=scoreAudit(TEMPLATE,d); expect(score.earned).toBe(score.applicable);
  });
  it('ignores unused colleague profiles and preserves main audit requirements', () => {
    const d=makeDoc(); d.staffInterviews=[{id:randomUUID(),colleague:'',role:'',answers:{}}];
    expect(interviewIssues(d,TEMPLATE)).toEqual([]);
    d.responses['09.01'].answer=null;
    expect(completionIssues(TEMPLATE,d).some(i=>i.questionId==='09.01')).toBe(true);
  });
  it('assesses only asked steps, keeps genuine deductions and persists sampling rules', () => {
    const d=makeDoc();
    const practical={...newPracticalCheck(),optionalSampling:true}; practical.checks.location={result:'met' as const,note:''};
    d.staffInterviews=[{id:randomUUID(),colleague:'Jane Doe',role:'Sales assistant',answers:{assembly:{asked:'Where is the assembly point?',reply:'',assessment:null,outcome:'',practical}}}];
    expect(interviewAssessment(d.staffInterviews[0].answers.assembly,'assembly')).toBe('understood');
    expect(effectiveResponse(d,TEMPLATE,'06.03').answer).toBe('yes');
    expect(interviewIssues(d,TEMPLATE)).toEqual([]);
    practical.checks.location.result='gap'; practical.checks.location.note='Incorrect location';
    const a=d.staffInterviews[0].answers.assembly; a.gapSeverity='minor'; a.outcome='Brief and recheck';
    expect(staffDeduction(d,TEMPLATE,'06.03',2)).toBe(0.25);
    expect(completionIssues(TEMPLATE,d).some(i=>i.questionId==='06.03' && i.message.includes('action'))).toBe(true);
    expect(validateDocument(fromStoredInterviewDocument(toStoredInterviewDocument(d,TEMPLATE)),TEMPLATE)).toEqual(d);
    delete d.staffInterviews[0].answers.assembly;
    expect(effectiveResponse(d,TEMPLATE,'06.03').answer).toBe('na');
    expect(staffDeduction(d,TEMPLATE,'06.03',2)).toBe(0);
  });
  it('migrates only editable copies and never rewrites historic checklist assessments', () => {
    const old=emptyDocument(); const practical=newPracticalCheck(); practical.checks.location={result:'met',note:''};
    old.staffInterviews=[{id:randomUUID(),colleague:'Jane',role:'Assistant',answers:{assembly:{asked:'Where?',reply:'',assessment:null,outcome:'',practical}}}];
    const updated=withCurrentInterviewScoring(old);
    expect(interviewAssessment(old.staffInterviews[0].answers.assembly,'assembly')).toBeNull();
    expect(interviewAssessment(updated.staffInterviews![0].answers.assembly,'assembly')).toBe('understood');
    expect(old.optionalStaffSampling).toBeUndefined();
  });
});
