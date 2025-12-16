import { getUserProfile } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { LogOut } from 'lucide-react'
import { redirect } from 'next/navigation'

async function signOut() {
  'use server'
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function Header() {
  const profile = await getUserProfile()

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200/50 bg-white/80 backdrop-blur-sm px-6 md:px-8">
      <div className="flex items-center gap-4">
        <input
          type="search"
          placeholder="Search..."
          className="h-9 w-64 rounded-full border border-gray-200 bg-white px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600 font-medium">
          {profile?.full_name || 'User'}
        </span>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="icon" className="rounded-full">
            <LogOut className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </header>
  )
}

