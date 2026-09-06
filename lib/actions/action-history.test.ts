import {describe,it,expect} from 'vitest'
import {isHistoricalStoreAction} from './action-history'
describe('store action history',()=>{
 it('archives completed actions immediately',()=>expect(isHistoricalStoreAction({status:'complete',active_until:'2099-01-01'})).toBe(true))
 it('archives on the six-month boundary without pretending the action was completed',()=>{
  const action={status:'open',active_until:'2027-02-04'}
  expect(isHistoricalStoreAction(action,'2027-02-03')).toBe(false)
  expect(isHistoricalStoreAction(action,'2027-02-04')).toBe(true)
  expect(action.status).toBe('open')
 })
})
