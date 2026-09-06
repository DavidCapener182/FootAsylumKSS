import type { SupabaseClient } from '@supabase/supabase-js'
import { PDFParse } from 'pdf-parse'
import { auditDateFromCover, coverMatchesStore, parsePdfFlaggedItems, sixMonthsAfter, pdfFindingActionRow } from './pdf-flagged-items'

export async function importAuditPdfActions({supabase, userId, storeId, auditNumber, filePath, file}: {
  supabase: SupabaseClient; userId: string; storeId: string; auditNumber: 1 | 2; filePath: string; file: File
}) {
  if (auditNumber !== 2) return {status:'skipped' as const,count:0,total:0,activeUntil:null,warning:null}
  let auditDate: string | null = null
  try {
    const {data: store, error: storeError} = await supabase.from('fa_stores')
      .select('store_name,store_code,postcode,compliance_audit_1_pdf_path,compliance_audit_2_pdf_path,compliance_audit_1_date,compliance_audit_2_date').eq('id',storeId).single()
    if (storeError || !store) throw new Error('Store could not be verified')
    if (store[`compliance_audit_${auditNumber}_pdf_path`] !== filePath) throw new Error('The linked PDF changed; import needs review')
    if (file.size > 50 * 1024 * 1024) throw new Error('PDF saved; files over 50 MB require a separate action import')
    const parser = new PDFParse({data:Buffer.from(await file.arrayBuffer())})
    let parsed
    try { parsed = parsePdfFlaggedItems((await parser.getText()).pages) } finally { await parser.destroy() }
    auditDate = auditDateFromCover(parsed.cover)
    if (!coverMatchesStore(parsed.cover,store.store_name,store.store_code,store.postcode)) throw new Error('PDF store identity needs review before actions can be imported')
    const otherNumber = 1
    if (store[`compliance_audit_${otherNumber}_date`] === auditDate && store[`compliance_audit_${auditNumber}_date`] !== auditDate) throw new Error('PDF date matches the other audit slot; review required')
    const activeUntil = sixMonthsAfter(auditDate)
    const rows = parsed.findings.map(finding => pdfFindingActionRow(finding,{storeId,auditNumber,auditDate: auditDate!,filePath,userId,activeUntil}))
    const count = await insertPdfFindingRows(supabase, rows)
    const {error} = await supabase.from('fa_audit_pdf_imports').upsert({store_id:storeId,audit_number:auditNumber,pdf_path:filePath,audit_date:auditDate,status:'imported',finding_count:parsed.findings.length,error:null,created_by_user_id:userId},{onConflict:'store_id,pdf_path'})
    if (error) throw new Error(`Actions imported, but the import receipt could not be saved: ${error.message}`)
    return {status:'imported' as const,count,total:parsed.findings.length,activeUntil,warning:null}
  } catch (error) {
    const warning = error instanceof Error ? error.message : 'Action extraction needs review'
    const {error: receiptError} = await supabase.from('fa_audit_pdf_imports').upsert({store_id:storeId,audit_number:auditNumber,pdf_path:filePath,audit_date:auditDate,status:'needs_review',error:warning,created_by_user_id:userId},{onConflict:'store_id,pdf_path'})
    if (receiptError) console.error('Unable to save PDF import review receipt',receiptError.message)
    return {status:'needs_review' as const,count:0,total:0,activeUntil:null,warning}
  }
}

export async function insertPdfFindingRows(supabase: SupabaseClient, rows: ReturnType<typeof pdfFindingActionRow>[]) {
  let count=0
  for (const row of rows) {
    const {data:existing,error:lookupError}=await supabase.from('fa_store_actions').select('id').eq('store_id',row.store_id).eq('source_audit_date',row.source_audit_date).eq('source_finding_key',row.source_finding_key).maybeSingle()
    if (lookupError) throw new Error(lookupError.message)
    if (existing) continue
    const {error}=await supabase.from('fa_store_actions').insert(row)
    if (error && error.code !== '23505') throw new Error(error.message)
    if (!error) count++
  }
  return count
}
