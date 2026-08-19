'use client'

import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Loader2, LogIn, LogOut, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { KioskStaffSearch } from '@/components/emp/event-day/kiosk-staff-search'
import { KioskStaffConfirmCard } from '@/components/emp/event-day/kiosk-staff-confirm-card'
import {
  KioskEquipmentForm,
  emptyKioskEquipmentState,
  type KioskEquipmentState,
} from '@/components/emp/event-day/kiosk-equipment-form'
import { KioskClockOutForm } from '@/components/emp/event-day/kiosk-clock-out-form'
import type {
  EmpEventDayKioskClockedInStaffResult,
  EmpEventDayKioskStaffResult,
  EmpEventDayKioskUnavailableStaffResult,
  EmpEventDayKioskUnavailableReason,
} from '@/lib/emp/event-day-data'

type VerifiedKiosk = {
  planId: string
  eventName: string
  kioskLabel: string | null
  timezone: string
  eventDays: Array<{ date: string; label: string }>
}

type Step = 'loading' | 'mode' | 'name-in' | 'confirm-in' | 'equipment' | 'name-out' | 'confirm-out' | 'return-kit' | 'success'
type LookupStatus = 'idle' | 'too_short' | 'no_match' | 'ambiguous' | 'matched' | 'unavailable'

const ADMIN_LOGIN_HREF = '/login?redirectTo=%2Fadmin%2Fevent-management-plans'

class KioskApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'KioskApiError'
    this.status = status
  }
}

function todayInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${lookup.year}-${lookup.month}-${lookup.day}`
}

function defaultEventDate(payload: VerifiedKiosk) {
  const today = todayInTimezone(payload.timezone)
  return payload.eventDays.find((day) => day.date === today)?.date || payload.eventDays[0]?.date || ''
}

function tabletLockIsEnabled(token: string) {
  return typeof window !== 'undefined' && (
    new URLSearchParams(window.location.search).get('tablet') === '1'
    || window.localStorage.getItem(`emp-event-day-tablet-lock-token:${token}`) === '1'
  )
}

function resolveLockedEventDate(payload: VerifiedKiosk, token: string, isLocked: boolean) {
  if (typeof window === 'undefined') return defaultEventDate(payload)

  const urlDate = new URLSearchParams(window.location.search).get('date') || ''
  if (urlDate && payload.eventDays.some((day) => day.date === urlDate)) return urlDate

  if (isLocked) {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key?.startsWith('emp-event-day-tablet-lock:')) continue

      try {
        const stored = JSON.parse(window.localStorage.getItem(key) || '{}') as {
          token?: string
          eventDate?: string | null
        }
        if (
          stored.token === token
          && stored.eventDate
          && payload.eventDays.some((day) => day.date === stored.eventDate)
        ) {
          return stored.eventDate
        }
      } catch {
        // Ignore stale local tablet-lock records.
      }
    }
  }

  return defaultEventDate(payload)
}

export function EmpEventDayKioskClient({ token }: { token: string }) {
  const [verified, setVerified] = useState<VerifiedKiosk | null>(null)
  const [step, setStep] = useState<Step>('loading')
  const [isTabletLocked, setIsTabletLocked] = useState(false)
  const [nameQuery, setNameQuery] = useState('')
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>('idle')
  const [matchedStaff, setMatchedStaff] = useState<EmpEventDayKioskStaffResult | null>(null)
  const [unavailableStaff, setUnavailableStaff] = useState<EmpEventDayKioskUnavailableStaffResult | null>(null)
  const [unavailableReason, setUnavailableReason] = useState<EmpEventDayKioskUnavailableReason | null>(null)
  const [eventDate, setEventDate] = useState('')
  const [selected, setSelected] = useState<EmpEventDayKioskStaffResult | null>(null)
  const [selectedClockedIn, setSelectedClockedIn] = useState<EmpEventDayKioskClockedInStaffResult | null>(null)
  const [workerVerificationCode, setWorkerVerificationCode] = useState('')
  const [equipment, setEquipment] = useState<KioskEquipmentState>(emptyKioskEquipmentState)
  const [success, setSuccess] = useState('')
  const [successCountdown, setSuccessCountdown] = useState(3)
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [isLookupBusy, setIsLookupBusy] = useState(false)
  const [kioskPinOpen, setKioskPinOpen] = useState(false)
  const [kioskPin, setKioskPin] = useState('')
  const [kioskPinDraft, setKioskPinDraft] = useState('')
  const [kioskPinError, setKioskPinError] = useState<string | null>(null)

  const api = useCallback(async (path: string, body: Record<string, unknown>) => {
    const response = await fetch(`/api/event-day/${token}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, ...(kioskPin ? { pin: kioskPin } : {}) }),
    })
    const payload = await response.json()
    if (!response.ok) {
      if (response.status === 401) {
        setKioskPin('')
        setKioskPinDraft('')
        setKioskPinError('Enter the current shared kiosk PIN.')
        setKioskPinOpen(true)
      }
      throw new KioskApiError(payload.error || 'Request failed', response.status)
    }
    return payload
  }, [kioskPin, token])

  async function run(action: () => Promise<void>) {
    setIsBusy(true)
    setError(null)
    try {
      await action()
    } catch (nextError: any) {
      setError(nextError?.message || 'Request failed')
    } finally {
      setIsBusy(false)
    }
  }

  function resetName() {
    setNameQuery('')
    setMatchedStaff(null)
    setUnavailableStaff(null)
    setUnavailableReason(null)
    setLookupStatus('idle')
    setWorkerVerificationCode('')
    setError(null)
  }

  const applyVerifiedKiosk = useCallback((payload: VerifiedKiosk) => {
    const tabletLocked = tabletLockIsEnabled(token)
    setIsTabletLocked(Boolean(tabletLocked))
    if (tabletLocked && typeof window !== 'undefined') {
      window.localStorage.setItem(`emp-event-day-tablet-lock-token:${token}`, '1')
      window.localStorage.setItem(`emp-event-day-tablet-lock:${payload.planId}`, JSON.stringify({
        planId: payload.planId,
        token,
        eventDate: resolveLockedEventDate(payload, token, true),
        lockedAt: new Date().toISOString(),
      }))
    }
    setVerified(payload)
    setEventDate(resolveLockedEventDate(payload, token, Boolean(tabletLocked)))
    setStep('mode')
  }, [token])

  const requestVerification = useCallback(async (pin: string) => {
    const response = await fetch(`/api/event-day/${token}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pin ? { pin } : {}),
    })
    const payload = await response.json()
    if (!response.ok) throw new KioskApiError(payload.error || 'Kiosk access is not available', response.status)
    return payload as VerifiedKiosk
  }, [token])

  async function submitKioskPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextPin = kioskPinDraft.trim()
    if (!nextPin) {
      setKioskPinError('Enter the shared kiosk PIN.')
      return
    }

    setIsBusy(true)
    setKioskPinError(null)
    try {
      const payload = await requestVerification(nextPin)
      setKioskPin(nextPin)
      setKioskPinDraft('')
      setKioskPinOpen(false)
      setError(null)
      applyVerifiedKiosk(payload)
    } catch (nextError: any) {
      setKioskPinDraft('')
      if (nextError instanceof KioskApiError && nextError.status === 401) {
        setKioskPinError('Incorrect kiosk PIN.')
      } else if (nextError instanceof KioskApiError && nextError.status === 403) {
        setKioskPinOpen(false)
        setVerified(null)
        setStep('loading')
        setError(nextError.message)
      } else {
        setKioskPinError(nextError?.message || 'Could not verify the kiosk PIN.')
      }
    } finally {
      setIsBusy(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    const tabletLocked = tabletLockIsEnabled(token)
    setIsTabletLocked(tabletLocked)
    if (tabletLocked && typeof window !== 'undefined') {
      window.localStorage.setItem(`emp-event-day-tablet-lock-token:${token}`, '1')
    }

    async function verifyTablet() {
      setIsBusy(true)
      setError(null)
      try {
        const payload = await requestVerification('')
        if (!isMounted) return
        applyVerifiedKiosk(payload)
      } catch (nextError: any) {
        if (!isMounted) return
        if (nextError instanceof KioskApiError && nextError.status === 401) {
          setKioskPinDraft('')
          setKioskPinError(null)
          setKioskPinOpen(true)
        } else {
          setError(nextError?.message || 'Kiosk access is not available')
        }
      } finally {
        if (isMounted) setIsBusy(false)
      }
    }

    void verifyTablet()

    return () => {
      isMounted = false
    }
  }, [applyVerifiedKiosk, requestVerification, token])

  useEffect(() => {
    if (!verified || kioskPinOpen) return
    const interval = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/event-day/${token}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(kioskPin ? { pin: kioskPin } : {}),
        })
        if (response.status === 401) {
          setKioskPin('')
          setKioskPinDraft('')
          setKioskPinError('Enter the current shared kiosk PIN.')
          setKioskPinOpen(true)
        } else if (response.status === 403) {
          setVerified(null)
          setStep('loading')
          setError('Tablet access has expired or been switched off by admin.')
        }
      } catch {
        // Keep the current screen during brief network drops.
      }
    }, 10000)
    return () => window.clearInterval(interval)
  }, [kioskPin, kioskPinOpen, token, verified])

  useEffect(() => {
    const mode = step === 'name-in' ? 'clock_in' : step === 'name-out' ? 'clock_out' : null
    if (!mode || !verified || kioskPinOpen) return

    const query = nameQuery.trim()
    setMatchedStaff(null)
    setUnavailableStaff(null)
    setUnavailableReason(null)
    setError(null)
    if (query.length < 2) {
      setLookupStatus(query ? 'too_short' : 'idle')
      return
    }

    let isCurrent = true
    setIsLookupBusy(true)
    const timer = window.setTimeout(async () => {
      try {
        const payload = await api('search-staff', { query, eventDate, mode })
        if (!isCurrent) return
        setMatchedStaff(payload.staff || null)
        setUnavailableStaff(payload.unavailableStaff || null)
        setUnavailableReason(payload.unavailableReason || null)
        setLookupStatus(payload.status || (payload.staff ? 'matched' : 'no_match'))
      } catch (nextError: any) {
        if (!isCurrent) return
        setMatchedStaff(null)
        setUnavailableStaff(null)
        setUnavailableReason(null)
        setLookupStatus('no_match')
        setError(nextError?.message || 'Search failed')
      } finally {
        if (isCurrent) setIsLookupBusy(false)
      }
    }, 350)

    return () => {
      isCurrent = false
      window.clearTimeout(timer)
      setIsLookupBusy(false)
    }
  }, [api, step, nameQuery, eventDate, kioskPinOpen, verified])

  useEffect(() => {
    if (step !== 'success') return

    setSuccessCountdown(3)
    const startedAt = Date.now()
    const interval = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000)
      setSuccessCountdown(Math.max(0, 3 - elapsedSeconds))
    }, 250)
    const timeout = window.setTimeout(() => {
      setSuccess('')
      setError(null)
      setStep('mode')
    }, 3000)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
  }, [step, success])

  async function loadClockedIn() {
    await run(async () => {
      const payload = await api('clocked-in', {
        query: nameQuery,
        eventDate,
        mode: 'clock_out',
        workerVerificationCode,
      })
      const person = payload.staff?.[0]
      if (!person) throw new Error('No clocked-in shift matches that name.')
      setSelectedClockedIn(person)
      setStep('return-kit')
    })
  }

  async function clockIn() {
    if (!selected) return
    await run(async () => {
      try {
        await api('clock-in', {
          staffShiftId: selected.id,
          nameQuery,
          eventDate,
          workerVerificationCode,
          deviceLabel: verified?.kioskLabel,
          equipment,
        })
      } catch (nextError) {
        if (nextError instanceof KioskApiError && [403, 429].includes(nextError.status)) {
          setStep('confirm-in')
        }
        throw nextError
      }
      setSuccess(`${selected.staffName} is clocked in.`)
      setEquipment(emptyKioskEquipmentState)
      setSelected(null)
      resetName()
      setStep('success')
    })
  }

  async function clockOut(input: {
    returns: Array<{ assignmentId: string; status: string; notes?: string }>
    notes: string
  }) {
    if (!selectedClockedIn) return
    await run(async () => {
      try {
        await api('clock-out', {
          staffShiftId: selectedClockedIn.id,
          nameQuery,
          eventDate,
          workerVerificationCode,
          deviceLabel: verified?.kioskLabel,
          returns: input.returns,
          notes: input.notes,
        })
      } catch (nextError) {
        if (nextError instanceof KioskApiError && [403, 429].includes(nextError.status)) {
          setStep('confirm-out')
        }
        throw nextError
      }
      setSuccess(`${selectedClockedIn.staffName} is clocked out.`)
      setSelectedClockedIn(null)
      setSelected(null)
      resetName()
      setStep('success')
    })
  }

  const selectedEventDay = verified?.eventDays.find((day) => day.date === eventDate) || null
  const kioskPinDialog = (
    <Dialog
      open={kioskPinOpen}
      onOpenChange={(open) => {
        setKioskPinOpen(open)
        if (!open) {
          setKioskPinDraft('')
          setKioskPinError(null)
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={submitKioskPin}>
          <DialogHeader>
            <DialogTitle>Kiosk PIN</DialogTitle>
            <DialogDescription>Enter the shared PIN configured for this event-day tablet.</DialogDescription>
          </DialogHeader>
          <div className="mt-5 space-y-2">
            <Input
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={12}
              value={kioskPinDraft}
              onChange={(event) => {
                setKioskPinDraft(event.target.value.replace(/\D/g, '').slice(0, 12))
                setKioskPinError(null)
              }}
              className="h-14 rounded-lg text-center text-2xl font-black tracking-[0.35em]"
              aria-label="Kiosk PIN"
            />
            {kioskPinError ? <p className="text-sm font-semibold text-red-700">{kioskPinError}</p> : null}
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setKioskPinOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isBusy} className="bg-slate-950 hover:bg-slate-800">
              Continue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )

  if (step === 'loading' || !verified) {
    return (
      <main className="min-h-[100dvh] bg-[#071018] text-white">
        <div className="mx-auto flex min-h-[100dvh] max-w-xl flex-col justify-center px-5 py-8">
          <div className="rounded-lg border border-white/10 bg-white p-6 text-slate-950 shadow-2xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                {isBusy ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShieldCheck className="h-6 w-6" />}
              </div>
              <div>
                <h1 className="text-2xl font-black">Staff Sign In / Out</h1>
                <p className="text-sm font-medium text-slate-500">{isBusy ? 'Loading tablet access.' : 'Tablet access is not available.'}</p>
              </div>
            </div>
            {error ? <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}
            {!isTabletLocked ? (
              <Button type="button" variant="outline" className="mt-4 h-12 w-full rounded-lg" onClick={() => window.location.assign(ADMIN_LOGIN_HREF)}>
                <LogIn className="mr-2 h-4 w-4" />
                Admin login
              </Button>
            ) : null}
          </div>
          {kioskPinDialog}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[100dvh] bg-[#eef3f0] text-slate-950">
      <div className="mx-auto flex min-h-[100dvh] max-w-7xl flex-col px-4 py-4 sm:px-6">
        <header className="mb-5 overflow-hidden rounded-lg bg-[#071018] text-white shadow-2xl shadow-slate-900/20">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-300">Event Day Operations</p>
              <h1 className="mt-2 text-3xl font-black sm:text-5xl">{verified.eventName || 'Staff Sign In / Out'}</h1>
              <p className="mt-2 text-base font-semibold text-slate-300">{verified.kioskLabel || 'Tablet kiosk'}</p>
              {isTabletLocked ? <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Tablet mode locked</p> : null}
            </div>
            {selectedEventDay ? (
              <div className="flex flex-wrap gap-2">
                <div className="rounded-lg bg-white px-4 py-2 text-sm font-black text-slate-950">
                  {selectedEventDay.label}
                </div>
              </div>
            ) : null}
          </div>
        </header>

        {step === 'mode' ? (
          <div className="grid flex-1 gap-4 md:grid-cols-2">
            <button
              type="button"
              className="group min-h-[42dvh] rounded-lg bg-emerald-700 p-7 text-left text-white shadow-2xl shadow-emerald-900/20 transition hover:bg-emerald-800"
              onClick={() => {
                resetName()
                setStep('name-in')
              }}
            >
              <LogIn className="h-14 w-14" />
              <div className="mt-10 text-5xl font-black">Clock In</div>
              <div className="mt-4 text-lg font-semibold text-emerald-50">Start shift and record issued kit.</div>
            </button>
            <button
              type="button"
              className="group min-h-[42dvh] rounded-lg bg-slate-950 p-7 text-left text-white shadow-2xl shadow-slate-900/20 transition hover:bg-slate-800"
              onClick={() => {
                resetName()
                setStep('name-out')
              }}
            >
              <LogOut className="h-14 w-14" />
              <div className="mt-10 text-5xl font-black">Clock Out</div>
              <div className="mt-4 text-lg font-semibold text-slate-300">Finish shift and return issued kit.</div>
            </button>
          </div>
        ) : null}

        {step === 'name-in' || step === 'name-out' ? (
          <div className="space-y-4">
            <Button type="button" variant="outline" className="h-12 rounded-lg bg-white" onClick={() => setStep('mode')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <KioskStaffSearch
              mode={step === 'name-in' ? 'clock-in' : 'clock-out'}
              query={nameQuery}
              staff={matchedStaff}
              unavailableStaff={unavailableStaff}
              unavailableReason={unavailableReason}
              lookupStatus={lookupStatus}
              isBusy={isLookupBusy}
              onQueryChange={setNameQuery}
              onConfirm={() => {
                if (!matchedStaff) return
                if (step === 'name-in') {
                  setSelected(matchedStaff)
                  setStep('confirm-in')
                } else {
                  setSelected(matchedStaff)
                  setStep('confirm-out')
                }
              }}
            />
          </div>
        ) : null}

        {step === 'confirm-in' && selected ? (
          <KioskStaffConfirmCard
            staff={selected}
            actionLabel="Continue"
            verificationCode={workerVerificationCode}
            error={error}
            isBusy={isBusy}
            onBack={() => {
              setWorkerVerificationCode('')
              setStep('name-in')
            }}
            onVerificationCodeChange={(value) => {
              setWorkerVerificationCode(value)
              setError(null)
            }}
            onContinue={() => setStep('equipment')}
          />
        ) : null}

        {step === 'equipment' && selected ? (
          <KioskEquipmentForm
            value={equipment}
            error={error}
            isBusy={isBusy}
            onChange={setEquipment}
            onSubmit={clockIn}
          />
        ) : null}

        {step === 'confirm-out' && selected ? (
          <KioskStaffConfirmCard
            staff={selected}
            actionLabel="Continue"
            verificationCode={workerVerificationCode}
            error={error}
            isBusy={isBusy}
            onBack={() => {
              setWorkerVerificationCode('')
              setStep('name-out')
            }}
            onVerificationCodeChange={(value) => {
              setWorkerVerificationCode(value)
              setError(null)
            }}
            onContinue={() => void loadClockedIn()}
          />
        ) : null}

        {step === 'return-kit' && selectedClockedIn ? (
          <KioskClockOutForm
            staff={selectedClockedIn}
            error={error}
            isBusy={isBusy}
            onSubmit={clockOut}
          />
        ) : null}

        {step === 'success' ? (
          <div className="mx-auto flex flex-1 w-full max-w-xl items-center">
            <div className="w-full rounded-lg bg-white p-8 text-center shadow-2xl shadow-slate-900/10">
              <CheckCircle2 className="mx-auto h-20 w-20 text-emerald-700" />
              <h2 className="mt-5 text-4xl font-black text-slate-950">{success}</h2>
              <Button type="button" className="mt-7 h-16 w-full rounded-lg bg-slate-950 text-xl font-black hover:bg-slate-800" onClick={() => setStep('mode')}>
                Back to start in {successCountdown}
              </Button>
            </div>
          </div>
        ) : null}

        {error && !['confirm-in', 'confirm-out', 'equipment', 'return-kit'].includes(step) ? (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
        ) : null}

        <footer className="mt-5 flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          <span>KSS Event Management</span>
          {!isTabletLocked ? (
            <button type="button" onClick={() => window.location.assign(ADMIN_LOGIN_HREF)} className="rounded-lg bg-white px-4 py-2 text-slate-700 shadow-sm transition hover:text-slate-950">
              Admin login
            </button>
          ) : null}
        </footer>
        {kioskPinDialog}
      </div>
    </main>
  )
}
