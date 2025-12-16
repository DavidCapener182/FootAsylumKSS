'use server'

import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { revalidatePath } from 'next/cache'
import { FaActionPriority, FaActionStatus } from '@/types/db'

export interface CreateActionInput {
  title: string
  description?: string
  priority: FaActionPriority
  assigned_to_user_id: string
  due_date: string
  status?: FaActionStatus
  evidence_required?: boolean
  investigation_id?: string | null
}

export async function createAction(incidentId: string, input: CreateActionInput) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data: action, error } = await supabase
    .from('fa_actions')
    .insert({
      ...input,
      incident_id: incidentId,
      status: input.status || 'open',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create action: ${error.message}`)
  }

  await logActivity('action', action.id, 'CREATED', {
    new: action,
  })

  revalidatePath(`/incidents/${incidentId}`)
  revalidatePath('/actions')
  return action
}

export async function updateAction(id: string, updates: Partial<CreateActionInput & { status?: FaActionStatus; completion_notes?: string }>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data: currentAction } = await supabase
    .from('fa_actions')
    .select('*')
    .eq('id', id)
    .single()

  const updateData: Record<string, unknown> = { ...updates }
  
  // Set completed_at if status changes to complete
  if (updates.status === 'complete' && currentAction?.status !== 'complete') {
    updateData.completed_at = new Date().toISOString()
  }

  const { data: action, error } = await supabase
    .from('fa_actions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update action: ${error.message}`)
  }

  await logActivity('action', id, 'UPDATED', {
    old: currentAction,
    new: action,
  })

  revalidatePath(`/incidents/${action.incident_id}`)
  revalidatePath('/actions')
  return action
}

