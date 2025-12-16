'use server'

import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { revalidatePath } from 'next/cache'
import { FaIncidentCategory, FaSeverity, FaIncidentStatus } from '@/types/db'

export interface CreateIncidentInput {
  store_id: string
  incident_category: FaIncidentCategory
  severity: FaSeverity
  summary: string
  description?: string
  occurred_at: string
  persons_involved?: unknown
  injury_details?: unknown
  witnesses?: unknown
  riddor_reportable?: boolean
}

export async function createIncident(input: CreateIncidentInput) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Generate reference number
  const { data: refData } = await supabase.rpc('fa_generate_incident_reference')
  const reference_no = refData || `INC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`

  const { data: incident, error } = await supabase
    .from('fa_incidents')
    .insert({
      ...input,
      reference_no,
      reported_by_user_id: user.id,
      reported_at: new Date().toISOString(),
      status: 'open',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create incident: ${error.message}`)
  }

  // Log activity (trigger will also log, but explicit log for clarity)
  await logActivity('incident', incident.id, 'CREATED', {
    new: incident,
  })

  revalidatePath('/incidents')
  return incident
}

export async function updateIncident(id: string, updates: Partial<CreateIncidentInput & { status?: FaIncidentStatus; assigned_investigator_user_id?: string | null; target_close_date?: string | null; closure_summary?: string | null }>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Get current incident for activity log
  const { data: currentIncident } = await supabase
    .from('fa_incidents')
    .select('*')
    .eq('id', id)
    .single()

  const updateData: Record<string, unknown> = { ...updates }
  if (updates.status === 'closed' && !updateData.closed_at) {
    updateData.closed_at = new Date().toISOString()
  }

  const { data: incident, error } = await supabase
    .from('fa_incidents')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update incident: ${error.message}`)
  }

  // Log activity
  await logActivity('incident', id, 'UPDATED', {
    old: currentIncident,
    new: incident,
  })

  revalidatePath('/incidents')
  revalidatePath(`/incidents/${id}`)
  return incident
}

export async function assignInvestigator(incidentId: string, investigatorId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data: incident, error } = await supabase
    .from('fa_incidents')
    .update({
      assigned_investigator_user_id: investigatorId,
      status: 'under_investigation',
    })
    .eq('id', incidentId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to assign investigator: ${error.message}`)
  }

  await logActivity('incident', incidentId, 'STATUS_CHANGED', {
    action: 'Investigator assigned',
    investigator_id: investigatorId,
  })

  revalidatePath('/incidents')
  revalidatePath(`/incidents/${incidentId}`)
  return incident
}

