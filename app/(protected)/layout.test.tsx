import React, { createElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubGlobal('React', React)

const mockRequireAuth = vi.fn()
const mockMaybeSingle = vi.fn()
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@/lib/auth', () => ({ requireAuth: mockRequireAuth }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}))
vi.mock('@/components/layout/sidebar', () => ({ Sidebar: () => null }))
vi.mock('@/components/layout/header', () => ({ Header: () => null }))
vi.mock('@/components/layout/mobile-tab-bar', () => ({ MobileTabBar: () => null }))
vi.mock('@/components/layout/sidebar-provider', () => ({
  SidebarProvider: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('@/components/ui/toaster', () => ({ Toaster: () => null }))
vi.mock('@/components/ReleaseNotesModal', () => ({ ReleaseNotesModal: () => null }))

describe('protected layout profile boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue({
      user: {
        id: 'user-1',
        user_metadata: { intended_role: 'admin' },
      },
    })
  })

  it('does not render protected children for an authenticated user without a profile', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    const { default: ProtectedLayout } = await import('./layout')

    const result = await ProtectedLayout({
      children: createElement('p', null, 'private operational data'),
    })
    const html = renderToStaticMarkup(result as ReactElement)

    expect(html).toContain('Account Access Unavailable')
    expect(html).not.toContain('private operational data')
  })

  it('keeps protected rendering available for a trusted active profile', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'user-1', role: 'readonly', account_status: 'active' },
      error: null,
    })
    const { default: ProtectedLayout } = await import('./layout')

    const result = await ProtectedLayout({
      children: createElement('p', null, 'private operational data'),
    })
    const html = renderToStaticMarkup(result as ReactElement)

    expect(html).toContain('private operational data')
    expect(html).not.toContain('Account Access Unavailable')
  })

  it('does not render protected children for a suspended admin profile', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'user-1', role: 'admin', account_status: 'suspended' },
      error: null,
    })
    const { default: ProtectedLayout } = await import('./layout')

    const result = await ProtectedLayout({
      children: createElement('p', null, 'private operational data'),
    })
    const html = renderToStaticMarkup(result as ReactElement)

    expect(html).toContain('Account Access Unavailable')
    expect(html).not.toContain('private operational data')
  })
})
