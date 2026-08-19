'use client'

import React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isValidTotpCode, normalizeTotpCode } from '@/lib/mfa/totp'

type MfaCodeFormProps = {
  descriptionId: string
  submitLabel: string
  onVerify: (code: string) => Promise<string | null>
}

export function MfaCodeForm({ descriptionId, submitLabel, onVerify }: MfaCodeFormProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const mountedRef = useRef(true)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => () => {
    mountedRef.current = false
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!isValidTotpCode(code)) {
      setError('Enter the 6-digit code from your authenticator app.')
      inputRef.current?.focus()
      return
    }

    setPending(true)
    const verificationError = await onVerify(code)
    if (!mountedRef.current) return
    setPending(false)

    if (verificationError) {
      setCode('')
      setError(verificationError)
      inputRef.current?.focus()
    }
  }

  const errorId = `${descriptionId}-error`

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate aria-busy={pending}>
      <div className="space-y-2">
        <Label htmlFor={`${descriptionId}-code`} className="text-slate-800">
          Verification code
        </Label>
        <Input
          ref={inputRef}
          id={`${descriptionId}-code`}
          name="verification-code"
          type="text"
          value={code}
          onChange={(event) => setCode(normalizeTotpCode(event.target.value))}
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="000000"
          aria-describedby={`${descriptionId}${error ? ` ${errorId}` : ''}`}
          aria-invalid={Boolean(error)}
          disabled={pending}
          className="font-mono text-lg tracking-[0.3em]"
        />
      </div>

      {error && (
        <p id={errorId} role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="min-h-[44px] w-full bg-[#0e1925] text-white hover:bg-[#143457]"
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Verifying…
          </>
        ) : submitLabel}
      </Button>
    </form>
  )
}
