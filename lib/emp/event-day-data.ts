import 'server-only'

import { createHash, randomBytes } from 'crypto'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { getEmpUserContext } from '@/lib/emp/access'
import { EmpSetupRequiredError, getEmpMasterTemplatePlanPrefill } from '@/lib/emp/data'
import { findEmpStaffByName, getEmpStaffForEvent, getEmpStaffSignInDatesForEvent } from '@/lib/emp/event-staff'
import {
  getDeploymentMatrixRowsFromCells,
  syncDeploymentMatrixEventPagesFromSourcePages,
  type EmpMasterTemplatePrefillData,
  type EmpMasterTemplateTablePagePrefill,
} from '@/lib/emp/master-template-prefill'
import {
  adminClockAdjustmentSchema,
  adminEquipmentReplaceSchema,
  adminEquipmentStockUpdateSchema,
  adminEquipmentStockUpsertSchema,
  adminEquipmentUpdateSchema,
  adminNoShowSchema,
  adminWalkUpStaffSchema,
  clockInSchema,
  clockOutSchema,
  eventDaySettingsSchema,
  importMappingSchema,
  kioskNameLookupSchema,
  mealTokenIssueSchema,
  staffingImportModeSchema,
  type EmpEventEquipmentStatus,
  type EmpEventEquipmentType,
  type EmpEventImportMapping,
  type EmpEventStaffingImportMode,
  type EmpEventStaffShiftStatus,
} from '@/lib/emp/event-day-schema'
import {
  cleanImportText,
  normaliseStaffName,
  parseEmpEventDate,
  previewEmpEventStaffingCsv,
  previewEmpEventMasterDeploymentXlsx,
  type EmpEventStaffingImportPreview,
} from '@/lib/emp/event-day-import'
import {
  resolveUniqueKioskNameMatch,
  unavailableReasonForKioskStatus,
  type KioskNameLookupStatus,
  type KioskNameLookupMode,
  type KioskUnavailableReason,
} from '@/lib/emp/event-day-identity'

type SupabaseLike = ReturnType<typeof createAdminSupabaseClient>

type SupabaseErrorLike = {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
} | null | undefined

type EmpPlanRow = {
  id: string
  title: string
  event_name: string | null
  status: string
  document_status: string | null
  selected_annexes: string[] | null
  include_kss_profile_appendix: boolean
  created_at: string
  updated_at: string
}

type EventDaySettingsRow = {
  plan_id: string
  kiosk_enabled: boolean
  kiosk_token_hash: string | null
  kiosk_pin_hash: string | null
  timezone: string
  kiosk_label: string | null
  meal_token_total: number | null
  created_at: string
  updated_at: string
}

type StaffShiftRow = {
  id: string
  plan_id: string
  import_batch_id: string | null
  staff_name: string
  staff_name_normalised: string
  agency: string | null
  email: string | null
  phone: string | null
  sia_badge_number: string | null
  sia_expiry_date: string | null
  position: string | null
  area: string | null
  shift_start: string | null
  shift_end: string | null
  status: EmpEventStaffShiftStatus
  clocked_in_at: string | null
  clocked_out_at: string | null
  completed_at: string | null
  clocked_in_via: string | null
  clocked_out_via: string | null
  admin_notes: string | null
  staff_notes: string | null
  is_walk_up: boolean
  created_at: string
  updated_at: string
}

type EquipmentAssignmentRow = {
  id: string
  plan_id: string
  staff_shift_id: string
  equipment_type: EmpEventEquipmentType
  item_number: string | null
  quantity: number
  status: EmpEventEquipmentStatus
  issued_at: string
  issued_via: string | null
  returned_at: string | null
  returned_via: string | null
  replaced_by_assignment_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

type EquipmentStockRow = {
  id: string
  plan_id: string
  equipment_type: EmpEventEquipmentType
  item_number: string | null
  quantity_total: number
  active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

type MealTokenRow = {
  id: string
  plan_id: string
  staff_shift_id: string
  token_date: string
  issued_at: string
  notes: string | null
  created_at: string
}

type ImportBatchRow = {
  id: string
  plan_id: string
  file_name: string | null
  file_type: string | null
  file_size: number | null
  row_count: number
  error_count: number
  created_at: string
}

type ClockEventRow = {
  id: string
  plan_id: string
  staff_shift_id: string
  event_type: string
  event_time: string
  captured_via: string
  device_label: string | null
  reason: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export class EmpEventDayError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'EmpEventDayError'
    this.status = status
  }
}

export type EmpEventDayPlanSummary = {
  id: string
  title: string
  eventName: string | null
  status: string
  documentStatus: string | null
  selectedAnnexes: string[]
  includeKssProfileAppendix: boolean
  createdAt: string
  updatedAt: string
}

export type EmpEventDaySettings = {
  planId: string
  kioskEnabled: boolean
  hasKioskToken: boolean
  hasKioskPin: boolean
  timezone: string
  kioskLabel: string | null
  mealTokenTotal: number | null
  createdAt: string
  updatedAt: string
}

export type EmpEventDayStaffShift = {
  id: string
  planId: string
  importBatchId: string | null
  staffName: string
  staffNameNormalised: string
  agency: string | null
  email: string | null
  phone: string | null
  siaBadgeNumber: string | null
  siaExpiryDate: string | null
  position: string | null
  area: string | null
  shiftStart: string | null
  shiftEnd: string | null
  status: EmpEventStaffShiftStatus
  clockedInAt: string | null
  clockedOutAt: string | null
  completedAt: string | null
  adminNotes: string | null
  staffNotes: string | null
  isWalkUp: boolean
  createdAt: string
  updatedAt: string
}

export type EmpEventDayEquipmentAssignment = {
  id: string
  planId: string
  staffShiftId: string
  equipmentType: EmpEventEquipmentType
  itemNumber: string | null
  quantity: number
  status: EmpEventEquipmentStatus
  issuedAt: string
  returnedAt: string | null
  replacedByAssignmentId: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type EmpEventDayEquipmentStock = {
  id: string
  planId: string
  equipmentType: EmpEventEquipmentType
  itemNumber: string | null
  quantityTotal: number
  active: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type EmpEventDayMealToken = {
  id: string
  planId: string
  staffShiftId: string
  tokenDate: string
  issuedAt: string
  notes: string | null
  createdAt: string
}

export type EmpEventDayImportBatch = {
  id: string
  planId: string
  fileName: string | null
  fileType: string | null
  fileSize: number | null
  rowCount: number
  errorCount: number
  createdAt: string
}

export type EmpEventDayClockEvent = {
  id: string
  planId: string
  staffShiftId: string
  eventType: string
  eventTime: string
  capturedVia: string
  deviceLabel: string | null
  reason: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export type EmpEventDayAdminData = {
  plan: EmpEventDayPlanSummary
  settings: EmpEventDaySettings
  shifts: EmpEventDayStaffShift[]
  equipmentAssignments: EmpEventDayEquipmentAssignment[]
  equipmentStock: EmpEventDayEquipmentStock[]
  mealTokens: EmpEventDayMealToken[]
  importBatches: EmpEventDayImportBatch[]
  clockEvents: EmpEventDayClockEvent[]
  stockSummary: EmpEventDayStockSummary
  metrics: {
    scheduled: number
    clockedIn: number
    completed: number
    noShow: number
    cancelled: number
    activeRadios: number
    radiosTotal: number | null
    radiosAvailable: number | null
    earpiecesTotal: number | null
    earpiecesOut: number
    earpiecesAvailable: number | null
    outstandingKit: number
    mealTokensToday: number
    mealTokenTotal: number | null
    mealTokensRemaining: number | null
  }
}

export type EmpEventDayEquipmentStockSummary = {
  equipmentType: EmpEventEquipmentType
  label: string
  total: number | null
  out: number
  unavailable: number
  available: number | null
  serialisedCount: number
}

export type EmpEventDayMealTokenStockSummary = {
  total: number | null
  issued: number
  available: number | null
}

export type EmpEventDayStockSummary = {
  equipment: EmpEventDayEquipmentStockSummary[]
  mealTokens: EmpEventDayMealTokenStockSummary
}

export type EmpEventDayKioskStaffResult = {
  id: string
  staffName: string
  agency: string | null
  position: string | null
  area: string | null
  shiftStart: string | null
  shiftEnd: string | null
  status: EmpEventStaffShiftStatus
  clockedInAt: string | null
}

export type EmpEventDayKioskClockedInStaffResult = EmpEventDayKioskStaffResult & {
  equipmentAssignments: Array<{
    id: string
    equipmentType: EmpEventEquipmentType
    itemNumber: string | null
    status: EmpEventEquipmentStatus
    notes: string | null
  }>
}

export type EmpEventDayKioskUnavailableReason = KioskUnavailableReason

type KioskContext = {
  supabase: SupabaseLike
  settings: EventDaySettingsRow
  plan: EmpPlanRow
}

function hashSecret(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function hashPin(planId: string, pin: string) {
  return hashSecret(`${planId}:${pin}`)
}

function hashToken(token: string) {
  return hashSecret(token)
}

function randomToken() {
  return randomBytes(24).toString('base64url')
}

function clean(value: unknown) {
  return cleanImportText(value)
}

function nullIfBlank(value: unknown) {
  const text = clean(value)
  return text || null
}

function isEventDaySchemaMissingError(error: SupabaseErrorLike) {
  const text = [error?.code, error?.message, error?.details, error?.hint]
    .map((value) => clean(value).toLowerCase())
    .join(' ')

  return (
    text.includes('pgrst205') ||
    (text.includes('emp_event_') && text.includes('schema cache')) ||
    (text.includes('emp_event_') && text.includes('could not find the table')) ||
    (text.includes('emp_event_') && text.includes('does not exist')) ||
    text.includes('emp_event_equipment_stock') ||
    text.includes('meal_token_total')
  )
}

function throwEventDayDatabaseError(context: string, error: SupabaseErrorLike): never {
  if (isEventDaySchemaMissingError(error)) {
    throw new EmpSetupRequiredError(
      'EMP Event Day Operations database setup required. Apply supabase/migrations/058_add_emp_event_day_operations.sql and supabase/migrations/20260616201941_add_emp_event_day_stock_controls.sql to the connected Supabase project, then refresh this page.'
    )
  }

  throw new EmpEventDayError(`${context}: ${error?.message || 'Unknown error'}`, 500)
}

const EVENT_DAY_PAGE_SIZE = 1000

async function selectAllEventDayRows<T>(queryFactory: () => any, context: string): Promise<T[]> {
  const rows: T[] = []

  for (let from = 0; ; from += EVENT_DAY_PAGE_SIZE) {
    const { data, error } = await queryFactory().range(from, from + EVENT_DAY_PAGE_SIZE - 1)
    if (error) throwEventDayDatabaseError(context, error)

    const page = ((data || []) as T[])
    rows.push(...page)

    if (page.length < EVENT_DAY_PAGE_SIZE) return rows
  }
}

function buildPlanSummary(row: EmpPlanRow): EmpEventDayPlanSummary {
  return {
    id: row.id,
    title: row.title,
    eventName: row.event_name,
    status: row.status,
    documentStatus: row.document_status,
    selectedAnnexes: Array.isArray(row.selected_annexes) ? row.selected_annexes : [],
    includeKssProfileAppendix: Boolean(row.include_kss_profile_appendix),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function buildSettings(row: EventDaySettingsRow): EmpEventDaySettings {
  return {
    planId: row.plan_id,
    kioskEnabled: Boolean(row.kiosk_enabled),
    hasKioskToken: Boolean(row.kiosk_token_hash),
    hasKioskPin: Boolean(row.kiosk_pin_hash),
    timezone: row.timezone || 'Europe/London',
    kioskLabel: row.kiosk_label,
    mealTokenTotal: typeof row.meal_token_total === 'number' ? row.meal_token_total : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function buildShift(row: StaffShiftRow): EmpEventDayStaffShift {
  return {
    id: row.id,
    planId: row.plan_id,
    importBatchId: row.import_batch_id,
    staffName: row.staff_name,
    staffNameNormalised: row.staff_name_normalised,
    agency: row.agency,
    email: row.email,
    phone: row.phone,
    siaBadgeNumber: row.sia_badge_number,
    siaExpiryDate: row.sia_expiry_date,
    position: row.position,
    area: row.area,
    shiftStart: row.shift_start,
    shiftEnd: row.shift_end,
    status: row.status,
    clockedInAt: row.clocked_in_at,
    clockedOutAt: row.clocked_out_at,
    completedAt: row.completed_at,
    adminNotes: row.admin_notes,
    staffNotes: row.staff_notes,
    isWalkUp: Boolean(row.is_walk_up),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function buildEquipment(row: EquipmentAssignmentRow): EmpEventDayEquipmentAssignment {
  return {
    id: row.id,
    planId: row.plan_id,
    staffShiftId: row.staff_shift_id,
    equipmentType: row.equipment_type,
    itemNumber: row.item_number,
    quantity: Number(row.quantity || 1),
    status: row.status,
    issuedAt: row.issued_at,
    returnedAt: row.returned_at,
    replacedByAssignmentId: row.replaced_by_assignment_id,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function buildEquipmentStock(row: EquipmentStockRow): EmpEventDayEquipmentStock {
  return {
    id: row.id,
    planId: row.plan_id,
    equipmentType: row.equipment_type,
    itemNumber: row.item_number,
    quantityTotal: Number(row.quantity_total || 0),
    active: Boolean(row.active),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function buildMealToken(row: MealTokenRow): EmpEventDayMealToken {
  return {
    id: row.id,
    planId: row.plan_id,
    staffShiftId: row.staff_shift_id,
    tokenDate: row.token_date,
    issuedAt: row.issued_at,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

function buildImportBatch(row: ImportBatchRow): EmpEventDayImportBatch {
  return {
    id: row.id,
    planId: row.plan_id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    rowCount: Number(row.row_count || 0),
    errorCount: Number(row.error_count || 0),
    createdAt: row.created_at,
  }
}

function buildClockEvent(row: ClockEventRow): EmpEventDayClockEvent {
  return {
    id: row.id,
    planId: row.plan_id,
    staffShiftId: row.staff_shift_id,
    eventType: row.event_type,
    eventTime: row.event_time,
    capturedVia: row.captured_via,
    deviceLabel: row.device_label,
    reason: row.reason,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  }
}

async function getPlanOrThrow(supabase: SupabaseLike, planId: string): Promise<EmpPlanRow> {
  const { data, error } = await (supabase as any)
    .from('emp_plans')
    .select('id, title, event_name, status, document_status, selected_annexes, include_kss_profile_appendix, created_at, updated_at')
    .eq('id', planId)
    .single()

  if (error || !data) {
    throw new EmpEventDayError('EMP plan not found', 404)
  }

  return data as EmpPlanRow
}

async function touchEmpPlan(supabase: SupabaseLike, planId: string, profileId?: string | null) {
  if (!profileId) return
  await (supabase as any)
    .from('emp_plans')
    .update({
      updated_by_user_id: profileId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
}

async function loadSettingsByPlan(supabase: SupabaseLike, planId: string) {
  const { data, error } = await (supabase as any)
    .from('emp_event_day_settings')
    .select('plan_id, kiosk_enabled, kiosk_token_hash, kiosk_pin_hash, timezone, kiosk_label, meal_token_total, created_at, updated_at')
    .eq('plan_id', planId)
    .maybeSingle()

  if (error) {
    throwEventDayDatabaseError('Failed to load event-day settings', error)
  }

  return data as EventDaySettingsRow | null
}

async function ensureSettingsForAdmin(supabase: SupabaseLike, planId: string, profileId: string) {
  const existing = await loadSettingsByPlan(supabase, planId)
  if (existing) return existing

  const now = new Date().toISOString()
  const { data, error } = await (supabase as any)
    .from('emp_event_day_settings')
    .insert({
      plan_id: planId,
      timezone: 'Europe/London',
      meal_token_total: null,
      created_by_user_id: profileId,
      updated_by_user_id: profileId,
      created_at: now,
      updated_at: now,
    })
    .select('plan_id, kiosk_enabled, kiosk_token_hash, kiosk_pin_hash, timezone, kiosk_label, meal_token_total, created_at, updated_at')
    .single()

  if (error) throwEventDayDatabaseError('Failed to create event-day settings', error)
  if (!data) throw new EmpEventDayError('Failed to create event-day settings: Unknown error', 500)

  return data as EventDaySettingsRow
}

async function getEventDateFromPlan(supabase: SupabaseLike, planId: string) {
  const { data } = await (supabase as any)
    .from('emp_plan_field_values')
    .select('value_text, emp_template_fields!inner(key)')
    .eq('plan_id', planId)
    .in('emp_template_fields.key', ['show_dates', 'public_ingress_time', 'build_dates', 'issue_date'])

  const values = (data || [])
    .map((row: any) => clean(row.value_text))
    .filter(Boolean)
    .join(' ')
  const match = values.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/) || values.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (!match) return null

  if (match[1]?.length === 4) {
    const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00`)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }

  const [, day, month, rawYear] = match
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear
  const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

async function loadStaffShifts(supabase: SupabaseLike, planId: string) {
  const data = await selectAllEventDayRows<StaffShiftRow>(() => (supabase as any)
    .from('emp_event_staff_shifts')
    .select('*')
    .eq('plan_id', planId)
    .order('shift_start', { ascending: true, nullsFirst: false })
    .order('staff_name', { ascending: true }), 'Failed to load event-day staff')

  return data.map(buildShift)
}

async function loadEquipmentAssignments(supabase: SupabaseLike, planId: string) {
  const data = await selectAllEventDayRows<EquipmentAssignmentRow>(() => (supabase as any)
    .from('emp_event_equipment_assignments')
    .select('*')
    .eq('plan_id', planId)
    .order('issued_at', { ascending: false }), 'Failed to load event-day equipment')

  return data.map(buildEquipment)
}

async function loadEquipmentStock(supabase: SupabaseLike, planId: string) {
  const data = await selectAllEventDayRows<EquipmentStockRow>(() => (supabase as any)
    .from('emp_event_equipment_stock')
    .select('*')
    .eq('plan_id', planId)
    .order('equipment_type', { ascending: true })
    .order('item_number', { ascending: true, nullsFirst: true }), 'Failed to load event-day equipment stock')

  return data.map(buildEquipmentStock)
}

async function loadMealTokens(supabase: SupabaseLike, planId: string) {
  const data = await selectAllEventDayRows<MealTokenRow>(() => (supabase as any)
    .from('emp_event_meal_tokens')
    .select('*')
    .eq('plan_id', planId)
    .order('issued_at', { ascending: false }), 'Failed to load meal tokens')

  return data.map(buildMealToken)
}

async function loadImportBatches(supabase: SupabaseLike, planId: string) {
  const { data, error } = await (supabase as any)
    .from('emp_event_staff_import_batches')
    .select('*')
    .eq('plan_id', planId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) throwEventDayDatabaseError('Failed to load import batches', error)
  return ((data || []) as ImportBatchRow[]).map(buildImportBatch)
}

async function loadClockEvents(supabase: SupabaseLike, planId: string) {
  const { data, error } = await (supabase as any)
    .from('emp_event_staff_clock_events')
    .select('*')
    .eq('plan_id', planId)
    .order('event_time', { ascending: false })
    .limit(200)

  if (error) throwEventDayDatabaseError('Failed to load clock events', error)
  return ((data || []) as ClockEventRow[]).map(buildClockEvent)
}

function formatDateInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${lookup.year}-${lookup.month}-${lookup.day}`
}

function parseTemplateDateKey(value: unknown) {
  const text = clean(value)
  if (!text) return null

  const isoMatch = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`

  const ukMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/)
  if (ukMatch) return `${ukMatch[3]}-${ukMatch[2].padStart(2, '0')}-${ukMatch[1].padStart(2, '0')}`

  return null
}

function parseTemplateTime(value: unknown) {
  const match = clean(value).match(/\b(\d{1,2})[:.](\d{2})\b/)
  if (!match) return null
  const hour = Number.parseInt(match[1], 10)
  const minute = Number.parseInt(match[2], 10)
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour > 23 || minute > 59) return null
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function dateTimeFromTemplateParts(dateKey: string | null, timeValue: unknown, fallbackTime?: string) {
  if (!dateKey) return null
  const time = parseTemplateTime(timeValue) || fallbackTime
  if (!time) return null
  const date = new Date(`${dateKey}T${time}:00`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function dateFromTemplateValue(value: unknown) {
  const parsed = parseEmpEventDate(value)
  return parsed.value
}

function normalizeEventProfileMatch(value: unknown) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function normalizeStaffCompany(value: unknown) {
  return clean(value).replace(/\s+\(continued\)$/i, '')
}

function rowIndexesFromCells(tableCells: Record<string, string> | undefined) {
  return Array.from(new Set(
    Object.keys(tableCells || {})
      .map((cellKey) => Number.parseInt(cellKey.split(':')[0] || '', 10))
      .filter((rowIndex) => Number.isFinite(rowIndex) && rowIndex >= 0)
  )).sort((a, b) => a - b)
}

type EventDayRosterSeedRow = {
  staffName: string
  agency: string | null
  phone: string | null
  siaBadgeNumber: string | null
  siaExpiryDate: string | null
  position: string | null
  area: string | null
  shiftStart: string | null
  shiftEnd: string | null
  notes: string | null
}

function buildRosterSeedRowsFromStaffSignInPages(
  pages: EmpMasterTemplateTablePagePrefill[] | undefined,
  plan: EmpPlanRow
): EventDayRosterSeedRow[] {
  const eventStaffRows = getEmpStaffForEvent(plan.event_name || '', plan.title)
  const rows: EventDayRosterSeedRow[] = []

  for (const page of pages || []) {
    const tableCells = page.tableCells || {}
    const agency = normalizeStaffCompany(page.fields?.Company) || null
    const dateKey = parseTemplateDateKey(page.fields?.Date)

    for (const rowIndex of rowIndexesFromCells(tableCells)) {
      const staffName = clean(tableCells[`${rowIndex}:staff_name`])
      if (!staffName) continue

      const matchedStaff = findEmpStaffByName(eventStaffRows, staffName)
      const shiftStart = dateTimeFromTemplateParts(dateKey, tableCells[`${rowIndex}:shift_start`], dateKey ? '00:00' : undefined)
      const shiftEnd = dateTimeFromTemplateParts(dateKey, tableCells[`${rowIndex}:shift_end`])

      rows.push({
        staffName,
        agency,
        phone: matchedStaff?.mobileNumber || null,
        siaBadgeNumber: nullIfBlank(tableCells[`${rowIndex}:sia_badge_number`] || matchedStaff?.siaBadgeNumber),
        siaExpiryDate: dateFromTemplateValue(tableCells[`${rowIndex}:expiry_date`] || matchedStaff?.expiryDate),
        position: null,
        area: null,
        shiftStart,
        shiftEnd,
        notes: dateKey ? `Imported from EMP staff sign-in sheet for ${dateKey}.` : 'Imported from EMP staff sign-in sheet.',
      })
    }
  }

  return rows
}

function splitAssignedStaffNames(value: string) {
  return clean(value)
    .split(/\s*(?:,|;|\n|\/|\band\b)\s*/i)
    .map((item) => clean(item))
    .filter((item) => item.length > 1 && !/^(tbc|n\/a|none)$/i.test(item))
}

function buildRosterSeedRowsFromDeploymentPages(
  pages: EmpMasterTemplateTablePagePrefill[] | undefined
): EventDayRosterSeedRow[] {
  const rows: EventDayRosterSeedRow[] = []

  for (const page of syncDeploymentMatrixEventPagesFromSourcePages(pages || [])) {
    const dateKey = parseTemplateDateKey(page.fields?.Date)
    for (const row of getDeploymentMatrixRowsFromCells(page.tableCells)) {
      const shiftStart = dateTimeFromTemplateParts(dateKey, row.start)
      const shiftEnd = dateTimeFromTemplateParts(dateKey, row.end)
      for (const staffName of splitAssignedStaffNames(row.assigned)) {
        rows.push({
          staffName,
          agency: null,
          phone: null,
          siaBadgeNumber: null,
          siaExpiryDate: null,
          position: nullIfBlank(row.position),
          area: nullIfBlank(row.zone),
          shiftStart,
          shiftEnd,
          notes: 'Imported from EMP deployment matrix.',
        })
      }
    }
  }

  return rows
}

function uniqueRosterSeedRows(rows: EventDayRosterSeedRow[]) {
  const seen = new Set<string>()
  const uniqueRows: EventDayRosterSeedRow[] = []

  for (const row of rows) {
    const key = [
      normaliseStaffName(row.staffName),
      clean(row.agency).toLowerCase(),
      clean(row.shiftStart),
      clean(row.shiftEnd),
      clean(row.position).toLowerCase(),
      clean(row.area).toLowerCase(),
    ].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    uniqueRows.push(row)
  }

  return uniqueRows
}

function buildRosterSeedRowsFromPrefill(prefillData: EmpMasterTemplatePrefillData | null | undefined, plan: EmpPlanRow) {
  const tablePages = prefillData?.templateTablePageValues || {}
  const staffSignInRows = buildRosterSeedRowsFromStaffSignInPages(tablePages['staff-sign-in-sign-out-sheet'], plan)
  if (staffSignInRows.length) return uniqueRosterSeedRows(staffSignInRows)

  return uniqueRosterSeedRows(buildRosterSeedRowsFromDeploymentPages(tablePages['deployment-matrix']))
}

async function loadSavedTemplateRosterRows(supabase: SupabaseLike, plan: EmpPlanRow) {
  const { data, error } = await (supabase as any)
    .from('emp_master_template_events')
    .select('event_name, event_date, prefill_data, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) {
    const message = clean(error.message).toLowerCase()
    if (
      message.includes('emp_master_template_events') &&
      (message.includes('does not exist') || message.includes('schema cache') || message.includes('prefill_data'))
    ) {
      return []
    }
    throwEventDayDatabaseError('Failed to load saved EMP download sheets', error)
  }

  const planNames = [
    normalizeEventProfileMatch(plan.event_name),
    normalizeEventProfileMatch(plan.title),
  ].filter(Boolean)

  const bestProfiles = ((data || []) as Array<{
    event_name: string | null
    event_date: string | null
    prefill_data: EmpMasterTemplatePrefillData | null
    updated_at: string | null
  }>)
    .map((profile) => {
      const profileName = normalizeEventProfileMatch(profile.prefill_data?.eventName || profile.event_name)
      const score = planNames.reduce((current, planName) => {
        if (!planName || !profileName) return current
        if (planName === profileName) return Math.max(current, 3)
        if (planName.includes(profileName) || profileName.includes(planName)) return Math.max(current, 2)
        const planTokens = new Set(planName.split(/\s+/).filter((part) => part.length > 3))
        const overlap = profileName.split(/\s+/).filter((part) => planTokens.has(part)).length
        return overlap >= 2 ? Math.max(current, 1) : current
      }, 0)

      return { profile, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  for (const { profile } of bestProfiles) {
    const rows = buildRosterSeedRowsFromPrefill(profile.prefill_data, plan)
    if (rows.length) return rows
  }

  return []
}

async function buildRosterRowsFromEmpPlan(planId: string, supabase: SupabaseLike, plan: EmpPlanRow) {
  const savedRows = await loadSavedTemplateRosterRows(supabase, plan)
  if (savedRows.length) return { rows: savedRows, source: 'saved_download_sheets' as const }

  const planPrefill = await getEmpMasterTemplatePlanPrefill(planId)
  const generatedRows = buildRosterSeedRowsFromPrefill(planPrefill.prefillData, plan)
  if (generatedRows.length) return { rows: generatedRows, source: 'generated_download_sheets' as const }

  return { rows: [] as EventDayRosterSeedRow[], source: 'none' as const }
}

async function insertRosterSeedRows(input: {
  supabase: SupabaseLike
  planId: string
  profileId: string
  rows: EventDayRosterSeedRow[]
  source: 'saved_download_sheets' | 'generated_download_sheets'
  mode: EmpEventStaffingImportMode
  replacementNote: string
}) {
  if (input.mode === 'replace_unstarted') {
    const { error: replaceError } = await (input.supabase as any)
      .from('emp_event_staff_shifts')
      .update({
        status: 'cancelled',
        updated_by_user_id: input.profileId,
        updated_at: new Date().toISOString(),
        admin_notes: input.replacementNote,
      })
      .eq('plan_id', input.planId)
      .in('status', ['scheduled', 'no_show'])

    if (replaceError) throw new EmpEventDayError(`Failed to replace unstarted roster: ${replaceError.message}`, 500)
  }

  const { data: batch, error: batchError } = await (input.supabase as any)
    .from('emp_event_staff_import_batches')
    .insert({
      plan_id: input.planId,
      file_name: input.source === 'saved_download_sheets'
        ? 'Saved EMP download sheets'
        : 'Generated EMP download sheets',
      file_type: 'application/json',
      file_size: null,
      uploaded_by_user_id: input.profileId,
      row_count: input.rows.length,
      error_count: 0,
    })
    .select('id')
    .single()

  if (batchError || !batch) throw new EmpEventDayError(`Failed to create EMP roster sync batch: ${batchError?.message || 'Unknown error'}`, 500)

  const { error: insertError } = await (input.supabase as any)
    .from('emp_event_staff_shifts')
    .insert(input.rows.map((row) => ({
      plan_id: input.planId,
      import_batch_id: batch.id,
      staff_name: row.staffName,
      staff_name_normalised: normaliseStaffName(row.staffName),
      agency: row.agency,
      phone: row.phone,
      sia_badge_number: row.siaBadgeNumber,
      sia_expiry_date: row.siaExpiryDate,
      position: row.position,
      area: row.area,
      shift_start: row.shiftStart,
      shift_end: row.shiftEnd,
      admin_notes: row.notes,
      created_by_user_id: input.profileId,
      updated_by_user_id: input.profileId,
    })))

  if (insertError) throw new EmpEventDayError(`Failed to import EMP roster rows: ${insertError.message}`, 500)

  return String(batch.id)
}

function equipmentTypeLabel(type: EmpEventEquipmentType) {
  switch (type) {
    case 'hi_vis':
      return 'Hi-vis'
    case 'radio':
      return 'Radios'
    case 'earpiece':
      return 'Earpieces'
    case 'clicker':
      return 'Clickers'
    case 'search_wand':
      return 'Search wands'
    case 'other':
      return 'Other kit'
    default:
      return type
  }
}

function sumEquipmentQuantities(items: EmpEventDayEquipmentAssignment[]) {
  return items.reduce((total, item) => total + Number(item.quantity || 1), 0)
}

export function computeEmpEventDayStockSummary(input: {
  stock: EmpEventDayEquipmentStock[]
  equipment: EmpEventDayEquipmentAssignment[]
  mealTokens: EmpEventDayMealToken[]
  mealTokenTotal: number | null
}): EmpEventDayStockSummary {
  const equipmentTypes = [...new Set([
    ...input.stock.map((item) => item.equipmentType),
    ...input.equipment.map((item) => item.equipmentType),
    'radio' as EmpEventEquipmentType,
    'earpiece' as EmpEventEquipmentType,
  ])]

  const equipment = equipmentTypes.map((equipmentType) => {
    const activeStock = input.stock.filter((item) => item.active && item.equipmentType === equipmentType)
    const assignments = input.equipment.filter((item) => item.equipmentType === equipmentType)
    const out = sumEquipmentQuantities(assignments.filter((item) => item.status === 'issued'))
    const unavailable = sumEquipmentQuantities(assignments.filter((item) => ['issued', 'damaged', 'lost'].includes(item.status)))
    const total = activeStock.length > 0
      ? activeStock.reduce((value, item) => value + Number(item.quantityTotal || 0), 0)
      : null

    return {
      equipmentType,
      label: equipmentTypeLabel(equipmentType),
      total,
      out,
      unavailable,
      available: total === null ? null : Math.max(total - unavailable, 0),
      serialisedCount: activeStock.filter((item) => item.itemNumber).length,
    }
  }).sort((a, b) => {
    const order: EmpEventEquipmentType[] = ['radio', 'earpiece', 'hi_vis', 'clicker', 'search_wand', 'other']
    return order.indexOf(a.equipmentType) - order.indexOf(b.equipmentType)
  })

  const issuedMealTokens = input.mealTokens.length
  return {
    equipment,
    mealTokens: {
      total: input.mealTokenTotal,
      issued: issuedMealTokens,
      available: input.mealTokenTotal === null ? null : Math.max(input.mealTokenTotal - issuedMealTokens, 0),
    },
  }
}

function findStockSummary(summary: EmpEventDayStockSummary, equipmentType: EmpEventEquipmentType) {
  return summary.equipment.find((item) => item.equipmentType === equipmentType)
}

function buildMetrics(input: {
  shifts: EmpEventDayStaffShift[]
  equipment: EmpEventDayEquipmentAssignment[]
  mealTokens: EmpEventDayMealToken[]
  timezone: string
  stockSummary: EmpEventDayStockSummary
}) {
  const today = formatDateInTimezone(new Date(), input.timezone)
  const radioStock = findStockSummary(input.stockSummary, 'radio')
  const earpieceStock = findStockSummary(input.stockSummary, 'earpiece')
  return {
    scheduled: input.shifts.filter((shift) => shift.status === 'scheduled').length,
    clockedIn: input.shifts.filter((shift) => shift.status === 'clocked_in').length,
    completed: input.shifts.filter((shift) => shift.status === 'completed').length,
    noShow: input.shifts.filter((shift) => shift.status === 'no_show').length,
    cancelled: input.shifts.filter((shift) => shift.status === 'cancelled').length,
    activeRadios: input.equipment.filter((item) => item.status === 'issued' && item.equipmentType === 'radio').length,
    radiosTotal: radioStock?.total ?? null,
    radiosAvailable: radioStock?.available ?? null,
    earpiecesTotal: earpieceStock?.total ?? null,
    earpiecesOut: earpieceStock?.out ?? 0,
    earpiecesAvailable: earpieceStock?.available ?? null,
    outstandingKit: input.equipment.filter((item) => item.status === 'issued').length,
    mealTokensToday: input.mealTokens.filter((token) => token.tokenDate === today).length,
    mealTokenTotal: input.stockSummary.mealTokens.total,
    mealTokensRemaining: input.stockSummary.mealTokens.available,
  }
}

export async function getEmpEventDayAdminData(planId: string): Promise<EmpEventDayAdminData> {
  const { supabase, profile } = await getEmpUserContext()
  const plan = await getPlanOrThrow(supabase as any, planId)
  const settingsRow = await ensureSettingsForAdmin(supabase as any, planId, profile.id)
  const [shifts, equipmentAssignments, equipmentStock, mealTokens, importBatches, clockEvents] = await Promise.all([
    loadStaffShifts(supabase as any, planId),
    loadEquipmentAssignments(supabase as any, planId),
    loadEquipmentStock(supabase as any, planId),
    loadMealTokens(supabase as any, planId),
    loadImportBatches(supabase as any, planId),
    loadClockEvents(supabase as any, planId),
  ])

  const settings = buildSettings(settingsRow)
  const stockSummary = computeEmpEventDayStockSummary({
    stock: equipmentStock,
    equipment: equipmentAssignments,
    mealTokens,
    mealTokenTotal: settings.mealTokenTotal,
  })
  return {
    plan: buildPlanSummary(plan),
    settings,
    shifts,
    equipmentAssignments,
    equipmentStock,
    mealTokens,
    importBatches,
    clockEvents,
    stockSummary,
    metrics: buildMetrics({
      shifts,
      equipment: equipmentAssignments,
      mealTokens,
      timezone: settings.timezone,
      stockSummary,
    }),
  }
}

export async function getEmpEventDaySettings(planId: string) {
  const { supabase, profile } = await getEmpUserContext()
  await getPlanOrThrow(supabase as any, planId)
  return buildSettings(await ensureSettingsForAdmin(supabase as any, planId, profile.id))
}

export async function generateEmpEventDayKioskAccess(input: {
  planId: string
  pin?: string | null
  kioskLabel?: string | null
  timezone?: string | null
}) {
  const { supabase, profile } = await getEmpUserContext()
  await getPlanOrThrow(supabase as any, input.planId)
  const parsed = eventDaySettingsSchema.parse({
    pin: input.pin,
    kioskLabel: input.kioskLabel,
    timezone: input.timezone || 'Europe/London',
    enabled: true,
    rotateToken: true,
  })
  const kioskPin = parsed.pin && parsed.pin.trim().length >= 4 ? parsed.pin : null

  const rawToken = randomToken()
  const now = new Date().toISOString()
  const { data, error } = await (supabase as any)
    .from('emp_event_day_settings')
    .upsert({
      plan_id: input.planId,
      kiosk_enabled: true,
      kiosk_token_hash: hashToken(rawToken),
      kiosk_pin_hash: kioskPin ? hashPin(input.planId, kioskPin) : null,
      timezone: parsed.timezone,
      kiosk_label: parsed.kioskLabel || null,
      updated_by_user_id: profile.id,
      updated_at: now,
    }, { onConflict: 'plan_id' })
    .select('plan_id, kiosk_enabled, kiosk_token_hash, kiosk_pin_hash, timezone, kiosk_label, meal_token_total, created_at, updated_at')
    .single()

  if (error) throwEventDayDatabaseError('Failed to generate kiosk access', error)
  if (!data) throw new EmpEventDayError('Failed to generate kiosk access: Unknown error', 500)

  await touchEmpPlan(supabase as any, input.planId, profile.id)
  return { settings: buildSettings(data as EventDaySettingsRow), token: rawToken }
}

export async function updateEmpEventDayKioskSettings(input: {
  planId: string
  enabled?: boolean
  kioskLabel?: string | null
  timezone?: string | null
  pin?: string | null
  mealTokenTotal?: number | null
}) {
  const { supabase, profile } = await getEmpUserContext()
  await getPlanOrThrow(supabase as any, input.planId)
  const existing = await ensureSettingsForAdmin(supabase as any, input.planId, profile.id)
  const now = new Date().toISOString()
  const payload: Record<string, unknown> = {
    kiosk_enabled: typeof input.enabled === 'boolean' ? input.enabled : existing.kiosk_enabled,
    kiosk_label: typeof input.kioskLabel === 'undefined' ? existing.kiosk_label : nullIfBlank(input.kioskLabel),
    timezone: nullIfBlank(input.timezone) || existing.timezone || 'Europe/London',
    updated_by_user_id: profile.id,
    updated_at: now,
  }
  if (typeof input.mealTokenTotal !== 'undefined') {
    const parsed = eventDaySettingsSchema.parse({ mealTokenTotal: input.mealTokenTotal, timezone: existing.timezone || 'Europe/London' })
    payload.meal_token_total = parsed.mealTokenTotal
  }
  if (input.pin) {
    if (input.pin.trim().length < 4) throw new EmpEventDayError('Kiosk PIN must be at least 4 characters')
    payload.kiosk_pin_hash = hashPin(input.planId, input.pin)
  }

  const { data, error } = await (supabase as any)
    .from('emp_event_day_settings')
    .update(payload)
    .eq('plan_id', input.planId)
    .select('plan_id, kiosk_enabled, kiosk_token_hash, kiosk_pin_hash, timezone, kiosk_label, meal_token_total, created_at, updated_at')
    .single()

  if (error) throwEventDayDatabaseError('Failed to update kiosk settings', error)
  if (!data) throw new EmpEventDayError('Failed to update kiosk settings: Unknown error', 500)
  await touchEmpPlan(supabase as any, input.planId, profile.id)
  return buildSettings(data as EventDaySettingsRow)
}

export async function disableEmpEventDayKiosk(planId: string) {
  return updateEmpEventDayKioskSettings({ planId, enabled: false })
}

export async function previewEmpEventStaffingImport(input: {
  planId: string
  csvText: string
  mapping?: Partial<EmpEventImportMapping> | null
}): Promise<EmpEventStaffingImportPreview> {
  const { supabase } = await getEmpUserContext()
  await getPlanOrThrow(supabase as any, input.planId)
  const eventDateIso = await getEventDateFromPlan(supabase as any, input.planId)
  return previewEmpEventStaffingCsv({
    csvText: input.csvText,
    mapping: input.mapping,
    eventDateIso,
  })
}

function fallbackYearFromEventDateIso(value: string | null) {
  if (!value) return null
  const match = value.match(/^(\d{4})-/)
  return match ? Number(match[1]) : null
}

function eventStaffDatesForPlan(plan: EmpPlanRow) {
  return getEmpStaffSignInDatesForEvent(plan.event_name || '', plan.title)
}

export async function previewEmpEventMasterDeploymentImport(input: {
  planId: string
  workbookBuffer: Buffer
}): Promise<EmpEventStaffingImportPreview> {
  const { supabase } = await getEmpUserContext()
  const plan = await getPlanOrThrow(supabase as any, input.planId)
  const eventDateIso = await getEventDateFromPlan(supabase as any, input.planId)
  return await previewEmpEventMasterDeploymentXlsx({
    workbookBuffer: input.workbookBuffer,
    allowedDateKeys: eventStaffDatesForPlan(plan),
    fallbackYear: fallbackYearFromEventDateIso(eventDateIso),
  })
}

export async function commitEmpEventStaffingImport(input: {
  planId: string
  csvText: string
  mapping: Partial<EmpEventImportMapping>
  mode: EmpEventStaffingImportMode
  fileMetadata?: {
    fileName?: string | null
    fileType?: string | null
    fileSize?: number | null
  }
}) {
  const { supabase, profile } = await getEmpUserContext()
  await getPlanOrThrow(supabase as any, input.planId)
  const mapping = importMappingSchema.parse(input.mapping)
  const mode = staffingImportModeSchema.parse(input.mode)
  const eventDateIso = await getEventDateFromPlan(supabase as any, input.planId)
  const preview = previewEmpEventStaffingCsv({ csvText: input.csvText, mapping, eventDateIso })
  const validRows = preview.validRows.flatMap((previewRow) => previewRow.row ? [previewRow.row] : [])

  if (mode === 'replace_unstarted') {
    const { error: replaceError } = await (supabase as any)
      .from('emp_event_staff_shifts')
      .update({
        status: 'cancelled',
        updated_by_user_id: profile.id,
        updated_at: new Date().toISOString(),
        admin_notes: 'Cancelled by roster replacement import.',
      })
      .eq('plan_id', input.planId)
      .in('status', ['scheduled', 'no_show'])

    if (replaceError) throw new EmpEventDayError(`Failed to replace unstarted roster: ${replaceError.message}`, 500)
  }

  const { data: batch, error: batchError } = await (supabase as any)
    .from('emp_event_staff_import_batches')
    .insert({
      plan_id: input.planId,
      file_name: nullIfBlank(input.fileMetadata?.fileName),
      file_type: nullIfBlank(input.fileMetadata?.fileType),
      file_size: input.fileMetadata?.fileSize ?? null,
      uploaded_by_user_id: profile.id,
      row_count: validRows.length,
      error_count: preview.errorCount,
    })
    .select('id')
    .single()

  if (batchError || !batch) throw new EmpEventDayError(`Failed to create import batch: ${batchError?.message || 'Unknown error'}`, 500)

  if (validRows.length > 0) {
    const { error: insertError } = await (supabase as any)
      .from('emp_event_staff_shifts')
      .insert(validRows.map((row) => ({
        plan_id: input.planId,
        import_batch_id: batch.id,
        staff_name: row.staffName,
        staff_name_normalised: normaliseStaffName(row.staffName),
        agency: row.agency,
        email: row.email,
        phone: row.phone,
        sia_badge_number: row.siaBadgeNumber,
        sia_expiry_date: row.siaExpiryDate,
        position: row.position,
        area: row.area,
        shift_start: row.shiftStart,
        shift_end: row.shiftEnd,
        admin_notes: row.notes,
        created_by_user_id: profile.id,
        updated_by_user_id: profile.id,
      })))

    if (insertError) throw new EmpEventDayError(`Failed to import roster rows: ${insertError.message}`, 500)
  }

  await touchEmpPlan(supabase as any, input.planId, profile.id)
  return {
    batchId: String(batch.id),
    importedCount: validRows.length,
    skippedCount: preview.errorCount,
    preview,
    data: await getEmpEventDayAdminData(input.planId),
  }
}

export async function commitEmpEventMasterDeploymentImport(input: {
  planId: string
  workbookBuffer: Buffer
  mode: EmpEventStaffingImportMode
  fileMetadata?: {
    fileName?: string | null
    fileType?: string | null
    fileSize?: number | null
  }
}) {
  const { supabase, profile } = await getEmpUserContext()
  const plan = await getPlanOrThrow(supabase as any, input.planId)
  const mode = staffingImportModeSchema.parse(input.mode)
  const eventDateIso = await getEventDateFromPlan(supabase as any, input.planId)
  const preview = await previewEmpEventMasterDeploymentXlsx({
    workbookBuffer: input.workbookBuffer,
    allowedDateKeys: eventStaffDatesForPlan(plan),
    fallbackYear: fallbackYearFromEventDateIso(eventDateIso),
  })
  const validRows = preview.validRows.flatMap((previewRow) => previewRow.row ? [previewRow.row] : [])

  if (mode === 'replace_unstarted') {
    const { error: replaceError } = await (supabase as any)
      .from('emp_event_staff_shifts')
      .update({
        status: 'cancelled',
        updated_by_user_id: profile.id,
        updated_at: new Date().toISOString(),
        admin_notes: 'Cancelled by master deployment replacement import.',
      })
      .eq('plan_id', input.planId)
      .in('status', ['scheduled', 'no_show'])

    if (replaceError) throw new EmpEventDayError(`Failed to replace unstarted roster: ${replaceError.message}`, 500)
  }

  const eventStaffRows = getEmpStaffForEvent(plan.event_name || '', plan.title)
  const { data: batch, error: batchError } = await (supabase as any)
    .from('emp_event_staff_import_batches')
    .insert({
      plan_id: input.planId,
      file_name: nullIfBlank(input.fileMetadata?.fileName),
      file_type: nullIfBlank(input.fileMetadata?.fileType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
      file_size: input.fileMetadata?.fileSize ?? null,
      uploaded_by_user_id: profile.id,
      row_count: validRows.length,
      error_count: preview.errorCount,
    })
    .select('id')
    .single()

  if (batchError || !batch) throw new EmpEventDayError(`Failed to create master deployment import batch: ${batchError?.message || 'Unknown error'}`, 500)

  if (validRows.length > 0) {
    const { error: insertError } = await (supabase as any)
      .from('emp_event_staff_shifts')
      .insert(validRows.map((row) => {
        const matchedStaff = findEmpStaffByName(eventStaffRows, row.staffName)
        return {
          plan_id: input.planId,
          import_batch_id: batch.id,
          staff_name: row.staffName,
          staff_name_normalised: normaliseStaffName(row.staffName),
          agency: row.agency,
          email: row.email,
          phone: row.phone || matchedStaff?.mobileNumber || null,
          sia_badge_number: row.siaBadgeNumber || matchedStaff?.siaBadgeNumber || null,
          sia_expiry_date: row.siaExpiryDate || dateFromTemplateValue(matchedStaff?.expiryDate),
          position: row.position,
          area: row.area,
          shift_start: row.shiftStart,
          shift_end: row.shiftEnd,
          admin_notes: row.notes,
          created_by_user_id: profile.id,
          updated_by_user_id: profile.id,
        }
      }))

    if (insertError) throw new EmpEventDayError(`Failed to import master deployment rows: ${insertError.message}`, 500)
  }

  await touchEmpPlan(supabase as any, input.planId, profile.id)
  return {
    batchId: String(batch.id),
    importedCount: validRows.length,
    skippedCount: preview.errorCount,
    preview,
    data: await getEmpEventDayAdminData(input.planId),
  }
}

export async function syncEmpEventDayRosterFromPlan(input: {
  planId: string
  mode?: EmpEventStaffingImportMode
}) {
  const { supabase, profile } = await getEmpUserContext()
  const plan = await getPlanOrThrow(supabase as any, input.planId)
  const mode = staffingImportModeSchema.parse(input.mode || 'replace_unstarted')
  const source = await buildRosterRowsFromEmpPlan(input.planId, supabase as any, plan)

  if (source.rows.length === 0) {
    throw new EmpEventDayError('No staff rows were found in the EMP download sheets for this plan.', 404)
  }
  if (source.source === 'none') {
    throw new EmpEventDayError('No EMP roster source was found for this plan.', 404)
  }

  const batchId = await insertRosterSeedRows({
    supabase: supabase as any,
    planId: input.planId,
    profileId: profile.id,
    rows: source.rows,
    source: source.source,
    mode,
    replacementNote: 'Cancelled by EMP download-sheet roster sync.',
  })

  await touchEmpPlan(supabase as any, input.planId, profile.id)
  return {
    batchId,
    importedCount: source.rows.length,
    skippedCount: 0,
    source: source.source,
    data: await getEmpEventDayAdminData(input.planId),
  }
}

async function getKioskContext(token: string, pin?: string | null): Promise<KioskContext> {
  const supabase = createAdminSupabaseClient()
  const tokenHash = hashToken(clean(token))
  const { data: settings, error } = await (supabase as any)
    .from('emp_event_day_settings')
    .select('plan_id, kiosk_enabled, kiosk_token_hash, kiosk_pin_hash, timezone, kiosk_label, created_at, updated_at')
    .eq('kiosk_token_hash', tokenHash)
    .maybeSingle()

  if (error) throwEventDayDatabaseError('Failed to load kiosk settings', error)

  if (!settings || !settings.kiosk_enabled) {
    throw new EmpEventDayError('Kiosk access is not available', 403)
  }

  const providedPin = clean(pin)
  if (providedPin && settings.kiosk_pin_hash && hashPin(settings.plan_id, providedPin) !== settings.kiosk_pin_hash) {
    throw new EmpEventDayError('Invalid kiosk PIN', 401)
  }

  const plan = await getPlanOrThrow(supabase, settings.plan_id)
  return { supabase, settings: settings as EventDaySettingsRow, plan }
}

export async function verifyEmpEventDayKioskAccess(input: { token: string; pin?: string | null }) {
  const context = await getKioskContext(input.token, input.pin)
  return {
    planId: context.plan.id,
    eventName: context.plan.event_name || context.plan.title,
    kioskLabel: context.settings.kiosk_label,
    timezone: context.settings.timezone,
    eventDays: await loadKioskEventDays(context.supabase, context.plan.id, context.settings.timezone),
  }
}

async function loadKioskEventDays(supabase: SupabaseLike, planId: string, timezone: string) {
  const data = await selectAllEventDayRows<StaffShiftRow>(() => (supabase as any)
    .from('emp_event_staff_shifts')
    .select('id, plan_id, import_batch_id, staff_name, staff_name_normalised, agency, email, phone, sia_badge_number, sia_expiry_date, position, area, shift_start, shift_end, status, clocked_in_at, clocked_out_at, completed_at, clocked_in_via, clocked_out_via, admin_notes, staff_notes, is_walk_up, created_at, updated_at')
    .eq('plan_id', planId)
    .neq('status', 'cancelled')
    .not('shift_start', 'is', null)
    .order('shift_start', { ascending: true }), 'Failed to load event days')

  const seen = new Set<string>()
  for (const row of data.filter(isOperationalKioskRow)) {
    if (!row.shift_start) continue
    seen.add(formatDateInTimezone(new Date(row.shift_start), timezone))
  }

  return Array.from(seen).map((date) => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone || 'Europe/London',
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    }).formatToParts(new Date(`${date}T12:00:00.000Z`))
    const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    return {
      date,
      label: `${lookup.weekday} ${lookup.day} ${lookup.month}`,
    }
  })
}

function buildKioskStaff(row: StaffShiftRow): EmpEventDayKioskStaffResult {
  return {
    id: row.id,
    staffName: row.staff_name,
    agency: row.agency,
    position: row.position,
    area: row.area,
    shiftStart: row.shift_start,
    shiftEnd: row.shift_end,
    status: row.status,
    clockedInAt: row.clocked_in_at,
  }
}

function filterKioskRowsByEventDate(rows: StaffShiftRow[], eventDate: string | null | undefined, timezone: string) {
  if (!eventDate) return rows
  return rows.filter((row) => (
    row.shift_start
    && formatDateInTimezone(new Date(row.shift_start), timezone) === eventDate
  ))
}

function isLegacyDateOnlyStaffSignInRow(row: StaffShiftRow) {
  return Boolean(
    row.shift_start
    && !row.shift_end
    && !row.is_walk_up
    && /imported from emp staff sign-in sheet/i.test(row.admin_notes || '')
  )
}

function isOperationalKioskRow(row: StaffShiftRow) {
  if (row.status === 'cancelled') return false
  if (isLegacyDateOnlyStaffSignInRow(row)) return false
  if (row.status === 'scheduled' && !row.is_walk_up && (!row.shift_start || !row.shift_end)) return false
  return true
}

function uniqueKioskNameMatch(rows: StaffShiftRow[], query: string): {
  status: KioskNameLookupStatus
  row: StaffShiftRow | null
} {
  return resolveUniqueKioskNameMatch(
    rows.map((row) => ({ ...row, staffName: row.staff_name })),
    query
  )
}

async function loadKioskRowsForNameLookup(
  context: KioskContext,
  mode: KioskNameLookupMode,
  eventDate?: string | null
) {
  const statuses = ['scheduled', 'clocked_in', 'completed', 'no_show']
  const data = await selectAllEventDayRows<StaffShiftRow>(() => (context.supabase as any)
    .from('emp_event_staff_shifts')
    .select('id, plan_id, import_batch_id, staff_name, staff_name_normalised, agency, email, phone, sia_badge_number, sia_expiry_date, position, area, shift_start, shift_end, status, clocked_in_at, clocked_out_at, completed_at, clocked_in_via, clocked_out_via, admin_notes, staff_notes, is_walk_up, created_at, updated_at')
    .eq('plan_id', context.plan.id)
    .in('status', statuses)
    .order('shift_start', { ascending: true, nullsFirst: false }), 'Failed to search event-day staff')

  return filterKioskRowsByEventDate(data, eventDate, context.settings.timezone)
    .filter(isOperationalKioskRow)
}

async function loadKioskShiftByName(input: {
  token: string
  pin?: string | null
  query: string
  eventDate?: string | null
  mode: KioskNameLookupMode
}) {
  const context = await getKioskContext(input.token, input.pin)
  const rows = await loadKioskRowsForNameLookup(context, input.mode, input.eventDate)
  const match = uniqueKioskNameMatch(rows, input.query)
  const unavailableReason = match.row ? unavailableReasonForKioskStatus(match.row.status, input.mode) : null
  return { context, ...match, unavailableReason }
}

export async function searchKioskStaff(input: { token: string; body: unknown }) {
  const parsed = kioskNameLookupSchema.parse(input.body)
  const { row, status, unavailableReason } = await loadKioskShiftByName({
    token: input.token,
    pin: parsed.pin,
    query: parsed.query,
    eventDate: parsed.eventDate,
    mode: parsed.mode,
  })

  return {
    status: unavailableReason ? 'unavailable' : status,
    staff: row && !unavailableReason ? buildKioskStaff(row) : null,
    unavailableStaff: row && unavailableReason ? buildKioskStaff(row) : null,
    unavailableReason,
  }
}

export async function getKioskClockedInStaff(input: { token: string; body: unknown }) {
  const body = typeof input.body === 'object' && input.body ? input.body : {}
  const parsed = kioskNameLookupSchema.parse({ ...body, mode: 'clock_out' })
  const { context, row, status, unavailableReason } = await loadKioskShiftByName({
    token: input.token,
    pin: parsed.pin,
    query: parsed.query,
    eventDate: parsed.eventDate,
    mode: 'clock_out',
  })
  if (!row || status !== 'matched' || unavailableReason) {
    throw new EmpEventDayError('Keep typing until your name is the only match.', status === 'no_match' ? 404 : 409)
  }

  const { data: equipment, error: equipmentError } = await (context.supabase as any)
    .from('emp_event_equipment_assignments')
    .select('id, staff_shift_id, equipment_type, item_number, status, notes')
    .eq('plan_id', context.plan.id)
    .eq('staff_shift_id', row.id)
    .eq('status', 'issued')

  if (equipmentError) throw new EmpEventDayError(`Failed to load issued equipment: ${equipmentError.message}`, 500)

  const equipmentAssignments = ((equipment || []) as Array<{
    id: string
    staff_shift_id: string
    equipment_type: EmpEventEquipmentType
    item_number: string | null
    status: EmpEventEquipmentStatus
    notes: string | null
  }>).map((item) => ({
      id: item.id,
      equipmentType: item.equipment_type,
      itemNumber: item.item_number,
      status: item.status,
      notes: item.notes,
  }))

  return [{
    ...buildKioskStaff(row),
    equipmentAssignments,
  }]
}

function equipmentRowsFromClockIn(input: ReturnType<typeof clockInSchema.parse>, planId: string, issuedAt: string) {
  const rows: Array<Record<string, unknown>> = []
  const add = (equipmentType: EmpEventEquipmentType, itemNumber?: string | null, notes?: string | null) => {
    rows.push({
      plan_id: planId,
      staff_shift_id: input.staffShiftId,
      equipment_type: equipmentType,
      item_number: nullIfBlank(itemNumber),
      notes: nullIfBlank(notes),
      status: 'issued',
      issued_at: issuedAt,
      issued_via: 'kiosk',
    })
  }

  if (input.equipment.hasRadio) add('radio', input.equipment.radioNumber)
  if (input.equipment.hasHiVis) add('hi_vis', null, input.equipment.hiVisDetails)
  if (input.equipment.hasEarpiece) add('earpiece')
  if (input.equipment.hasClicker) add('clicker', input.equipment.clickerNumber)
  if (input.equipment.hasSearchWand) add('search_wand', input.equipment.searchWandNumber)
  if (input.equipment.otherKit) add('other', null, input.equipment.otherKit)
  return rows
}

function splitStockItemNumbers(value: unknown) {
  return clean(value)
    .split(/[\n,;]+/g)
    .map((item) => clean(item))
    .filter(Boolean)
}

function normaliseStockNumber(value: unknown) {
  return clean(value).toLowerCase()
}

function isUnavailableEquipmentStatus(status: EmpEventEquipmentStatus) {
  return ['issued', 'damaged', 'lost'].includes(status)
}

async function assertEquipmentStockAvailable(
  supabase: SupabaseLike,
  planId: string,
  rows: Array<Record<string, unknown>>
) {
  const requested = rows
    .map((row) => ({
      equipmentType: row.equipment_type as EmpEventEquipmentType,
      itemNumber: nullIfBlank(row.item_number),
      quantity: Number(row.quantity || 1),
    }))
    .filter((row) => row.equipmentType && row.quantity > 0)

  if (requested.length === 0) return

  const requestedTypes = Array.from(new Set(requested.map((row) => row.equipmentType)))
  const { data: stockRows, error: stockError } = await (supabase as any)
    .from('emp_event_equipment_stock')
    .select('*')
    .eq('plan_id', planId)
    .eq('active', true)
    .in('equipment_type', requestedTypes)

  if (stockError) throwEventDayDatabaseError('Failed to check equipment stock', stockError)

  const configuredStock = ((stockRows || []) as EquipmentStockRow[]).map(buildEquipmentStock)
  const configuredTypes = new Set(configuredStock.map((row) => row.equipmentType))
  if (configuredTypes.size === 0) return

  const { data: assignmentRows, error: assignmentError } = await (supabase as any)
    .from('emp_event_equipment_assignments')
    .select('*')
    .eq('plan_id', planId)
    .in('equipment_type', requestedTypes)
    .in('status', ['issued', 'damaged', 'lost'])

  if (assignmentError) throwEventDayDatabaseError('Failed to check issued equipment stock', assignmentError)

  const unavailableAssignments = ((assignmentRows || []) as EquipmentAssignmentRow[])
    .map(buildEquipment)
    .filter((item) => isUnavailableEquipmentStatus(item.status))

  for (const equipmentType of requestedTypes) {
    const stockForType = configuredStock.filter((item) => item.equipmentType === equipmentType)
    if (stockForType.length === 0) continue

    const serialisedStock = stockForType.filter((item) => item.itemNumber)
    const hasUnserialisedBucket = stockForType.some((item) => !item.itemNumber && item.quantityTotal > 0)
    const total = stockForType.reduce((value, item) => value + item.quantityTotal, 0)
    const alreadyUnavailable = sumEquipmentQuantities(unavailableAssignments.filter((item) => item.equipmentType === equipmentType))
    const requestedForType = requested.filter((item) => item.equipmentType === equipmentType)
    const requestedQuantity = requestedForType.reduce((value, item) => value + item.quantity, 0)

    if (alreadyUnavailable + requestedQuantity > total) {
      throw new EmpEventDayError(`${equipmentTypeLabel(equipmentType)} stock is exhausted. ${Math.max(total - alreadyUnavailable, 0)} left in stock.`, 409)
    }

    for (const item of requestedForType) {
      if (!item.itemNumber) continue
      const requestedNumber = normaliseStockNumber(item.itemNumber)
      const knownSerial = serialisedStock.some((stock) => normaliseStockNumber(stock.itemNumber) === requestedNumber)
      if (serialisedStock.length > 0 && !knownSerial && !hasUnserialisedBucket) {
        throw new EmpEventDayError(`${equipmentTypeLabel(equipmentType)} ${item.itemNumber} is not in the configured stock list.`, 409)
      }
      const unavailableSerial = unavailableAssignments.some((assignment) => (
        assignment.equipmentType === equipmentType
        && normaliseStockNumber(assignment.itemNumber) === requestedNumber
      ))
      if (unavailableSerial) {
        throw new EmpEventDayError(`${equipmentTypeLabel(equipmentType)} ${item.itemNumber} is not available.`, 409)
      }
    }
  }
}

async function loadShiftForUpdate(supabase: SupabaseLike, planId: string, staffShiftId: string) {
  const { data, error } = await (supabase as any)
    .from('emp_event_staff_shifts')
    .select('*')
    .eq('id', staffShiftId)
    .eq('plan_id', planId)
    .single()

  if (error || !data) throw new EmpEventDayError('Staff shift not found', 404)
  return data as StaffShiftRow
}

async function assertNameQueryMatchesShift(input: {
  token: string
  pin?: string | null
  shift: StaffShiftRow
  query: string
  eventDate?: string | null
  mode: KioskNameLookupMode
}) {
  const { row, status } = await loadKioskShiftByName({
    token: input.token,
    pin: input.pin,
    query: input.query,
    eventDate: input.eventDate,
    mode: input.mode,
  })

  if (status !== 'matched' || row?.id !== input.shift.id) {
    throw new EmpEventDayError('Keep typing until your own name is the only match.', 403)
  }
}

async function insertEquipmentEvents(supabase: SupabaseLike, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return
  const { error } = await (supabase as any).from('emp_event_equipment_events').insert(rows)
  if (error) throw new EmpEventDayError(`Failed to write equipment audit events: ${error.message}`, 500)
}

export async function clockInEmpEventStaff(input: { token: string; body: unknown }) {
  const parsed = clockInSchema.parse(input.body)
  const { supabase, plan } = await getKioskContext(input.token, parsed.pin)
  const now = new Date().toISOString()
  const shift = await loadShiftForUpdate(supabase, plan.id, parsed.staffShiftId)
  await assertNameQueryMatchesShift({
    token: input.token,
    pin: parsed.pin,
    shift,
    query: parsed.nameQuery,
    eventDate: parsed.eventDate,
    mode: 'clock_in',
  })
  if (shift.status === 'clocked_in') throw new EmpEventDayError('This staff member is already clocked in')
  if (shift.status !== 'scheduled') throw new EmpEventDayError('This staff shift is not available for clock-in')

  const equipmentRows = equipmentRowsFromClockIn(parsed, plan.id, now)
  await assertEquipmentStockAvailable(supabase, plan.id, equipmentRows)
  const { data: updatedShift, error: updateError } = await (supabase as any)
    .from('emp_event_staff_shifts')
    .update({
      status: 'clocked_in',
      clocked_in_at: now,
      clocked_in_via: 'kiosk',
      staff_notes: nullIfBlank(parsed.equipment.notes) || shift.staff_notes,
      updated_at: now,
    })
    .eq('id', parsed.staffShiftId)
    .eq('plan_id', plan.id)
    .eq('status', 'scheduled')
    .select('*')
    .single()

  if (updateError || !updatedShift) throw new EmpEventDayError('Unable to clock in this staff shift', 409)

  let insertedEquipment: EquipmentAssignmentRow[] = []
  try {
    if (equipmentRows.length > 0) {
      const { data, error } = await (supabase as any)
        .from('emp_event_equipment_assignments')
        .insert(equipmentRows)
        .select('*')
      if (error) throw error
      insertedEquipment = (data || []) as EquipmentAssignmentRow[]
      await insertEquipmentEvents(supabase, insertedEquipment.map((assignment) => ({
        plan_id: plan.id,
        assignment_id: assignment.id,
        staff_shift_id: parsed.staffShiftId,
        event_type: 'issued',
        after_data: assignment,
        performed_via: 'kiosk',
      })))
    }

    const { error: clockError } = await (supabase as any)
      .from('emp_event_staff_clock_events')
      .insert({
        plan_id: plan.id,
        staff_shift_id: parsed.staffShiftId,
        event_type: 'clock_in',
        event_time: now,
        captured_via: 'kiosk',
        device_label: parsed.deviceLabel,
        metadata: { equipmentCount: insertedEquipment.length },
      })
    if (clockError) throw clockError
  } catch (error: any) {
    if (insertedEquipment.length > 0) {
      await (supabase as any)
        .from('emp_event_equipment_assignments')
        .update({ status: 'cancelled', updated_at: new Date().toISOString(), notes: 'Cancelled after failed clock-in write.' })
        .in('id', insertedEquipment.map((assignment) => assignment.id))
    }
    await (supabase as any)
      .from('emp_event_staff_shifts')
      .update({ status: 'scheduled', clocked_in_at: null, clocked_in_via: null, updated_at: new Date().toISOString() })
      .eq('id', parsed.staffShiftId)
    throw new EmpEventDayError(`Clock-in failed: ${error?.message || String(error)}`, 409)
  }

  return {
    staff: buildKioskStaff(updatedShift as StaffShiftRow),
    equipmentAssignments: insertedEquipment.map(buildEquipment),
  }
}

export async function clockOutEmpEventStaff(input: { token: string; body: unknown }) {
  const parsed = clockOutSchema.parse(input.body)
  const { supabase, plan } = await getKioskContext(input.token, parsed.pin)
  const now = new Date().toISOString()
  const shift = await loadShiftForUpdate(supabase, plan.id, parsed.staffShiftId)
  await assertNameQueryMatchesShift({
    token: input.token,
    pin: parsed.pin,
    shift,
    query: parsed.nameQuery,
    eventDate: parsed.eventDate,
    mode: 'clock_out',
  })
  if (shift.status !== 'clocked_in') throw new EmpEventDayError('This staff member is not currently clocked in')

  const { data: currentEquipment, error: equipmentLoadError } = await (supabase as any)
    .from('emp_event_equipment_assignments')
    .select('*')
    .eq('plan_id', plan.id)
    .eq('staff_shift_id', parsed.staffShiftId)
    .eq('status', 'issued')

  if (equipmentLoadError) throw new EmpEventDayError(`Failed to load issued equipment: ${equipmentLoadError.message}`, 500)

  const returnsById = new Map(parsed.returns.map((item) => [item.assignmentId, item]))
  const updatedEquipment: EquipmentAssignmentRow[] = []
  for (const assignment of (currentEquipment || []) as EquipmentAssignmentRow[]) {
    const returnInput = returnsById.get(assignment.id)
    const status = returnInput?.status || 'returned'
    const before = assignment
    const { data, error } = await (supabase as any)
      .from('emp_event_equipment_assignments')
      .update({
        status,
        item_number: typeof returnInput?.itemNumber === 'undefined' ? assignment.item_number : nullIfBlank(returnInput.itemNumber),
        notes: nullIfBlank(returnInput?.notes) || assignment.notes,
        returned_at: now,
        returned_via: 'kiosk',
        updated_at: now,
      })
      .eq('id', assignment.id)
      .eq('status', 'issued')
      .select('*')
      .single()
    if (error || !data) throw new EmpEventDayError(`Failed to update returned equipment: ${error?.message || 'Unknown error'}`, 500)
    updatedEquipment.push(data as EquipmentAssignmentRow)
    await insertEquipmentEvents(supabase, [{
      plan_id: plan.id,
      assignment_id: assignment.id,
      staff_shift_id: parsed.staffShiftId,
      event_type: status,
      before_data: before,
      after_data: data,
      performed_via: 'kiosk',
      reason: nullIfBlank(returnInput?.notes),
    }])
  }

  const { data: updatedShift, error: updateError } = await (supabase as any)
    .from('emp_event_staff_shifts')
    .update({
      status: 'completed',
      clocked_out_at: now,
      completed_at: now,
      clocked_out_via: 'kiosk',
      staff_notes: nullIfBlank(parsed.notes) || shift.staff_notes,
      updated_at: now,
    })
    .eq('id', parsed.staffShiftId)
    .eq('plan_id', plan.id)
    .eq('status', 'clocked_in')
    .select('*')
    .single()

  if (updateError || !updatedShift) throw new EmpEventDayError('Unable to clock out this staff shift', 409)

  const { error: clockError } = await (supabase as any)
    .from('emp_event_staff_clock_events')
    .insert({
      plan_id: plan.id,
      staff_shift_id: parsed.staffShiftId,
      event_type: 'clock_out',
      event_time: now,
      captured_via: 'kiosk',
      device_label: parsed.deviceLabel,
      metadata: { returnedEquipmentCount: updatedEquipment.length },
    })
  if (clockError) throw new EmpEventDayError(`Failed to write clock-out event: ${clockError.message}`, 500)

  return {
    staff: buildKioskStaff(updatedShift as StaffShiftRow),
    equipmentAssignments: updatedEquipment.map(buildEquipment),
  }
}

export async function adminAddWalkUpStaff(planId: string, body: unknown) {
  const parsed = adminWalkUpStaffSchema.parse(body)
  const { supabase, profile } = await getEmpUserContext()
  await getPlanOrThrow(supabase as any, planId)
  const now = new Date().toISOString()
  const { data, error } = await (supabase as any)
    .from('emp_event_staff_shifts')
    .insert({
      plan_id: planId,
      staff_name: parsed.staffName,
      staff_name_normalised: normaliseStaffName(parsed.staffName),
      agency: parsed.agency || null,
      email: parsed.email || null,
      phone: parsed.phone || null,
      sia_badge_number: parsed.siaBadgeNumber || null,
      sia_expiry_date: parsed.siaExpiryDate || null,
      position: parsed.position || null,
      area: parsed.area || null,
      shift_start: parsed.shiftStart || null,
      shift_end: parsed.shiftEnd || null,
      admin_notes: parsed.notes || null,
      is_walk_up: true,
      created_by_user_id: profile.id,
      updated_by_user_id: profile.id,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single()

  if (error || !data) throw new EmpEventDayError(`Failed to add walk-up staff: ${error?.message || 'Unknown error'}`, 500)
  await touchEmpPlan(supabase as any, planId, profile.id)
  return buildShift(data as StaffShiftRow)
}

export async function adminMarkNoShow(planId: string, body: unknown) {
  const parsed = adminNoShowSchema.parse(body)
  const { supabase, profile } = await getEmpUserContext()
  await getPlanOrThrow(supabase as any, planId)
  const now = new Date().toISOString()
  const { data, error } = await (supabase as any)
    .from('emp_event_staff_shifts')
    .update({
      status: 'no_show',
      admin_notes: parsed.reason || 'Marked as no-show.',
      updated_by_user_id: profile.id,
      updated_at: now,
    })
    .eq('id', parsed.staffShiftId)
    .eq('plan_id', planId)
    .eq('status', 'scheduled')
    .select('*')
    .single()
  if (error || !data) throw new EmpEventDayError('Only scheduled staff can be marked no-show', 409)
  await touchEmpPlan(supabase as any, planId, profile.id)
  return buildShift(data as StaffShiftRow)
}

export async function adminReinstateNoShow(planId: string, body: unknown) {
  const parsed = adminNoShowSchema.parse(body)
  const { supabase, profile } = await getEmpUserContext()
  await getPlanOrThrow(supabase as any, planId)
  const now = new Date().toISOString()
  const { data, error } = await (supabase as any)
    .from('emp_event_staff_shifts')
    .update({
      status: 'scheduled',
      admin_notes: parsed.reason || 'Reinstated from no-show.',
      updated_by_user_id: profile.id,
      updated_at: now,
    })
    .eq('id', parsed.staffShiftId)
    .eq('plan_id', planId)
    .eq('status', 'no_show')
    .select('*')
    .single()
  if (error || !data) throw new EmpEventDayError('Only no-show staff can be reinstated', 409)
  await touchEmpPlan(supabase as any, planId, profile.id)
  return buildShift(data as StaffShiftRow)
}

export async function adminAdjustClockTime(planId: string, body: unknown) {
  const parsed = adminClockAdjustmentSchema.parse(body)
  const { supabase, profile } = await getEmpUserContext()
  await getPlanOrThrow(supabase as any, planId)
  const shift = await loadShiftForUpdate(supabase as any, planId, parsed.staffShiftId)
  const now = new Date().toISOString()
  const field = parsed.clockType === 'clock_in' ? 'clocked_in_at' : 'clocked_out_at'
  const statusPatch: Record<string, unknown> = {}
  if (parsed.clockType === 'clock_in' && shift.status === 'scheduled') statusPatch.status = 'clocked_in'
  if (parsed.clockType === 'clock_out' && shift.status === 'clocked_in') {
    statusPatch.status = 'completed'
    statusPatch.completed_at = parsed.eventTime
  }

  const { data, error } = await (supabase as any)
    .from('emp_event_staff_shifts')
    .update({
      [field]: new Date(parsed.eventTime).toISOString(),
      ...statusPatch,
      updated_by_user_id: profile.id,
      updated_at: now,
    })
    .eq('id', parsed.staffShiftId)
    .eq('plan_id', planId)
    .select('*')
    .single()

  if (error || !data) throw new EmpEventDayError(`Failed to adjust clock time: ${error?.message || 'Unknown error'}`, 500)

  const { error: clockError } = await (supabase as any)
    .from('emp_event_staff_clock_events')
    .insert({
      plan_id: planId,
      staff_shift_id: parsed.staffShiftId,
      event_type: 'admin_adjustment',
      event_time: new Date(parsed.eventTime).toISOString(),
      captured_via: 'admin',
      captured_by_user_id: profile.id,
      reason: parsed.reason,
      metadata: {
        clockType: parsed.clockType,
        previousClockIn: shift.clocked_in_at,
        previousClockOut: shift.clocked_out_at,
      },
    })
  if (clockError) throw new EmpEventDayError(`Failed to write clock adjustment event: ${clockError.message}`, 500)
  await touchEmpPlan(supabase as any, planId, profile.id)
  return buildShift(data as StaffShiftRow)
}

export async function adminUpdateEquipmentAssignment(planId: string, body: unknown) {
  const parsed = adminEquipmentUpdateSchema.parse(body)
  const { supabase, profile } = await getEmpUserContext()
  await getPlanOrThrow(supabase as any, planId)
  const { data: before, error: beforeError } = await (supabase as any)
    .from('emp_event_equipment_assignments')
    .select('*')
    .eq('id', parsed.assignmentId)
    .eq('plan_id', planId)
    .single()
  if (beforeError || !before) throw new EmpEventDayError('Equipment assignment not found', 404)

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (parsed.status) {
    updatePayload.status = parsed.status
    if (['returned', 'damaged', 'lost'].includes(parsed.status)) {
      updatePayload.returned_at = new Date().toISOString()
      updatePayload.returned_via = 'admin'
      updatePayload.returned_by_user_id = profile.id
    }
  }
  if (typeof parsed.itemNumber !== 'undefined') updatePayload.item_number = nullIfBlank(parsed.itemNumber)
  if (typeof parsed.quantity !== 'undefined') updatePayload.quantity = parsed.quantity
  if (typeof parsed.notes !== 'undefined') updatePayload.notes = parsed.notes

  const { data, error } = await (supabase as any)
    .from('emp_event_equipment_assignments')
    .update(updatePayload)
    .eq('id', parsed.assignmentId)
    .eq('plan_id', planId)
    .select('*')
    .single()
  if (error || !data) throw new EmpEventDayError(`Failed to update equipment: ${error?.message || 'Unknown error'}`, 500)

  await insertEquipmentEvents(supabase as any, [{
    plan_id: planId,
    assignment_id: parsed.assignmentId,
    staff_shift_id: (before as EquipmentAssignmentRow).staff_shift_id,
    event_type: parsed.status || 'adjusted',
    before_data: before,
    after_data: data,
    performed_by_user_id: profile.id,
    performed_via: 'admin',
    reason: parsed.reason,
  }])
  await touchEmpPlan(supabase as any, planId, profile.id)
  return buildEquipment(data as EquipmentAssignmentRow)
}

export async function adminReplaceEquipmentAssignment(planId: string, body: unknown) {
  const parsed = adminEquipmentReplaceSchema.parse(body)
  const { supabase, profile } = await getEmpUserContext()
  await getPlanOrThrow(supabase as any, planId)
  const { data: before, error: beforeError } = await (supabase as any)
    .from('emp_event_equipment_assignments')
    .select('*')
    .eq('id', parsed.assignmentId)
    .eq('plan_id', planId)
    .single()
  if (beforeError || !before) throw new EmpEventDayError('Equipment assignment not found', 404)
  const oldAssignment = before as EquipmentAssignmentRow
  const now = new Date().toISOString()
  await assertEquipmentStockAvailable(supabase as any, planId, [{
    equipment_type: oldAssignment.equipment_type,
    item_number: parsed.replacementItemNumber,
    quantity: oldAssignment.quantity,
  }])

  const { data: replacement, error: insertError } = await (supabase as any)
    .from('emp_event_equipment_assignments')
    .insert({
      plan_id: planId,
      staff_shift_id: oldAssignment.staff_shift_id,
      equipment_type: oldAssignment.equipment_type,
      item_number: parsed.replacementItemNumber,
      quantity: oldAssignment.quantity,
      status: 'issued',
      issued_at: now,
      issued_via: 'admin',
      issued_by_user_id: profile.id,
      notes: parsed.replacementNotes,
    })
    .select('*')
    .single()
  if (insertError || !replacement) throw new EmpEventDayError(`Failed to create replacement equipment: ${insertError?.message || 'Unknown error'}`, 500)

  const { data: updatedOld, error: updateError } = await (supabase as any)
    .from('emp_event_equipment_assignments')
    .update({
      status: parsed.previousStatus,
      returned_at: now,
      returned_via: 'admin',
      returned_by_user_id: profile.id,
      replaced_by_assignment_id: replacement.id,
      updated_at: now,
      notes: oldAssignment.notes ? `${oldAssignment.notes}\n${parsed.reason}` : parsed.reason,
    })
    .eq('id', parsed.assignmentId)
    .eq('plan_id', planId)
    .select('*')
    .single()
  if (updateError || !updatedOld) throw new EmpEventDayError(`Failed to update replaced equipment: ${updateError?.message || 'Unknown error'}`, 500)

  await insertEquipmentEvents(supabase as any, [
    {
      plan_id: planId,
      assignment_id: parsed.assignmentId,
      staff_shift_id: oldAssignment.staff_shift_id,
      event_type: 'replaced',
      before_data: before,
      after_data: updatedOld,
      performed_by_user_id: profile.id,
      performed_via: 'admin',
      reason: parsed.reason,
    },
    {
      plan_id: planId,
      assignment_id: replacement.id,
      staff_shift_id: oldAssignment.staff_shift_id,
      event_type: 'issued',
      after_data: replacement,
      performed_by_user_id: profile.id,
      performed_via: 'admin',
      reason: parsed.reason,
    },
  ])
  await touchEmpPlan(supabase as any, planId, profile.id)
  return {
    previous: buildEquipment(updatedOld as EquipmentAssignmentRow),
    replacement: buildEquipment(replacement as EquipmentAssignmentRow),
  }
}

async function loadEquipmentStockRowsForType(
  supabase: SupabaseLike,
  planId: string,
  equipmentType: EmpEventEquipmentType
) {
  const { data, error } = await (supabase as any)
    .from('emp_event_equipment_stock')
    .select('*')
    .eq('plan_id', planId)
    .eq('equipment_type', equipmentType)

  if (error) throwEventDayDatabaseError('Failed to load equipment stock', error)
  return (data || []) as EquipmentStockRow[]
}

export async function adminUpsertEquipmentStock(planId: string, body: unknown) {
  const parsed = adminEquipmentStockUpsertSchema.parse(body)
  const { supabase, profile } = await getEmpUserContext()
  await getPlanOrThrow(supabase as any, planId)
  const itemNumbers = Array.from(new Set(splitStockItemNumbers(parsed.itemNumbers)))
  const now = new Date().toISOString()
  const existingRows = await loadEquipmentStockRowsForType(supabase as any, planId, parsed.equipmentType)
  const rowsToReturn: EquipmentStockRow[] = []

  if (itemNumbers.length > 0) {
    const existingByNumber = new Map(
      existingRows
        .filter((row) => row.item_number)
        .map((row) => [normaliseStockNumber(row.item_number), row])
    )

    for (const itemNumber of itemNumbers) {
      const existing = existingByNumber.get(normaliseStockNumber(itemNumber))
      if (existing) {
        const { data, error } = await (supabase as any)
          .from('emp_event_equipment_stock')
          .update({
            quantity_total: 1,
            active: true,
            notes: parsed.notes ?? existing.notes,
            updated_by_user_id: profile.id,
            updated_at: now,
          })
          .eq('id', existing.id)
          .select('*')
          .single()
        if (error || !data) throw new EmpEventDayError(`Failed to update stock item ${itemNumber}: ${error?.message || 'Unknown error'}`, 500)
        rowsToReturn.push(data as EquipmentStockRow)
      } else {
        const { data, error } = await (supabase as any)
          .from('emp_event_equipment_stock')
          .insert({
            plan_id: planId,
            equipment_type: parsed.equipmentType,
            item_number: itemNumber,
            quantity_total: 1,
            active: true,
            notes: parsed.notes || null,
            created_by_user_id: profile.id,
            updated_by_user_id: profile.id,
            created_at: now,
            updated_at: now,
          })
          .select('*')
          .single()
        if (error || !data) throw new EmpEventDayError(`Failed to add stock item ${itemNumber}: ${error?.message || 'Unknown error'}`, 500)
        rowsToReturn.push(data as EquipmentStockRow)
      }
    }
  } else {
    const existing = existingRows.find((row) => !row.item_number)
    if (existing) {
      const { data, error } = await (supabase as any)
        .from('emp_event_equipment_stock')
        .update({
          quantity_total: parsed.quantityTotal,
          active: true,
          notes: parsed.notes ?? existing.notes,
          updated_by_user_id: profile.id,
          updated_at: now,
        })
        .eq('id', existing.id)
        .select('*')
        .single()
      if (error || !data) throw new EmpEventDayError(`Failed to update ${equipmentTypeLabel(parsed.equipmentType)} stock: ${error?.message || 'Unknown error'}`, 500)
      rowsToReturn.push(data as EquipmentStockRow)
    } else {
      const { data, error } = await (supabase as any)
        .from('emp_event_equipment_stock')
        .insert({
          plan_id: planId,
          equipment_type: parsed.equipmentType,
          item_number: null,
          quantity_total: parsed.quantityTotal,
          active: true,
          notes: parsed.notes || null,
          created_by_user_id: profile.id,
          updated_by_user_id: profile.id,
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single()
      if (error || !data) throw new EmpEventDayError(`Failed to add ${equipmentTypeLabel(parsed.equipmentType)} stock: ${error?.message || 'Unknown error'}`, 500)
      rowsToReturn.push(data as EquipmentStockRow)
    }
  }

  await touchEmpPlan(supabase as any, planId, profile.id)
  return rowsToReturn.map(buildEquipmentStock)
}

export async function adminUpdateEquipmentStock(planId: string, body: unknown) {
  const parsed = adminEquipmentStockUpdateSchema.parse(body)
  const { supabase, profile } = await getEmpUserContext()
  await getPlanOrThrow(supabase as any, planId)
  const payload: Record<string, unknown> = {
    updated_by_user_id: profile.id,
    updated_at: new Date().toISOString(),
  }
  if (typeof parsed.quantityTotal !== 'undefined') payload.quantity_total = parsed.quantityTotal
  if (typeof parsed.active !== 'undefined') payload.active = parsed.active
  if (typeof parsed.notes !== 'undefined') payload.notes = parsed.notes

  const { data, error } = await (supabase as any)
    .from('emp_event_equipment_stock')
    .update(payload)
    .eq('id', parsed.stockId)
    .eq('plan_id', planId)
    .select('*')
    .single()

  if (error || !data) throw new EmpEventDayError(`Failed to update equipment stock: ${error?.message || 'Unknown error'}`, 500)
  await touchEmpPlan(supabase as any, planId, profile.id)
  return buildEquipmentStock(data as EquipmentStockRow)
}

export async function adminIssueMealToken(planId: string, body: unknown) {
  const parsed = mealTokenIssueSchema.parse(body)
  const { supabase, profile } = await getEmpUserContext()
  await getPlanOrThrow(supabase as any, planId)
  const settings = await ensureSettingsForAdmin(supabase as any, planId, profile.id)
  await loadShiftForUpdate(supabase as any, planId, parsed.staffShiftId)
  const tokenDate = parsed.tokenDate || formatDateInTimezone(new Date(), settings.timezone)
  if (typeof settings.meal_token_total === 'number') {
    const { count, error: countError } = await (supabase as any)
      .from('emp_event_meal_tokens')
      .select('id', { count: 'exact', head: true })
      .eq('plan_id', planId)
    if (countError) throwEventDayDatabaseError('Failed to check meal token stock', countError)
    if ((count || 0) >= settings.meal_token_total) {
      throw new EmpEventDayError('Meal token stock is exhausted.', 409)
    }
  }
  const { data, error } = await (supabase as any)
    .from('emp_event_meal_tokens')
    .insert({
      plan_id: planId,
      staff_shift_id: parsed.staffShiftId,
      token_date: tokenDate,
      issued_by_user_id: profile.id,
      notes: parsed.notes,
    })
    .select('*')
    .single()
  if (error || !data) throw new EmpEventDayError('Meal token has already been issued for this staff member today', 409)
  await touchEmpPlan(supabase as any, planId, profile.id)
  return buildMealToken(data as MealTokenRow)
}

function csvEscape(value: unknown) {
  const text = String(value ?? '')
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export async function exportEmpEventDayCsv(planId: string) {
  const data = await getEmpEventDayAdminData(planId)
  const equipmentByShift = new Map<string, EmpEventDayEquipmentAssignment[]>()
  for (const item of data.equipmentAssignments) {
    const group = equipmentByShift.get(item.staffShiftId) || []
    group.push(item)
    equipmentByShift.set(item.staffShiftId, group)
  }
  const mealTokensByShift = new Map<string, EmpEventDayMealToken[]>()
  for (const token of data.mealTokens) {
    const group = mealTokensByShift.get(token.staffShiftId) || []
    group.push(token)
    mealTokensByShift.set(token.staffShiftId, group)
  }

  const headers = [
    'Event plan title',
    'Event name',
    'Staff name',
    'Agency',
    'Position',
    'Area',
    'Scheduled start',
    'Scheduled end',
    'Actual clock-in',
    'Actual clock-out',
    'Status',
    'Equipment issued',
    'Equipment returned',
    'Equipment outstanding',
    'Meal token dates',
    'Admin notes',
    'Staff notes',
  ]
  const rows = data.shifts.map((shift) => {
    const equipment = equipmentByShift.get(shift.id) || []
    const mealTokens = mealTokensByShift.get(shift.id) || []
    const describe = (items: EmpEventDayEquipmentAssignment[]) => items.map((item) => `${item.equipmentType}${item.itemNumber ? ` ${item.itemNumber}` : ''}`).join('; ')
    return [
      data.plan.title,
      data.plan.eventName || '',
      shift.staffName,
      shift.agency || '',
      shift.position || '',
      shift.area || '',
      shift.shiftStart || '',
      shift.shiftEnd || '',
      shift.clockedInAt || '',
      shift.clockedOutAt || '',
      shift.status,
      describe(equipment),
      describe(equipment.filter((item) => ['returned', 'replaced'].includes(item.status))),
      describe(equipment.filter((item) => ['issued', 'damaged', 'lost'].includes(item.status))),
      mealTokens.map((token) => token.tokenDate).join('; '),
      shift.adminNotes || '',
      shift.staffNotes || '',
    ]
  })
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')
  const safeName = clean(data.plan.eventName || data.plan.title || 'Event').replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return {
    filename: `Event-Day-Operations-${safeName || 'Event'}-${formatDateInTimezone(new Date(), data.settings.timezone)}.csv`,
    csv,
  }
}
