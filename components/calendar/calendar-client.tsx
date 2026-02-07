'use client'

import { useState, useMemo, useEffect } from 'react'
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  format, 
  isToday,
  addDays,
  subDays
} from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays, Route, CheckCircle2, ShieldCheck, Users, Gauge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarDayEvent } from './calendar-day-event'
import { CalendarEventModal } from './calendar-event-modal'
import type { CalendarData, PlannedRoute, CompletedStore } from '@/app/actions/calendar'

interface CalendarClientProps {
  initialData: CalendarData
}

export function CalendarClient({ initialData }: CalendarClientProps) {
  const [currentMonth, setCurrentMonth] = useState(initialData.month)
  const [currentYear, setCurrentYear] = useState(initialData.year)
  const [selectedEvent, setSelectedEvent] = useState<{
    type: 'planned' | 'completed'
    data: PlannedRoute | CompletedStore
    date: string
  } | null>(null)
  const [calendarData, setCalendarData] = useState(initialData)
  const [isMobile, setIsMobile] = useState(false)
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date()
    return startOfWeek(today, { weekStartsOn: 1 }) // Monday
  })

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Get the date object for the current month
  const currentDate = useMemo(() => {
    return new Date(currentYear, currentMonth - 1, 1)
  }, [currentMonth, currentYear])

  // Fetch new calendar data when month changes
  const handleMonthChange = async (direction: 'prev' | 'next') => {
    let newMonth = currentMonth
    let newYear = currentYear

    if (direction === 'prev') {
      if (newMonth === 1) {
        newMonth = 12
        newYear--
      } else {
        newMonth--
      }
    } else {
      if (newMonth === 12) {
        newMonth = 1
        newYear++
      } else {
        newMonth++
      }
    }

    setCurrentMonth(newMonth)
    setCurrentYear(newYear)

    // Fetch new data
    try {
      const { getCalendarData } = await import('@/app/actions/calendar')
      const newData = await getCalendarData(newMonth, newYear)
      setCalendarData(newData)
    } catch (error) {
      console.error('Error fetching calendar data:', error)
    }
  }

  // Handle week navigation for mobile
  const handleWeekChange = async (direction: 'prev' | 'next') => {
    const newWeekStart = direction === 'prev' 
      ? subDays(currentWeekStart, 7)
      : addDays(currentWeekStart, 7)
    
    setCurrentWeekStart(newWeekStart)
    
    // Check if we need to fetch data for a different month
    const newWeekMonth = newWeekStart.getMonth() + 1
    const newWeekYear = newWeekStart.getFullYear()
    
    if (newWeekMonth !== currentMonth || newWeekYear !== currentYear) {
      setCurrentMonth(newWeekMonth)
      setCurrentYear(newWeekYear)
      
      // Fetch new data
      try {
        const { getCalendarData } = await import('@/app/actions/calendar')
        const newData = await getCalendarData(newWeekMonth, newWeekYear)
        setCalendarData(newData)
      } catch (error) {
        console.error('Error fetching calendar data:', error)
      }
    }
  }

  // Get the week dates for mobile view
  const weekDays = useMemo(() => {
    const days: Array<{
      date: Date
      dateStr: string
      plannedRoutes: PlannedRoute[]
      completedStores: CompletedStore[]
    }> = []

    const dataMap = new Map<string, { plannedRoutes: PlannedRoute[], completedStores: CompletedStore[] }>()
    calendarData.days.forEach(day => {
      dataMap.set(day.date, { plannedRoutes: day.plannedRoutes, completedStores: day.completedStores })
    })

    for (let i = 0; i < 7; i++) {
      const dayDate = addDays(currentWeekStart, i)
      const dateStr = format(dayDate, 'yyyy-MM-dd')
      const dayData = dataMap.get(dateStr) || { plannedRoutes: [], completedStores: [] }

      days.push({
        date: dayDate,
        dateStr,
        plannedRoutes: dayData.plannedRoutes,
        completedStores: dayData.completedStores
      })
    }

    return days
  }, [currentWeekStart, calendarData])

  // Create calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 }) // Monday

    const days: Array<{
      date: Date
      isCurrentMonth: boolean
      dateStr: string
      plannedRoutes: PlannedRoute[]
      completedStores: CompletedStore[]
    }> = []

    const dataMap = new Map<string, { plannedRoutes: PlannedRoute[], completedStores: CompletedStore[] }>()
    calendarData.days.forEach(day => {
      dataMap.set(day.date, { plannedRoutes: day.plannedRoutes, completedStores: day.completedStores })
    })

    let currentDay = new Date(calendarStart)
    while (currentDay <= calendarEnd) {
      const dateStr = format(currentDay, 'yyyy-MM-dd')
      const isCurrentMonth = currentDay >= monthStart && currentDay <= monthEnd
      const dayData = dataMap.get(dateStr) || { plannedRoutes: [], completedStores: [] }

      days.push({
        date: new Date(currentDay),
        isCurrentMonth,
        dateStr,
        plannedRoutes: dayData.plannedRoutes,
        completedStores: dayData.completedStores
      })

      currentDay.setDate(currentDay.getDate() + 1)
    }

    return days
  }, [currentDate, calendarData])

  // Group days into weeks
  const weeks = useMemo(() => {
    const weekGroups: typeof calendarDays[] = []
    let currentWeek: typeof calendarDays = []

    calendarDays.forEach((day, index) => {
      currentWeek.push(day)
      if ((index + 1) % 7 === 0) {
        weekGroups.push(currentWeek)
        currentWeek = []
      }
    })

    if (currentWeek.length > 0) {
      weekGroups.push(currentWeek)
    }

    return weekGroups
  }, [calendarDays])

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const totalPlannedRoutes = calendarData.days.reduce((total, day) => total + day.plannedRoutes.length, 0)
  const totalCompletedStores = calendarData.days.reduce((total, day) => total + day.completedStores.length, 0)
  const activeDays = calendarData.days.filter((day) => day.plannedRoutes.length > 0 || day.completedStores.length > 0).length
  const managerCapacity = useMemo(() => {
    const managerMap = new Map<string, {
      managerName: string
      plannedRoutes: number
      storeStops: number
      estimatedHours: number
      activeDays: Set<string>
      overbookedDays: number
      busiestDayHours: number
    }>()
    const dailyHoursByManager = new Map<string, number>()

    calendarData.days.forEach((day) => {
      day.plannedRoutes.forEach((route) => {
        const managerName = route.managerName || 'Unassigned'
        const key = managerName
        if (!managerMap.has(key)) {
          managerMap.set(key, {
            managerName,
            plannedRoutes: 0,
            storeStops: 0,
            estimatedHours: 0,
            activeDays: new Set<string>(),
            overbookedDays: 0,
            busiestDayHours: 0,
          })
        }

        const storeStops = route.storeCount || route.stores?.length || 0
        const visitHours = storeStops * 1.75
        const driveHours = Math.max(0.5, storeStops * 0.5)
        const estimatedHours = visitHours + driveHours

        const manager = managerMap.get(key)!
        manager.plannedRoutes += 1
        manager.storeStops += storeStops
        manager.estimatedHours += estimatedHours
        manager.activeDays.add(day.date)

        const dayKey = `${key}::${day.date}`
        dailyHoursByManager.set(dayKey, (dailyHoursByManager.get(dayKey) || 0) + estimatedHours)
      })
    })

    dailyHoursByManager.forEach((hours, dayKey) => {
      const [managerName] = dayKey.split('::')
      const manager = managerMap.get(managerName)
      if (!manager) return
      if (hours > 8) manager.overbookedDays += 1
      if (hours > manager.busiestDayHours) manager.busiestDayHours = hours
    })

    return Array.from(managerMap.values())
      .map((manager) => {
        const capacityHours = manager.activeDays.size * 8
        const utilizationPct = capacityHours > 0 ? Math.round((manager.estimatedHours / capacityHours) * 100) : 0
        return {
          managerName: manager.managerName,
          plannedRoutes: manager.plannedRoutes,
          storeStops: manager.storeStops,
          estimatedHours: Number(manager.estimatedHours.toFixed(1)),
          activeDays: manager.activeDays.size,
          overbookedDays: manager.overbookedDays,
          busiestDayHours: Number(manager.busiestDayHours.toFixed(1)),
          utilizationPct,
        }
      })
      .sort((a, b) => b.utilizationPct - a.utilizationPct)
  }, [calendarData])

  // Mobile week view
  if (isMobile) {
    const weekStartDate = weekDays[0]?.date || currentWeekStart
    const weekEndDate = weekDays[6]?.date || addDays(currentWeekStart, 6)

    return (
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 shadow-lg">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-slate-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Calendar Overview
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">{format(weekStartDate, 'MMMM yyyy')}</h1>
            <p className="mt-2 text-sm text-slate-300">
              {format(weekStartDate, 'MMM d')} - {format(weekEndDate, 'MMM d, yyyy')}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/20 bg-white/10 px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-widest text-slate-300">Routes</p>
                <p className="mt-1 text-lg font-semibold text-white">{totalPlannedRoutes}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-widest text-slate-300">Completed</p>
                <p className="mt-1 text-lg font-semibold text-white">{totalCompletedStores}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-widest text-slate-300">Active Days</p>
                <p className="mt-1 text-lg font-semibold text-white">{activeDays}</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-200 bg-slate-50/70 pb-3">
            <CardTitle className="text-base text-slate-800 flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-600" />
              Team Capacity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            {managerCapacity.length === 0 ? (
              <p className="text-xs italic text-slate-500">No planned routes this month.</p>
            ) : (
              managerCapacity.slice(0, 4).map((manager) => (
                <div key={manager.managerName} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                  <div className="flex items-center justify-between text-xs">
                    <p className="font-semibold text-slate-700 truncate">{manager.managerName}</p>
                    <p className="font-semibold text-slate-700">{manager.utilizationPct}%</p>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${manager.utilizationPct > 100 ? 'bg-rose-500' : manager.utilizationPct > 85 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, manager.utilizationPct)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {manager.storeStops} stops • {manager.estimatedHours}h planned
                    {manager.overbookedDays > 0 ? ` • ${manager.overbookedDays} overbooked day${manager.overbookedDays > 1 ? 's' : ''}` : ''}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-slate-800">
                {format(weekStartDate, 'MMM d')} - {format(weekEndDate, 'MMM d, yyyy')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleWeekChange('prev')}
                  className="h-9 w-9 p-0 rounded-lg"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleWeekChange('next')}
                  className="h-9 w-9 p-0 rounded-lg"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 bg-white">
            {/* Vertical week schedule */}
            <div className="divide-y divide-slate-200">
              {weekDays.map((day) => {
                const isCurrentDay = isToday(day.date)
                const dayName = dayNames[day.date.getDay() === 0 ? 6 : day.date.getDay() - 1]

                return (
                  <div
                    key={day.dateStr}
                    className={`
                      p-4 border-l-4
                      ${isCurrentDay ? 'border-l-blue-500 bg-blue-50/60' : 'border-l-transparent bg-white'}
                    `}
                  >
                    {/* Day header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`
                          text-sm font-semibold
                          ${isCurrentDay ? 'text-blue-600' : 'text-slate-900'}
                        `}>
                          {dayName}
                        </div>
                        <div className={`
                          text-lg font-bold
                          ${isCurrentDay ? 'text-blue-600' : 'text-slate-900'}
                        `}>
                          {format(day.date, 'd')}
                        </div>
                        {isCurrentDay && (
                          <span className="text-xs text-blue-600 font-medium">Today</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500">
                        {format(day.date, 'MMM yyyy')}
                      </div>
                    </div>

                    {/* Events for this day */}
                    <div className="space-y-2">
                      {day.plannedRoutes.length === 0 && day.completedStores.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">No events scheduled</p>
                      ) : (
                        <>
                          {/* Planned routes */}
                          {day.plannedRoutes.map((route, idx) => (
                            <CalendarDayEvent
                              key={`planned-${route.key}-${idx}`}
                              type="planned"
                              data={route}
                              date={day.dateStr}
                              onClick={() => setSelectedEvent({ type: 'planned', data: route, date: day.dateStr })}
                            />
                          ))}

                          {/* Completed stores */}
                          {day.completedStores.map((store, idx) => (
                            <CalendarDayEvent
                              key={`completed-${store.id}-${idx}`}
                              type="completed"
                              data={store}
                              date={day.dateStr}
                              onClick={() => setSelectedEvent({ type: 'completed', data: store, date: day.dateStr })}
                            />
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Desktop month view
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 sm:p-6 md:p-7 shadow-lg">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-slate-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Calendar Overview
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">{format(currentDate, 'MMMM yyyy')}</h1>
            <p className="mt-2 text-sm text-slate-300 sm:text-base">Monthly schedule for planned visits and completed compliance activity.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-widest text-slate-300">Routes</p>
              <p className="mt-1 text-lg font-semibold text-white">{totalPlannedRoutes}</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-widest text-slate-300">Completed</p>
              <p className="mt-1 text-lg font-semibold text-white">{totalCompletedStores}</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-widest text-slate-300">Active Days</p>
              <p className="mt-1 text-lg font-semibold text-white">{activeDays}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-200 bg-slate-50/60 pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base text-slate-800 flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-600" />
              Manager Capacity
            </CardTitle>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              <Gauge className="h-3 w-3" />
              8h target/day
            </span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-3">
          {managerCapacity.length === 0 ? (
            <p className="text-sm italic text-slate-500">No route capacity data for this month.</p>
          ) : (
            managerCapacity.slice(0, 6).map((manager) => (
              <div key={manager.managerName} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-slate-800">{manager.managerName}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      manager.utilizationPct > 100
                        ? 'border border-rose-200 bg-rose-50 text-rose-700'
                        : manager.utilizationPct > 85
                        ? 'border border-amber-200 bg-amber-50 text-amber-700'
                        : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {manager.utilizationPct}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      manager.utilizationPct > 100
                        ? 'bg-rose-500'
                        : manager.utilizationPct > 85
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(manager.utilizationPct, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  {manager.storeStops} stops • {manager.estimatedHours}h across {manager.activeDays} day{manager.activeDays === 1 ? '' : 's'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {manager.overbookedDays > 0
                    ? `${manager.overbookedDays} overbooked day${manager.overbookedDays > 1 ? 's' : ''}`
                    : `Busiest day: ${manager.busiestDayHours}h`}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-200 bg-slate-50/60">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-slate-600" />
              {format(currentDate, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMonthChange('prev')}
                className="h-9 w-9 p-0 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMonthChange('next')}
                className="h-9 w-9 p-0 rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-semibold uppercase tracking-wide text-blue-700">
              <Route className="h-3 w-3" />
              Planned Route
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold uppercase tracking-wide text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              Completed Store
            </span>
          </div>
        </CardHeader>
        <CardContent className="bg-white">
          {/* Day names header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-semibold text-slate-600 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {weeks.map((week, weekIndex) =>
              week.map((day, dayIndex) => {
                const dayKey = `${weekIndex}-${dayIndex}`
                const isCurrentDay = isToday(day.date)

                return (
                  <div
                    key={dayKey}
                    className={`
                      min-h-[124px] border border-slate-200 rounded-lg p-2
                      ${!day.isCurrentMonth ? 'bg-slate-50/70 opacity-65' : 'bg-white'}
                      ${isCurrentDay ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                      flex flex-col
                      transition-colors hover:bg-slate-50/50
                    `}
                  >
                    {/* Date number */}
                    <div className={`
                      text-sm font-semibold mb-1
                      ${isCurrentDay ? 'text-blue-600' : day.isCurrentMonth ? 'text-slate-900' : 'text-slate-400'}
                    `}>
                      {format(day.date, 'd')}
                    </div>

                    {/* Events */}
                    <div className="flex-1 space-y-1 overflow-y-auto">
                      {/* Planned routes */}
                      {day.plannedRoutes.map((route, idx) => (
                        <CalendarDayEvent
                          key={`planned-${route.key}-${idx}`}
                          type="planned"
                          data={route}
                          date={day.dateStr}
                          onClick={() => setSelectedEvent({ type: 'planned', data: route, date: day.dateStr })}
                        />
                      ))}

                      {/* Completed stores */}
                      {day.completedStores.map((store, idx) => (
                        <CalendarDayEvent
                          key={`completed-${store.id}-${idx}`}
                          type="completed"
                          data={store}
                          date={day.dateStr}
                          onClick={() => setSelectedEvent({ type: 'completed', data: store, date: day.dateStr })}
                        />
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Event detail modal */}
      {selectedEvent && (
        <CalendarEventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  )
}
