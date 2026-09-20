import {describe,it,expect} from 'vitest';
import {TEMPLATE,emptyDocument,emptyResponse} from './template';
import v1 from './template-v1.json';
import {scoreAudit} from './scoring';
import {interviewPrompts} from './staff-interviews';
import {NOTE_PRESETS} from './note-presets';
import {questionNotesHint} from './question-guidance';
describe('Customer safety and observed sign-in',()=>{
 it('adds a separate three-point customer check without rewriting the previous template',()=>{
  const checks=TEMPLATE.sections.flatMap(s=>s.checks);
  expect(checks.find(q=>q.id==='11.07')).toMatchObject({weight:3,question:'Are customer shelves and displays safe and secure?'});
  expect(v1.flatMap(s=>s.checks).find(q=>q.id==='11.07')).toBeUndefined();
  expect(TEMPLATE.sections[10].total).toBe(22);
  const notes=['11.07','11.08','11.09','11.10'].flatMap(id=>NOTE_PRESETS[id].yes).map(n=>n.text).join(' ');
  expect(notes).toMatch(/benches/);expect(notes).toMatch(/heights/);expect(notes).toMatch(/high-level/);
  expect(questionNotesHint(TEMPLATE.version,'11.04','')).toContain('customer seating');
 });
 it('keeps sign-in as an auditor observation rather than a colleague knowledge score',()=>{
  expect(TEMPLATE.sections[7].checks.find(q=>q.id==='08.02')?.question).toBe('Were you asked to sign in on arrival and sign out before leaving?');
  expect(interviewPrompts(TEMPLATE).some(p=>p.questionId==='08.02')).toBe(false);
  expect(interviewPrompts({...TEMPLATE,version:'hs-update-2026-09-19-v1',sections:v1}).some(p=>p.id==='visitors')).toBe(true);
 });
 it('normalises non-100 weights, failures and N/A to a percentage',()=>{
  const doc=emptyDocument();TEMPLATE.sections.flatMap(s=>s.checks).forEach(q=>doc.responses[q.id]={...emptyResponse(),answer:'yes'});
  expect(scoreAudit(TEMPLATE,doc)).toMatchObject({earned:112,applicable:112,percentage:100});
  doc.responses['11.07'].answer='no';
  expect(scoreAudit(TEMPLATE,doc).percentage).toBeCloseTo(97.3214286);
  doc.responses['11.07'].answer='na';doc.responses['15.02'].answer='no';
  expect(scoreAudit(TEMPLATE,doc)).toMatchObject({earned:105,applicable:109,percentage:105/109*100});
 });
});
