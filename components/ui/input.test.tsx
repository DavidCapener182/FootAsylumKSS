import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Input } from '@/components/ui/input'

describe('Input', () => {
  it('lets search fields override left padding without leaving base px classes behind', () => {
    const html = renderToStaticMarkup(<Input className="pl-10 pr-4" />)

    expect(html).toContain('pl-10')
    expect(html).toContain('pr-4')
    expect(html).not.toContain(' px-4')
    expect(html).not.toContain(' sm:px-3')
  })
})
