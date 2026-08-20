'use client'

import { useReportWebVitals } from 'next/web-vitals'

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    const body = JSON.stringify({ type: 'web_vital', name: metric.name, value: metric.value, rating: metric.rating, route: window.location.pathname, metricId: metric.id })
    if (navigator.sendBeacon) navigator.sendBeacon('/api/observability/client', new Blob([body], { type: 'application/json' }))
    else void fetch('/api/observability/client', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true })
  })
  return null
}
