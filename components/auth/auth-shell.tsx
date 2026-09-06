import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { WorkspaceBrand } from '@/components/layout/workspace-brand'

type AuthShellProps = {
  children: ReactNode
  logoSize?: 'standard' | 'compact'
  contentClassName?: string
  desktopLogoPosition?: 'centered' | 'corner'
}

export function AuthShell({ children, logoSize = 'standard', contentClassName, desktopLogoPosition = 'centered' }: AuthShellProps) {
  return (
    <div className="auth-workspace relative min-h-[100svh] bg-[#202922]">
      <div className="relative flex min-h-[100svh] flex-col items-center justify-center px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:p-8">
        <div className={cn('mb-8 text-white', desktopLogoPosition === 'corner' && 'sm:absolute sm:left-8 sm:top-8', logoSize === 'compact' && 'scale-90')}>
          <WorkspaceBrand />
        </div>
        <div className={cn('mx-auto w-full max-w-md', contentClassName)}>{children}</div>
      </div>
    </div>
  )
}
