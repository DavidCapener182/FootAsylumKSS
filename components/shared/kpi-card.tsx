import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { cn, formatPercent } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: 'purple' | 'orange' | 'emerald' | 'blue'
}

const variantStyles = {
  purple: 'bg-purple-50',
  orange: 'bg-orange-50',
  emerald: 'bg-emerald-50',
  blue: 'bg-blue-50',
}

const variantIconColors = {
  purple: 'text-purple-600',
  orange: 'text-orange-600',
  emerald: 'text-emerald-600',
  blue: 'text-blue-600',
}

export function KPICard({ title, value, description, icon: Icon, trend, variant = 'blue' }: KPICardProps) {
  return (
    <Card className={cn(variantStyles[variant], 'border-0')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
        <CardTitle className="text-xs font-medium text-gray-700">{title}</CardTitle>
        {Icon && (
          <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
            <Icon className={cn('h-4 w-4', variantIconColors[variant])} />
          </div>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className={cn('text-2xl font-bold', variantIconColors[variant])}>{value}</div>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
        {trend && (
          <p className={cn('text-xs mt-1 font-medium', trend.isPositive ? 'text-emerald-600' : 'text-red-600')}>
            {trend.isPositive ? '+' : ''}{formatPercent(trend.value)} from last period
          </p>
        )}
      </CardContent>
    </Card>
  )
}

