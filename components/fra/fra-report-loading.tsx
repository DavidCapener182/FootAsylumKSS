'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'

type FRALoadingGlyphProps = {
  className?: string
}

type FRAReportLoadingStateProps = {
  title: string
  description: string
  className?: string
  panelClassName?: string
}

export function FRALoadingGlyph({ className }: FRALoadingGlyphProps) {
  const gradientId = useId().replace(/:/g, '')

  return (
    <svg
      viewBox="0 0 120 120"
      className={cn('h-10 w-10 text-indigo-600', className)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      <circle
        cx="60"
        cy="60"
        r="38"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.14"
        strokeWidth="10"
      />

      <path
        d="M60 22a38 38 0 0 1 31.1 16.2"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeLinecap="round"
        strokeWidth="10"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 60 60"
          to="360 60 60"
          dur="1.35s"
          repeatCount="indefinite"
        />
      </path>

      <g fill={`url(#${gradientId})`}>
        <circle cx="60" cy="24" r="5.5">
          <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />
          <animate attributeName="r" values="5.5;4.2;5.5" dur="1.2s" repeatCount="indefinite" />
        </circle>
        <circle cx="91" cy="42" r="4.5">
          <animate attributeName="opacity" values="0.45;1;0.45" dur="1.2s" begin="-0.4s" repeatCount="indefinite" />
          <animate attributeName="r" values="4.5;5.8;4.5" dur="1.2s" begin="-0.4s" repeatCount="indefinite" />
        </circle>
        <circle cx="29" cy="78" r="4.5">
          <animate attributeName="opacity" values="0.45;1;0.45" dur="1.2s" begin="-0.8s" repeatCount="indefinite" />
          <animate attributeName="r" values="4.5;5.8;4.5" dur="1.2s" begin="-0.8s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  )
}

export function FRAReportLoadingState({
  title,
  description,
  className,
  panelClassName,
}: FRAReportLoadingStateProps) {
  return (
    <div
      className={cn('flex items-center justify-center px-6 py-12', className)}
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          'w-full max-w-xl rounded-[28px] border border-slate-200/90 bg-white/95 p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur',
          panelClassName
        )}
      >
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_rgba(255,255,255,0.92)_68%)]">
          <FRALoadingGlyph className="h-14 w-14" />
        </div>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          KSS x Footasylum
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  )
}
