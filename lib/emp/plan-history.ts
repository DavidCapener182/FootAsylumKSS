import type { EmpPlanSummary } from '@/lib/emp/data'

const COMPLETED_PLAN_STATUSES = new Set(['complete', 'completed', 'archived'])
const COMPLETED_DOCUMENT_STATUSES = new Set(['complete', 'completed', 'archived'])
const RADIO_ONE_PATTERN = /\b(?:bbc\s*)?radio\s*(?:1|one)\b|\br1bw\b/i
const ACTIVE_PLAN_START_DATES: Array<{ pattern: RegExp; startDate: string }> = [
  { pattern: /\bdownload festival\b|\bdlf26\b/i, startDate: '2026-06-10' },
  { pattern: /\bisle of wight festival\b|\biow(?:f)?\b|\biow26\b/i, startDate: '2026-06-18' },
  { pattern: /\bparklife festival\b|\bheaton park\b/i, startDate: '2026-06-20' },
  { pattern: /\bstate fayr(?:e)? festival\b|\bstate fayr(?:e)?\b/i, startDate: '2026-06-26' },
  { pattern: /\blatitude festival\b|\bhenham park\b/i, startDate: '2026-07-23' },
  { pattern: /\bwilderness festival\b|\bcornbury park\b/i, startDate: '2026-07-30' },
  { pattern: /\bleeds festival\b|\bbramham park\b/i, startDate: '2026-08-27' },
  { pattern: /\breading festival\b|\brichfield avenue\b/i, startDate: '2026-08-27' },
  { pattern: /\belectric picnic\b|\bstradbally hall\b/i, startDate: '2026-08-28' },
  { pattern: /\b(?:bbc\s*)?radio\s*2\b|\bradio two\b|\bcity park,?\s+stirling\b/i, startDate: '2026-09-11' },
]

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

export function isRadioOneEmpPlan(plan: Pick<EmpPlanSummary, 'title' | 'eventName'>) {
  return RADIO_ONE_PATTERN.test(`${plan.title} ${plan.eventName || ''}`)
}

export function isCompletedEmpHistoryPlan(plan: Pick<EmpPlanSummary, 'title' | 'eventName' | 'status' | 'documentStatus'>) {
  return COMPLETED_PLAN_STATUSES.has(normalize(plan.status))
    || COMPLETED_DOCUMENT_STATUSES.has(normalize(plan.documentStatus))
    || isRadioOneEmpPlan(plan)
}

export function splitEmpPlansByHistory<T extends Pick<EmpPlanSummary, 'title' | 'eventName' | 'status' | 'documentStatus'>>(plans: T[]) {
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

export function getEmpPlanActiveStartDate(plan: Pick<EmpPlanSummary, 'title' | 'eventName'>) {
  return getEmpPlanActiveSchedule(plan)?.startDate || null
}

function getEmpPlanActiveSchedule(plan: Pick<EmpPlanSummary, 'title' | 'eventName'>) {
  const identity = `${plan.title} ${plan.eventName || ''}`
  const scheduleIndex = ACTIVE_PLAN_START_DATES.findIndex((candidate) => candidate.pattern.test(identity))

  if (scheduleIndex === -1) {
    return null
  }

  return {
    startDate: ACTIVE_PLAN_START_DATES[scheduleIndex].startDate,
    scheduleIndex,
  }
}

export function sortActiveEmpPlansByDate<T extends Pick<EmpPlanSummary, 'title' | 'eventName'>>(plans: T[]) {
  return plans
    .map((plan, index) => ({
      plan,
      index,
      schedule: getEmpPlanActiveSchedule(plan),
    }))
    .sort((a, b) => {
      if (a.schedule && b.schedule && a.schedule.startDate !== b.schedule.startDate) {
        return a.schedule.startDate.localeCompare(b.schedule.startDate)
      }

      if (a.schedule && b.schedule && a.schedule.scheduleIndex !== b.schedule.scheduleIndex) {
        return a.schedule.scheduleIndex - b.schedule.scheduleIndex
      }

      if (a.schedule && !b.schedule) return -1
      if (!a.schedule && b.schedule) return 1

      return a.index - b.index
    })
    .map(({ plan }) => plan)
}
