import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { OfflineSyncIndicator, PageHeader, RiskBadge } from '@/components/product'

describe('shared product UI', () => {
  it('communicates risk with text and an icon instead of colour alone', () => {
    const html = renderToStaticMarkup(<RiskBadge level="critical" />)
    expect(html).toContain('Critical risk')
    expect(html).toContain('<svg')
  })

  it('distinguishes device-only work from platform-saved work', () => {
    expect(renderToStaticMarkup(<OfflineSyncIndicator state="offline" pendingCount={2} />))
      .toContain('2 saved on this device')
    expect(renderToStaticMarkup(<OfflineSyncIndicator state="online" />))
      .toContain('Saved to platform')
  })

  it('renders a labelled breadcrumb and one primary action area', () => {
    const html = renderToStaticMarkup(
      <PageHeader
        title="Incident queue"
        breadcrumbs={[{ label: 'Today', href: '/dashboard' }, { label: 'Incidents' }]}
        primaryAction={<a href="/incidents/new">Report incident</a>}
      />
    )
    expect(html).toContain('aria-label="Breadcrumb"')
    expect(html).toContain('Report incident')
  })
})
