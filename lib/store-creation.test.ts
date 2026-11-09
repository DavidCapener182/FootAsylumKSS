import { describe, expect, it } from 'vitest'
import { createStoreSchema, literalStoreSearch } from './store-creation'
import { can } from './role-capabilities'
import type { UserRole } from './auth'

const input = { requestId: 'a1111111-1111-4111-8111-111111111111', store_name: 'New Outlet', store_code: '', address_line_1: '1 Example Road', city: 'Example', postcode: 'ab1 2cd', region: '', reporting_area: '' }

describe('new store validation', () => {
  it('leaves unknown code and reporting fields null', () => {
    expect(createStoreSchema.parse(input)).toMatchObject({ store_code: null, reporting_area: null, region: null, postcode: 'AB1 2CD' })
  })
  it.each(['store_name', 'address_line_1', 'city', 'postcode'])('requires %s', field => {
    expect(createStoreSchema.safeParse({ ...input, [field]: ' ' }).success).toBe(false)
  })
  it('rejects invalid request IDs, reporting areas and hidden store codes', () => {
    expect(createStoreSchema.safeParse({ ...input, requestId: 'new' }).success).toBe(false)
    expect(createStoreSchema.safeParse({ ...input, reporting_area: 'AREA6' }).success).toBe(false)
    expect(createStoreSchema.safeParse({ ...input, store_code: 'EXT-NEW' }).success).toBe(false)
  })
  it('escapes pattern characters for exact case-insensitive duplicate checks', () => {
    expect(literalStoreSearch('A_B%\\')).toBe('A\\_B\\%\\\\')
  })
  it('allows only administrators to create stores', () => {
    expect(can('admin', 'manageStores')).toBe(true)
    for (const role of ['ops', 'readonly', 'client', 'client_admin', 'area_manager', 'pending', null] as Array<UserRole | null>) expect(can(role, 'manageStores')).toBe(false)
  })
})
