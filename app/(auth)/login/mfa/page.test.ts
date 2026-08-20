import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRedirect = vi.fn((destination: string) => {
  throw new Error(`REDIRECT:${destination}`)
})

vi.mock('next/navigation', () => ({ redirect: mockRedirect }))

describe('retired MFA route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an existing session to its validated application destination', async () => {
    const { default: RetiredMfaPage } = await import('./page')

    expect(() => RetiredMfaPage({ searchParams: { redirectTo: '/reports?week=2' } }))
      .toThrow('REDIRECT:/reports?week=2')
    expect(mockRedirect).toHaveBeenCalledWith('/reports?week=2')
  })

  it('rejects an external destination', async () => {
    const { default: RetiredMfaPage } = await import('./page')

    expect(() => RetiredMfaPage({ searchParams: { redirectTo: 'https://attacker.example' } }))
      .toThrow('REDIRECT:/')
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })
})
