import { cn } from '@/lib/utils'

/** Text identity keeps navigation usable when a logo asset is unavailable. */
export function WorkspaceBrand({ className }: { className?: string }) {
  return (
    <div className={cn('workspace-brand', className)} aria-label="KSS x Footasylum">
      <span className="workspace-brand-name">KSSxFOOTASYLUM<span className="text-lime-300">.</span></span>
      <span className="workspace-brand-caption">KSS / COMPLIANCE WORKSPACE</span>
    </div>
  )
}
