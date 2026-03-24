import Image from 'next/image'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type AuthShellProps = {
  children: ReactNode
  logoSize?: 'standard' | 'compact'
  contentClassName?: string
  desktopLogoPosition?: 'centered' | 'corner'
}

export function AuthShell({
  children,
  logoSize = 'standard',
  contentClassName,
  desktopLogoPosition = 'centered',
}: AuthShellProps) {
  return (
    <div className="relative min-h-[100svh] overflow-x-hidden bg-gradient-to-br from-[#0e1925] via-[#1a2f3f] to-[#0e1925]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0e1925]/90 via-[#1a2f3f]/80 to-[#0e1925]/90" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_40%)] sm:hidden" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,_rgba(110,168,255,0.18),_transparent_60%)] sm:hidden" />

      <div className="relative z-10 flex min-h-[100svh] flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:min-h-screen sm:items-center sm:justify-center sm:p-4">
        {desktopLogoPosition === 'corner' ? (
          <>
            <div className="absolute left-6 top-6 hidden sm:block">
              <Image
                src="/fa-logo.png"
                alt="KSS x Footasylum Logo"
                width={120}
                height={60}
                className="h-auto w-auto object-contain"
                priority
              />
            </div>
            <div
              className={cn(
                'mx-auto mb-5 flex w-full justify-center sm:hidden',
                logoSize === 'compact' ? 'max-w-[120px]' : 'max-w-[160px]'
              )}
            >
              <Image
                src="/fa-logo.png"
                alt="KSS x Footasylum Logo"
                width={208}
                height={104}
                className="h-auto w-full object-contain drop-shadow-[0_10px_28px_rgba(0,0,0,0.28)]"
                priority
              />
            </div>
          </>
        ) : (
          <div
            className={cn(
              'mx-auto mb-5 flex w-full justify-center sm:mb-8',
              logoSize === 'compact' ? 'max-w-[120px] sm:max-w-[148px]' : 'max-w-[160px] sm:max-w-[208px]'
            )}
          >
            <Image
              src="/fa-logo.png"
              alt="KSS x Footasylum Logo"
              width={208}
              height={104}
              className="h-auto w-full object-contain drop-shadow-[0_10px_28px_rgba(0,0,0,0.28)]"
              priority
            />
          </div>
        )}

        <div className={cn('mx-auto w-full max-w-md', contentClassName)}>{children}</div>
      </div>
    </div>
  )
}
