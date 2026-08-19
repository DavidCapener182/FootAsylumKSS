'use client'

import React, { useId, type ChangeEvent } from 'react'
import { Camera, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EvidenceUploader({
  label = 'Add evidence',
  hint = 'Photos or documents. Files are not uploaded until you submit.',
  accept = 'image/*,.pdf',
  multiple = true,
  capture,
  disabled,
  onFilesSelected,
  className,
}: {
  label?: string
  hint?: string
  accept?: string
  multiple?: boolean
  capture?: 'user' | 'environment'
  disabled?: boolean
  onFilesSelected: (files: File[]) => void
  className?: string
}) {
  const inputId = useId()
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFilesSelected(Array.from(event.target.files || []))
    event.target.value = ''
  }

  return (
    <div className={cn('rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4', className)}>
      <input id={inputId} className="sr-only" type="file" accept={accept} multiple={multiple} capture={capture} disabled={disabled} onChange={handleChange} />
      <label htmlFor={inputId} className={cn('flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white focus-within:ring-2 focus-within:ring-slate-400', disabled && 'cursor-not-allowed opacity-50')}>
        {capture ? <Camera className="h-5 w-5" aria-hidden="true" /> : <Upload className="h-5 w-5" aria-hidden="true" />}
        {label}
      </label>
      <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>
    </div>
  )
}
