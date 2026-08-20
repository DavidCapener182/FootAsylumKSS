'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
      console.warn('Offline field shell could not be registered.', error)
    })
  }, [])
  return null
}
