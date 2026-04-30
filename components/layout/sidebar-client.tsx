'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { User, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserRole, UserProfile } from '@/lib/auth'
import { useSidebar } from './sidebar-provider'
import { navItems, type NavItem } from './nav-items'
import { FeedbackModal } from '@/components/FeedbackModal'
import {
  getCmpNavItems,
  getCmpPageTitle,
  isCmpNavItemActive,
  isCmpSectionPath,
} from './cmp-chrome'
import {
  getEmpNavItems,
  getEmpPageTitle,
  isEmpNavItemActive,
  isEmpSectionPath,
} from './emp-chrome'

const sectionOrder: NonNullable<NavItem['section']>[] = [
  'Overview',
  'Compliance Management',
  'Stores',
  'Planning',
  'Reporting',
  'Administration',
]

const allNavItems = navItems

interface SidebarClientProps {
  userRole?: UserRole | null
  userProfile?: UserProfile | null
}

export function SidebarClient({ userRole, userProfile }: SidebarClientProps) {
  const pathname = usePathname() || '/'
  const { isOpen, setIsOpen } = useSidebar()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const isCmpSection = isCmpSectionPath(pathname)
  const isEmpSection = isEmpSectionPath(pathname)
  const isKssPlanSection = isCmpSection || isEmpSection
  const planNavItems = isEmpSection ? getEmpNavItems(pathname) : getCmpNavItems(pathname)
  const planPageTitle = isEmpSection ? getEmpPageTitle(pathname) : getCmpPageTitle(pathname)
  const planBrand = isEmpSection ? 'KSS Event Management' : 'KSS Crowd Management'

  const filteredItems = (() => {
    if (userRole === 'admin') {
      // Admin sees everything (respect role-restricted items)
      return allNavItems.filter(item => !item.allowedRoles || item.allowedRoles.includes('admin'))
    } else if (userRole === 'client') {
      // Client role: hide adminOnly, clientHidden, and role-restricted items
      return allNavItems.filter(item => !item.adminOnly && !item.clientHidden && (!item.allowedRoles || item.allowedRoles.includes('client')))
    } else if (userRole === 'ops') {
      return allNavItems.filter(item => !item.adminOnly && (!item.allowedRoles || item.allowedRoles.includes('ops')))
    } else if (userRole === 'readonly') {
      return allNavItems.filter(item => !item.adminOnly && (!item.allowedRoles || item.allowedRoles.includes('readonly')))
    } else if (userRole === 'pending') {
      return allNavItems.filter(item => !item.adminOnly && !item.clientHidden && (!item.allowedRoles || item.allowedRoles.includes('pending')))
    }
    return allNavItems.filter(item => !item.adminOnly && !item.clientHidden)
  })()

  // Close mobile menu when route changes
  useEffect(() => {
    if (isOpen) {
      setIsOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-5 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] md:h-20 md:px-6 md:py-0">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-24 md:h-20 md:w-48">
            <Image
              src={isKssPlanSection ? '/kss-logo.png' : '/fa-logo.png'}
              alt={isKssPlanSection ? planBrand : 'KSS x Footasylum'}
              fill
              sizes="192px"
              className="object-contain"
              style={isKssPlanSection ? undefined : { top: 4, left: 10 }}
            />
          </div>
          <div className="min-w-0 md:hidden">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-500">
              {isKssPlanSection ? planBrand : 'KSS x Footasylum'}
            </p>
            <p className="text-sm font-semibold text-slate-900">
              {isKssPlanSection ? planPageTitle : 'Navigation'}
            </p>
          </div>
          <span className="sr-only">{isKssPlanSection ? planBrand : 'KSS x Footasylum'}</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 md:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5 text-slate-600" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/85 shadow-[0_16px_30px_rgba(15,23,42,0.08)] md:space-y-4 md:rounded-none md:border-0 md:bg-transparent md:shadow-none">
          {(isKssPlanSection ? [{ section: null, items: planNavItems }] : sectionOrder.map((section) => ({
            section,
            items: filteredItems.filter((item) => (item.section || 'Overview') === section),
          })).filter((group) => group.items.length > 0)).map((group) => (
            <div key={group.section || 'kss-plan'}>
              {group.section ? (
                <p className="px-4 pb-1 pt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 md:px-3 md:pt-0 md:text-white/40">
                  {group.section}
                </p>
              ) : null}
              <ul className="md:space-y-1.5">
          {group.items.map((item) => {
            const Icon = item.icon
            const isActive = !item.action && (
              isKssPlanSection
                ? (isEmpSection ? isEmpNavItemActive(pathname, item.href) : isCmpNavItemActive(pathname, item.href))
                : pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            )

            if (item.action === 'feedback') {
              return (
                <li key={item.href} className="border-t border-slate-100 first:border-t-0 md:border-t-0">
                  <button
                    onClick={() => { setIsOpen(false); setFeedbackOpen(true) }}
                    className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-[15px] font-medium text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900 md:min-h-[48px] md:rounded-2xl md:text-sm md:text-white/80 md:hover:bg-white/10 md:hover:text-white"
                  >
                    <Icon className="h-5 w-5 flex-shrink-0 text-slate-400 md:text-white/70" />
                    {item.label}
                  </button>
                </li>
              )
            }

            return (
              <li key={item.href} className="border-t border-slate-100 first:border-t-0 md:border-t-0">
                {isKssPlanSection ? (
                  <a
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex min-h-[52px] items-center gap-3 px-4 py-3 text-[15px] font-medium transition-all md:min-h-[48px] md:rounded-2xl md:text-sm',
                      isActive
                        ? 'bg-white text-slate-950 font-semibold shadow-[inset_0_0_0_1px_rgba(15,23,42,0.05)] md:bg-white md:text-slate-950 md:shadow-[inset_0_0_0_1px_rgba(15,23,42,0.05)]'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 md:text-white/80 md:hover:bg-white/10 md:hover:text-white'
                    )}
                  >
                    <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-slate-900 md:text-slate-900' : 'text-slate-400 md:text-white/70')} />
                    {item.label}
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    prefetch={false}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex min-h-[52px] items-center gap-3 px-4 py-3 text-[15px] font-medium transition-all md:min-h-[48px] md:rounded-2xl md:text-sm',
                      isActive
                        ? 'bg-white text-slate-950 font-semibold shadow-[inset_0_0_0_1px_rgba(15,23,42,0.05)] md:bg-white md:text-slate-950 md:shadow-[inset_0_0_0_1px_rgba(15,23,42,0.05)]'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 md:text-white/80 md:hover:bg-white/10 md:hover:text-white'
                    )}
                  >
                    <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-slate-900 md:text-slate-900' : 'text-slate-400 md:text-white/70')} />
                    {item.label}
                  </Link>
                )}
              </li>
            )
          })}
              </ul>
            </div>
          ))}
        </div>
      </nav>
      <div className="p-4 pt-2">
        <div className="flex items-center gap-3 rounded-[28px] border border-slate-200 bg-white/85 px-4 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm md:rounded-[24px] md:border-white/10 md:bg-white/10 md:shadow-none">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#143457] md:bg-white/20">
            <User className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 md:text-white">
              {userProfile?.full_name || 'User'}
            </p>
            {userRole === 'readonly' ? (
              <p className="mt-0.5 text-xs font-semibold text-amber-700 md:text-amber-200">View only</p>
            ) : userRole ? (
              <p className="mt-0.5 text-xs capitalize text-slate-500 md:text-white/50">{userRole}</p>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )

  // Desktop sidebar (always visible)
  return (
    <>
      {/* Desktop Sidebar - hidden when printing */}
      <aside className="no-print hidden md:flex w-64 flex-col h-screen-zoom bg-[#0e1925] fixed left-0 top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <>
        {/* Overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 z-[60] bg-[#0b1320]/28 backdrop-blur-sm md:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Mobile Sidebar - hidden when printing */}
        <aside
          className={cn(
            'no-print fixed left-0 top-0 z-[70] flex h-screen-zoom w-[86vw] max-w-[348px] flex-col rounded-r-[32px] border-r border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.98)_0%,rgba(236,242,247,0.98)_100%)] shadow-[0_24px_60px_rgba(15,23,42,0.22)] transition-transform duration-300 ease-in-out safe-bottom touch-pan-y md:hidden',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
          aria-hidden={!isOpen}
          aria-label="Navigation menu"
        >
          {sidebarContent}
        </aside>
      </>

      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  )
}
