import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RadioOneDailySecurityBriefBooklet } from '@/components/emp/radio-one-daily-security-brief-booklet'

describe('RadioOneDailySecurityBriefBooklet', () => {
  it('renders the event-week security brief heading in the printable booklet', () => {
    const html = renderToStaticMarkup(<RadioOneDailySecurityBriefBooklet />)

    expect(html).toContain('<h1>Radio One Event Week Security Brief</h1>')
    expect(html).toContain("BBC Radio 1&#x27;s Big Weekend Sunderland 2026")
  })
})
