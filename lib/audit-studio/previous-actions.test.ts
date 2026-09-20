import {describe,it,expect} from 'vitest';
import {previousActionResponse} from './previous-actions';
import {emptyDocument,emptyResponse,TEMPLATE} from './template';
import {effectiveResponse,toStoredInterviewDocument,fromStoredInterviewDocument} from './staff-interviews';
import {completionIssues} from './scoring';
import type {PreviousActionReview} from './types';
const action:PreviousActionReview={id:'hs:one',kind:'H&S',title:'Clear the aisle',detail:'Boxes in aisle',date:'2026-01-22',status:'completed',outcome:'improved',note:'Walked the aisle; it remains clear.'};
describe('previous action review',()=>{
 it('does not infer a pass just because the old action is closed',()=>{const d=emptyDocument({});d.previousActionReviews=[{...action,outcome:null}];expect(previousActionResponse(d,'16.03',{...emptyResponse(),answer:'yes',verified:true}).answer).toBeNull();});
 it('one failed review defeats a manual Yes, while other checks stay unchanged',()=>{const d=emptyDocument({});d.previousActionReviews=[action,{...action,id:'fra:two',outcome:'not-improved'}];d.responses['16.03']={...emptyResponse(),answer:'yes',verified:true};expect(effectiveResponse(d,TEMPLATE,'16.03').answer).toBe('no');expect(effectiveResponse(d,TEMPLATE,'15.04').answer).toBeNull();});
 it('indexes the derived result and preserves reviews on reload',()=>{const d=emptyDocument({});d.previousActionReviews=[action];expect(toStoredInterviewDocument(d,TEMPLATE).responses['16.03'].answer).toBe('yes');expect(fromStoredInterviewDocument(toStoredInterviewDocument(d,TEMPLATE))).toEqual(d);});
 it('requires an explanation even for N/A or failed reviews',()=>{const d=emptyDocument({});d.previousActionReviews=[{...action,outcome:'not-improved',note:''}];expect(completionIssues(TEMPLATE,d).some(i=>i.message.includes('each selected previous action'))).toBe(true);});
 it('excludes an entirely non-applicable sample with its recorded reasons',()=>{const d=emptyDocument({});d.previousActionReviews=[{...action,outcome:'not-applicable',note:'Area removed from the store.'}];expect(effectiveResponse(d,TEMPLATE,'16.03')).toMatchObject({answer:'na',naReason:expect.stringContaining('Area removed')});});
});
