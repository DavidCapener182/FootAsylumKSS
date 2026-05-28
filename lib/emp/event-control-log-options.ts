export const EMP_EVENT_CONTROL_LOG_TYPE_OPTIONS = [
  { value: 'medical', label: 'Medical' },
  { value: 'welfare', label: 'Welfare' },
  { value: 'security', label: 'Security' },
  { value: 'bars', label: 'Bars' },
  { value: 'campsites', label: 'Campsites' },
  { value: 'operational', label: 'Operational' },
  { value: 'traffic', label: 'Traffic' },
  { value: 'customer', label: 'Customer' },
  { value: 'staff', label: 'Staff' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'weather', label: 'Weather' },
  { value: 'other', label: 'Other' },
] as const

export const EMP_EVENT_CONTROL_LOG_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
] as const

export const EMP_EVENT_CONTROL_LOG_STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'closed', label: 'Closed' },
] as const

export type EmpEventControlLogType = string
export type EmpEventControlLogPriority = (typeof EMP_EVENT_CONTROL_LOG_PRIORITY_OPTIONS)[number]['value']
export type EmpEventControlLogStatus = (typeof EMP_EVENT_CONTROL_LOG_STATUS_OPTIONS)[number]['value']

function getOptionLabel<T extends { value: string; label: string }>(options: readonly T[], value: string) {
  return options.find((option) => option.value === value)?.label || value
}

function titleCaseOptionValue(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(' ')
}

export function normalizeEmpEventControlLogTypeValue(value: unknown) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')

  return normalized || 'operational'
}

export function getEmpEventControlLogTypeLabel(value: string) {
  const normalized = normalizeEmpEventControlLogTypeValue(value)
  const defaultLabel = getOptionLabel(EMP_EVENT_CONTROL_LOG_TYPE_OPTIONS, normalized)
  return defaultLabel === normalized ? titleCaseOptionValue(normalized) : defaultLabel
}

export function getEmpEventControlLogPriorityLabel(value: string) {
  return getOptionLabel(EMP_EVENT_CONTROL_LOG_PRIORITY_OPTIONS, value)
}

export function getEmpEventControlLogStatusLabel(value: string) {
  return getOptionLabel(EMP_EVENT_CONTROL_LOG_STATUS_OPTIONS, value)
}
