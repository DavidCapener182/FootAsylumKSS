'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle } from 'lucide-react'

interface Store {
  id: string
  store_name: string
  store_code: string | null
  compliance_audit_1_date: string | null
  compliance_audit_2_date: string | null
  compliance_audit_2_assigned_manager_user_id: string | null
  compliance_audit_2_planned_date: string | null
  assigned_manager?: {
    id: string
    full_name: string | null
  } | null
}

interface Profile {
  id: string
  full_name: string | null
}

interface ComplianceVisitsTrackingProps {
  stores: Store[]
  profiles: Profile[]
}

function calculateDaysUntilEndOfYear(): number {
  const now = new Date()
  const endOfYear = new Date(now.getFullYear(), 11, 31) // December 31
  const diffTime = endOfYear.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export function ComplianceVisitsTracking({ stores, profiles }: ComplianceVisitsTrackingProps) {
  const daysRemaining = calculateDaysUntilEndOfYear()

  if (stores.length === 0) {
    return (
      <Card className="bg-amber-50 border-0">
        <CardHeader>
          <CardTitle className="text-amber-900 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Compliance Visits Due
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">All stores have completed their compliance visits for this year.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-amber-50 border-0 h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-amber-900 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Compliance Visits Due ({stores.length} stores)
          <span className="text-sm font-normal text-amber-700 ml-2">
            ({daysRemaining} days until end of year)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        <div className="rounded-md border border-amber-200 bg-white max-w-full">
          <div className="max-h-[320px] overflow-auto overscroll-x-contain touch-pan-x touch-pan-y">
            <Table className="min-w-[640px]">
              <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                <TableRow>
                  <TableHead>Store Name</TableHead>
                  <TableHead>Days Remaining</TableHead>
                  <TableHead>Assigned Manager</TableHead>
                  <TableHead>Planned Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.map((store) => {
                  return (
                    <TableRow key={store.id}>
                      <TableCell className="font-medium">
                        {store.store_name}
                        {store.store_code && (
                          <span className="text-gray-500 text-xs ml-2">({store.store_code})</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={daysRemaining < 30 ? 'text-red-600 font-semibold' : ''}>
                          {daysRemaining}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-700">
                          {store.assigned_manager?.full_name || 'Unassigned'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-700">
                          {store.compliance_audit_2_planned_date
                            ? new Date(store.compliance_audit_2_planned_date).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })
                            : 'Not planned'}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

