import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  DownloadFestivalSecurityBriefBooklet,
  RadioOneDailySecurityBriefBooklet,
} from '@/components/emp/radio-one-daily-security-brief-booklet'

describe('RadioOneDailySecurityBriefBooklet', () => {
  it('renders the event-week security brief heading in the printable booklet', () => {
    const html = renderToStaticMarkup(<RadioOneDailySecurityBriefBooklet />)

    expect(html).toContain('<h1>Radio One Event Week Security Brief</h1>')
    expect(html).toContain("BBC Radio 1&#x27;s Big Weekend Sunderland 2026")
    expect(html).toContain('emp-radio-one-booklet-sheet')
    expect(html.indexOf('Page 4 of 4')).toBeLessThan(html.indexOf('Page 1 of 4'))
    expect(html.indexOf('Page 2 of 4')).toBeLessThan(html.indexOf('Page 3 of 4'))
  })

  it('renders the Download Festival briefing pack without Radio One content', () => {
    const html = renderToStaticMarkup(<DownloadFestivalSecurityBriefBooklet />)

    expect(html).toContain('<h1>Download Festival Security Brief</h1>')
    expect(html).toContain('Download Festival 2026')
    expect(html).toContain('Challenge 21')
    expect(html).toContain('Donington Park')
    expect(html).toContain('/emp-assets/download-festival-logo.png')
    expect(html).toContain('/emp-assets/download-2026-event-poster.jpg')
    expect(html).toContain('Download 2026 Line-up Poster')
    expect(html).toContain('Accessibility Search and Access-First Standard')
    expect(html).toContain('Be calm, believe the access need')
    expect(html).toContain('Accessible Campsites, Toilets and Queues')
    expect(html).toContain('Trackway is not spare space')
    expect(html).toContain('Some customers have urgent or non-visible access needs')
    expect(html).toContain('Common Search Answers')
    expect(html).toContain('What to Record at Search')
    expect(html).toContain('Assistance dogs')
    expect(html).toContain('Vehicle curfew')
    expect(html).toContain('Complaint Handling Model - LISTEN')
    expect(html).toContain('Quick Staff Briefing Script')
    expect(html).toContain('Accessibility Do&#x27;s and Don&#x27;ts - Quick Reference')
    expect((html.match(/emp-radio-one-booklet-sheet/g) || [])).toHaveLength(4)
    expect(html.indexOf('Page 8 of 8')).toBeLessThan(html.indexOf('Page 1 of 8'))
    expect(html.indexOf('Page 2 of 8')).toBeLessThan(html.indexOf('Page 7 of 8'))
    expect(html.indexOf('Page 6 of 8')).toBeLessThan(html.indexOf('Page 3 of 8'))
    expect(html.indexOf('Page 4 of 8')).toBeLessThan(html.indexOf('Page 5 of 8'))
    expect(html).not.toContain('Radio One Event Week Security Brief')
    expect(html).not.toContain('BBC Radio 1')
  })
})
