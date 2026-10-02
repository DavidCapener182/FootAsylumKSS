import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { DAVID_CAPENER_USER_ID } from '@/lib/user-view-access'

vi.stubGlobal('React', React)
vi.mock('next/navigation', () => ({ usePathname: () => '/client-documents' }))
vi.mock('./sidebar-provider', () => ({ useSidebar: () => ({ isOpen: false, setIsOpen: vi.fn() }) }))
vi.mock('./store-search', () => ({ StoreSearch: () => null }))
vi.mock('./command-palette', () => ({ CommandPalette: () => null }))
import { HeaderClient } from './header-client'

describe('header activity visibility', () => {
  it('shows the activity dropdown for David', () => {
    const html = renderToStaticMarkup(<HeaderClient signOut={() => {}} currentUser={{ id: DAVID_CAPENER_USER_ID, name: 'David Capener', role: 'admin' }} />)
    expect(html).toContain('Last page seen:')
    expect(html).toContain('Last document opened:')
    expect(html).toContain('view activity details')
  })

  it('keeps online initials but hides all activity details for another administrator', () => {
    const html = renderToStaticMarkup(<HeaderClient signOut={() => {}} currentUser={{ id: 'another-admin', name: 'David Capener', role: 'admin' }} />)
    expect(html).toContain('Currently online users')
    expect(html).not.toContain('Last page seen:')
    expect(html).not.toContain('Last document opened:')
    expect(html).not.toContain('Latest action:')
  })
})
