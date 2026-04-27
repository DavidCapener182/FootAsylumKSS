'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/permissions'

export type AuditNumber = 1 | 2

type SaveComplianceAuditInput = {
  storeId: string
  auditNumber: AuditNumber
  date: string
  percentage: number
  pdfPath?: string | null
  currentAudit1Complete?: boolean
  currentAudit2Complete?: boolean
}

export async function saveComplianceAudit(input: SaveComplianceAuditInput) {
  const { supabase } = await requirePermission('manageAudits')
  const pctNum = Number(input.percentage)

  if (!input.storeId) {
    throw new Error('Store is required')
  }
  if (input.auditNumber !== 1 && input.auditNumber !== 2) {
    throw new Error('Invalid audit number')
  }
  if (!input.date) {
    throw new Error('Audit date is required')
  }
  if (!Number.isFinite(pctNum) || pctNum < 0 || pctNum > 100) {
    throw new Error('Percentage must be between 0 and 100')
  }

  const autoActionPlanSent = pctNum < 80
  const updateData: Record<string, string | number | boolean | null> = {}

  if (input.auditNumber === 1) {
    updateData.compliance_audit_1_date = input.date
    updateData.compliance_audit_1_overall_pct = pctNum
    updateData.action_plan_1_sent = autoActionPlanSent
    if (input.pdfPath) updateData.compliance_audit_1_pdf_path = input.pdfPath
  } else {
    updateData.compliance_audit_2_date = input.date
    updateData.compliance_audit_2_overall_pct = pctNum
    updateData.action_plan_2_sent = autoActionPlanSent
    if (input.pdfPath) updateData.compliance_audit_2_pdf_path = input.pdfPath
  }

  let totalAudits = 0
  if (input.auditNumber === 1 || input.currentAudit1Complete) totalAudits += 1
  if (input.auditNumber === 2 || input.currentAudit2Complete) totalAudits += 1
  updateData.total_audits_to_date = totalAudits

  const { data, error } = await supabase
    .from('fa_stores')
    .update(updateData)
    .eq('id', input.storeId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save audit data: ${error.message}`)
  }

  revalidatePath('/audit-tracker')
  revalidatePath('/dashboard')
  revalidatePath(`/stores/${input.storeId}`)

  return data
}

export async function updateComplianceAuditScore(
  storeId: string,
  auditNumber: AuditNumber,
  percentage: number
) {
  const { supabase } = await requirePermission('manageAudits')
  const pctNum = Number(percentage)

  if (!storeId) {
    throw new Error('Store is required')
  }
  if (auditNumber !== 1 && auditNumber !== 2) {
    throw new Error('Invalid audit number')
  }
  if (!Number.isFinite(pctNum) || pctNum < 0 || pctNum > 100) {
    throw new Error('Percentage must be between 0 and 100')
  }

  const autoActionPlanSent = pctNum < 80
  const updateData: Record<string, number | boolean> = auditNumber === 1
    ? {
        compliance_audit_1_overall_pct: pctNum,
        action_plan_1_sent: autoActionPlanSent,
      }
    : {
        compliance_audit_2_overall_pct: pctNum,
        action_plan_2_sent: autoActionPlanSent,
      }

  const { data, error } = await supabase
    .from('fa_stores')
    .update(updateData)
    .eq('id', storeId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update audit score: ${error.message}`)
  }

  revalidatePath('/audit-tracker')
  revalidatePath('/dashboard')
  revalidatePath(`/stores/${storeId}`)

  return data
}

export async function updateComplianceAudit2Tracking(
  storeId: string,
  assignedManagerUserId: string | null,
  plannedDate: string | null
) {
  const { supabase } = await requirePermission('manageAudits')

  const { error } = await supabase
    .from('fa_stores')
    .update({
      compliance_audit_2_assigned_manager_user_id: assignedManagerUserId || null,
      compliance_audit_2_planned_date: plannedDate || null,
    })
    .eq('id', storeId)

  if (error) {
    console.error('Error updating compliance audit tracking:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateFRA(
  storeId: string,
  date: string,
  notes: string | null,
  percentage: number | null,
  pdfPath?: string | null
) {
  const { supabase } = await requirePermission('manageFRA')

  const updateData: any = {
    fire_risk_assessment_date: date,
    fire_risk_assessment_notes: notes || null,
    fire_risk_assessment_pct: percentage !== null && percentage !== undefined ? percentage : null,
  }

  if (pdfPath !== undefined) {
    updateData.fire_risk_assessment_pdf_path = pdfPath
  }

  const { error } = await supabase
    .from('fa_stores')
    .update(updateData)
    .eq('id', storeId)

  if (error) {
    throw new Error(`Failed to update FRA: ${error.message}`)
  }

  revalidatePath('/fire-risk-assessment')
  return { success: true }
}
