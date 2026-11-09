import { z } from 'zod'
import { shouldHideStore } from '@/lib/store-normalization'

const requiredText = (label: string, max: number) => z.string()
  .trim().min(1, `${label} is required`).max(max, `${label} is too long`)
  .transform(value => value.replace(/\s+/g, ' '))

export const createStoreSchema = z.object({
  requestId: z.string().uuid('Invalid submission. Reload the form and try again.'),
  store_name: requiredText('Store name', 160),
  store_code: z.string().trim().max(32).regex(/^[a-zA-Z0-9 -]*$/, 'Use letters, numbers, spaces or hyphens for the store code')
    .transform(value => value.toUpperCase() || null),
  address_line_1: requiredText('Address', 240),
  city: requiredText('Town or city', 100),
  postcode: requiredText('Postcode', 12).transform(value => value.toUpperCase()),
  region: z.string().trim().max(80).transform(value => value || null),
  reporting_area: z.enum(['', 'AREA1', 'AREA2', 'AREA3', 'AREA4', 'AREA5', 'NON_RETAIL'])
    .transform(value => value || null),
}).superRefine((input, ctx) => {
  if (shouldHideStore({ ...input, is_active: true })) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['store_name'],
      message: 'This name or code is excluded by the store directory rules. Check the verified name for the new location.' })
  }
})

export type CreateStoreInput = z.input<typeof createStoreSchema>
export type CreateStoreResult = { ok: true; id: string } | { ok: false; error: string }

// PostgREST ilike treats these characters as patterns, not literal text.
export function literalStoreSearch(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}
