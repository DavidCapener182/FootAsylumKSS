import {
  Activity,
  CheckSquare,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Settings,
  Store,
  Route,
  Flame,
  Calendar,
  Bug,
  ShieldCheck,
} from 'lucide-react'
import type React from 'react'

export type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  section?: 'Overview' | 'Audit Management' | 'Stores' | 'Planning' | 'Reporting' | 'Administration'
  adminOnly?: boolean
  clientHidden?: boolean
  allowedRoles?: Array<'admin' | 'ops' | 'readonly' | 'client' | 'pending'>
  action?: 'feedback'
}

export const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Overview' },
  { href: '/activity', label: 'Recent Activity', icon: Activity, section: 'Overview', clientHidden: true },
  { href: '/audit-tracker', label: 'Compliance Audits', icon: ClipboardList, section: 'Audit Management' },
  { href: '/fire-risk-assessment', label: 'Fire Risk Assessments', icon: Flame, section: 'Audit Management' },
  { href: '/actions', label: 'Actions', icon: CheckSquare, section: 'Audit Management' },
  { href: '/stores', label: 'Store Directory', icon: Store, section: 'Stores' },
  { href: '/route-planning', label: 'Route Planning', icon: Route, section: 'Planning', clientHidden: true, allowedRoles: ['admin', 'ops'] },
  { href: '/calendar', label: 'Calendar', icon: Calendar, section: 'Planning' },
  { href: '/reports', label: 'Reports & Exports', icon: FileText, section: 'Reporting' },
  { href: '/help', label: 'GDPR & Data Protection', icon: ShieldCheck, section: 'Reporting' },
  { href: '/admin', label: 'Admin', icon: Settings, section: 'Administration', adminOnly: true },
  { href: '#feedback', label: 'Report a Bug', icon: Bug, section: 'Administration', action: 'feedback' },
]
