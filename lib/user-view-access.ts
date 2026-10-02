// Verified against fa_profiles. Never authorize activity access by display name.
export const DAVID_CAPENER_USER_ID = '091f7f25-9edb-4120-8d50-cfa4070f1352'

export function canViewUserActivity(user: { id: string; role: string }): boolean {
  return user.id === DAVID_CAPENER_USER_ID && user.role === 'admin'
}
