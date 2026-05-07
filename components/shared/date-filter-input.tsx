'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'

type DateFilterInputProps = {
  name: string
  defaultValue?: string
  placeholder: string
  ariaLabel: string
  className?: string
}

export function DateFilterInput({
  name,
  defaultValue = '',
  placeholder,
  ariaLabel,
  className,
}: DateFilterInputProps) {
  const [value, setValue] = useState(defaultValue)
  const [focused, setFocused] = useState(Boolean(defaultValue))
  const inputType = focused || value ? 'date' : 'text'

  return (
    <Input
      type={inputType}
      name={name}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        if (!value) setFocused(false)
      }}
      onChange={(event) => setValue(event.target.value)}
      className={className}
    />
  )
}
