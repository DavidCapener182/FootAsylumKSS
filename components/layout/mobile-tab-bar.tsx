'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import type { UserRole } from '@/lib/auth'

import { cn } from '@/lib/utils'
import { useSidebar } from './sidebar-provider'
import { getMobileTabItems, isPrimaryMobilePath, matchesMobilePath } from './mobile-nav-config'

export function MobileTabBar({ userRole }: { userRole?: UserRole | null }) {
  const pathname = usePathname()
  const { setIsOpen } = useSidebar()
  const tabItems = getMobileTabItems(userRole)
  const moreActive = !isPrimaryMobilePath(pathname, userRole)
  const featuredHref = userRole === 'admin' || userRole === 'ops' ? '/audit-tracker' : null

  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.95rem,env(safe-area-inset-bottom))] pt-3 md:hidden"
      aria-label="Primary navigation"
    >
      <div className="mx-auto grid max-w-[392px] grid-cols-5 gap-1 rounded-[32px] border border-slate-200/85 bg-[rgba(248,250,252,0.94)] p-1.5 shadow-[0_16px_34px_rgba(15,23,42,0.14)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[rgba(248,250,252,0.88)]">
        {tabItems.map((item) => {
          const Icon = item.icon
          const isActive = matchesMobilePath(pathname, item.href)
          const isFeatured = item.href === featuredHref

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[20px] px-1 py-2.5 text-[10px] font-semibold tracking-[0.01em] transition-[background-color,color,box-shadow]',
                isFeatured
                  ? 'bg-[#143457] text-white shadow-[0_12px_24px_rgba(20,52,87,0.22)]'
                  : isActive
                    ? 'bg-white text-slate-900 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.16)]'
                    : 'text-slate-500 active:bg-white'
              )}
            >
              <Icon
                strokeWidth={1.9}
                className={cn(
                  'h-[18px] w-[18px]',
                  isFeatured ? 'text-white' : isActive ? 'text-slate-900' : 'text-slate-500'
                )}
              />
              <span>{item.label}</span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={cn(
            'flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[20px] px-1 py-2.5 text-[10px] font-semibold tracking-[0.01em] transition-[background-color,color,box-shadow]',
            moreActive
              ? 'bg-white text-slate-900 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.16)]'
              : 'text-slate-500 active:bg-white'
          )}
          aria-label="Open more navigation options"
        >
          <Menu strokeWidth={1.9} className={cn('h-[18px] w-[18px]', moreActive ? 'text-slate-900' : 'text-slate-500')} />
          <span>More</span>
        </button>
      </div>
    </nav>
  )
}
