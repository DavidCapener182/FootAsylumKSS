import { z } from 'zod'

export const EMP_EVENT_STAFF_SHIFT_STATUSES = [
  'scheduled',
  'clocked_in',
  'completed',
  'no_show',
  'cancelled',
] as const

export const EMP_EVENT_CLOCK_EVENT_TYPES = [
  'clock_in',
  'clock_out',
  'admin_adjustment',
] as const

export const EMP_EVENT_EQUIPMENT_TYPES = [
  'hi_vis',
  'radio',
  'earpiece',
  'clicker',
  'search_wand',
  'other',
] as const

export const EMP_EVENT_EQUIPMENT_STATUSES = [
  'issued',
  'returned',
  'replaced',
  'damaged',
  'lost',
  'cancelled',
] as const

export type EmpEventStaffShiftStatus = typeof EMP_EVENT_STAFF_SHIFT_STATUSES[number]
export type EmpEventClockEventType = typeof EMP_EVENT_CLOCK_EVENT_TYPES[number]
export type EmpEventEquipmentType = typeof EMP_EVENT_EQUIPMENT_TYPES[number]
export type EmpEventEquipmentStatus = typeof EMP_EVENT_EQUIPMENT_STATUSES[number]

export const empEventStaffShiftStatusSchema = z.enum(EMP_EVENT_STAFF_SHIFT_STATUSES)
export const empEventEquipmentTypeSchema = z.enum(EMP_EVENT_EQUIPMENT_TYPES)
export const empEventEquipmentStatusSchema = z.enum(EMP_EVENT_EQUIPMENT_STATUSES)

const optionalText = z.preprocess(
  (value) => {
    if (value === null || typeof value === 'undefined') return null
    const text = String(value).trim()
    return text.length > 0 ? text : null
  },
  z.string().nullable()
)

const optionalIsoText = optionalText.refine((value) => {
  if (!value) return true
  return !Number.isNaN(Date.parse(value))
}, 'Invalid date/time')

export const staffImportRowSchema = z.object({
  staffName: z.string().trim().min(1, 'Staff name is required'),
  agency: optionalText,
  email: optionalText,
  phone: optionalText,
  siaBadgeNumber: optionalText,
  siaExpiryDate: optionalText,
  position: optionalText,
  area: optionalText,
  shiftStart: optionalIsoText,
  shiftEnd: optionalIsoText,
  notes: optionalText,
})

export const importMappingSchema = z.object({
  staffName: z.string().min(1),
  agency: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  siaBadgeNumber: z.string().optional().nullable(),
  siaExpiryDate: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  area: z.string().optional().nullable(),
  shiftStart: z.string().optional().nullable(),
  shiftEnd: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const staffingImportModeSchema = z.enum(['add', 'replace_unstarted'])

const equipmentQuestionSchema = z.object({
  hasRadio: z.boolean().default(false),
  radioNumber: optionalText,
  hasHiVis: z.boolean().default(false),
  hiVisDetails: optionalText,
  hasEarpiece: z.boolean().default(false),
  hasClicker: z.boolean().default(false),
  clickerNumber: optionalText,
  hasSearchWand: z.boolean().default(false),
  searchWandNumber: optionalText,
  otherKit: optionalText,
  notes: optionalText,
}).superRefine((value, context) => {
  if (value.hasRadio && !value.radioNumber) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['radioNumber'],
      message: 'Radio number is required when radio is issued',
    })
  }
})

export const clockInSchema = z.object({
  staffShiftId: z.string().uuid(),
  pin: optionalText.optional(),
  nameQuery: z.string({
    required_error: 'Name is required',
    invalid_type_error: 'Name is required',
  }).trim().min(2, 'Keep typing your name'),
  eventDate: optionalText.optional(),
  deviceLabel: optionalText,
  equipment: equipmentQuestionSchema,
})

export const clockOutSchema = z.object({
  staffShiftId: z.string().uuid(),
  pin: optionalText.optional(),
  nameQuery: z.string({
    required_error: 'Name is required',
    invalid_type_error: 'Name is required',
  }).trim().min(2, 'Keep typing your name'),
  eventDate: optionalText.optional(),
  deviceLabel: optionalText,
  returns: z.array(z.object({
    assignmentId: z.string().uuid(),
    status: z.enum(['returned', 'damaged', 'lost']).default('returned'),
    itemNumber: optionalText.optional(),
    notes: optionalText.optional(),
  })).default([]),
  notes: optionalText,
})

export const adminEquipmentUpdateSchema = z.object({
  staffShiftId: z.string().uuid().optional(),
  assignmentId: z.string().uuid(),
  status: empEventEquipmentStatusSchema.optional(),
  itemNumber: optionalText.optional(),
  quantity: z.coerce.number().int().positive().optional(),
  notes: optionalText.optional(),
  reason: z.string().trim().min(1, 'Reason is required'),
})

export const adminEquipmentReplaceSchema = z.object({
  assignmentId: z.string().uuid(),
  replacementItemNumber: optionalText,
  replacementNotes: optionalText,
  previousStatus: empEventEquipmentStatusSchema.default('replaced'),
  reason: z.string().trim().min(1, 'Reason is required'),
})

export const adminEquipmentStockUpsertSchema = z.object({
  equipmentType: empEventEquipmentTypeSchema,
  itemNumbers: optionalText.optional(),
  quantityTotal: z.coerce.number().int().min(0, 'Stock quantity cannot be negative').default(1),
  notes: optionalText.optional(),
})

export const adminEquipmentStockUpdateSchema = z.object({
  stockId: z.string().uuid(),
  quantityTotal: z.coerce.number().int().min(0, 'Stock quantity cannot be negative').optional(),
  active: z.boolean().optional(),
  notes: optionalText.optional(),
})

export const mealTokenIssueSchema = z.object({
  staffShiftId: z.string().uuid(),
  tokenDate: optionalText.optional(),
  notes: optionalText.optional(),
})

export const adminClockAdjustmentSchema = z.object({
  staffShiftId: z.string().uuid(),
  clockType: z.enum(['clock_in', 'clock_out']),
  eventTime: z.string().trim().min(1).refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date/time'),
  reason: z.string().trim().min(1, 'Adjustment reason is required'),
})

export const kioskAccessSchema = z.object({
  pin: z.string().min(1),
})

export const kioskNameLookupSchema = z.object({
  pin: optionalText.optional(),
  query: z.string({
    required_error: 'Name is required',
    invalid_type_error: 'Name is required',
  }).trim().min(2, 'Keep typing your name'),
  eventDate: optionalText.optional(),
  mode: z.enum(['clock_in', 'clock_out']).default('clock_in'),
})

export const adminWalkUpStaffSchema = z.object({
  staffName: z.string().trim().min(1, 'Staff name is required'),
  agency: optionalText.optional(),
  email: optionalText.optional(),
  phone: optionalText.optional(),
  siaBadgeNumber: optionalText.optional(),
  siaExpiryDate: optionalText.optional(),
  position: optionalText.optional(),
  area: optionalText.optional(),
  shiftStart: optionalIsoText.optional(),
  shiftEnd: optionalIsoText.optional(),
  notes: optionalText.optional(),
})

export const adminNoShowSchema = z.object({
  staffShiftId: z.string().uuid(),
  action: z.enum(['mark_no_show', 'reinstate']).default('mark_no_show'),
  reason: optionalText.optional(),
})

export const eventDaySettingsSchema = z.object({
  pin: optionalText.optional(),
  kioskLabel: optionalText.optional(),
  timezone: z.string().trim().min(1).default('Europe/London'),
  mealTokenTotal: z.coerce.number().int().min(0, 'Meal token total cannot be negative').nullable().optional(),
  enabled: z.boolean().optional(),
  rotateToken: z.boolean().optional(),
})

export type StaffImportRowInput = z.infer<typeof staffImportRowSchema>
export type EmpEventImportMapping = z.infer<typeof importMappingSchema>
export type EmpEventStaffingImportMode = z.infer<typeof staffingImportModeSchema>
export type ClockInInput = z.infer<typeof clockInSchema>
export type ClockOutInput = z.infer<typeof clockOutSchema>
export type AdminEquipmentStockUpsertInput = z.infer<typeof adminEquipmentStockUpsertSchema>
