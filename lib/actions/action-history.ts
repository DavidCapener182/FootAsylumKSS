export function isHistoricalStoreAction(action: { status?: string | null; active_until?: string | null }, today = new Date().toISOString().slice(0,10)) {
  return ['complete','completed','cancelled'].includes(String(action.status).toLowerCase()) || Boolean(action.active_until && action.active_until <= today)
}
