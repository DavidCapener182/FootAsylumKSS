import { cn } from '@/lib/utils'

export type StatusBadgeTone = 'success' | 'danger' | 'warning' | 'info' | 'teal' | 'muted'

const statusToneMap: Record<StatusBadgeTone, string> = {
  success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  danger: 'border-red-100 bg-red-50 text-red-700',
  warning: 'border-amber-100 bg-amber-50 text-amber-700',
  info: 'border-blue-100 bg-blue-50 text-blue-700',
  teal: 'border-teal-100 bg-teal-50 text-teal-700',
  muted: 'border-slate-200 bg-slate-100 text-slate-600',
}

export function StatusBadge({
  label,
  tone = 'muted',
  className,
}: {
  label: string
  tone?: StatusBadgeTone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        statusToneMap[tone],
        className
      )}
    >
      {label}
    </span>
  )
}
