import { describe, expect, it } from 'vitest'
import { isBremontStore, shouldHideStore } from './store-normalization'

describe('store normalization', () => {
  it('hides the Bremont boutique row from Footasylum operational views', () => {
    const store = {
      store_code: 'BREMONT-MAN',
      store_name: 'Bremont Manchester Boutique',
      is_active: true,
    }

    expect(isBremontStore(store)).toBe(true)
    expect(shouldHideStore(store)).toBe(true)
  })

  it('does not hide a Footasylum Manchester store', () => {
    expect(shouldHideStore({
      store_code: 'S0001',
      store_name: 'Manchester Arndale',
      is_active: true,
    })).toBe(false)
  })
})
