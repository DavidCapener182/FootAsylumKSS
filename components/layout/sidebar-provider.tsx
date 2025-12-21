'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface SidebarContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleToggle = (event: CustomEvent) => {
      setIsOpen(event.detail)
    }

    window.addEventListener('toggleMobileMenu', handleToggle as EventListener)
    return () => {
      window.removeEventListener('toggleMobileMenu', handleToggle as EventListener)
    }
  }, [])

  const toggle = () => setIsOpen(!isOpen)

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen, toggle }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider')
  }
  return context
}

