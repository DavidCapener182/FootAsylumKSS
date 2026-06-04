'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Edit3,
  HelpCircle,
  ListChecks,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  Radio,
  Search,
  Send,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import type { EmpEventControlLogData, EmpEventControlLogEntry } from '@/lib/emp/data'
import {
  EMP_EVENT_CONTROL_LOG_PRIORITY_OPTIONS,
  EMP_EVENT_CONTROL_LOG_STATUS_OPTIONS,
  EMP_EVENT_CONTROL_LOG_TYPE_OPTIONS,
  getEmpEventControlLogPriorityLabel,
  getEmpEventControlLogStatusLabel,
  getEmpEventControlLogTypeLabel,
  normalizeEmpEventControlLogTypeValue,
  type EmpEventControlLogPriority,
  type EmpEventControlLogStatus,
  type EmpEventControlLogType,
} from '@/lib/emp/event-control-log-options'
import { cn, formatAppDateTime, formatAppTime } from '@/lib/utils'

type FormState = {
  loggedAt: string
  fromCallSign: string
  toCallSign: string
  occurrence: string
  messageType: EmpEventControlLogType
  actionTaken: string
  owner: string
  priority: EmpEventControlLogPriority
  status: EmpEventControlLogStatus
}

type QuickActionContext = {
  fromCallSign: string
  toCallSign: string
  owner: string
  detail: string
}

type QuickActionQuestion = {
  id: string
  label: string
  target?: 'occurrence' | 'action' | 'both'
  type?: 'text' | 'textarea' | 'select'
  placeholder?: string
  options?: string[]
  required?: boolean
}

type QuickActionAnswers = Record<string, string>

type AmendmentState = {
  occurrence: string
  actionTaken: string
}

type QuickActionDefinition = {
  id: string
  label: string
  description: string
  messageType: EmpEventControlLogType
  priority: EmpEventControlLogPriority
  status: EmpEventControlLogStatus
  occurrence: string | ((context: QuickActionContext) => string)
  actionTaken: string | ((context: QuickActionContext) => string)
  questions: QuickActionQuestion[]
}

const EVENT_CONTROL_LOG_FUTURE_TOLERANCE_MS = 2 * 60 * 1000
const EVENT_CONTROL_LOG_AUTO_REFRESH_MS = 5000

const EMP_EVENT_CONTROL_QUICK_ACTIONS: QuickActionDefinition[] = [
  {
    id: 'staff-ready-doors',
    label: 'Staff on position ready for doors',
    description: 'Staff on position ready for doors.',
    messageType: 'operational',
    priority: 'low',
    status: 'closed',
    occurrence: 'Staff confirmed on position ready for doors.',
    actionTaken: 'Readiness for doors logged by Event Control.',
    questions: [
      { id: 'area', label: 'Area / gate', placeholder: 'e.g. Main Gate, Bar 2, Campsite A', required: true },
      { id: 'team', label: 'Team / call sign', placeholder: 'e.g. S1, Door team, Green team' },
      { id: 'ready_time', label: 'Ready time', placeholder: 'e.g. 16:45' },
      { id: 'issues', label: 'Issues or gaps', type: 'textarea', placeholder: 'Any missing staff, equipment, or access issues.' },
      { id: 'next_step', label: 'Next action', target: 'action', placeholder: 'e.g. Hold positions until doors instruction.' },
    ],
  },
  {
    id: 'staff-set-egress',
    label: 'Staff on position set for egress',
    description: 'Staff on position set for egress.',
    messageType: 'operational',
    priority: 'low',
    status: 'closed',
    occurrence: 'Staff confirmed on position and set for egress.',
    actionTaken: 'Egress readiness logged by Event Control.',
    questions: [
      { id: 'area', label: 'Area / route', placeholder: 'e.g. South egress route, Campsite exit', required: true },
      { id: 'team', label: 'Team / call sign', placeholder: 'e.g. Egress 1, S3, Gate team' },
      { id: 'position', label: 'Position covered', placeholder: 'e.g. barrier line, gate, crossing point' },
      { id: 'issues', label: 'Issues or restrictions', type: 'textarea', placeholder: 'Any blocked routes, peak-demand areas, or staffing gaps.' },
      { id: 'next_step', label: 'Next action', target: 'action', placeholder: 'e.g. Monitor flow and update Event Control.' },
    ],
  },
  {
    id: 'sit-rep-requested',
    label: 'Sit rep (request information)',
    description: 'Ask a person, team, or area for an update.',
    messageType: 'operational',
    priority: 'medium',
    status: 'monitoring',
    occurrence: ({ toCallSign }) => {
      const target = cleanClientValue(toCallSign)
      return target ? `Sit rep requested from ${target}.` : 'Sit rep requested.'
    },
    actionTaken: 'Awaiting update to Event Control.',
    questions: [
      { id: 'requested_from', label: 'Requested from', placeholder: 'Call sign, team, or area', required: true },
      { id: 'area_topic', label: 'Area / topic', placeholder: 'e.g. bars, campsite, queue line, medical incident' },
      { id: 'information_required', label: 'Information required', type: 'textarea', placeholder: 'What update does Event Control need?' },
      { id: 'response_due', label: 'Response due / check back', target: 'action', placeholder: 'e.g. update in 5 minutes' },
    ],
  },
  {
    id: 'sit-rep-no-issues',
    label: 'Sit rep: no issues',
    description: 'Record a clear update.',
    messageType: 'operational',
    priority: 'low',
    status: 'closed',
    occurrence: ({ fromCallSign }) => {
      const source = cleanClientValue(fromCallSign)
      return source && source !== 'Event Control'
        ? `Sit rep received from ${source}. No issues reported.`
        : 'Sit rep received. No issues reported.'
    },
    actionTaken: 'No further action required at this time.',
    questions: [
      { id: 'source', label: 'Source / team', placeholder: 'Who provided the update?', required: true },
      { id: 'area', label: 'Area covered', placeholder: 'e.g. arena, bars, campsite, queue' },
      { id: 'time_received', label: 'Time received', placeholder: 'e.g. 20:15' },
      { id: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Anything notable despite no issues.' },
      { id: 'next_review', label: 'Next review', target: 'action', placeholder: 'e.g. continue routine monitoring.' },
    ],
  },
  {
    id: 'radio-check-complete',
    label: 'Radio check complete',
    description: 'Radio check or comms check completed.',
    messageType: 'operational',
    priority: 'low',
    status: 'closed',
    occurrence: 'Radio check completed.',
    actionTaken: 'Communications check logged.',
    questions: [
      { id: 'channel', label: 'Channel / net', placeholder: 'e.g. Event Control, Channel 1', required: true },
      { id: 'units_checked', label: 'Units checked', type: 'textarea', placeholder: 'List call signs or teams checked.' },
      { id: 'missing_units', label: 'No response / missing units', placeholder: 'Any units not responding.' },
      { id: 'comms_issue', label: 'Comms issue', type: 'select', options: ['No', 'Yes', 'Unknown'] },
      { id: 'follow_up', label: 'Follow-up action', target: 'action', placeholder: 'e.g. chase missing units.' },
    ],
  },
  {
    id: 'doors-open',
    label: 'Doors open',
    description: 'Record doors or gates opening.',
    messageType: 'operational',
    priority: 'medium',
    status: 'closed',
    occurrence: 'Doors open.',
    actionTaken: 'Opening time logged by Event Control.',
    questions: [
      { id: 'door_gate', label: 'Door / gate', placeholder: 'e.g. Main entrance, North gate', required: true },
      { id: 'open_time', label: 'Open time', placeholder: 'e.g. 17:00' },
      { id: 'opening_status', label: 'Opening status', type: 'select', options: ['On time', 'Delayed', 'Partial', 'Held'] },
      { id: 'queue_status', label: 'Queue / crowd status', placeholder: 'e.g. light queue, heavy queue, flowing well' },
      { id: 'action_update', label: 'Action / update issued', target: 'action', placeholder: 'Who was informed or what was instructed?' },
    ],
  },
  {
    id: 'message-broadcast',
    label: 'Broadcast sent',
    description: 'Log a message issued to teams.',
    messageType: 'operational',
    priority: 'medium',
    status: 'closed',
    occurrence: 'Event Control broadcast issued.',
    actionTaken: 'Message passed to relevant teams.',
    questions: [
      { id: 'audience', label: 'Sent to', placeholder: 'e.g. All teams, bars, campsite supervisors', required: true },
      { id: 'message', label: 'Message sent', type: 'textarea', placeholder: 'Exact broadcast or instruction.', required: true },
      { id: 'channel', label: 'Channel used', placeholder: 'Radio channel, WhatsApp, phone, runner' },
      { id: 'confirmation', label: 'Confirmation required', type: 'select', options: ['No', 'Yes', 'Unknown'] },
      { id: 'follow_up', label: 'Follow-up action', target: 'action', placeholder: 'e.g. await acknowledgements.' },
    ],
  },
  {
    id: 'stand-down',
    label: 'Stand down issued',
    description: 'Record stand down or closure instruction.',
    messageType: 'operational',
    priority: 'medium',
    status: 'closed',
    occurrence: 'Stand down instruction issued.',
    actionTaken: 'Instruction logged and teams updated.',
    questions: [
      { id: 'team_area', label: 'Team / area', placeholder: 'Who is standing down?', required: true },
      { id: 'stand_down_time', label: 'Stand down time', placeholder: 'e.g. 23:15' },
      { id: 'reason', label: 'Reason', placeholder: 'e.g. area clear, task complete, event closed' },
      { id: 'remaining_tasks', label: 'Remaining tasks / exceptions', type: 'textarea', placeholder: 'Anything still active before closing.' },
      { id: 'handover', label: 'Handover / next action', target: 'action', placeholder: 'e.g. hand over to night team.' },
    ],
  },
  {
    id: 'medical-requested',
    label: 'Medical requested',
    description: 'Medical response requested.',
    messageType: 'medical',
    priority: 'high',
    status: 'open',
    occurrence: 'Medical response requested.',
    actionTaken: 'Medical team requested to attend and update Event Control.',
    questions: [
      { id: 'location', label: 'Location', placeholder: 'e.g. Main Stage barrier left, Bar 4, Campsite B', required: true },
      { id: 'conscious', label: 'Conscious', type: 'select', options: ['Unknown', 'Yes', 'No'], required: true },
      { id: 'breathing', label: 'Breathing', type: 'select', options: ['Unknown', 'Yes', 'No'], required: true },
      { id: 'approx_age', label: 'Approx age', placeholder: 'e.g. 20s, approx 35' },
      { id: 'sex', label: 'M/F', type: 'select', options: ['Unknown', 'M', 'F'] },
      { id: 'condition', label: 'Condition / injury', type: 'textarea', placeholder: 'What has been reported?' },
      { id: 'access_notes', label: 'Access / route notes', target: 'action', placeholder: 'Best route or who will meet medical.' },
    ],
  },
  {
    id: 'welfare-requested',
    label: 'Welfare requested',
    description: 'Welfare response requested.',
    messageType: 'welfare',
    priority: 'medium',
    status: 'open',
    occurrence: 'Welfare response requested.',
    actionTaken: 'Welfare team requested to attend and update Event Control.',
    questions: [
      { id: 'location', label: 'Location', placeholder: 'e.g. Bar 2, Campsite A, welfare tent', required: true },
      { id: 'concern', label: 'Concern', type: 'textarea', placeholder: 'What welfare concern has been reported?', required: true },
      { id: 'person_description', label: 'Person description', placeholder: 'Clothing, approximate age, M/F if known' },
      { id: 'with_friends', label: 'With friends / group', type: 'select', options: ['Unknown', 'Yes', 'No'] },
      { id: 'escalation', label: 'Police / medical needed', type: 'select', options: ['Unknown', 'No', 'Yes'] },
      { id: 'action_update', label: 'Action / update required', target: 'action', placeholder: 'What should Welfare report back?' },
    ],
  },
]

function cleanClientValue(value: unknown) {
  return String(value || '').trim()
}

function toDateTimeLocalValue(value: Date | string = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 19)
}

function toIsoTimestamp(value: string) {
  const raw = cleanClientValue(value)
  const now = new Date()
  const date = raw ? new Date(raw) : now
  if (Number.isNaN(date.getTime())) return now.toISOString()
  return date.getTime() - now.getTime() > EVENT_CONTROL_LOG_FUTURE_TOLERANCE_MS
    ? now.toISOString()
    : date.toISOString()
}

function buildEmptyFormState(): FormState {
  return {
    loggedAt: toDateTimeLocalValue(),
    fromCallSign: '',
    toCallSign: 'Event Control',
    occurrence: '',
    messageType: getEmpEventControlLogTypeLabel('operational'),
    actionTaken: '',
    owner: '',
    priority: 'medium',
    status: 'open',
  }
}

function buildEmptyQuickActionContext(): QuickActionContext {
  return {
    fromCallSign: 'Event Control',
    toCallSign: 'All Teams',
    owner: '',
    detail: '',
  }
}

function buildEmptyAmendmentState(): AmendmentState {
  return {
    occurrence: '',
    actionTaken: '',
  }
}

function buildFormStateFromEntry(entry: EmpEventControlLogEntry): FormState {
  return {
    loggedAt: toDateTimeLocalValue(entry.loggedAt),
    fromCallSign: entry.fromCallSign || '',
    toCallSign: entry.toCallSign || 'Event Control',
    occurrence: entry.occurrence,
    messageType: getEmpEventControlLogTypeLabel(entry.messageType),
    actionTaken: entry.actionTaken || '',
    owner: entry.owner || '',
    priority: entry.priority,
    status: entry.status,
  }
}

function resolveQuickActionText(
  value: QuickActionDefinition['occurrence'] | QuickActionDefinition['actionTaken'],
  context: QuickActionContext
) {
  return typeof value === 'function' ? value(context) : value
}

function getQuickActionQuestionLines(
  action: QuickActionDefinition,
  answers: QuickActionAnswers,
  target: 'occurrence' | 'action'
) {
  return action.questions.flatMap((question) => {
    const questionTarget = question.target || 'occurrence'
    const shouldInclude = questionTarget === target || questionTarget === 'both'
    const answer = cleanClientValue(answers[question.id])

    return shouldInclude && answer ? [`${question.label}: ${answer}`] : []
  })
}

function getMissingQuickActionQuestions(action: QuickActionDefinition, answers: QuickActionAnswers) {
  return action.questions.filter((question) => question.required && !cleanClientValue(answers[question.id]))
}

function buildQuickActionFormState(
  action: QuickActionDefinition,
  context: QuickActionContext,
  answers: QuickActionAnswers
): FormState {
  const detail = cleanClientValue(context.detail)
  const occurrence = [
    resolveQuickActionText(action.occurrence, context),
    ...getQuickActionQuestionLines(action, answers, 'occurrence'),
    detail ? `Extra detail: ${detail}` : '',
  ].filter(Boolean).join('\n')
  const actionTaken = [
    resolveQuickActionText(action.actionTaken, context),
    ...getQuickActionQuestionLines(action, answers, 'action'),
  ].filter(Boolean).join('\n')

  return {
    loggedAt: toDateTimeLocalValue(),
    fromCallSign: cleanClientValue(context.fromCallSign) || 'Event Control',
    toCallSign: cleanClientValue(context.toCallSign) || 'Event Control',
    occurrence,
    messageType: getEmpEventControlLogTypeLabel(action.messageType),
    actionTaken,
    owner: cleanClientValue(context.owner),
    priority: action.priority,
    status: action.status,
  }
}

function formatLogNumber(value: number) {
  return String(Math.max(0, Number(value || 0))).padStart(3, '0')
}

function priorityClass(priority: EmpEventControlLogPriority) {
  switch (priority) {
    case 'urgent':
      return 'border-red-200 bg-red-50 text-red-700'
    case 'high':
      return 'border-rose-200 bg-rose-50 text-rose-700'
    case 'medium':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    default:
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
}

function priorityRowClass(priority: EmpEventControlLogPriority) {
  switch (priority) {
    case 'urgent':
      return 'bg-red-50/80'
    case 'high':
      return 'bg-rose-50/70'
    case 'medium':
      return 'bg-amber-50/35'
    default:
      return 'bg-white'
  }
}

function statusClass(status: EmpEventControlLogStatus) {
  switch (status) {
    case 'closed':
      return 'border-slate-200 bg-slate-100 text-slate-700'
    case 'monitoring':
      return 'border-sky-200 bg-sky-50 text-sky-700'
    default:
      return 'border-blue-200 bg-blue-50 text-blue-700'
  }
}

function typeClass(type: EmpEventControlLogType) {
  switch (normalizeEmpEventControlLogTypeValue(type)) {
    case 'medical':
      return 'border-red-100 bg-red-50 text-red-700'
    case 'welfare':
      return 'border-violet-100 bg-violet-50 text-violet-700'
    case 'security':
      return 'border-slate-200 bg-slate-100 text-slate-800'
    case 'bars':
      return 'border-amber-100 bg-amber-50 text-amber-800'
    case 'campsites':
      return 'border-lime-100 bg-lime-50 text-lime-800'
    case 'traffic':
      return 'border-orange-100 bg-orange-50 text-orange-700'
    case 'weather':
      return 'border-cyan-100 bg-cyan-50 text-cyan-700'
    default:
      return 'border-emerald-100 bg-emerald-50 text-emerald-700'
  }
}

function sortEntries(entries: EmpEventControlLogEntry[]) {
  return [...entries].sort((first, second) => {
    const logDiff = Number(second.logNumber || 0) - Number(first.logNumber || 0)
    if (logDiff !== 0) return logDiff

    const createdDiff = new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
    if (createdDiff !== 0) return createdDiff

    return new Date(second.loggedAt).getTime() - new Date(first.loggedAt).getTime()
  })
}

function uniqueTextSuggestions(values: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const suggestions: string[] = []

  values.forEach((value) => {
    const suggestion = String(value || '').trim()
    const key = suggestion.toLowerCase()
    if (!suggestion || seen.has(key)) return
    seen.add(key)
    suggestions.push(suggestion)
  })

  return suggestions
}

function uniqueTypeSuggestions(values: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const suggestions: string[] = []

  values.forEach((value) => {
    const normalized = normalizeEmpEventControlLogTypeValue(value)
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    suggestions.push(normalized)
  })

  return suggestions
}

function normalizeInitialSuggestions(value: EmpEventControlLogData['suggestions'] | undefined) {
  return {
    messageTypes: uniqueTypeSuggestions(value?.messageTypes || []),
    contacts: uniqueTextSuggestions(value?.contacts || []),
  }
}

export function EmpEventControlLogClient({ initialData }: { initialData: EmpEventControlLogData }) {
  const [entries, setEntries] = useState(() => sortEntries(initialData.entries))
  const [savedSuggestions, setSavedSuggestions] = useState(() => normalizeInitialSuggestions(initialData.suggestions))
  const [form, setForm] = useState<FormState>(() => buildEmptyFormState())
  const [useLiveTimestamp, setUseLiveTimestamp] = useState(true)
  const [quickActionsOpen, setQuickActionsOpen] = useState(false)
  const [quickActionContext, setQuickActionContext] = useState<QuickActionContext>(() => buildEmptyQuickActionContext())
  const [selectedQuickActionId, setSelectedQuickActionId] = useState<string | null>(null)
  const [quickActionAnswers, setQuickActionAnswers] = useState<QuickActionAnswers>({})
  const [quickActionError, setQuickActionError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<'all' | EmpEventControlLogPriority>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | EmpEventControlLogStatus>('all')
  const [editingEntry, setEditingEntry] = useState<EmpEventControlLogEntry | null>(null)
  const [editForm, setEditForm] = useState<FormState | null>(null)
  const [editAmendments, setEditAmendments] = useState<AmendmentState>(() => buildEmptyAmendmentState())
  const [pendingEntryId, setPendingEntryId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [liveSyncAt, setLiveSyncAt] = useState<string | null>(null)
  const [liveSyncError, setLiveSyncError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const stats = useMemo(() => {
    const open = entries.filter((entry) => entry.status === 'open').length
    const monitoring = entries.filter((entry) => entry.status === 'monitoring').length
    const high = entries.filter((entry) => entry.priority === 'high' || entry.priority === 'urgent').length
    return { total: entries.length, open, monitoring, high }
  }, [entries])

  const filteredEntries = useMemo(() => {
    const term = search.trim().toLowerCase()
    return sortEntries(entries.filter((entry) => {
      const matchesSearch = !term || [
        entry.fromCallSign,
        entry.toCallSign,
        entry.occurrence,
        entry.actionTaken,
        entry.owner,
        getEmpEventControlLogTypeLabel(entry.messageType),
        getEmpEventControlLogPriorityLabel(entry.priority),
        getEmpEventControlLogStatusLabel(entry.status),
      ].some((value) => String(value || '').toLowerCase().includes(term))
      const matchesPriority = priorityFilter === 'all' || entry.priority === priorityFilter
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter
      return matchesSearch && matchesPriority && matchesStatus
    }))
  }, [entries, priorityFilter, search, statusFilter])

  const messageTypeOptions = useMemo(
    () => uniqueTypeSuggestions([
      ...EMP_EVENT_CONTROL_LOG_TYPE_OPTIONS.map((option) => option.value),
      ...savedSuggestions.messageTypes,
      ...entries.map((entry) => entry.messageType),
    ]),
    [entries, savedSuggestions.messageTypes]
  )

  const contactOptions = useMemo(
    () => uniqueTextSuggestions([
      'Event Control',
      ...savedSuggestions.contacts,
      ...entries.flatMap((entry) => [entry.fromCallSign, entry.toCallSign, entry.owner]),
    ]),
    [entries, savedSuggestions.contacts]
  )

  const selectedQuickAction = useMemo(
    () => EMP_EVENT_CONTROL_QUICK_ACTIONS.find((action) => action.id === selectedQuickActionId) || null,
    [selectedQuickActionId]
  )

  const lastUpdated = entries[0]?.updatedAt || initialData.plan.updatedAt
  const printHref = `/print/emp-master-template?templateId=event-control-log&planId=${encodeURIComponent(initialData.plan.id)}`
  const pdfHref = `/api/emp/master-templates/generate-pdf?templateId=event-control-log&planId=${encodeURIComponent(initialData.plan.id)}`

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  useEffect(() => {
    if (!useLiveTimestamp) return

    const syncTimestamp = () => {
      const loggedAt = toDateTimeLocalValue()
      setForm((current) => (current.loggedAt === loggedAt ? current : { ...current, loggedAt }))
    }

    syncTimestamp()
    const timer = window.setInterval(syncTimestamp, 1000)
    return () => window.clearInterval(timer)
  }, [useLiveTimestamp])

  const useCurrentTimestamp = () => {
    setUseLiveTimestamp(true)
    setForm((current) => ({ ...current, loggedAt: toDateTimeLocalValue() }))
  }

  const updateEditForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setEditForm((current) => (current ? { ...current, [key]: value } : current))
  }

  const updateEditAmendment = <K extends keyof AmendmentState>(key: K, value: AmendmentState[K]) => {
    setEditAmendments((current) => ({ ...current, [key]: value }))
  }

  const updateQuickActionContext = <K extends keyof QuickActionContext>(key: K, value: QuickActionContext[K]) => {
    setQuickActionError(null)
    setQuickActionContext((current) => ({ ...current, [key]: value }))
  }

  const selectQuickAction = (action: QuickActionDefinition) => {
    setQuickActionError(null)
    if (selectedQuickActionId !== action.id) {
      setQuickActionAnswers({})
    }
    setSelectedQuickActionId(action.id)
  }

  const updateQuickActionAnswer = (questionId: string, value: string) => {
    setQuickActionError(null)
    setQuickActionAnswers((current) => ({ ...current, [questionId]: value }))
  }

  const loadEntries = useCallback(async ({ announce = false }: { announce?: boolean } = {}) => {
    try {
      if (announce) {
        setError(null)
        setNotice(null)
      }

      const response = await fetch(`/api/emp/event-control-log?planId=${encodeURIComponent(initialData.plan.id)}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || data.details || `Failed to refresh log (${response.status})`)
      }

      setEntries(sortEntries(Array.isArray(data.entries) ? data.entries : []))
      setSavedSuggestions(normalizeInitialSuggestions(data.suggestions))
      setLiveSyncAt(new Date().toISOString())
      setLiveSyncError(null)
      if (announce) setNotice('Log refreshed.')
    } catch (refreshError: any) {
      const message = refreshError?.message || 'Failed to refresh log'
      setLiveSyncError(message)
      if (announce) setError(message)
    }
  }, [initialData.plan.id])

  const refreshEntries = () => {
    startTransition(async () => {
      await loadEntries({ announce: true })
    })
  }

  useEffect(() => {
    const syncVisibleLog = () => {
      if (document.hidden) return
      void loadEntries()
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) syncVisibleLog()
    }

    syncVisibleLog()
    const timer = window.setInterval(syncVisibleLog, EVENT_CONTROL_LOG_AUTO_REFRESH_MS)
    window.addEventListener('focus', syncVisibleLog)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', syncVisibleLog)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [loadEntries])

  const createLogEntry = (
    entryForm: FormState,
    onSuccess: (entry: EmpEventControlLogEntry) => void
  ) => {
    if (!entryForm.occurrence.trim()) {
      setError('Add the radio message or occurrence before saving the log entry.')
      return
    }

    startTransition(async () => {
      try {
        setError(null)
        setNotice(null)
        const response = await fetch('/api/emp/event-control-log', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: initialData.plan.id,
            ...entryForm,
            loggedAt: toIsoTimestamp(entryForm.loggedAt),
          }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(data.error || data.details || `Failed to add log entry (${response.status})`)
        }

        const createdEntry = data.entry as EmpEventControlLogEntry
        setEntries((current) => sortEntries([createdEntry, ...current]))
        onSuccess(createdEntry)
      } catch (submitError: any) {
        setError(submitError?.message || 'Failed to add log entry')
      }
    })
  }

  const submitEntry = () => {
    createLogEntry(form, (entry) => {
      setForm((current) => ({
        ...buildEmptyFormState(),
        fromCallSign: current.fromCallSign,
        toCallSign: current.toCallSign || 'Event Control',
        messageType: current.messageType,
        owner: current.owner,
        priority: current.priority,
      }))
      setUseLiveTimestamp(true)
      setNotice(`Log ${formatLogNumber(entry.logNumber)} added.`)
    })
  }

  const submitQuickAction = () => {
    if (!selectedQuickAction) {
      setQuickActionError('Select a quick action first.')
      return
    }

    const missingQuestions = getMissingQuickActionQuestions(selectedQuickAction, quickActionAnswers)
    if (missingQuestions.length > 0) {
      setQuickActionError(`Add ${missingQuestions[0].label.toLowerCase()} before adding this quick action.`)
      return
    }

    const quickActionForm = buildQuickActionFormState(selectedQuickAction, quickActionContext, quickActionAnswers)
    createLogEntry(quickActionForm, (entry) => {
      setQuickActionContext((current) => ({ ...current, detail: '' }))
      setSelectedQuickActionId(null)
      setQuickActionAnswers({})
      setQuickActionError(null)
      setNotice(`${selectedQuickAction.label} added as log ${formatLogNumber(entry.logNumber)}.`)
    })
  }

  const updateEntry = (
    entry: EmpEventControlLogEntry,
    updates: Partial<Pick<EmpEventControlLogEntry, 'priority' | 'status'>>
  ) => {
    startTransition(async () => {
      try {
        setPendingEntryId(entry.id)
        setError(null)
        setNotice(null)
        const response = await fetch('/api/emp/event-control-log', {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: initialData.plan.id,
            entryId: entry.id,
            priority: updates.priority,
            status: updates.status,
          }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(data.error || data.details || `Failed to update log entry (${response.status})`)
        }
        setEntries((current) => sortEntries(current.map((item) => (item.id === entry.id ? data.entry : item))))
      } catch (updateError: any) {
        setError(updateError?.message || 'Failed to update log entry')
      } finally {
        setPendingEntryId(null)
      }
    })
  }

  const beginEditEntry = (entry: EmpEventControlLogEntry) => {
    setError(null)
    setNotice(null)
    setEditingEntry(entry)
    setEditForm(buildFormStateFromEntry(entry))
    setEditAmendments(buildEmptyAmendmentState())
  }

  const closeEditEntry = () => {
    if (isPending) return
    setEditingEntry(null)
    setEditForm(null)
    setEditAmendments(buildEmptyAmendmentState())
  }

  const saveEditedEntry = () => {
    if (!editingEntry || !editForm) return

    startTransition(async () => {
      try {
        setPendingEntryId(editingEntry.id)
        setError(null)
        setNotice(null)
        const response = await fetch('/api/emp/event-control-log', {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: initialData.plan.id,
            entryId: editingEntry.id,
            loggedAt: toIsoTimestamp(editForm.loggedAt),
            fromCallSign: editForm.fromCallSign,
            toCallSign: editForm.toCallSign,
            messageType: editForm.messageType,
            owner: editForm.owner,
            priority: editForm.priority,
            status: editForm.status,
            occurrenceAmendment: editAmendments.occurrence,
            actionTakenAmendment: editAmendments.actionTaken,
          }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(data.error || data.details || `Failed to update log entry (${response.status})`)
        }
        setEntries((current) => sortEntries(current.map((item) => (item.id === editingEntry.id ? data.entry : item))))
        setEditingEntry(null)
        setEditForm(null)
        setEditAmendments(buildEmptyAmendmentState())
        setNotice(`Log ${formatLogNumber(data.entry?.logNumber || editingEntry.logNumber)} updated.`)
      } catch (updateError: any) {
        setError(updateError?.message || 'Failed to update log entry')
      } finally {
        setPendingEntryId(null)
      }
    })
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <a
              href="/admin/event-management-plans"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to EMP workspace
            </a>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">Event Control Log</h1>
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  {initialData.plan.eventName || 'Event not set'}
                </Badge>
              </div>
              <p className="hidden max-w-3xl text-sm leading-6 text-slate-600 sm:block">
                {initialData.plan.title}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 min-[430px]:grid-cols-2 xl:flex xl:flex-wrap xl:items-center">
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-medium text-slate-600 sm:px-4">
              Updated: {formatAppDateTime(lastUpdated, {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              }, lastUpdated)}
            </div>
            <div
              className={cn(
                'rounded-full border px-3 py-2 text-center text-xs font-medium sm:px-4',
                liveSyncError
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              )}
              title={liveSyncError || 'Event control log auto-refreshes every 5 seconds.'}
            >
              {liveSyncError
                ? 'Live sync issue'
                : liveSyncAt
                  ? `Live sync: ${formatAppTime(liveSyncAt, { second: '2-digit' }, liveSyncAt)}`
                  : 'Live sync on'}
            </div>
            <Button type="button" variant="outline" onClick={refreshEntries} disabled={isPending} className="w-full xl:w-auto">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
            <a href={printHref} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: 'outline' }), 'w-full xl:w-auto')}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </a>
            <a href={pdfHref} className={cn(buttonVariants({ variant: 'default' }), 'w-full bg-emerald-700 hover:bg-emerald-800 xl:w-auto')}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </a>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:px-4 sm:py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total entries</p>
            <p className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 sm:px-4 sm:py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Open</p>
            <p className="mt-1 text-xl font-bold text-blue-950 sm:text-2xl">{stats.open}</p>
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 sm:px-4 sm:py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">Monitoring</p>
            <p className="mt-1 text-xl font-bold text-sky-950 sm:text-2xl">{stats.monitoring}</p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 sm:px-4 sm:py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">High priority</p>
            <p className="mt-1 text-xl font-bold text-rose-950 sm:text-2xl">{stats.high}</p>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:pb-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-emerald-700" />
              <h2 className="text-base font-semibold text-slate-950 sm:text-lg">Add radio message</h2>
            </div>
            <p className="hidden text-sm text-slate-500 sm:block">
              Record the source, occurrence, action, priority, and current status while the message is fresh.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => setQuickActionsOpen(true)} className="w-full shrink-0 md:w-auto">
            <ListChecks className="mr-2 h-4 w-4" />
            Quick actions
          </Button>
        </div>

        <datalist id="event-control-contact-options">
          {contactOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <datalist id="event-control-type-options">
          {messageTypeOptions.map((option) => (
            <option key={option} value={getEmpEventControlLogTypeLabel(option)} />
          ))}
        </datalist>

        <div className="mt-3 grid gap-3 sm:mt-5 sm:gap-4 lg:grid-cols-6">
          <div className="space-y-2 lg:col-span-2 xl:col-span-1">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="event-control-logged-at">Time</Label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={useCurrentTimestamp}
                aria-label="Use current time"
                className="h-7 min-h-7 w-7 min-w-7 text-slate-500 hover:text-emerald-700"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Input
              id="event-control-logged-at"
              type="datetime-local"
              step="1"
              value={form.loggedAt}
              onChange={(event) => {
                setUseLiveTimestamp(false)
                updateForm('loggedAt', event.target.value)
              }}
              className="rounded-md"
            />
          </div>
          <div className="space-y-2 lg:col-span-2 xl:col-span-1">
            <Label htmlFor="event-control-from">From</Label>
            <Input
              id="event-control-from"
              list="event-control-contact-options"
              value={form.fromCallSign}
              onChange={(event) => updateForm('fromCallSign', event.target.value)}
              placeholder="A1, F5, Medical"
              className="rounded-md"
            />
          </div>
          <div className="space-y-2 lg:col-span-2 xl:col-span-1">
            <Label htmlFor="event-control-to">To</Label>
            <Input
              id="event-control-to"
              list="event-control-contact-options"
              value={form.toCallSign}
              onChange={(event) => updateForm('toCallSign', event.target.value)}
              className="rounded-md"
            />
          </div>
          <div className="space-y-2 lg:col-span-2 xl:col-span-1">
            <Label htmlFor="event-control-type">Type</Label>
            <Input
              id="event-control-type"
              list="event-control-type-options"
              value={form.messageType}
              onChange={(event) => updateForm('messageType', event.target.value)}
              placeholder="Bars, Campsites, Medical"
              className="rounded-md"
            />
          </div>
          <div className="space-y-2 lg:col-span-2 xl:col-span-1">
            <Label htmlFor="event-control-priority">Priority</Label>
            <select
              id="event-control-priority"
              value={form.priority}
              onChange={(event) => updateForm('priority', event.target.value as EmpEventControlLogPriority)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
            >
              {EMP_EVENT_CONTROL_LOG_PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2 lg:col-span-2 xl:col-span-1">
            <Label htmlFor="event-control-status">Status</Label>
            <select
              id="event-control-status"
              value={form.status}
              onChange={(event) => updateForm('status', event.target.value as EmpEventControlLogStatus)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
            >
              {EMP_EVENT_CONTROL_LOG_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_220px]">
          <div className="space-y-2">
            <Label htmlFor="event-control-occurrence">Occurrence</Label>
            <Textarea
              id="event-control-occurrence"
              value={form.occurrence}
              onChange={(event) => updateForm('occurrence', event.target.value)}
              placeholder="Radio message, incident detail, location, and immediate facts."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-control-action">Action taken</Label>
            <Textarea
              id="event-control-action"
              value={form.actionTaken}
              onChange={(event) => updateForm('actionTaken', event.target.value)}
              placeholder="Dispatch, escalation, update issued, outcome, or next check."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-control-owner">Owner</Label>
            <Input
              id="event-control-owner"
              list="event-control-contact-options"
              value={form.owner}
              onChange={(event) => updateForm('owner', event.target.value)}
              placeholder="Controller / lead"
              className="rounded-md"
            />
            <Button type="button" onClick={submitEntry} disabled={isPending} className="mt-4 w-full bg-emerald-700 hover:bg-emerald-800">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add to log
            </Button>
          </div>
        </div>

        {notice ? <div className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</div> : null}
        {error ? <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-3 py-3 sm:px-5 sm:py-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950 sm:text-lg">Control log</h2>
            <p className="mt-1 text-sm text-slate-500">
              Showing {filteredEntries.length} of {entries.length} entries.
            </p>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <label className="relative block md:w-[300px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search log..."
                className="rounded-md pl-9"
              />
            </label>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as 'all' | EmpEventControlLogPriority)}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
            >
              <option value="all">All priorities</option>
              {EMP_EVENT_CONTROL_LOG_PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | EmpEventControlLogStatus)}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
            >
              <option value="all">All statuses</option>
              {EMP_EVENT_CONTROL_LOG_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="px-3 py-8 text-center sm:px-5 sm:py-14">
            <p className="text-sm font-medium text-slate-700">No matching log entries.</p>
            <p className="mt-1 text-sm text-slate-500">Add the first radio message above or clear the current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1480px] w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col style={{ width: '84px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '150px' }} />
                <col />
                <col style={{ width: '140px' }} />
                <col />
                <col style={{ width: '132px' }} />
                <col style={{ width: '140px' }} />
                <col style={{ width: '58px' }} />
              </colgroup>
              <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Log</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-5 py-3">Occurrence</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className={cn('align-top transition-colors', priorityRowClass(entry.priority))}>
                    <td className="px-4 py-4">
                      <div className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">
                        {formatLogNumber(entry.logNumber)}
                      </div>
                      <div className="mt-1 text-xs font-medium text-slate-600">
                        {formatAppTime(entry.loggedAt, {}, entry.loggedAt)}
                      </div>
                    </td>
                    <td className="break-words px-4 py-4 font-medium text-slate-900">{entry.fromCallSign || '-'}</td>
                    <td className="break-words px-4 py-4 font-medium text-slate-900">{entry.toCallSign || '-'}</td>
                    <td className="px-5 py-4 text-slate-700">
                      <p className="whitespace-pre-wrap break-words leading-5">{entry.occurrence}</p>
                      {entry.owner ? <p className="mt-2 text-xs font-medium text-slate-500">Owner: {entry.owner}</p> : null}
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant="outline" className={cn('shadow-none', typeClass(entry.messageType))}>
                        {getEmpEventControlLogTypeLabel(entry.messageType)}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      <p className="whitespace-pre-wrap break-words leading-5">{entry.actionTaken || '-'}</p>
                    </td>
                    <td className="px-3 py-4">
                      <select
                        value={entry.priority}
                        disabled={pendingEntryId === entry.id}
                        onChange={(event) => updateEntry(entry, { priority: event.target.value as EmpEventControlLogPriority })}
                        className={cn('h-9 w-full rounded-full border px-3 text-xs font-semibold', priorityClass(entry.priority))}
                      >
                        {EMP_EVENT_CONTROL_LOG_PRIORITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={entry.status}
                        disabled={pendingEntryId === entry.id}
                        onChange={(event) => updateEntry(entry, { status: event.target.value as EmpEventControlLogStatus })}
                        className={cn('h-9 w-full rounded-full border px-3 text-xs font-semibold', statusClass(entry.status))}
                      >
                        {EMP_EVENT_CONTROL_LOG_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={pendingEntryId === entry.id}
                        onClick={() => beginEditEntry(entry)}
                        aria-label={`Edit log ${formatLogNumber(entry.logNumber)}`}
                        className="text-slate-500 hover:text-emerald-700"
                      >
                        {pendingEntryId === entry.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Edit3 className="h-4 w-4" />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Sheet open={quickActionsOpen} onOpenChange={setQuickActionsOpen}>
        <SheetContent className="overflow-y-auto bg-white p-0 text-slate-900 sm:w-[520px]">
          <div className="border-b border-slate-200 px-3 py-3 sm:px-5 sm:py-5">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-emerald-700" />
              <SheetTitle className="text-lg font-semibold text-slate-950">Quick actions</SheetTitle>
            </div>
            <SheetDescription className="mt-1 text-sm text-slate-500">
              Select a common control-room update, complete the prompts, then add it to the log.
            </SheetDescription>
          </div>

          <div className="space-y-3 px-3 py-3 sm:space-y-4 sm:px-5 sm:py-5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quick-action-from">From</Label>
                  <Input
                    id="quick-action-from"
                    list="event-control-contact-options"
                    value={quickActionContext.fromCallSign}
                    onChange={(event) => updateQuickActionContext('fromCallSign', event.target.value)}
                    className="rounded-md bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quick-action-to">To</Label>
                  <Input
                    id="quick-action-to"
                    list="event-control-contact-options"
                    value={quickActionContext.toCallSign}
                    onChange={(event) => updateQuickActionContext('toCallSign', event.target.value)}
                    className="rounded-md bg-white"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="quick-action-owner">Owner</Label>
                  <Input
                    id="quick-action-owner"
                    list="event-control-contact-options"
                    value={quickActionContext.owner}
                    onChange={(event) => updateQuickActionContext('owner', event.target.value)}
                    placeholder="Controller / lead"
                    className="rounded-md bg-white"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="quick-action-detail">Extra detail</Label>
                  <Textarea
                    id="quick-action-detail"
                    value={quickActionContext.detail}
                    onChange={(event) => updateQuickActionContext('detail', event.target.value)}
                    placeholder="Area, time, gate, stand, or instruction detail."
                    rows={3}
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            {selectedQuickAction ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950">{selectedQuickAction.label}</p>
                    <p className="mt-0.5 text-sm leading-5 text-slate-600">
                      Add the detail needed before this update is logged.
                    </p>
                  </div>
                  <Badge variant="outline" className={cn('shrink-0 bg-white shadow-none', typeClass(selectedQuickAction.messageType))}>
                    {getEmpEventControlLogTypeLabel(selectedQuickAction.messageType)}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3">
                  {selectedQuickAction.questions.map((question) => {
                    const questionId = `quick-action-question-${selectedQuickAction.id}-${question.id}`
                    const value = quickActionAnswers[question.id] || ''

                    return (
                      <div key={question.id} className="space-y-2">
                        <Label htmlFor={questionId}>
                          {question.label}
                          {question.required ? <span className="ml-1 text-red-600">*</span> : null}
                        </Label>
                        {question.type === 'textarea' ? (
                          <Textarea
                            id={questionId}
                            value={value}
                            onChange={(event) => updateQuickActionAnswer(question.id, event.target.value)}
                            placeholder={question.placeholder}
                            rows={3}
                            className="bg-white"
                          />
                        ) : question.type === 'select' ? (
                          <select
                            id={questionId}
                            value={value}
                            onChange={(event) => updateQuickActionAnswer(question.id, event.target.value)}
                            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                          >
                            <option value="">Select...</option>
                            {(question.options || []).map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            id={questionId}
                            value={value}
                            onChange={(event) => updateQuickActionAnswer(question.id, event.target.value)}
                            placeholder={question.placeholder}
                            className="rounded-md bg-white"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>

                {quickActionError ? (
                  <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    {quickActionError}
                  </div>
                ) : null}

                <Button
                  type="button"
                  onClick={submitQuickAction}
                  disabled={isPending}
                  className="mt-4 w-full bg-emerald-700 hover:bg-emerald-800"
                >
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Add quick action to log
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-sm text-slate-500">
                Choose a quick action below to show the follow-up questions.
              </div>
            )}

            <div className="grid gap-2">
              {EMP_EVENT_CONTROL_QUICK_ACTIONS.map((action) => {
                const ActionIcon =
                  action.id === 'sit-rep-requested'
                    ? HelpCircle
                    : action.id.includes('requested') || action.id === 'message-broadcast'
                      ? Send
                      : CheckCircle2
                const isSelected = selectedQuickActionId === action.id

                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => selectQuickAction(action)}
                    disabled={isPending}
                    aria-pressed={isSelected}
                    className={cn(
                      'group flex w-full items-start gap-3 rounded-lg border bg-white p-3 text-left shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60',
                      isSelected ? 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200' : 'border-slate-200'
                    )}
                  >
                    <span className={cn(
                      'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600 transition group-hover:border-emerald-200 group-hover:bg-white group-hover:text-emerald-700',
                      isSelected ? 'border-emerald-200 bg-white text-emerald-700' : ''
                    )}>
                      {isPending && isSelected ? <Loader2 className="h-4 w-4 animate-spin" /> : <ActionIcon className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-950">{action.label}</span>
                      <span className="mt-0.5 block text-sm leading-5 text-slate-500">{action.description}</span>
                    </span>
                    <span className={cn(
                      'rounded-full border px-2 py-1 text-xs font-semibold',
                      isSelected
                        ? 'border-emerald-300 bg-white text-emerald-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    )}>
                      {isSelected ? 'Selected' : 'Select'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(editingEntry)} onOpenChange={(open) => {
        if (!open) closeEditEntry()
      }}>
        <DialogContent className="md:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Edit log {editingEntry ? formatLogNumber(editingEntry.logNumber) : ''}
            </DialogTitle>
            <DialogDescription>
              Update routing, priority, or status. Occurrence and action text is locked; add timestamped amendments for the audit trail.
            </DialogDescription>
          </DialogHeader>

          {editForm ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="event-control-edit-logged-at">Time</Label>
                  <Input
                    id="event-control-edit-logged-at"
                    type="datetime-local"
                    step="1"
                    value={editForm.loggedAt}
                    onChange={(event) => updateEditForm('loggedAt', event.target.value)}
                    className="rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-control-edit-from">From</Label>
                  <Input
                    id="event-control-edit-from"
                    list="event-control-contact-options"
                    value={editForm.fromCallSign}
                    onChange={(event) => updateEditForm('fromCallSign', event.target.value)}
                    className="rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-control-edit-to">To</Label>
                  <Input
                    id="event-control-edit-to"
                    list="event-control-contact-options"
                    value={editForm.toCallSign}
                    onChange={(event) => updateEditForm('toCallSign', event.target.value)}
                    className="rounded-md"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="event-control-edit-type">Type</Label>
                  <Input
                    id="event-control-edit-type"
                    list="event-control-type-options"
                    value={editForm.messageType}
                    onChange={(event) => updateEditForm('messageType', event.target.value)}
                    className="rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-control-edit-priority">Priority</Label>
                  <select
                    id="event-control-edit-priority"
                    value={editForm.priority}
                    onChange={(event) => updateEditForm('priority', event.target.value as EmpEventControlLogPriority)}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                  >
                    {EMP_EVENT_CONTROL_LOG_PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-control-edit-status">Status</Label>
                  <select
                    id="event-control-edit-status"
                    value={editForm.status}
                    onChange={(event) => updateEditForm('status', event.target.value as EmpEventControlLogStatus)}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                  >
                    {EMP_EVENT_CONTROL_LOG_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px]">
                <div className="space-y-2">
                  <p
                    id="event-control-edit-occurrence-current"
                    className="text-sm font-medium leading-none text-slate-900"
                  >
                    Current occurrence
                  </p>
                  <div
                    aria-labelledby="event-control-edit-occurrence-current"
                    className="min-h-[124px] rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-5 text-slate-700"
                  >
                    <p className="whitespace-pre-wrap break-words">{editForm.occurrence || '-'}</p>
                  </div>
                  <Label htmlFor="event-control-edit-occurrence-amendment">Occurrence amendment</Label>
                  <Textarea
                    id="event-control-edit-occurrence-amendment"
                    value={editAmendments.occurrence}
                    onChange={(event) => updateEditAmendment('occurrence', event.target.value)}
                    placeholder="Add new occurrence information only. It will be timestamped when saved."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <p
                    id="event-control-edit-action-current"
                    className="text-sm font-medium leading-none text-slate-900"
                  >
                    Current action taken
                  </p>
                  <div
                    aria-labelledby="event-control-edit-action-current"
                    className="min-h-[124px] rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-5 text-slate-700"
                  >
                    <p className="whitespace-pre-wrap break-words">{editForm.actionTaken || '-'}</p>
                  </div>
                  <Label htmlFor="event-control-edit-action-amendment">Action amendment</Label>
                  <Textarea
                    id="event-control-edit-action-amendment"
                    value={editAmendments.actionTaken}
                    onChange={(event) => updateEditAmendment('actionTaken', event.target.value)}
                    placeholder="Add new action or outcome information only. It will be timestamped when saved."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-control-edit-owner">Owner</Label>
                  <Input
                    id="event-control-edit-owner"
                    list="event-control-contact-options"
                    value={editForm.owner}
                    onChange={(event) => updateEditForm('owner', event.target.value)}
                    className="rounded-md"
                  />
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeEditEntry} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveEditedEntry}
              disabled={isPending || !editForm}
              className="bg-emerald-700 hover:bg-emerald-800"
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit3 className="mr-2 h-4 w-4" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
