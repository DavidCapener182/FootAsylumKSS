'use server'

import { logActivity } from '@/lib/activity-log'
import { revalidatePath } from 'next/cache'
import { FaIncidentStatus } from '@/types/db'
import { requirePermission } from '@/lib/permissions'
import { createIncidentInputSchema, type CreateIncidentInput } from '@/lib/incidents/schema'

export async function createIncident(input: CreateIncidentInput) {
  const { supabase, userId } = await requirePermission('manageIncidents')
  const parsedInput = createIncidentInputSchema.parse(input)

  const { data: refData, error: referenceError } = await supabase.rpc('fa_generate_incident_reference')
  if (referenceError || typeof refData !== 'string' || !/^INC-\d{4}-\d{6,}$/.test(refData)) {
    throw new Error(`Failed to allocate incident reference: ${referenceError?.message || 'Invalid reference returned'}`)
  }

  const { data: incident, error } = await supabase
    .from('fa_incidents')
    .insert({
      ...parsedInput,
      reference_no: refData,
      reported_by_user_id: userId,
      reported_at: new Date().toISOString(),
      status: 'open',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create incident: ${error.message}`)
  }

  revalidatePath('/incidents')
  return incident
}

export async function updateIncident(id: string, updates: Partial<CreateIncidentInput & { status?: FaIncidentStatus; assigned_investigator_user_id?: string | null; target_close_date?: string | null; closure_summary?: string | null }>) {
  const { supabase } = await requirePermission('manageIncidents')

  // Get current incident for activity log
  const { data: currentIncident } = await supabase
    .from('fa_incidents')
    .select('*')
    .eq('id', id)
    .single()

  if (!currentIncident) {
    throw new Error('Incident not found')
  }

  // If closing the incident, move it to closed_incidents table
  if (updates.status === 'closed' && currentIncident.status !== 'closed') {
    const closedAt = new Date().toISOString()
    
    // Check if incident already exists in closed_incidents (shouldn't happen, but safety check)
    const { data: existingClosed } = await supabase
      .from('fa_closed_incidents')
      .select('id')
      .eq('id', id)
      .single()

    if (!existingClosed) {
      // Copy incident to closed_incidents table
      const { error: insertError } = await supabase
        .from('fa_closed_incidents')
        .insert({
          id: currentIncident.id,
          reference_no: currentIncident.reference_no,
          store_id: currentIncident.store_id,
          reported_by_user_id: currentIncident.reported_by_user_id,
          incident_category: currentIncident.incident_category,
          severity: currentIncident.severity,
          summary: currentIncident.summary,
          description: currentIncident.description,
          occurred_at: currentIncident.occurred_at,
          reported_at: currentIncident.reported_at,
          persons_involved: currentIncident.persons_involved,
          injury_details: currentIncident.injury_details,
          witnesses: currentIncident.witnesses,
          riddor_reportable: currentIncident.riddor_reportable,
          status: 'closed' as FaIncidentStatus,
          assigned_investigator_user_id: currentIncident.assigned_investigator_user_id,
          target_close_date: currentIncident.target_close_date,
          closed_at: closedAt,
          closure_summary: updates.closure_summary || currentIncident.closure_summary,
          created_at: currentIncident.created_at,
          updated_at: closedAt,
        })

      if (insertError) {
        throw new Error(`Failed to move incident to closed: ${insertError.message}`)
      }
    }

    // Delete from open incidents table (this will cascade delete related actions, investigations, etc.)
    const { error: deleteError } = await supabase
      .from('fa_incidents')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw new Error(`Failed to delete incident: ${deleteError.message}`)
    }

    // Log activity (skip if no authenticated user, as per our updated trigger)
    try {
      await logActivity('incident', id, 'CLOSED', {
        old: currentIncident,
        new: { ...currentIncident, status: 'closed', closed_at: closedAt },
      })
    } catch (logError) {
      // Log error but don't fail the close operation
      console.error('Failed to log activity for incident closure:', logError)
    }

    revalidatePath('/incidents')
    return { ...currentIncident, status: 'closed' as FaIncidentStatus, closed_at: closedAt }
  }

  // Regular update for non-closing status changes
  const updateData: Record<string, unknown> = { ...updates }
  
  const { data: incident, error } = await supabase
    .from('fa_incidents')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update incident: ${error.message}`)
  }

  revalidatePath('/incidents')
  revalidatePath(`/incidents/${id}`)
  return incident
}

export async function assignInvestigator(incidentId: string, investigatorId: string) {
  const { supabase } = await requirePermission('manageIncidents')

  // Handle unassigning (empty string or 'unassigned')
  const updateData: any = {
    assigned_investigator_user_id: investigatorId === 'unassigned' || !investigatorId ? null : investigatorId,
  }

  // Only update status if we're assigning (not unassigning)
  if (investigatorId && investigatorId !== 'unassigned') {
    const { data: currentIncident } = await supabase
      .from('fa_incidents')
      .select('status')
      .eq('id', incidentId)
      .single()

    // Only change to under_investigation if currently open
    if (currentIncident?.status === 'open') {
      updateData.status = 'under_investigation'
    }
  }

  const { data: incident, error } = await supabase
    .from('fa_incidents')
    .update(updateData)
    .eq('id', incidentId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to assign investigator: ${error.message}`)
  }

  await logActivity(
    'incident',
    incidentId,
    investigatorId === 'unassigned' || !investigatorId
      ? 'INVESTIGATOR_UNASSIGNED'
      : 'INVESTIGATOR_ASSIGNED',
    {
    action: investigatorId === 'unassigned' || !investigatorId ? 'Investigator unassigned' : 'Investigator assigned',
    investigator_id: updateData.assigned_investigator_user_id,
    }
  )

  revalidatePath('/incidents')
  revalidatePath(`/incidents/${incidentId}`)
  return incident
}

export async function deleteIncident(id: string) {
  const { supabase } = await requirePermission('manageIncidents')

  // Check if incident is in closed_incidents table first
  const { data: closedIncident, error: closedError } = await supabase
    .from('fa_closed_incidents')
    .select('reference_no')
    .eq('id', id)
    .maybeSingle()

  let currentIncident: any = null
  let tableName = 'fa_incidents'

  // If found in closed_incidents, use that table
  if (closedIncident) {
    currentIncident = closedIncident
    tableName = 'fa_closed_incidents'
  } else {
    // If not in closed_incidents, check open incidents
    const { data: openIncident, error: openError } = await supabase
      .from('fa_incidents')
      .select('reference_no')
      .eq('id', id)
      .maybeSingle()
    
    if (openIncident) {
      currentIncident = openIncident
      tableName = 'fa_incidents'
    }
  }

  if (!currentIncident) {
    throw new Error('Incident not found')
  }

  // Delete from the appropriate table
  const { error: deleteError } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id)

  if (deleteError) {
    throw new Error(`Failed to delete incident: ${deleteError.message}`)
  }

  // Active incidents are captured by the database DELETE trigger. The legacy
  // archive does not have that trigger, so retain one trusted semantic event.
  if (tableName === 'fa_closed_incidents') {
    await logActivity('incident', id, 'DELETED', {
      old: currentIncident,
      message: `Archived incident ${currentIncident.reference_no || id} deleted.`,
    })
  }

  revalidatePath('/incidents')
  revalidatePath('/dashboard')
  return { success: true }
}
