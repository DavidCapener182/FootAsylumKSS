'use client'

import { Button } from '@/components/ui/button'
import { LogOut, Menu } from 'lucide-react'
import { useSidebar } from './sidebar-provider'
import { cn } from '@/lib/utils'

interface HeaderClientProps {
  signOut: () => void
}

export function HeaderClient({ signOut }: HeaderClientProps) {
  const { isOpen, setIsOpen } = useSidebar()

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(prev => !prev)
  }

  return (
    <header className="flex h-16 items-center justify-between bg-[#0e1925] px-4 md:px-6 lg:px-8 relative z-30">
      <div className="flex items-center gap-3 md:gap-4 flex-1">
        {/* Mobile Menu Button */}
        <button
          onClick={handleMenuClick}
          className={cn(
            "md:hidden p-2 rounded-lg hover:bg-white/10 active:bg-white/20 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation z-[100] relative cursor-pointer",
            isOpen && "bg-white/10"
          )}
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
          type="button"
        >
          <Menu className="h-6 w-6 text-white pointer-events-none" />
        </button>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <form action={signOut}>
          <Button 
            type="submit" 
            variant="ghost" 
            className="rounded-full min-h-[44px] px-3 md:px-4 text-white hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4 md:h-5 md:w-5 mr-2" />
            <span className="hidden sm:inline">Log Out</span>
          </Button>
        </form>
      </div>
    </header>
  )
}

