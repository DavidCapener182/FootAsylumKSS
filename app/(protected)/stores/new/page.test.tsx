import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const guard = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ requireRole: guard }))
vi.mock('@/components/stores/create-store-form', () => ({ CreateStoreForm: () => <div>creation form</div> }))
import NewStorePage from './page'

beforeEach(() => { vi.clearAllMocks() })
describe('/stores/new', () => {
  it('renders the creation page after checking admin access', async () => {
    guard.mockResolvedValue({ profile: { role: 'admin' } })
    expect(renderToStaticMarkup(await NewStorePage())).toContain('creation form')
    expect(guard).toHaveBeenCalledWith(['admin'])
  })
  it('does not render the form if the guard redirects', async () => {
    guard.mockRejectedValue(new Error('redirect'))
    await expect(NewStorePage()).rejects.toThrow('redirect')
  })
})
