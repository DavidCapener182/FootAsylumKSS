import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RadioOneDailySecurityBriefBooklet } from '@/components/emp/radio-one-daily-security-brief-booklet'

describe('RadioOneDailySecurityBriefBooklet', () => {
  it('renders the event-week security brief heading in the printable booklet', () => {
    const html = renderToStaticMarkup(<RadioOneDailySecurityBriefBooklet />)

    expect(html).toContain('<h1>Radio One Event Week Security Brief</h1>')
    expect(html).toContain("BBC Radio 1&#x27;s Big Weekend Sunderland 2026")
    expect(html).toContain('emp-radio-one-booklet-sheet')
    expect(html.indexOf('Page 4 of 4')).toBeLessThan(html.indexOf('Page 1 of 4'))
    expect(html.indexOf('Page 2 of 4')).toBeLessThan(html.indexOf('Page 3 of 4'))
  })
})
