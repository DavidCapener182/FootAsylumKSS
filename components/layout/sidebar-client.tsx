'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserProfile } from '@/lib/auth'
import { navItems } from '@/components/layout/nav-items'

interface SidebarClientProps {
  userProfile?: UserProfile | null
}

export function SidebarClient({ userProfile }: SidebarClientProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-64 flex-col h-screen bg-gradient-to-b from-gray-50 to-purple-50/30 border-r border-gray-200/50">
      <div className="flex h-16 items-center px-6 border-b border-gray-200/50">
        <h1 className="text-lg font-semibold text-gray-900">KSS Assurance</h1>
      </div>
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-white text-gray-900 rounded-full shadow-sm font-semibold'
                      : 'text-gray-600 hover:text-gray-900 rounded-full'
                  )}
                >
                  <Icon className={cn('h-5 w-5', isActive ? 'text-gray-900' : 'text-gray-500')} />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200/50">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/50 backdrop-blur-sm">
          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
            <User className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {userProfile?.full_name || 'User'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}

