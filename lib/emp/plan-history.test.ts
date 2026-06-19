import { describe, expect, it } from 'vitest'
import {
  isCompletedEmpHistoryPlan,
  isRadioOneEmpPlan,
  sortActiveEmpPlansByDate,
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
      documentStatus: 'V1',
    }
    const downloadPlan = {
      id: 'download',
      title: 'KSS NW LTD Event Management Plan - Download Festival 2026',
      eventName: 'Download Festival 2026',
      status: 'draft',
      documentStatus: 'V1',
    }
    const parklifePlan = {
      id: 'parklife',
      title: 'KSS NW LTD Bar Security Operations Plan - Parklife Festival 2026',
      eventName: 'Parklife Festival 2026',
      status: 'draft',
      documentStatus: 'V1',
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
        documentStatus: 'V1',
      })
    ).toBe(true)
  })

  it('moves completed document-status plans into completed history even when the enum status is still draft', () => {
    expect(
      isCompletedEmpHistoryPlan({
        title: 'KSS NW LTD Event Management Plan - Download Festival 2026',
        eventName: 'Download Festival 2026',
        status: 'draft',
        documentStatus: 'Completed',
      })
    ).toBe(true)
  })

  it('sorts active festival plans by nearest 2026 event start date first', () => {
    const plans = [
      {
        id: 'wilderness',
        title: 'KSS NW LTD Event Management Plan - Wilderness Festival 2026',
        eventName: 'Wilderness Festival 2026',
      },
      {
        id: 'radio-2',
        title: 'KSS NW LTD Event Management Plan - BBC Radio 2 in the Park 2026',
        eventName: 'BBC Radio 2 in the Park 2026',
      },
      {
        id: 'parklife',
        title: 'KSS NW LTD Bar Security Operations Plan - Parklife Festival 2026',
        eventName: 'Parklife Festival 2026',
      },
      {
        id: 'electric-picnic',
        title: 'KSS NW LTD Event Management Plan - Electric Picnic 2026',
        eventName: 'Electric Picnic 2026',
      },
      {
        id: 'reading',
        title: 'KSS NW LTD Event Management Plan - Reading Festival 2026',
        eventName: 'Reading Festival 2026',
      },
      {
        id: 'latitude',
        title: 'KSS NW LTD Event Management Plan - Latitude Festival 2026',
        eventName: 'Latitude Festival 2026',
      },
      {
        id: 'download',
        title: 'KSS NW LTD Event Management Plan - Download Festival 2026',
        eventName: 'Download Festival 2026',
      },
      {
        id: 'state-fayre',
        title: 'KSS NW LTD Event Management Plan - State Fayre Festival 2026',
        eventName: 'State Fayre Festival 2026',
      },
      {
        id: 'leeds',
        title: 'KSS NW LTD Event Management Plan - Leeds Festival 2026',
        eventName: 'Leeds Festival 2026',
      },
      {
        id: 'isle-of-wight',
        title: 'KSS NW LTD Event Management Plan - Isle of Wight Festival 2026',
        eventName: 'Isle of Wight Festival 2026',
      },
    ]

    expect(sortActiveEmpPlansByDate(plans).map((plan) => plan.id)).toEqual([
      'download',
      'isle-of-wight',
      'parklife',
      'state-fayre',
      'latitude',
      'wilderness',
      'leeds',
      'reading',
      'electric-picnic',
      'radio-2',
    ])
  })
})
