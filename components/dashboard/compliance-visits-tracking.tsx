'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { updateComplianceAudit2Tracking } from '@/app/actions/stores'
import { AlertCircle } from 'lucide-react'

interface Store {
  id: string
  store_name: string
  store_code: string | null
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
  const router = useRouter()
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const daysRemaining = calculateDaysUntilEndOfYear()

  const handleManagerChange = async (storeId: string, managerId: string | null) => {
    setLoading({ ...loading, [storeId]: true })
    try {
      const store = stores.find(s => s.id === storeId)
      await updateComplianceAudit2Tracking(
        storeId,
        managerId || null,
        store?.compliance_audit_2_planned_date || null
      )
      router.refresh()
    } catch (error) {
      console.error('Error updating manager:', error)
    } finally {
      setLoading({ ...loading, [storeId]: false })
    }
  }

  const handleDateChange = async (storeId: string, date: string) => {
    setLoading({ ...loading, [storeId]: true })
    try {
      const store = stores.find(s => s.id === storeId)
      await updateComplianceAudit2Tracking(
        storeId,
        store?.compliance_audit_2_assigned_manager_user_id || null,
        date || null
      )
      router.refresh()
    } catch (error) {
      console.error('Error updating planned date:', error)
    } finally {
      setLoading({ ...loading, [storeId]: false })
    }
  }

  if (stores.length === 0) {
    return (
      <Card className="bg-amber-50 border-0">
        <CardHeader>
          <CardTitle className="text-amber-900 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Second Compliance Visits Due
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">All stores have completed their second compliance visit for this year.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-amber-50 border-0">
      <CardHeader>
        <CardTitle className="text-amber-900 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Second Compliance Visits Due ({stores.length} stores)
          <span className="text-sm font-normal text-amber-700 ml-2">
            ({daysRemaining} days until end of year)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-amber-200 bg-white overflow-hidden">
          <div className="max-h-[320px] overflow-y-auto">
            <Table>
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
                  const isStoreLoading = loading[store.id]
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
                        <Select
                          value={store.compliance_audit_2_assigned_manager_user_id || 'unassigned'}
                          onValueChange={(value) => handleManagerChange(store.id, value === 'unassigned' ? null : value)}
                          disabled={isStoreLoading}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select manager..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {profiles.map((profile) => (
                              <SelectItem key={profile.id} value={profile.id}>
                                {profile.full_name || 'Unknown'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={store.compliance_audit_2_planned_date || ''}
                          onChange={(e) => handleDateChange(store.id, e.target.value)}
                          disabled={isStoreLoading}
                          className="w-[180px]"
                          min={new Date().toISOString().split('T')[0]}
                          max={`${new Date().getFullYear()}-12-31`}
                        />
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

