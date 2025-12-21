'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, AlertTriangle, CheckSquare, Store, FileText, Settings, User, ClipboardList, Activity, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserRole, UserProfile } from '@/lib/auth'
import { useSidebar } from './sidebar-provider'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { href: '/actions', label: 'Actions', icon: CheckSquare },
  { href: '/stores', label: 'Stores', icon: Store },
  { href: '/audit-tracker', label: 'Audit Tracker', icon: ClipboardList },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/activity', label: 'Recent Activity', icon: Activity },
  { href: '/admin', label: 'Admin', icon: Settings, adminOnly: true },
]

interface SidebarClientProps {
  userRole?: UserRole | null
  userProfile?: UserProfile | null
}

export function SidebarClient({ userRole, userProfile }: SidebarClientProps) {
  const pathname = usePathname()
  const { isOpen, setIsOpen } = useSidebar()

  const filteredItems = userRole === 'admin' 
    ? navItems 
    : navItems.filter(item => !item.adminOnly)

  // Close mobile menu when route changes
  useEffect(() => {
    if (isOpen) {
      setIsOpen(false)
    }
  }, [pathname, isOpen, setIsOpen])

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200/50">
>>>>>>> 8306438 (Implement mobile responsiveness across entire application)
        <h1 className="text-lg font-semibold text-gray-900">KSS Assurance</h1>
        <button
          onClick={() => setIsOpen(false)}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Close menu"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>
      </div>
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {filteredItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all min-h-[44px]',
                    isActive
                      ? 'bg-white text-gray-900 rounded-full shadow-sm font-semibold'
                      : 'text-gray-600 hover:text-gray-900 rounded-full'
                  )}
                >
                  <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-gray-900' : 'text-gray-500')} />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200/50">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/50 backdrop-blur-sm">
          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {userProfile?.full_name || 'User'}
            </p>
          </div>
        </div>
      </div>
    </>
  )

  // Desktop sidebar (always visible)
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col h-screen bg-gradient-to-b from-gray-50 to-purple-50/30 border-r border-gray-200/50 fixed left-0 top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <>
        {/* Overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={cn(
            'fixed top-0 left-0 z-50 w-64 h-screen bg-gradient-to-b from-gray-50 to-purple-50/30 border-r border-gray-200/50 flex flex-col transform transition-transform duration-300 ease-in-out md:hidden',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {sidebarContent}
        </aside>
      </>
    </>
  )
}

