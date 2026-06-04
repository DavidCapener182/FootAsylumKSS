'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { UserRole } from '@/lib/auth'

import { cn } from '@/lib/utils'
import { isCmpSectionPath } from './cmp-chrome'
import { isEmpSectionPath } from './emp-chrome'
import { getMobileMoreItems, getMobileTabItems, isPrimaryMobilePath, matchesMobilePath } from './mobile-nav-config'

export function MobileTabBar({ userRole }: { userRole?: UserRole | null }) {
  const pathname = usePathname() || '/'
  const normalizedPathname = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/'
  const isCmpSection = isCmpSectionPath(pathname)
  const isEmpSection = isEmpSectionPath(pathname)
  const tabItems = getMobileTabItems(userRole)
  const moreItems = getMobileMoreItems(userRole)
  const moreActive = !isPrimaryMobilePath(normalizedPathname, userRole)
  const [moreOpen, setMoreOpen] = useState(false)
  const morePanelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let rafId = 0

    const updateBottomOffset = () => {
      window.cancelAnimationFrame(rafId)
      rafId = window.requestAnimationFrame(() => {
        const viewport = window.visualViewport
        const bottomOffset = viewport
          ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
          : 0

        document.documentElement.style.setProperty(
          '--mobile-tab-bottom-offset',
          `${Math.round(bottomOffset)}px`
        )
      })
    }

    updateBottomOffset()
    window.addEventListener('resize', updateBottomOffset)
    window.addEventListener('orientationchange', updateBottomOffset)
    window.visualViewport?.addEventListener('resize', updateBottomOffset)
    window.visualViewport?.addEventListener('scroll', updateBottomOffset)

    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('resize', updateBottomOffset)
      window.removeEventListener('orientationchange', updateBottomOffset)
      window.visualViewport?.removeEventListener('resize', updateBottomOffset)
      window.visualViewport?.removeEventListener('scroll', updateBottomOffset)
      document.documentElement.style.removeProperty('--mobile-tab-bottom-offset')
    }
  }, [])

  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!moreOpen) return

    const handleClickOutside = (event: PointerEvent) => {
      if (!morePanelRef.current) return
      if (!morePanelRef.current.contains(event.target as Node)) {
        setMoreOpen(false)
      }
    }

    document.addEventListener('pointerdown', handleClickOutside)
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside)
    }
  }, [moreOpen])

  if (isCmpSection || isEmpSection) {
    return null
  }

  return (
    <nav
      className="no-print pointer-events-none fixed inset-x-0 z-40 px-4 pb-[max(0.95rem,env(safe-area-inset-bottom))] pt-3 md:hidden"
      aria-label="Primary navigation"
      style={{ bottom: 'var(--mobile-tab-bottom-offset, 0px)' }}
    >
      {moreOpen ? (
        <button
          type="button"
          className="pointer-events-auto fixed inset-0 cursor-default bg-transparent"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setMoreOpen(false)}
        />
      ) : null}

      <div className="relative mx-auto max-w-[392px]" ref={morePanelRef}>
        <div
          className={cn(
            'absolute inset-x-0 bottom-full z-10 mb-2 origin-bottom rounded-[28px] border border-slate-200/90 bg-[rgba(248,250,252,0.96)] p-3 shadow-[0_18px_38px_rgba(15,23,42,0.16)] backdrop-blur-2xl transition-all duration-300 ease-out',
            moreOpen
              ? 'pointer-events-auto visible translate-y-0 scale-100 opacity-100'
              : 'pointer-events-none invisible translate-y-3 scale-[0.96] opacity-0'
          )}
          aria-hidden={!moreOpen}
        >
          <div className="grid grid-cols-3 gap-2">
            {moreItems.map((item) => {
              const Icon = item.icon
              const isActive = matchesMobilePath(normalizedPathname, item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex min-h-[74px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-2 text-center text-[10px] font-semibold transition-all',
                    isActive
                      ? 'border-slate-300 bg-white text-slate-900 shadow-[0_8px_20px_rgba(15,23,42,0.09)]'
                      : 'border-slate-200 bg-slate-50/80 text-slate-600 active:bg-white'
                  )}
                  onClick={() => setMoreOpen(false)}
                  tabIndex={moreOpen ? undefined : -1}
                >
                  <Icon strokeWidth={1.9} className={cn('h-[18px] w-[18px]', isActive ? 'text-slate-900' : 'text-slate-500')} />
                  <span className="line-clamp-2 leading-tight">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>

        <div className="pointer-events-auto grid grid-cols-5 gap-1 rounded-[32px] border border-slate-200/85 bg-[rgba(248,250,252,0.94)] p-1.5 shadow-[0_16px_34px_rgba(15,23,42,0.14)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[rgba(248,250,252,0.88)]">
          {tabItems.map((item) => {
            const Icon = item.icon
            const isActive = matchesMobilePath(normalizedPathname, item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[20px] px-1 py-2.5 text-[10px] font-semibold tracking-[0.01em] transition-[background-color,color,box-shadow]',
                  isActive
                    ? 'bg-[#0e1925] text-white shadow-[0_8px_20px_rgba(14,25,37,0.22)]'
                    : 'text-slate-500 active:bg-white'
                )}
              >
                <Icon
                  strokeWidth={1.9}
                  className={cn(
                    'h-[18px] w-[18px]',
                    isActive ? 'text-white' : 'text-slate-500'
                  )}
                />
                <span>{item.label}</span>
              </Link>
            )
          })}

          <button
            type="button"
            onClick={() => setMoreOpen((prev) => !prev)}
            className={cn(
              'flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[20px] px-1 py-2.5 text-[10px] font-semibold tracking-[0.01em] transition-[background-color,color,box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
              moreActive
                ? 'bg-[#0e1925] text-white shadow-[0_8px_20px_rgba(14,25,37,0.22)]'
                : moreOpen
                ? 'bg-white text-slate-900 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.16)]'
                : 'text-slate-500 active:bg-white'
            )}
            aria-label={moreOpen ? 'Close more navigation options' : 'Open more navigation options'}
            aria-expanded={moreOpen}
          >
            {moreOpen ? (
              <X strokeWidth={1.9} className={cn('h-[18px] w-[18px]', moreActive ? 'text-white' : moreOpen ? 'text-slate-900' : 'text-slate-500')} />
            ) : (
              <Menu strokeWidth={1.9} className={cn('h-[18px] w-[18px]', moreActive ? 'text-white' : moreOpen ? 'text-slate-900' : 'text-slate-500')} />
            )}
            <span>More</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
