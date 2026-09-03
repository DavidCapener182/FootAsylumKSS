import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import FRAPrintReportLayout from './layout'
import { useOfflineSync } from '@/components/offline/offline-sync-provider'

vi.stubGlobal('React', React)

function OfflineSyncConsumer() {
  const { isOnline } = useOfflineSync()
  return <span>{isOnline ? 'online' : 'offline'}</span>
}

describe('FRA print report layout', () => {
  it('provides offline sync context required by FRAReportView', () => {
    const html = renderToStaticMarkup(
      <FRAPrintReportLayout>
        <OfflineSyncConsumer />
      </FRAPrintReportLayout>
    )

    expect(html).toContain('online')
  })
})
