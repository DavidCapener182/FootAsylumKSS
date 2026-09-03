import React, { type ReactNode } from 'react'
import { OfflineSyncProvider } from '@/components/offline/offline-sync-provider'

export default function FRAPrintReportLayout({ children }: { children: ReactNode }) {
  return <OfflineSyncProvider>{children}</OfflineSyncProvider>
}
