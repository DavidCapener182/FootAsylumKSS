'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { assignInvestigator } from '@/app/actions/incidents'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface AssignInvestigatorProps {
  incidentId: string
  currentInvestigatorId: string | null
  profiles: Array<{ id: string; full_name: string | null }>
}

export function AssignInvestigator({ incidentId, currentInvestigatorId, profiles }: AssignInvestigatorProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedValue, setSelectedValue] = useState(currentInvestigatorId || '')
  const router = useRouter()

  const handleChange = async (value: string) => {
    if (value === selectedValue) return

    setIsLoading(true)
    try {
      // Pass empty string for unassigning
      const investigatorId = value === 'unassigned' ? '' : value
      await assignInvestigator(incidentId, investigatorId)
      setSelectedValue(value === 'unassigned' ? '' : value)
      router.refresh()
    } catch (error) {
      console.error('Failed to assign investigator:', error)
      alert('Failed to assign investigator. Please try again.')
      setSelectedValue(currentInvestigatorId || '')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select 
        value={selectedValue || 'unassigned'} 
        onValueChange={handleChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[200px]">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <SelectValue placeholder="Select investigator">
              {selectedValue 
                ? profiles.find(p => p.id === selectedValue)?.full_name || 'Unknown'
                : 'Unassigned'
              }
            </SelectValue>
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {profiles.map((profile) => (
            <SelectItem key={profile.id} value={profile.id}>
              {profile.full_name || profile.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

