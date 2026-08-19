import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequirePermission = vi.fn()
const mockRpc = vi.fn()
const mockListUsers = vi.fn()
const mockInviteUserByEmail = vi.fn()
const mockUpdateUserById = vi.fn()
const mockProfileInsert = vi.fn()
const mockLogActivity = vi.fn()
const mockAdminFrom = vi.fn(() => ({ insert: mockProfileInsert }))

const mockAuthenticatedSupabase = { rpc: mockRpc }
const mockAdminClient = {
  auth: {
    admin: {
      listUsers: mockListUsers,
      inviteUserByEmail: mockInviteUserByEmail,
      updateUserById: mockUpdateUserById,
    },
  },
  from: mockAdminFrom,
}

vi.mock('@/lib/permissions', () => ({
  requirePermission: mockRequirePermission,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: vi.fn(() => mockAdminClient),
}))

vi.mock('@/lib/activity-log', () => ({
  logActivity: mockLogActivity,
}))

describe('administrator account lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequirePermission.mockResolvedValue({
      supabase: mockAuthenticatedSupabase,
      userId: 'admin-1',
      role: 'admin',
      accountStatus: 'active',
    })
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: null })
    mockInviteUserByEmail.mockResolvedValue({
      data: { user: { id: 'invited-user-1' } },
      error: null,
    })
    mockProfileInsert.mockResolvedValue({ error: null })
    mockLogActivity.mockResolvedValue(undefined)
    mockRpc.mockResolvedValue({
      data: [{
        account_status: 'deactivated',
        previous_account_status: 'active',
      }],
      error: null,
    })
    mockUpdateUserById.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  })

  it('provisions invitations as non-active from trusted administrator input', async () => {
    const { inviteUserByEmail } = await import('./users')

    const result = await inviteUserByEmail('new.user@example.com', 'ops')

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith('adminUsers')
    const inviteOptions = mockInviteUserByEmail.mock.calls[0][1]
    expect(inviteOptions.data).toEqual({ full_name: 'new.user' })
    expect(inviteOptions.data).not.toHaveProperty('intended_role')
    expect(mockProfileInsert).toHaveBeenCalledWith(expect.objectContaining({
      id: 'invited-user-1',
      role: 'ops',
      account_status: 'invited',
      status_changed_by_user_id: 'admin-1',
      status_change_reason: 'Account invited by administrator',
    }))
    expect(mockLogActivity).toHaveBeenCalledWith(
      'user',
      'invited-user-1',
      'Invited user account',
      { new: { role: 'ops', account_status: 'invited' } }
    )
  })

  it('reports invitation setup failure when trusted profile provisioning fails', async () => {
    mockProfileInsert.mockResolvedValueOnce({ error: { message: 'profile insert blocked' } })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { inviteUserByEmail } = await import('./users')

    const result = await inviteUserByEmail('new.user@example.com', 'readonly')

    expect(result.success).toBe(false)
    expect(result.message).toContain('profile could not be provisioned')
    consoleError.mockRestore()
  })

  it('requires a reason and delegates role/final-admin enforcement to the atomic RPC', async () => {
    const { updateUserRole } = await import('./users')

    await updateUserRole('admin-1', 'ops', 'Responsibilities transferred to another admin')

    expect(mockRpc).toHaveBeenCalledWith('fa_admin_change_user_access', {
      p_target_user_id: 'admin-1',
      p_new_role: 'ops',
      p_new_account_status: null,
      p_reason: 'Responsibilities transferred to another admin',
    })

    await expect(updateUserRole('admin-1', 'ops', ' ')).rejects.toThrow(/reason between 3 and 500/i)
  })

  it('surfaces the database final-admin safeguard for self-demotion', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'The final active administrator cannot be demoted, suspended, or deactivated' },
    })
    const { updateUserRole } = await import('./users')

    await expect(
      updateUserRole('admin-1', 'readonly', 'Removing administrative responsibilities')
    ).rejects.toThrow(/final active administrator/i)
  })

  it('deactivates without deleting history and applies the long Auth ban', async () => {
    const { deactivateAccount } = await import('./users')

    const result = await deactivateAccount('user-1', 'Employment ended on 19 August')

    expect(result.success).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('fa_admin_change_user_access', {
      p_target_user_id: 'user-1',
      p_new_role: null,
      p_new_account_status: 'deactivated',
      p_reason: 'Employment ended on 19 August',
    })
    expect(mockUpdateUserById).toHaveBeenCalledWith('user-1', {
      ban_duration: '876000h',
    })
  })

  it('fails before mutation when deactivation has no reason', async () => {
    const { deactivateAccount } = await import('./users')

    await expect(deactivateAccount('user-1', '')).rejects.toThrow(/reason between 3 and 500/i)
    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockUpdateUserById).not.toHaveBeenCalled()
  })

  it('contains no hard-delete action or administrator UI', () => {
    const source = readFileSync(join(process.cwd(), 'app/actions/users.ts'), 'utf8')
    const adminSource = readFileSync(
      join(process.cwd(), 'components/admin/admin-client.tsx'),
      'utf8'
    )

    expect(source).not.toMatch(/\.from\(['"]fa_profiles['"]\)[\s\S]{0,120}\.delete\s*\(/)
    expect(source).not.toContain('.auth.admin.deleteUser(')
    expect(source).not.toMatch(/export async function deleteUser/)
    expect(adminSource).not.toMatch(/\bdeleteUser\b/)
    expect(adminSource).not.toMatch(/permanently delete/i)
    expect(adminSource).not.toMatch(/delete user/i)
    expect(adminSource).not.toMatch(/\bTrash2\b/)
    expect(adminSource).toMatch(/Deactivate/)
  })
})
