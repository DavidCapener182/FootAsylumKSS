import { describe, expect, it, vi } from 'vitest'
import { saveLatestAuditPdf } from './save-latest-pdf'

function setup(old1: string | null = 'store/s/audit-1-old.pdf', old2: string | null = 'store/s/audit-2-old.pdf') {
  const previous = { compliance_audit_1_pdf_path: old1, compliance_audit_2_pdf_path: old2 }
  const events: string[] = []
  const single = vi.fn(async () => { events.push('link'); return { data: { id: 's' }, error: null } as any })
  const query: any = { eq: vi.fn(() => query), is: vi.fn(() => query), select: () => ({ single }) }
  const read = vi.fn(async () => ({ data: previous, error: null } as any))
  const update = vi.fn(() => query)
  const supabase: any = { from: vi.fn(() => ({ select: () => ({ eq: () => ({ single: read }) }), update })) }
  const upload = vi.fn(async (_path: string, _file: File, _options: unknown) => { events.push('upload'); return { error: null } as any })
  const remove = vi.fn(async () => { events.push('remove'); return { error: null } as any })
  const storageClient: any = { storage: { from: () => ({ upload, remove }) } }
  const input = { supabase, storageClient, storeId: 's', auditNumber: 2 as 1 | 2, file: new File(['%PDF-1.4'], 'audit.pdf', { type: 'application/pdf' }) }
  return { input, previous, events, single, query, read, update, upload, remove }
}

describe('latest audit PDF retention', () => {
  it('links Audit 2 before deleting both prior PDFs and preserves scores and dates', async () => {
    const x = setup()
    const result = await saveLatestAuditPdf(x.input)
    expect(x.events).toEqual(['upload', 'link', 'remove'])
    expect(x.update).toHaveBeenCalledWith({ compliance_audit_1_pdf_path: null, compliance_audit_2_pdf_path: result.filePath })
    expect(x.query.eq).toHaveBeenCalledWith('compliance_audit_1_pdf_path', x.previous.compliance_audit_1_pdf_path)
    expect(x.query.eq).toHaveBeenCalledWith('compliance_audit_2_pdf_path', x.previous.compliance_audit_2_pdf_path)
    expect(x.remove).toHaveBeenCalledWith([x.previous.compliance_audit_1_pdf_path, x.previous.compliance_audit_2_pdf_path])
  })
  it('replaces Audit 1 when there is no Audit 2', async () => {
    const x = setup('store/s/audit-1-old.pdf', null)
    const result = await saveLatestAuditPdf({ ...x.input, auditNumber: 1 })
    expect(result.paths.compliance_audit_1_pdf_path).toEqual(result.filePath)
    expect(x.query.is).toHaveBeenCalledWith('compliance_audit_2_pdf_path', null)
    expect(x.remove).toHaveBeenCalledWith(['store/s/audit-1-old.pdf'])
  })
  it('prevents an Audit 1 upload from replacing an existing Audit 2', async () => {
    const x = setup()
    await expect(saveLatestAuditPdf({ ...x.input, auditNumber: 1 })).rejects.toThrow('already has an Audit 2')
    expect(x.upload).not.toHaveBeenCalled()
    expect(x.remove).not.toHaveBeenCalled()
  })
  it('keeps existing files if upload fails', async () => {
    const x = setup(); x.upload.mockResolvedValueOnce({ error: { message: 'quota' } })
    await expect(saveLatestAuditPdf(x.input)).rejects.toThrow('quota')
    expect(x.update).not.toHaveBeenCalled(); expect(x.remove).not.toHaveBeenCalled()
  })
  it.each([{ data: null, error: { message: 'concurrent change' } }, { data: null, error: null }])('rolls back only the new upload if linking fails: %j', async failure => {
    const x = setup(); x.single.mockResolvedValueOnce(failure)
    await expect(saveLatestAuditPdf(x.input)).rejects.toThrow('Failed to update store record')
    expect(x.remove).toHaveBeenCalledTimes(1)
    expect(x.remove).toHaveBeenCalledWith([x.upload.mock.calls[0][0]])
  })
  it('reports a storage cleanup failure without losing the saved replacement', async () => {
    const x = setup(); x.remove.mockResolvedValueOnce({ error: { message: 'unavailable' } })
    const result = await saveLatestAuditPdf(x.input)
    expect(result.cleanupWarning).toContain('previous PDF could not be removed')
    expect(result.filePath).toEqual(x.upload.mock.calls[0][0])
  })
  it('does not delete legacy report-builder sources or another store file', async () => {
    const x = setup('fra/report/hs-audit.pdf', 'store/other/audit-2.pdf')
    const result = await saveLatestAuditPdf(x.input)
    expect(x.remove).not.toHaveBeenCalled()
    expect(result.cleanupWarning).toContain('reference check')
  })
  it('rejects inaccessible stores and disguised non-PDF files before upload', async () => {
    const x = setup(); x.read.mockResolvedValueOnce({ data: null, error: null })
    await expect(saveLatestAuditPdf(x.input)).rejects.toThrow('access denied')
    await expect(saveLatestAuditPdf({ ...x.input, file: new File(['bad'], 'bad.pdf') })).rejects.toThrow('not a valid PDF')
    expect(x.upload).not.toHaveBeenCalled()
  })
})
