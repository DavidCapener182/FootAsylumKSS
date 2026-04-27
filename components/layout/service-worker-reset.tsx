'use client'

import { useEffect } from 'react'

export function ServiceWorkerReset() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    let cancelled = false

    async function resetServiceWorkers() {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        if (cancelled || registrations.length === 0) {
          return
        }

        await Promise.all(
          registrations.map(async (registration) => {
            try {
              await registration.unregister()
            } catch (error) {
              console.warn('Failed to unregister service worker registration', error)
            }
          })
        )

        if ('caches' in window) {
          const cacheKeys = await caches.keys()
          await Promise.all(
            cacheKeys.map(async (cacheKey) => {
              try {
                await caches.delete(cacheKey)
              } catch (error) {
                console.warn(`Failed to clear cache "${cacheKey}"`, error)
              }
            })
          )
        }

        // Do not force a reload here. Some environments can end up in a
        // repeated-refresh loop when this component remounts frequently.
      } catch (error) {
        console.warn('Failed to reset service workers', error)
      }
    }

    void resetServiceWorkers()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
