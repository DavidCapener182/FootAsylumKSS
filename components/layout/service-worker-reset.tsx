'use client'

import { useEffect } from 'react'

const RESET_FLAG = 'kss-sw-reset-v1'

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

        if (!sessionStorage.getItem(RESET_FLAG)) {
          sessionStorage.setItem(RESET_FLAG, '1')
          window.location.reload()
        }
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
