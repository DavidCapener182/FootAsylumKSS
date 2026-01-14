'use client'

import { useState, useMemo } from 'react'
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  format, 
  isToday
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">
              {format(currentDate, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMonthChange('prev')}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMonthChange('next')}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                      min-h-[120px] border border-slate-200 rounded-lg p-2
                      ${!day.isCurrentMonth ? 'bg-slate-50 opacity-60' : 'bg-white'}
                      ${isCurrentDay ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                      flex flex-col
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
