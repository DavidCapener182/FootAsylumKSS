import { z } from 'zod'

export const INCIDENT_CATEGORIES = [
  'accident',
  'near_miss',
  'security',
  'fire',
  'health_safety',
  'other',
] as const

export const INCIDENT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const

const occurredAtSchema = z.string().trim().min(1, 'Occurred date is required').refine(
  (value) => !Number.isNaN(Date.parse(value)),
  'Occurred date is invalid'
)

export const incidentFormSchema = z.object({
  store_id: z.string().uuid('Store is required'),
  incident_category: z.enum(INCIDENT_CATEGORIES),
  severity: z.enum(INCIDENT_SEVERITIES),
  summary: z.string().trim().min(1, 'Summary is required').max(500, 'Summary is too long'),
  description: z.string().trim().max(10_000, 'Description is too long').optional(),
  occurred_at: occurredAtSchema,
  riddor_reportable: z.enum(['', 'yes', 'no'], {
    required_error: 'Select a RIDDOR screening outcome',
    invalid_type_error: 'Select a RIDDOR screening outcome',
  }).superRefine((value, context) => {
    if (value === '') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select a RIDDOR screening outcome',
      })
    }
  }),
})

export const createIncidentInputSchema = z.object({
  store_id: z.string().uuid('Store is required'),
  incident_category: z.enum(INCIDENT_CATEGORIES),
  severity: z.enum(INCIDENT_SEVERITIES),
  summary: z.string().trim().min(1, 'Summary is required').max(500, 'Summary is too long'),
  description: z.string().trim().max(10_000, 'Description is too long').optional(),
  occurred_at: occurredAtSchema,
  persons_involved: z.unknown().optional(),
  injury_details: z.unknown().optional(),
  witnesses: z.unknown().optional(),
  riddor_reportable: z.boolean(),
}).strict()

export type IncidentFormValues = z.infer<typeof incidentFormSchema>
export type CreateIncidentInput = z.infer<typeof createIncidentInputSchema>

export function toCreateIncidentInput(values: IncidentFormValues): CreateIncidentInput {
  // Keep this conversion safe when it is reused outside react-hook-form. The
  // form resolver rejects the empty placeholder, but callers must not be able
  // to turn an unselected RIDDOR outcome into a persisted `false` value.
  const parsedValues = incidentFormSchema.parse(values)

  return createIncidentInputSchema.parse({
    store_id: parsedValues.store_id,
    incident_category: parsedValues.incident_category,
    severity: parsedValues.severity,
    summary: parsedValues.summary,
    description: parsedValues.description,
    occurred_at: new Date(parsedValues.occurred_at).toISOString(),
    riddor_reportable: parsedValues.riddor_reportable === 'yes',
  })
}
