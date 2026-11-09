import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import ApplicationError from './error'

vi.stubGlobal('React', React)

describe('application error screen', () => {
  it('explains asset failures and offers a full reload instead of React retry', () => {
    const error = Object.assign(new Error('Loading chunk 5543 failed.'), { name: 'ChunkLoadError' })
    const html = renderToStaticMarkup(<ApplicationError error={error} reset={vi.fn()} />)
    expect(html).toContain('Part of the application failed to download')
    expect(html).toContain('Reload workspace')
    expect(html).not.toContain('Try again')
    expect(html).not.toContain('unavailable')
    expect(html).not.toContain('Reference:')
  })

  it('preserves ordinary retry and displays a real support reference', () => {
    const error = Object.assign(new Error('Request failed'), { digest: 'support-123' })
    const html = renderToStaticMarkup(<ApplicationError error={error} reset={vi.fn()} />)
    expect(html).toContain('Try again')
    expect(html).toContain('support-123')
    expect(html).not.toContain('Reload workspace')
  })
})
