'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ExternalLink,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldCheck,
  TabletSmartphone,
  Upload,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { EventDayKpiCards } from '@/components/emp/event-day/event-day-kpi-cards'
import { EventDayStaffCardList } from '@/components/emp/event-day/event-day-staff-card-list'
import { EventDayStaffTable } from '@/components/emp/event-day/event-day-staff-table'
import { StaffingImporter } from '@/components/emp/event-day/staffing-importer'
import { EquipmentEditorDialog } from '@/components/emp/event-day/equipment-editor-dialog'
import { ClockAdjustmentDialog } from '@/components/emp/event-day/clock-adjustment-dialog'
import { EquipmentBadges } from '@/components/emp/event-day/equipment-badges'
import { EventDayStockControls } from '@/components/emp/event-day/event-day-stock-controls'
import type { ClockVarianceType } from '@/components/emp/event-day/event-day-time-status'
import { cn, formatAppDateTime } from '@/lib/utils'
import type {
  EmpEventDayAdminData,
  EmpEventDayEquipmentAssignment,
  EmpEventDayStaffShift,
} from '@/lib/emp/event-day-data'

function todayInTimezone(timezone: string) {
  return dateKeyInTimezone(new Date(), timezone)
}

function dateKeyInTimezone(value: Date | string, timezone: string) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${lookup.year}-${lookup.month}-${lookup.day}`
}

function shiftDayKey(shift: EmpEventDayStaffShift, timezone: string) {
  return shift.shiftStart ? dateKeyInTimezone(shift.shiftStart, timezone) || 'unscheduled' : 'unscheduled'
}

function eventDayLabel(dayKey: string, timezone: string) {
  if (dayKey === 'unscheduled') return 'Unscheduled'
  const date = new Date(`${dayKey}T12:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return dayKey
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone || 'Europe/London',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).formatToParts(date)
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${lookup.weekday} ${lookup.day} ${lookup.month}`
}

function filterShifts(shifts: EmpEventDayStaffShift[], status?: string) {
  return status ? shifts.filter((shift) => shift.status === status) : shifts
}

function isDateOnlyLegacyRosterRow(shift: EmpEventDayStaffShift) {
  if (!shift.shiftStart || shift.shiftEnd || shift.isWalkUp) return false
  return /imported from emp staff sign-in sheet/i.test(shift.adminNotes || '')
}

function isOperationalShift(shift: EmpEventDayStaffShift) {
  if (shift.status === 'cancelled') return false
  if (isDateOnlyLegacyRosterRow(shift)) return false
  if (['scheduled', 'no_show'].includes(shift.status) && !shift.isWalkUp && (!shift.shiftStart || !shift.shiftEnd)) return false
  return true
}

function buildClientMetrics(input: {
  shifts: EmpEventDayStaffShift[]
  equipment: EmpEventDayEquipmentAssignment[]
  mealTokens: EmpEventDayAdminData['mealTokens']
  mealTokenDate: string
  stockSummary: EmpEventDayAdminData['stockSummary']
}): EmpEventDayAdminData['metrics'] {
  const visibleShiftIds = new Set(input.shifts.map((shift) => shift.id))
  const visibleEquipment = input.equipment.filter((item) => visibleShiftIds.has(item.staffShiftId))
  const radioStock = input.stockSummary.equipment.find((item) => item.equipmentType === 'radio')
  const earpieceStock = input.stockSummary.equipment.find((item) => item.equipmentType === 'earpiece')
  return {
    scheduled: input.shifts.filter((shift) => shift.status === 'scheduled').length,
    clockedIn: input.shifts.filter((shift) => shift.status === 'clocked_in').length,
    completed: input.shifts.filter((shift) => shift.status === 'completed').length,
    noShow: input.shifts.filter((shift) => shift.status === 'no_show').length,
    cancelled: input.shifts.filter((shift) => shift.status === 'cancelled').length,
    activeRadios: visibleEquipment.filter((item) => item.status === 'issued' && item.equipmentType === 'radio').length,
    radiosTotal: radioStock?.total ?? null,
    radiosAvailable: radioStock?.available ?? null,
    earpiecesTotal: earpieceStock?.total ?? null,
    earpiecesOut: earpieceStock?.out ?? 0,
    earpiecesAvailable: earpieceStock?.available ?? null,
    outstandingKit: visibleEquipment.filter((item) => item.status === 'issued').length,
    mealTokensToday: input.mealTokens.filter((token) => visibleShiftIds.has(token.staffShiftId) && token.tokenDate === input.mealTokenDate).length,
    mealTokenTotal: input.stockSummary.mealTokens.total,
    mealTokensRemaining: input.stockSummary.mealTokens.available,
  }
}

function tabletTokenStorageKey(planId: string) {
  return `emp-event-day-tablet-token:${planId}`
}

function readStoredTabletToken(planId: string) {
  if (typeof window === 'undefined') return null
  try {
    const stored = JSON.parse(window.localStorage.getItem(tabletTokenStorageKey(planId)) || '{}') as {
      token?: string
    }
    return typeof stored.token === 'string' && stored.token.trim() ? stored.token : null
  } catch {
    return null
  }
}

function storeTabletToken(planId: string, token: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(tabletTokenStorageKey(planId), JSON.stringify({
    token,
    savedAt: new Date().toISOString(),
  }))
}

function clearStoredTabletToken(planId: string) {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(tabletTokenStorageKey(planId))
}

export function EmpEventDayAdminClient({ initialData }: { initialData: EmpEventDayAdminData }) {
  const [data, setData] = useState(initialData)
  const [activeTab, setActiveTab] = useState('overview')
  const [message, setMessage] = useState<string | null>(null)
  const [rawToken, setRawToken] = useState<string | null>(null)
  const [settingsLabel, setSettingsLabel] = useState(initialData.settings.kioskLabel || '')
  const [walkUp, setWalkUp] = useState({ staffName: '', agency: '', position: '', area: '', notes: '' })
  const [equipmentShift, setEquipmentShift] = useState<EmpEventDayStaffShift | null>(null)
  const [clockDialog, setClockDialog] = useState<{
    shift: EmpEventDayStaffShift
    clockType: ClockVarianceType
    intent: 'adjust' | 'confirm_variance'
  } | null>(null)
  const [selectedDay, setSelectedDay] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  const today = useMemo(() => todayInTimezone(data.settings.timezone), [data.settings.timezone])
  const operationalShifts = useMemo(() => data.shifts.filter(isOperationalShift), [data.shifts])
  const equipmentByShift = useMemo(() => {
    const groups = new Map<string, EmpEventDayEquipmentAssignment[]>()
    for (const item of data.equipmentAssignments) {
      const group = groups.get(item.staffShiftId) || []
      group.push(item)
      groups.set(item.staffShiftId, group)
    }
    return groups
  }, [data.equipmentAssignments])
  const dayOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const shift of operationalShifts) {
      const key = shiftDayKey(shift, data.settings.timezone)
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => {
        if (a === 'unscheduled') return 1
        if (b === 'unscheduled') return -1
        return a.localeCompare(b)
      })
      .map(([key, count]) => ({
        key,
        count,
        label: eventDayLabel(key, data.settings.timezone),
      }))
  }, [operationalShifts, data.settings.timezone])
  const effectiveDay = selectedDay || dayOptions[0]?.key || ''
  const selectedMealDate = effectiveDay && effectiveDay !== 'unscheduled' ? effectiveDay : today
  const visibleShifts = useMemo(() => {
    if (!effectiveDay) return operationalShifts
    return operationalShifts.filter((shift) => shiftDayKey(shift, data.settings.timezone) === effectiveDay)
  }, [operationalShifts, data.settings.timezone, effectiveDay])
  const visibleMetrics = useMemo(() => buildClientMetrics({
    shifts: visibleShifts,
    equipment: data.equipmentAssignments,
    mealTokens: data.mealTokens,
    mealTokenDate: selectedMealDate,
    stockSummary: data.stockSummary,
  }), [data.equipmentAssignments, data.mealTokens, data.stockSummary, selectedMealDate, visibleShifts])

  useEffect(() => {
    if (!dayOptions.length) {
      if (selectedDay) setSelectedDay('')
      return
    }
    if (!selectedDay || !dayOptions.some((day) => day.key === selectedDay)) {
      setSelectedDay(dayOptions[0].key)
    }
  }, [dayOptions, selectedDay])

  useEffect(() => {
    if (!data.settings.hasKioskToken) {
      setRawToken(null)
      clearStoredTabletToken(data.plan.id)
      return
    }

    if (!rawToken) {
      setRawToken(readStoredTabletToken(data.plan.id))
    }
  }, [data.plan.id, data.settings.hasKioskToken, rawToken])

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/emp/event-day/${data.plan.id}/admin-data`, { cache: 'no-store' })
    const body = await response.json()
    if (!response.ok) throw new Error(body.error || 'Refresh failed')
    setData(body)
  }, [data.plan.id])

  useEffect(() => {
    const interval = window.setInterval(() => {
      refresh().catch(() => undefined)
    }, 5000)
    return () => window.clearInterval(interval)
  }, [refresh])

  async function runAction(action: () => Promise<void>) {
    setIsBusy(true)
    setMessage(null)
    try {
      await action()
    } catch (error: any) {
      setMessage(error?.message || 'Action failed')
    } finally {
      setIsBusy(false)
    }
  }

  function setImported(nextData: EmpEventDayAdminData) {
    setData(nextData)
  }

  async function issueMealToken(shiftId: string) {
    await runAction(async () => {
      const response = await fetch(`/api/emp/event-day/${data.plan.id}/meal-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffShiftId: shiftId, tokenDate: selectedMealDate }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Meal token failed')
      await refresh()
    })
  }

  async function markNoShow(shift: EmpEventDayStaffShift) {
    const dayLabel = eventDayLabel(shiftDayKey(shift, data.settings.timezone), data.settings.timezone)
    const confirmed = window.confirm(`Mark ${shift.staffName} as no-show for ${dayLabel}?`)
    if (!confirmed) return
    await runAction(async () => {
      const response = await fetch(`/api/emp/event-day/${data.plan.id}/staff`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffShiftId: shift.id,
          action: 'mark_no_show',
          reason: `Marked no-show from Event Day dashboard for ${dayLabel}.`,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'No-show update failed')
      await refresh()
    })
  }

  async function reinstateNoShow(shift: EmpEventDayStaffShift) {
    const dayLabel = eventDayLabel(shiftDayKey(shift, data.settings.timezone), data.settings.timezone)
    await runAction(async () => {
      const response = await fetch(`/api/emp/event-day/${data.plan.id}/staff`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffShiftId: shift.id,
          action: 'reinstate',
          reason: `Reinstated from no-show from Event Day dashboard for ${dayLabel}.`,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Reinstate failed')
      await refresh()
    })
  }

  async function addWalkUpStaff() {
    await runAction(async () => {
      const response = await fetch(`/api/emp/event-day/${data.plan.id}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(walkUp),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Walk-up add failed')
      setWalkUp({ staffName: '', agency: '', position: '', area: '', notes: '' })
      await refresh()
    })
  }

  async function generateTabletToken() {
    const response = await fetch(`/api/emp/event-day/${data.plan.id}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rotate',
          kioskLabel: settingsLabel,
          timezone: data.settings.timezone,
        }),
      })
    const body = await response.json()
    if (!response.ok) throw new Error(body.error || 'Kiosk token failed')

    const token = String(body.token || '').trim()
    if (!token) throw new Error('Kiosk token failed')
    setRawToken(token)
    storeTabletToken(data.plan.id, token)
    await refresh()
    return token
  }

  async function isTabletTokenUsable(token: string) {
    const response = await fetch(`/api/event-day/${token}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    return response.ok
  }

  async function getTabletToken() {
    const storedToken = rawToken || readStoredTabletToken(data.plan.id)
    if (storedToken && await isTabletTokenUsable(storedToken)) {
      setRawToken(storedToken)
      return storedToken
    }

    clearStoredTabletToken(data.plan.id)
    setRawToken(null)
    return await generateTabletToken()
  }

  async function rotateKioskToken() {
    await runAction(async () => {
      await generateTabletToken()
    })
  }

  async function toggleKiosk(enabled: boolean) {
    await runAction(async () => {
      const response = await fetch(`/api/emp/event-day/${data.plan.id}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, kioskLabel: settingsLabel }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Kiosk settings failed')
      if (!enabled && typeof window !== 'undefined') {
        window.localStorage.removeItem(`emp-event-day-tablet-lock:${data.plan.id}`)
        clearStoredTabletToken(data.plan.id)
        setRawToken(null)
      }
      await refresh()
    })
  }

  const kioskEventDate = effectiveDay && effectiveDay !== 'unscheduled' ? effectiveDay : null
  const kioskUrl = rawToken && typeof window !== 'undefined'
    ? (() => {
        const url = new URL(`/event-day/${rawToken}`, window.location.origin)
        if (kioskEventDate) url.searchParams.set('date', kioskEventDate)
        return url.toString()
      })()
    : null
  const kioskLockUrl = rawToken && typeof window !== 'undefined'
    ? (() => {
        const url = new URL(`/event-day/${rawToken}`, window.location.origin)
        url.searchParams.set('tablet', '1')
        if (kioskEventDate) url.searchParams.set('date', kioskEventDate)
        return url.toString()
      })()
    : null
  const activeRosterCount = visibleShifts.length
  const tabletLoginEnabled = data.settings.kioskEnabled && data.settings.hasKioskToken

  function buildKioskUrl(token: string, tablet: boolean) {
    const url = new URL(`/event-day/${token}`, window.location.origin)
    if (tablet) url.searchParams.set('tablet', '1')
    if (kioskEventDate) url.searchParams.set('date', kioskEventDate)
    return url.toString()
  }

  async function openTabletView() {
    await runAction(async () => {
      if (typeof window === 'undefined') return

      const token = await getTabletToken()
      const url = buildKioskUrl(token, true)
      const opened = window.open(url, '_blank', 'noopener,noreferrer')
      if (!opened) {
        window.location.assign(url)
      }
    })
  }

  async function lockThisDeviceToTablet() {
    await runAction(async () => {
      if (typeof window === 'undefined') return

      const token = await getTabletToken()
      const url = buildKioskUrl(token, true)
      window.localStorage.setItem(`emp-event-day-tablet-lock:${data.plan.id}`, JSON.stringify({
        planId: data.plan.id,
        token,
        eventDate: kioskEventDate,
        lockedAt: new Date().toISOString(),
      }))
      window.localStorage.setItem(`emp-event-day-tablet-lock-token:${token}`, '1')
      window.location.assign(url)
    })
  }

  const tableProps = {
    equipmentByShift,
    clockEvents: data.clockEvents,
    mealTokens: data.mealTokens,
    today: selectedMealDate,
    onIssueMeal: issueMealToken,
    onNoShow: markNoShow,
    onReinstate: reinstateNoShow,
    onEditEquipment: setEquipmentShift,
    onAdjustClock: (shift: EmpEventDayStaffShift, clockType: ClockVarianceType = 'clock_in') => setClockDialog({
      shift,
      clockType,
      intent: 'adjust',
    }),
    onConfirmVariance: (shift: EmpEventDayStaffShift, clockType: ClockVarianceType) => setClockDialog({
      shift,
      clockType,
      intent: 'confirm_variance',
    }),
  }

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <a href="/admin/event-management-plans" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900">
              <ArrowLeft className="mr-2 h-4 w-4" />
              EMP Workspace
            </a>
            <h1 className="text-2xl font-bold text-slate-950">Event Day Operations</h1>
            <p className="text-sm text-slate-500">{data.plan.eventName || data.plan.title}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => refresh()} disabled={isBusy}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <a
              href={`/api/emp/event-day/${data.plan.id}/export`}
              className={cn(buttonVariants({ variant: 'default' }), 'bg-emerald-700 hover:bg-emerald-800')}
            >
              Export CSV
            </a>
          </div>
        </div>

        <EventDayKpiCards metrics={visibleMetrics} />

        {dayOptions.length > 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-2">
            <div className="flex flex-wrap gap-2">
              {dayOptions.map((day) => (
                <Button
                  key={day.key}
                  type="button"
                  variant={effectiveDay === day.key ? 'default' : 'outline'}
                  size="sm"
                  className={cn('gap-2', effectiveDay === day.key ? 'bg-slate-950 hover:bg-slate-800' : '')}
                  aria-pressed={effectiveDay === day.key}
                  onClick={() => setSelectedDay(day.key)}
                >
                  {day.label}
                  <Badge variant={effectiveDay === day.key ? 'secondary' : 'outline'}>{day.count}</Badge>
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {message ? <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</div> : null}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="overflow-x-auto">
            <TabsList className="h-auto min-w-max justify-start">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="roster">Roster</TabsTrigger>
              <TabsTrigger value="clocked-in">Clocked In</TabsTrigger>
              <TabsTrigger value="stock">Stock</TabsTrigger>
              <TabsTrigger value="equipment">Equipment</TabsTrigger>
              <TabsTrigger value="meal-tokens">Meal Tokens</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="rounded-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Roster
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                    <span>Active check-in rows for {effectiveDay ? eventDayLabel(effectiveDay, data.settings.timezone) : 'this view'}</span>
                    <strong>{activeRosterCount}</strong>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setActiveTab('roster')}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import master deployment
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    Tablet Login
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    <div className="space-y-2">
                      <Label>Tablet label</Label>
                      <Input value={settingsLabel} onChange={(event) => setSettingsLabel(event.target.value)} placeholder="Gate iPad, Control desk" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                    <span>Status</span>
                    <strong>{tabletLoginEnabled ? 'Enabled' : 'Disabled'}</strong>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={rotateKioskToken} disabled={isBusy}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Generate tablet login
                    </Button>
                    <Button type="button" variant="outline" onClick={openTabletView} disabled={isBusy}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open tablet view
                    </Button>
                    <Button type="button" variant="secondary" onClick={lockThisDeviceToTablet} disabled={isBusy}>
                      <TabletSmartphone className="mr-2 h-4 w-4" />
                      Lock this tablet
                    </Button>
                    <Button type="button" variant="outline" onClick={() => toggleKiosk(!data.settings.kioskEnabled)} disabled={isBusy || !data.settings.hasKioskToken}>
                      {data.settings.kioskEnabled ? 'Switch off' : 'Switch on'}
                    </Button>
                  </div>
                  {kioskUrl ? (
                    <a className="inline-flex break-all text-sm font-medium text-emerald-800 underline" href={kioskUrl} target="_blank" rel="noreferrer">
                      Open tablet login
                      <ExternalLink className="ml-2 h-4 w-4 shrink-0" />
                    </a>
                  ) : data.settings.hasKioskToken ? (
                    <p className="text-xs text-slate-500">Open or lock will create a fresh tablet login if this browser does not have the current token.</p>
                  ) : null}
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              <Card className="rounded-lg xl:col-span-2">
                <CardHeader>
                  <CardTitle>Currently Clocked In</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <EventDayStaffTable shifts={filterShifts(visibleShifts, 'clocked_in')} {...tableProps} />
                  <EventDayStaffCardList shifts={filterShifts(visibleShifts, 'clocked_in')} {...tableProps} />
                </CardContent>
              </Card>
              <Card className="rounded-lg">
                <CardHeader>
                  <CardTitle>Exceptions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                    <span>Not signed in</span>
                    <strong>{visibleMetrics.scheduled}</strong>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                    <span>No-show</span>
                    <strong>{visibleMetrics.noShow}</strong>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                    <span>Outstanding kit</span>
                    <strong>{visibleMetrics.outstandingKit}</strong>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="roster" className="space-y-4">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>Master deployment roster</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  Upload the master deployment workbook here. Staff sign-in sheets are not used for Event Day because they do not contain reliable shift times.
                </p>
              </CardContent>
            </Card>
            <StaffingImporter planId={data.plan.id} onImported={setImported} />
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>Add walk-up staff</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-5">
                <Input placeholder="Staff name" value={walkUp.staffName} onChange={(event) => setWalkUp({ ...walkUp, staffName: event.target.value })} />
                <Input placeholder="Agency" value={walkUp.agency} onChange={(event) => setWalkUp({ ...walkUp, agency: event.target.value })} />
                <Input placeholder="Position" value={walkUp.position} onChange={(event) => setWalkUp({ ...walkUp, position: event.target.value })} />
                <Input placeholder="Area" value={walkUp.area} onChange={(event) => setWalkUp({ ...walkUp, area: event.target.value })} />
                <Button type="button" disabled={!walkUp.staffName.trim() || isBusy} onClick={addWalkUpStaff}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
                <Textarea className="md:col-span-5" placeholder="Notes" value={walkUp.notes} onChange={(event) => setWalkUp({ ...walkUp, notes: event.target.value })} />
              </CardContent>
            </Card>
            <EventDayStaffTable shifts={visibleShifts} {...tableProps} />
            <EventDayStaffCardList shifts={visibleShifts} {...tableProps} />
          </TabsContent>

          <TabsContent value="clocked-in" className="space-y-4">
            <EventDayStaffTable shifts={filterShifts(visibleShifts, 'clocked_in')} {...tableProps} />
            <EventDayStaffCardList shifts={filterShifts(visibleShifts, 'clocked_in')} {...tableProps} />
          </TabsContent>

          <TabsContent value="stock" className="space-y-4">
            <EventDayStockControls
              planId={data.plan.id}
              equipmentStock={data.equipmentStock}
              stockSummary={data.stockSummary}
              mealTokenTotal={data.settings.mealTokenTotal}
              onSaved={refresh}
            />
          </TabsContent>

          <TabsContent value="equipment" className="space-y-4">
            <EventDayStockControls
              planId={data.plan.id}
              equipmentStock={data.equipmentStock}
              stockSummary={data.stockSummary}
              mealTokenTotal={data.settings.mealTokenTotal}
              onSaved={refresh}
            />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleShifts.filter((shift) => (equipmentByShift.get(shift.id) || []).length > 0).map((shift) => (
                <article key={shift.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{shift.staffName}</h3>
                      <p className="text-sm text-slate-500">{shift.position || 'No position'}</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setEquipmentShift(shift)}>Edit</Button>
                  </div>
                  <div className="mt-3">
                    <EquipmentBadges equipment={equipmentByShift.get(shift.id) || []} />
                  </div>
                </article>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="meal-tokens" className="space-y-4">
            <EventDayStaffTable shifts={visibleShifts} {...tableProps} />
            <EventDayStaffCardList shifts={visibleShifts} {...tableProps} />
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <EventDayStaffTable shifts={filterShifts(visibleShifts, 'completed')} {...tableProps} />
            <EventDayStaffCardList shifts={filterShifts(visibleShifts, 'completed')} {...tableProps} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Kiosk settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Kiosk label</Label>
                    <Input value={settingsLabel} onChange={(event) => setSettingsLabel(event.target.value)} placeholder="Gate iPad, Control desk" />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <div className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3">
                      <ShieldCheck className="h-4 w-4 text-emerald-700" />
                      {data.settings.kioskEnabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={rotateKioskToken} disabled={isBusy}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Generate / rotate token
                  </Button>
                  <Button type="button" variant="outline" onClick={openTabletView} disabled={isBusy}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open tablet view
                  </Button>
                  <Button type="button" variant="secondary" onClick={lockThisDeviceToTablet} disabled={isBusy}>
                    <TabletSmartphone className="mr-2 h-4 w-4" />
                    Lock this tablet on staff sign-in
                  </Button>
                  <Button type="button" variant="outline" onClick={() => toggleKiosk(!data.settings.kioskEnabled)} disabled={isBusy || !data.settings.hasKioskToken}>
                    {data.settings.kioskEnabled ? 'Disable kiosk' : 'Enable kiosk'}
                  </Button>
                </div>
                {kioskUrl ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <div className="text-sm font-semibold text-emerald-900">Kiosk URL</div>
                    <a className="mt-1 inline-flex break-all text-sm text-emerald-800 underline" href={kioskUrl} target="_blank" rel="noreferrer">
                      {kioskUrl}
                      <ExternalLink className="ml-2 h-4 w-4 shrink-0" />
                    </a>
                    <p className="mt-2 text-xs text-emerald-800">This raw token is only shown now. Rotate again if it is lost.</p>
                  </div>
                ) : null}
                <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Last updated {formatAppDateTime(data.settings.updatedAt)}. Token set: {data.settings.hasKioskToken ? 'yes' : 'no'}.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <EquipmentEditorDialog
        open={Boolean(equipmentShift)}
        planId={data.plan.id}
        shift={equipmentShift}
        equipment={data.equipmentAssignments}
        onOpenChange={(open) => !open && setEquipmentShift(null)}
        onSaved={refresh}
      />
      <ClockAdjustmentDialog
        open={Boolean(clockDialog)}
        planId={data.plan.id}
        shift={clockDialog?.shift || null}
        initialClockType={clockDialog?.clockType || 'clock_in'}
        intent={clockDialog?.intent || 'adjust'}
        onOpenChange={(open) => !open && setClockDialog(null)}
        onSaved={refresh}
      />
    </div>
  )
}
