import { describe, expect, it } from 'vitest'
import {
  isCompletedEmpHistoryPlan,
  isRadioOneEmpPlan,
  splitEmpPlansByHistory,
} from '@/lib/emp/plan-history'

describe('EMP plan history grouping', () => {
  it('identifies Radio 1 plans from the event name or plan title', () => {
    expect(
      isRadioOneEmpPlan({
        title: 'KSS NW LTD Bar Security Operations Plan',
        eventName: "BBC Radio 1's Big Weekend Sunderland 2026",
      })
    ).toBe(true)

    expect(
      isRadioOneEmpPlan({
        title: 'KSS NW LTD Bar Security Operations Plan - Radio One Event Week',
        eventName: null,
      })
    ).toBe(true)
  })

  it('moves Radio 1 into completed history and leaves active drafts in plans', () => {
    const radioOnePlan = {
      id: 'radio-one',
      title: 'KSS NW LTD Bar Security Operations Plan - BBC Radio 1 Big Weekend Sunderland 2026',
      eventName: 'BBC Radio 1 Big Weekend Sunderland 2026',
      status: 'ready',
    }
    const downloadPlan = {
      id: 'download',
      title: 'KSS NW LTD Event Management Plan - Download Festival 2026',
      eventName: 'Download Festival 2026',
      status: 'draft',
    }
    const parklifePlan = {
      id: 'parklife',
      title: 'KSS NW LTD Bar Security Operations Plan - Parklife Festival 2026',
      eventName: 'Parklife Festival 2026',
      status: 'draft',
    }

    const groups = splitEmpPlansByHistory([radioOnePlan, downloadPlan, parklifePlan])

    expect(groups.activePlans).toEqual([downloadPlan, parklifePlan])
    expect(groups.historyPlans).toEqual([radioOnePlan])
  })

  it('also respects explicit completed-style statuses', () => {
    expect(
      isCompletedEmpHistoryPlan({
        title: 'Archived EMP',
        eventName: 'Completed event',
        status: 'completed',
      })
    ).toBe(true)
  })
})
