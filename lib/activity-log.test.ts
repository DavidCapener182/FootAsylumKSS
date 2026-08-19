import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequirePermission = vi.fn()
const mockInsert = vi.fn()
const mockAdminFrom = vi.fn(() => ({ insert: mockInsert }))

const mockAdminClient = {
  from: mockAdminFrom,
}

vi.mock('@/lib/permissions', () => ({
  requirePermission: mockRequirePermission,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: vi.fn(() => mockAdminClient),
}))

describe('trusted semantic activity logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequirePermission.mockResolvedValue({
      userId: '86c9f6bd-8712-4ead-a890-794c5ab6db81',
    })
    mockInsert.mockResolvedValue({ error: null })
  })

  it('authorizes the entity operation before appending via the service-role client', async () => {
    const { logActivity } = await import('./activity-log')

    await logActivity(
      'incident',
      '0f2cb4b7-d2f2-47ac-91f5-7003bdd8b0e4',
      '  CLOSED  ',
      { reason: 'Investigation complete' }
    )

    expect(mockRequirePermission).toHaveBeenCalledWith('manageIncidents')
    expect(mockAdminFrom).toHaveBeenCalledWith('fa_activity_log')
    expect(mockInsert).toHaveBeenCalledTimes(1)

    const payload = mockInsert.mock.calls[0][0]
    expect(payload).toMatchObject({
      entity_type: 'incident',
      entity_id: '0f2cb4b7-d2f2-47ac-91f5-7003bdd8b0e4',
      action: 'CLOSED',
      performed_by_user_id: '86c9f6bd-8712-4ead-a890-794c5ab6db81',
      details: { reason: 'Investigation complete' },
      source: 'server_action',
    })
    expect(payload.correlation_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  })

  it('maps every supported entity type to its controlling permission', async () => {
    const { logActivity } = await import('./activity-log')
    const entityId = '0f2cb4b7-d2f2-47ac-91f5-7003bdd8b0e4'

    await logActivity('incident', entityId, 'UPDATED')
    await logActivity('investigation', entityId, 'UPDATED')
    await logActivity('action', entityId, 'UPDATED')
    await logActivity('store', entityId, 'UPDATED')
    await logActivity('user', entityId, 'UPDATED')

    expect(mockRequirePermission.mock.calls.map(([permission]) => permission)).toEqual([
      'manageIncidents',
      'manageIncidents',
      'manageActions',
      'manageStoreCRM',
      'adminUsers',
    ])
  })

  it('never creates a privileged client when permission is denied', async () => {
    mockRequirePermission.mockRejectedValueOnce(new Error('Unauthorized'))
    const { logActivity } = await import('./activity-log')

    await expect(
      logActivity('store', '0f2cb4b7-d2f2-47ac-91f5-7003bdd8b0e4', 'CRM_NOTE_CREATED')
    ).rejects.toThrow('Unauthorized')

    expect(mockAdminFrom).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('rejects malformed entity IDs before the privileged insert', async () => {
    const { logActivity } = await import('./activity-log')

    await expect(logActivity('store', 'not-a-uuid', 'CRM_NOTE_CREATED')).rejects.toThrow(
      'valid UUID'
    )

    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockAdminFrom).not.toHaveBeenCalled()
  })

  it('rejects unsupported runtime entity values before authorization', async () => {
    const { logActivity } = await import('./activity-log')

    await expect(
      logActivity(
        'unsupported' as never,
        '0f2cb4b7-d2f2-47ac-91f5-7003bdd8b0e4',
        'UPDATED'
      )
    ).rejects.toThrow('not supported')

    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockAdminFrom).not.toHaveBeenCalled()
  })
})
