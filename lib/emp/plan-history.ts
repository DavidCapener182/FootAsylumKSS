import type { EmpPlanSummary } from '@/lib/emp/data'

const COMPLETED_PLAN_STATUSES = new Set(['complete', 'completed', 'archived'])
const RADIO_ONE_PATTERN = /\b(?:bbc\s*)?radio\s*(?:1|one)\b|\br1bw\b/i

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

export function isRadioOneEmpPlan(plan: Pick<EmpPlanSummary, 'title' | 'eventName'>) {
  return RADIO_ONE_PATTERN.test(`${plan.title} ${plan.eventName || ''}`)
}

export function isCompletedEmpHistoryPlan(plan: Pick<EmpPlanSummary, 'title' | 'eventName' | 'status'>) {
  return COMPLETED_PLAN_STATUSES.has(normalize(plan.status)) || isRadioOneEmpPlan(plan)
}

export function splitEmpPlansByHistory<T extends Pick<EmpPlanSummary, 'title' | 'eventName' | 'status'>>(plans: T[]) {
  return plans.reduce(
    (groups, plan) => {
      if (isCompletedEmpHistoryPlan(plan)) {
        groups.historyPlans.push(plan)
      } else {
        groups.activePlans.push(plan)
      }

      return groups
    },
    { activePlans: [] as T[], historyPlans: [] as T[] }
  )
}
