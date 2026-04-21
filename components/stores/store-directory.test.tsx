import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { StoreDirectory } from '@/components/stores/store-directory'

describe('StoreDirectory search input', () => {
  it('keeps search text clear of the icon on desktop', () => {
    const html = renderToStaticMarkup(<StoreDirectory stores={[]} />)

    expect(html).toContain('z-10 h-4 w-4')
    expect(html).toContain('pl-10 pr-4')
    expect(html).toContain('sm:pl-10 sm:pr-4')
  })
})
