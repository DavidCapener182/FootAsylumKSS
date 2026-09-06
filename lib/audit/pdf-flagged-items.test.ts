import {describe,it,expect} from 'vitest'
import {parsePdfFlaggedItems,sixMonthsAfter,auditDateFromCover} from './pdf-flagged-items'
const cover={num:1,text:'Sunderland\nFlagged items 2 Actions 1\nConducted on 4 Aug 2026 10:47 AM BST'}
const flagged={num:2,text:'1.Flaggeditems\nFlagged items 2 flagged\nCOSHH\nAre chemicals stored correctly? No\nCupboard door broken.\nPhoto 29 Photo 30\nFire Safety\nCombustible materials are\nstored correctly? No\nMaterials at the top of the stairs.'}
describe('audit PDF flagged-section extraction',()=>{
 it('extracts each flagged question and its exact observation, excluding photos and the main audit',()=>{
  const parsed=parsePdfFlaggedItems([cover,flagged,{num:3,text:'2.Disclaimer\nOther questions? No'}])
  expect(parsed.findings).toHaveLength(2)
  expect(parsed.findings[0]).toMatchObject({question:'Are chemicals stored correctly?',observation:'Cupboard door broken.',page:2})
  expect(parsed.findings[1].observation).toBe('Materials at the top of the stairs.')
 })
 it('continues across pages and excludes the separate Other actions section',()=>{
  const result=parsePdfFlaggedItems([cover,flagged,{num:3,text:'More observation.\nOther actions 1 action\nFire Safety\nExtra question? Yes'}])
  expect(result.findings[1].observation).toContain('More observation.')
  expect(result.findings).toHaveLength(2)
 })
 it('fails closed on incomplete sections and missing text',()=>{
  expect(()=>parsePdfFlaggedItems([cover,{num:2,text:'Flagged items 2 flagged'}])).toThrow('count mismatch')
  expect(()=>parsePdfFlaggedItems([{num:1,text:''}])).toThrow('count')
 })
 it('keeps multi-line training lists inside the question',()=>{
  const result=parsePdfFlaggedItems([{num:1,text:'Flagged items 1'}, {num:2,text:'Flagged items 1 flagged\nTraining\nToolbox refresher training:\nManual handling\nHousekeeping\nFire Safety\nStepladders\nNo\n85% complete.\n2.Disclaimer'}])
  expect(result.findings[0].question).toContain('Fire Safety Stepladders')
  expect(result.findings[0].observation).toBe('85% complete.')
 })
 it('uses calendar months and validates the report date',()=>{
  expect(sixMonthsAfter('2026-08-31')).toBe('2027-02-28')
  expect(sixMonthsAfter('2023-08-31')).toBe('2024-02-29')
  expect(auditDateFromCover(cover.text)).toBe('2026-08-04')
  expect(auditDateFromCover('Conducted on 17.02.2026 13:36 GMT')).toBe('2026-02-17')
  expect(()=>sixMonthsAfter('2026-02-30')).toThrow()
 })
})
