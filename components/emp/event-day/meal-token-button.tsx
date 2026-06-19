'use client'

import { Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { EmpEventDayMealToken } from '@/lib/emp/event-day-data'

export function MealTokenButton({
  shiftId,
  tokenDate,
  mealTokens,
  onIssue,
  disabled,
}: {
  shiftId: string
  tokenDate: string
  mealTokens: EmpEventDayMealToken[]
  onIssue: (shiftId: string) => void
  disabled?: boolean
}) {
  const issued = mealTokens.some((token) => token.staffShiftId === shiftId && token.tokenDate === tokenDate)

  return (
    <Button
      type="button"
      size="sm"
      variant={issued ? 'outline' : 'default'}
      disabled={issued || disabled}
      onClick={() => onIssue(shiftId)}
      className={issued ? 'border-emerald-200 text-emerald-700' : 'bg-emerald-700 hover:bg-emerald-800'}
    >
      <Utensils className="mr-2 h-4 w-4" />
      {issued ? 'Meal issued' : 'Issue meal'}
    </Button>
  )
}
