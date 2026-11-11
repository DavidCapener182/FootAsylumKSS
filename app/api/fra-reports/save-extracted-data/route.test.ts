import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
const { supabase } = vi.hoisted(() => ({ supabase: { from: vi.fn() } }))
vi.mock('@/lib/permissions', () => ({ requirePermission: vi.fn().mockResolvedValue({ supabase }) }))
import { POST } from './route'
describe('pre-opening assessor override validation', () => {
  it('rejects incomplete judgement before any record write', async () => {
    const request = new NextRequest('http://localhost/api/fra-reports/save-extracted-data', { method: 'POST', body: JSON.stringify({ instanceId: 'test', extractedData: { assessmentContext: 'pre_opening', manualRiskRatingOverride: { likelihood: 'Low', consequence: 'Extreme Harm', reason: '' } } }) })
    expect((await POST(request)).status).toBe(400)
    expect(supabase.from).not.toHaveBeenCalled()
  })
})
