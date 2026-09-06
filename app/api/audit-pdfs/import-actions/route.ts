import { NextResponse } from 'next/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requirePermission, isPermissionError } from '@/lib/permissions'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { importAuditPdfActions } from '@/lib/audit/import-pdf-actions'
export const maxDuration = 60
export async function POST(request: Request) {
  try {
    const {supabase,userId}=await requirePermission('manageAudits')
    const {storeId}=z.object({storeId:z.string().uuid()}).parse(await request.json())
    const {data:store,error}=await supabase.from('fa_stores').select('compliance_audit_2_pdf_path').eq('id',storeId).single()
    if (error || !store?.compliance_audit_2_pdf_path) return NextResponse.json({error:'No second-audit PDF is linked to this store'},{status:404})
    const path=store.compliance_audit_2_pdf_path
    const {data:file,error:downloadError}=await createAdminSupabaseClient().storage.from('fa-attachments').download(path)
    if (downloadError || !file) return NextResponse.json({error:'Unable to read the linked PDF'},{status:502})
    const result=await importAuditPdfActions({supabase,userId,storeId,auditNumber:2,filePath:path,file:new File([file],'audit-2.pdf',{type:'application/pdf'})})
    revalidatePath('/actions');revalidatePath('/audit-tracker');revalidatePath(`/stores/${storeId}`)
    return NextResponse.json(result)
  } catch(error) {
    return NextResponse.json({error:error instanceof Error?error.message:'Unable to check PDF'},{status:isPermissionError(error)?error.status:400})
  }
}
