import { CheckSquare, ClipboardList, Flame, LayoutDashboard, Route, Store } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { UserRole } from '@/lib/auth'
import { navItems } from './nav-items'

export type MobileTabItem = {
  href: string
  label: string
  icon: LucideIcon
}

const defaultMobileTabItems: MobileTabItem[] = [
  { href: '/dashboard', label: 'Today', icon: LayoutDashboard },
  { href: '/audit-tracker', label: 'Audits', icon: ClipboardList },
  { href: '/fire-risk-assessment', label: 'FRAs', icon: Flame },
  { href: '/stores', label: 'Stores', icon: Store },
]

const opsMobileTabItems: MobileTabItem[] = [
  { href: '/dashboard', label: 'Today', icon: LayoutDashboard },
  { href: '/route-planning', label: 'Routes', icon: Route },
  { href: '/audit-tracker', label: 'Audits', icon: ClipboardList },
  { href: '/actions', label: 'Actions', icon: CheckSquare },
]

const mobilePageTitles: Array<{ href: string; title: string }> = [
  { href: '/dashboard', title: 'Today' },
  { href: '/incidents', title: 'Operational Records' },
  { href: '/actions', title: 'Actions' },
  { href: '/stores', title: 'Store Directory' },
  { href: '/audit-tracker', title: 'Compliance Audits' },
  { href: '/audit-lab', title: 'SafeHub' },
  { href: '/fire-risk-assessment', title: 'Fire Risk Assessments' },
  { href: '/route-planning', title: 'Route Planning' },
  { href: '/calendar', title: 'Calendar' },
  { href: '/reports', title: 'Reports & Exports' },
  { href: '/help', title: 'Help Centre' },
  { href: '/privacy', title: 'Privacy' },
  { href: '/admin/event-management-plans', title: 'Event Plans' },
  { href: '/admin/crowd-management-plans', title: 'Crowd Plans' },
  { href: '/admin/event-day', title: 'Event Day' },
  { href: '/admin', title: 'Admin' },
  { href: '/activity', title: 'Recent Activity' },
]

export function matchesMobilePath(pathname: string, href: string): boolean {
  const normalizedPathname = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/'
  const normalizedHref = href.split(/[?#]/)[0].replace(/\/+$/, '') || '/'

  return normalizedPathname === normalizedHref || normalizedPathname.startsWith(`${normalizedHref}/`)
}

export function getMobileTabItems(userRole?: UserRole | null): MobileTabItem[] {
  return userRole === 'admin' || userRole === 'ops' ? opsMobileTabItems : defaultMobileTabItems
}

export function getMobileMoreItems(userRole?: UserRole | null): MobileTabItem[] {
  const primaryHrefs = new Set(getMobileTabItems(userRole).map((item) => item.href))

  return navItems
    .filter((item) => {
      if (item.action) return false
      if (primaryHrefs.has(item.href)) return false
      if (item.section === 'Administration') return false
      if (item.adminOnly && userRole !== 'admin') return false
      if (userRole === 'admin') return !item.allowedRoles || item.allowedRoles.includes('admin')
      if (userRole === 'client') return !item.adminOnly && !item.clientHidden && (!item.allowedRoles || item.allowedRoles.includes('client'))
      if (userRole === 'ops') return !item.adminOnly && (!item.allowedRoles || item.allowedRoles.includes('ops'))
      if (userRole === 'readonly') return !item.adminOnly && (!item.allowedRoles || item.allowedRoles.includes('readonly'))
      if (userRole === 'pending') return !item.adminOnly && !item.clientHidden && (!item.allowedRoles || item.allowedRoles.includes('pending'))
      return !item.adminOnly && !item.clientHidden
    })
    .map((item) => ({
      href: item.href,
      label: item.label.length > 16 ? item.label.replace(' Assessment', '') : item.label,
      icon: item.icon as LucideIcon,
    }))
}

export function isPrimaryMobilePath(pathname: string, userRole?: UserRole | null): boolean {
  return getMobileTabItems(userRole).some((tab) => matchesMobilePath(pathname, tab.href))
}

export function getMobilePageTitle(pathname: string): string {
  if (!pathname || pathname === '/') return 'Dashboard'

  const match = mobilePageTitles.find((item) => matchesMobilePath(pathname, item.href))
  if (match) return match.title

  const segment = pathname
    .split('?')[0]
    .split('/')
    .filter(Boolean)
    .pop()

  if (!segment) return 'Dashboard'

  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}
