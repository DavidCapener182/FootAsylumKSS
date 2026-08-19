import {
  getStoreActionListTitle,
  getStoreActionQuestion,
  normalizeStoreActionQuestion,
} from '@/lib/store-action-titles'

export type StoreActionSummaryInput = {
  title?: string | null
  description?: string | null
  source_flagged_item?: string | null
  training_completion_rate?: number | null
  source_type?: 'incident' | 'store'
  store_question?: string | null
}

const TOOLBOX_REFRESHER_QUESTION =
  'H&S toolbox refresher training completed in the last 12 months and records available for Manual handling Housekeeping Fire Safety Stepladders?'
const ACTION_SUMMARY_MAX_WORDS = 15

const NON_ACTIONABLE_STORE_QUESTIONS = new Set<string>([
  'Young persons?',
  'Expectant mothers?',
  'PAT?',
  'Fixed Electrical Wiring?',
  'Air Conditioning?',
  'Lift?',
  'Lifting equipment?',
  'Fire Alarm Maintenance?',
  'Emergency Lighting Maintenance?',
  'Sprinkler System?',
  'Escalators - Service and Maintenance?',
  'Fire Extinguisher Service?',
])

const STORE_SUMMARY_OVERRIDES: Record<string, string> = {
  'Are all ladders clearly numbered for identification purposes?': 'Ensure ladders are clearly numbered',
  'Is manual handling being carried out safely and are good practices being followed and posters visible?':
    'Ensure manual handling is being carried out safely with a Manual Handling poster displayed',
  'Are contractors managed whilst working on site? (sign in/out, permit to work)':
    'Ensure contractors are signed in and out on arrival',
  'Is the visitors signing in / out book available and in use?': 'Ensure visitors are signed in and out on arrival',
  'H&S induction training onboarding up to date and at 100%?':
    'Ensure H&S induction training onboarding is at 100%',
}

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function clampToWords(value: string, maxWords = ACTION_SUMMARY_MAX_WORDS) {
  const cleaned = collapseWhitespace(value)
  if (!cleaned) return ''
  return cleaned.split(' ').slice(0, maxWords).join(' ')
}

function formatPercentage(value: number) {
  const clamped = Math.min(100, Math.max(0, value))
  return `${Number.isInteger(clamped) ? clamped : clamped.toFixed(1).replace(/\.0$/, '')}%`
}

function extractPercentage(text: string) {
  for (const match of text.matchAll(/(\d{1,3}(?:\.\d+)?)\s*%/g)) {
    const value = Number.parseFloat(match[1])
    if (Number.isFinite(value) && value >= 0 && value < 100) return formatPercentage(value)
  }
  return null
}

function completionPercentage(action: StoreActionSummaryInput) {
  if (
    typeof action.training_completion_rate === 'number'
    && Number.isFinite(action.training_completion_rate)
    && action.training_completion_rate < 100
  ) {
    return formatPercentage(action.training_completion_rate)
  }

  for (const candidate of [
    action.source_flagged_item,
    action.title,
    action.store_question,
    action.description,
  ]) {
    const percentage = extractPercentage(String(candidate || ''))
    if (percentage) return percentage
  }

  return null
}

function canonicalQuestion(action: StoreActionSummaryInput) {
  const raw = action.store_question || getStoreActionQuestion(action) || getStoreActionListTitle(action)
  return normalizeStoreActionQuestion(raw) || raw
}

function toEnsureStatement(question: string) {
  const cleaned = question
    .replace(/\s*\((yes|no|n\/?a)\)\s*$/i, '')
    .replace(/[?!.]+$/, '')
    .trim()

  if (!cleaned) return 'Ensure this action is completed'

  const rewritten = cleaned
    .replace(/^Are\s+/i, '')
    .replace(/^Is\s+/i, '')
    .replace(/^Has\s+/i, '')
    .replace(/^Have\s+/i, '')
    .replace(/^Can\s+/i, '')
    .replace(/^Do\s+/i, '')
    .replace(/^Does\s+/i, '')
    .replace(/^Any\s+/i, 'any ')

  return `Ensure ${rewritten.charAt(0).toLowerCase()}${rewritten.slice(1)}`
}

function fallbackSummary(action: StoreActionSummaryInput) {
  const question = canonicalQuestion(action)
  if (question === TOOLBOX_REFRESHER_QUESTION) {
    const percentage = completionPercentage(action)
    return percentage
      ? `Ensure H&S toolbox refresher training reaches 100% from current ${percentage}, and update records.`
      : 'Ensure H&S toolbox refresher training reaches 100% and records are updated.'
  }

  return STORE_SUMMARY_OVERRIDES[question] || toEnsureStatement(question)
}

export function isSuppressedStoreActionQuestion(question: string | null | undefined) {
  const raw = String(question || '').trim()
  const normalized = normalizeStoreActionQuestion(raw) || raw
  return NON_ACTIONABLE_STORE_QUESTIONS.has(normalized)
}

export function buildPersistedStoreActionSummary(action: StoreActionSummaryInput) {
  const fallback = clampToWords(fallbackSummary(action) || 'Resolve this failed check.')
  const persisted = clampToWords(String(action.description || ''))
  if (!persisted) return fallback

  const question = canonicalQuestion(action)
  const percentage = completionPercentage(action)
  if (question === TOOLBOX_REFRESHER_QUESTION) {
    if (!persisted.includes('100%') || (percentage && !persisted.includes(percentage))) return fallback
  }

  return persisted
}

export function buildStoreSummaryBullets(actions: StoreActionSummaryInput[]) {
  return actions
    .filter((action) => action.source_type === 'store')
    .map(buildPersistedStoreActionSummary)
    .filter(Boolean)
}
