import { format } from 'date-fns'
import { Activity, CheckSquare, ClipboardList, Flame, Route } from 'lucide-react'

import type { StatusBadgeTone } from '@/components/ui/status-badge'
import { getInternalAreaDisplayName } from '@/lib/areas'
import type { ActivityItem, DashboardData, DashboardTone, PriorityStore, VisitRow } from './dashboard-types'

export const toneMap: Record<DashboardTone, { card: string; icon: string; value: string; bar: string }> = {
  danger: {
    card: 'border-red-100 bg-red-50/40',
    icon: 'bg-red-100 text-red-600',
    value: 'text-red-600',
    bar: 'bg-red-500',
  },
  warning: {
    card: 'border-amber-100 bg-amber-50/40',
    icon: 'bg-amber-100 text-amber-600',
    value: 'text-amber-600',
    bar: 'bg-amber-500',
  },
  info: {
    card: 'border-blue-100 bg-blue-50/40',
    icon: 'bg-blue-100 text-blue-600',
    value: 'text-blue-600',
    bar: 'bg-blue-500',
  },
  success: {
    card: 'border-emerald-100 bg-emerald-50/40',
    icon: 'bg-emerald-100 text-emerald-600',
    value: 'text-emerald-600',
    bar: 'bg-emerald-500',
  },
  teal: {
    card: 'border-teal-100 bg-teal-50/40',
    icon: 'bg-teal-100 text-teal-600',
    value: 'text-teal-600',
    bar: 'bg-teal-500',
  },
}

export const chartColours = ['#84cc16', '#0d9488', '#2563eb', '#f59e0b', '#dc2626', '#94a3b8']

export function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function percent(value: number, total: number) {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

export function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, Math.round(safeNumber(value))))
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return format(parsed, 'd MMM yyyy')
}

export function formatActivityTime(value: string | null | undefined) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return format(parsed, 'd MMM, HH:mm')
}

export function getStatusTone(label: string): StatusBadgeTone {
  const lower = label.toLowerCase()
  if (lower.includes('up to date') || lower.includes('complete') || lower.includes('compliant')) return 'success'
  if (lower.includes('overdue') || lower.includes('escalation')) return 'danger'
  if (lower.includes('due soon') || lower.includes('required')) return 'warning'
  if (lower.includes('planned') || lower.includes('in progress')) return 'info'
  return 'muted'
}

export function normalisePriorityStores(data: DashboardData): PriorityStore[] {
  const fromForecast = Array.isArray(data.complianceForecast?.stores)
    ? data.complianceForecast.stores.map((storeValue) => {
        const store = (storeValue || {}) as Record<string, unknown>
        const drivers = Array.isArray(store.drivers) ? store.drivers.join(' ').toLowerCase() : ''
        const fraStatus = drivers.includes('no in-date fra') || drivers.includes('fra') ? 'FRA Required' : 'FRA Up to Date'
        return {
          id: String(store.storeId || store.id || store.storeName),
          name: String(store.storeName || store.name || 'Unknown Store'),
          auditStatus: drivers.includes('second') || drivers.includes('audit') ? 'Second Audit Required' : 'Not Started',
          fraStatus,
          openActions: safeNumber(store.overdueActions ?? store.actionCount ?? store.count),
          href: store.storeId ? `/stores/${store.storeId}` : '/stores',
        }
      })
    : []
  if (fromForecast.length > 0) return fromForecast

  const fromSecondVisits = Array.isArray(data.storesNeedingSecondVisit)
    ? data.storesNeedingSecondVisit.map((store: Record<string, unknown>) => ({
        id: String(store.id || store.store_id || store.store_name),
        name: String(store.store_name || store.storeName || 'Unknown Store'),
        auditStatus: store.compliance_audit_2_planned_date ? 'Audit 2 Planned' : 'Second Audit Required',
        fraStatus: 'FRA Required',
        openActions: safeNumber(store.openActions ?? store.count),
        href: store.id ? `/stores/${store.id}` : '/stores',
      }))
    : []
  if (fromSecondVisits.length > 0) return fromSecondVisits

  const fromStoreActions = Array.isArray(data.storeActionStats?.topStores)
    ? data.storeActionStats.topStores.map((store: Record<string, unknown>) => ({
        id: String(store.id || store.name),
        name: String(store.name || store.storeName || 'Unknown Store'),
        auditStatus: 'Second Audit Required',
        fraStatus: safeNumber(store.overdue) > 0 ? 'FRA Overdue' : 'FRA Required',
        openActions: safeNumber(store.count),
        href: store.id ? `/stores/${store.id}` : '/actions',
      }))
    : []
  if (fromStoreActions.length > 0) return fromStoreActions

  return Array.isArray(data.topStores)
    ? data.topStores.map((store: Record<string, unknown>) => ({
        id: String(store.id || store.name),
        name: String(store.name || store.storeName || 'Unknown Store'),
        auditStatus: 'Not Started',
        fraStatus: 'FRA Required',
        openActions: safeNumber(store.count),
        href: store.id ? `/stores/${store.id}` : '/stores',
      }))
    : []
}

export function normaliseUpcomingVisits(routes: Array<Record<string, unknown>>): VisitRow[] {
  return [...routes]
    .sort((a, b) => String(a?.plannedDate || '').localeCompare(String(b?.plannedDate || '')))
    .map((route, index) => {
      const stores = Array.isArray(route?.stores) ? route.stores : []
      const firstStore = stores[0] as Record<string, unknown> | undefined
      const operationalItems = Array.isArray(route?.operationalItems) ? route.operationalItems : []
      const firstOperationalItem = operationalItems[0] as Record<string, unknown> | undefined
      const purpose = String(route?.purpose || firstOperationalItem?.title || '')
      const visitType = purpose.toLowerCase().includes('fra') ? 'FRA' : 'Audit'
      const storeName = firstStore?.name || firstStore?.store_name || route?.storeName
      const fallbackStore = safeNumber(route?.storeCount) > 1 ? `${route.storeCount} stores planned` : 'Route visit'
      return {
        id: String(route?.key || `${route?.plannedDate || 'route'}-${index}`),
        date: formatShortDate(route?.plannedDate as string | null | undefined),
        region: getAreaDisplayName(route?.area || route?.region),
        store: String(storeName || fallbackStore),
        visitType,
      }
    })
}

export function formatActivityItem(item: Record<string, unknown>): ActivityItem {
  return {
    id: String(item?.id || item?.created_at || Math.random()),
    time: formatActivityTime(item?.created_at as string | null | undefined),
    label: formatActivityLabel(item),
    type: inferActivityType(item),
  }
}

export function getAreaDisplayName(value: unknown) {
  return getInternalAreaDisplayName(typeof value === 'string' ? value : null, {
    fallback: 'Unknown region',
    includeCode: false,
  })
}

function formatActivityLabel(item: Record<string, unknown>) {
  const details = normalizeObject(item.details)
  const explicitDescription = getNonEmptyString(item.description) || getNonEmptyString(details?.description)
  if (explicitDescription) return explicitDescription

  const explicitAction = getNonEmptyString(details?.action)
  if (explicitAction) return explicitAction

  const entityType = formatEntityType(item.entity_type)
  const action = String(item.action || '').trim().toUpperCase()

  if (action === 'UPDATED') {
    const changedFields = getChangedFieldNames(details)
    if (changedFields.length > 0) {
      const fieldList = changedFields.slice(0, 2).map(formatFieldName).join(', ')
      const suffix = changedFields.length > 2 ? ` +${changedFields.length - 2} more` : ''
      return `${entityType} updated: ${fieldList}${suffix}`
    }
    return `${entityType} updated`
  }

  if (action === 'CREATED') return `${entityType} created`
  if (action === 'DELETED') return `${entityType} deleted`
  if (action === 'CLOSED') return `${entityType} closed`
  if (action) return `${entityType} ${formatFieldName(action.toLowerCase())}`

  return `${entityType} activity recorded`
}

function normalizeObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function getChangedFieldNames(details: Record<string, unknown> | null) {
  const oldData = normalizeObject(details?.old)
  const newData = normalizeObject(details?.new)
  if (!oldData || !newData) return []

  const ignoredFields = new Set(['id', 'updated_at', 'created_at'])
  return Object.keys(newData).filter((field) => {
    if (ignoredFields.has(field)) return false
    return JSON.stringify(oldData[field]) !== JSON.stringify(newData[field])
  })
}

function formatEntityType(value: unknown) {
  const entityType = String(value || '').toLowerCase()
  const entityMap: Record<string, string> = {
    action: 'Action',
    audit: 'Audit',
    incident: 'Incident',
    investigation: 'Investigation',
    route: 'Route',
    store: 'Store',
  }

  return entityMap[entityType] || 'Record'
}

function formatFieldName(field: string) {
  const fieldMap: Record<string, string> = {
    assigned_investigator_user_id: 'assigned investigator',
    compliance_audit_1_date: 'audit 1 date',
    compliance_audit_1_overall_pct: 'audit 1 score',
    compliance_audit_2_date: 'audit 2 date',
    compliance_audit_2_overall_pct: 'audit 2 score',
    compliance_audit_2_planned_date: 'audit 2 planned date',
    due_date: 'due date',
    fire_risk_assessment_date: 'FRA date',
    priority: 'priority',
    status: 'status',
    title: 'title',
  }

  return fieldMap[field] || field.replace(/_/g, ' ')
}

function getNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function inferActivityType(item: Record<string, unknown>): ActivityItem['type'] {
  const text = `${item?.description || ''} ${item?.action || ''} ${item?.entity_type || ''}`.toLowerCase()
  if (text.includes('fra') || text.includes('fire risk')) return 'FRA'
  if (text.includes('audit')) return 'Audit'
  if (text.includes('action')) return 'Action'
  if (text.includes('route') || text.includes('visit') || text.includes('planning')) return 'Planning'
  return 'Update'
}

export function getActivityIcon(type: ActivityItem['type']) {
  if (type === 'FRA') return Flame
  if (type === 'Audit') return ClipboardList
  if (type === 'Action') return CheckSquare
  if (type === 'Planning') return Route
  return Activity
}

export function getActivityTone(type: ActivityItem['type']): StatusBadgeTone {
  if (type === 'FRA') return 'warning'
  if (type === 'Audit') return 'success'
  if (type === 'Action') return 'danger'
  if (type === 'Planning') return 'info'
  return 'muted'
}
