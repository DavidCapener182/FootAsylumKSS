'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LogOut, Menu } from 'lucide-react'

interface HeaderClientProps {
  signOut: () => void
}

export function HeaderClient({ signOut }: HeaderClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Expose mobile menu state to parent via custom event or context
  // For now, we'll use a simple approach with a callback
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
    // Dispatch event for sidebar to listen
    window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: !mobileMenuOpen }))
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200/50 bg-white/80 backdrop-blur-sm px-4 md:px-6 lg:px-8">
      <div className="flex items-center gap-3 md:gap-4 flex-1">
        {/* Mobile Menu Button */}
        <button
          onClick={toggleMobileMenu}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <form action={signOut}>
          <Button 
            type="submit" 
            variant="ghost" 
            className="rounded-full min-h-[44px] px-3 md:px-4"
          >
            <LogOut className="h-4 w-4 md:h-5 md:w-5 mr-2" />
            <span className="hidden sm:inline">Log Out</span>
          </Button>
        </form>
      </div>
    </header>
  )
}

