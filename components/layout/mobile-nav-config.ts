import { AlertTriangle, Calendar, ClipboardList, LayoutDashboard, Route, Store } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { UserRole } from '@/lib/auth'

export type MobileTabItem = {
  href: string
  label: string
  icon: LucideIcon
}

const defaultMobileTabItems: MobileTabItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { href: '/stores', label: 'Stores', icon: Store },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
]

const opsMobileTabItems: MobileTabItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/audit-tracker', label: 'Audit', icon: ClipboardList },
  { href: '/route-planning', label: 'Routes', icon: Route },
]

const mobilePageTitles: Array<{ href: string; title: string }> = [
  { href: '/dashboard', title: 'Dashboard' },
  { href: '/incidents', title: 'Incidents' },
  { href: '/actions', title: 'Actions' },
  { href: '/stores', title: 'Stores' },
  { href: '/audit-tracker', title: 'Audit Tracker' },
  { href: '/fire-risk-assessment', title: 'Fire Risk' },
  { href: '/route-planning', title: 'Route Planning' },
  { href: '/calendar', title: 'Calendar' },
  { href: '/reports', title: 'Reports' },
  { href: '/help', title: 'GDPR' },
  { href: '/admin', title: 'Admin' },
  { href: '/activity', title: 'Recent Activity' },
]

export function matchesMobilePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function getMobileTabItems(userRole?: UserRole | null): MobileTabItem[] {
  return userRole === 'admin' || userRole === 'ops' ? opsMobileTabItems : defaultMobileTabItems
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
