import {
  Activity,
  AlertTriangle,
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
  LifeBuoy,
  Users,
  Radio,
} from 'lucide-react'
import type React from 'react'

export type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  section?: 'Today' | 'Assurance' | 'Stores' | 'Insights' | 'Events' | 'Administration'
  adminOnly?: boolean
  clientHidden?: boolean
  allowedRoles?: Array<'admin' | 'ops' | 'readonly' | 'client' | 'pending'>
  action?: 'feedback'
}

export const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Today', icon: LayoutDashboard, section: 'Today' },
  { href: '/audit-tracker', label: 'Audits', icon: ClipboardList, section: 'Assurance' },
  { href: '/fire-risk-assessment', label: 'Fire Risk Assessments', icon: Flame, section: 'Assurance' },
  { href: '/audit-lab', label: 'SafeHub', icon: ShieldCheck, section: 'Assurance', allowedRoles: ['admin', 'ops'] },
  { href: '/actions', label: 'Actions', icon: CheckSquare, section: 'Assurance' },
  { href: '/incidents', label: 'Incidents', icon: AlertTriangle, section: 'Assurance' },
  { href: '/stores', label: 'Store Directory', icon: Store, section: 'Stores' },
  { href: '/route-planning', label: 'Routes', icon: Route, section: 'Stores', clientHidden: true, allowedRoles: ['admin', 'ops'] },
  { href: '/calendar', label: 'Calendar', icon: Calendar, section: 'Stores' },
  { href: '/activity', label: 'Activity', icon: Activity, section: 'Insights', clientHidden: true },
  { href: '/reports', label: 'Reports', icon: FileText, section: 'Insights' },
  { href: '/admin/event-management-plans', label: 'Event Plans', icon: ClipboardList, section: 'Events', adminOnly: true },
  { href: '/admin/crowd-management-plans', label: 'Crowd Plans', icon: Users, section: 'Events', adminOnly: true },
  { href: '/admin/event-day', label: 'Event Day', icon: Radio, section: 'Events', adminOnly: true },
  { href: '/help', label: 'Help Centre', icon: LifeBuoy, section: 'Insights' },
  { href: '/privacy', label: 'Privacy', icon: ShieldCheck, section: 'Insights' },
  { href: '/admin', label: 'Admin', icon: Settings, section: 'Administration', adminOnly: true },
  { href: '#feedback', label: 'Report a Bug', icon: Bug, section: 'Administration', action: 'feedback' },
]
