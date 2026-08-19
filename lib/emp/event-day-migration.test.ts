import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/058_add_emp_event_day_operations.sql'),
  'utf8'
)

const stockMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260616201941_add_emp_event_day_stock_controls.sql'),
  'utf8'
)

const kioskHardeningMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260819230958_harden_emp_event_day_kiosk.sql'),
  'utf8'
)

describe('event-day migration safety constraints', () => {
  it('prevents duplicate active serialised equipment on a plan', () => {
    expect(migration).toContain('idx_emp_event_active_serialised_equipment')
    expect(migration).toContain("status = 'issued'")
    expect(migration).toContain("equipment_type IN ('radio', 'clicker', 'search_wand')")
  })

  it('enforces one meal token per staff shift per date', () => {
    expect(migration).toContain('UNIQUE (plan_id, staff_shift_id, token_date)')
  })

  it('requires admin adjustment clock events to include a reason', () => {
    expect(migration).toContain('emp_event_clock_admin_adjustment_reason')
    expect(migration).toContain("event_type <> 'admin_adjustment'")
  })

  it('does not create RLS delete policies for operational event-day records', () => {
    expect(migration.toLowerCase()).not.toContain(' for delete')
    expect(migration.toLowerCase()).not.toContain('delete on table')
  })

  it('keeps kiosk tables inaccessible to anon while granting explicit authenticated access', () => {
    expect(migration).toContain('FROM anon')
    expect(migration).toContain('TO authenticated, service_role')
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY')
  })

  it('adds plan-level stock controls without anon access or delete policies', () => {
    expect(stockMigration).toContain('CREATE TABLE IF NOT EXISTS public.emp_event_equipment_stock')
    expect(stockMigration).toContain('meal_token_total')
    expect(stockMigration).toContain('ENABLE ROW LEVEL SECURITY')
    expect(stockMigration).toContain('FROM anon')
    expect(stockMigration).toContain('TO authenticated, service_role')
    expect(stockMigration.toLowerCase()).not.toContain(' for delete')
    expect(stockMigration.toLowerCase()).not.toContain('delete on table')
  })

  it('revokes legacy kiosk credentials and adds an explicit lifecycle', () => {
    expect(kioskHardeningMigration).toContain('kiosk_access_id UUID')
    expect(kioskHardeningMigration).toContain('kiosk_event_date DATE')
    expect(kioskHardeningMigration).toContain('kiosk_token_issued_at TIMESTAMPTZ')
    expect(kioskHardeningMigration).toContain('kiosk_token_expires_at TIMESTAMPTZ')
    expect(kioskHardeningMigration).toContain('kiosk_revoked_at TIMESTAMPTZ')
    expect(kioskHardeningMigration).toMatch(/kiosk_token_hash = NULL,[\s\S]*kiosk_revoked_at = COALESCE/)
    expect(kioskHardeningMigration).toContain('emp_event_day_kiosk_token_lifecycle_complete')
    expect(kioskHardeningMigration).toContain('emp_event_day_enabled_kiosk_is_active')
  })

  it('keeps kiosk limiter and request events service-role-only', () => {
    expect(kioskHardeningMigration).toContain('CREATE TABLE IF NOT EXISTS public.emp_event_kiosk_request_limits')
    expect(kioskHardeningMigration).toContain('CREATE TABLE IF NOT EXISTS public.emp_event_kiosk_request_events')
    expect(kioskHardeningMigration).toContain('ALTER TABLE public.emp_event_kiosk_request_limits ENABLE ROW LEVEL SECURITY')
    expect(kioskHardeningMigration).toContain('ALTER TABLE public.emp_event_kiosk_request_events ENABLE ROW LEVEL SECURITY')
    expect(kioskHardeningMigration).toMatch(/REVOKE ALL ON TABLE[\s\S]*FROM PUBLIC, anon, authenticated/)
    expect(kioskHardeningMigration).toMatch(/GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.emp_event_kiosk_request_limits[\s\S]*TO service_role/)
    expect(kioskHardeningMigration).toMatch(/GRANT SELECT, INSERT ON TABLE public\.emp_event_kiosk_request_events[\s\S]*TO service_role/)
  })

  it('limits access to the atomic rate-limit function', () => {
    expect(kioskHardeningMigration).toContain('public.emp_consume_event_day_kiosk_limit')
    expect(kioskHardeningMigration).toContain('SECURITY INVOKER')
    expect(kioskHardeningMigration).toContain('SET search_path = pg_catalog, public')
    expect(kioskHardeningMigration).toMatch(/REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon, authenticated/)
    expect(kioskHardeningMigration).toMatch(/GRANT EXECUTE ON FUNCTION[\s\S]*TO service_role/)
  })

  it('locks repeated worker-proof failures at the configured threshold', () => {
    expect(kioskHardeningMigration).toContain("'pin', 'worker'")
    expect(kioskHardeningMigration).toContain('IF v_row.request_count >= p_limit THEN')
    expect(kioskHardeningMigration).toContain('reservation_window_started_at TIMESTAMPTZ')
    expect(kioskHardeningMigration).toContain('attempt_reserved BOOLEAN')
    expect(kioskHardeningMigration).toMatch(/v_row\.locked_until,[\s\S]*v_row\.window_started_at,[\s\S]*false;/)
    expect(kioskHardeningMigration).toMatch(/v_retry_until,[\s\S]*v_row\.window_started_at,[\s\S]*p_increment > 0;/)
  })

  it('terminates the threshold lock update before returning limiter state', () => {
    expect(kioskHardeningMigration).toMatch(
      /SET locked_until = v_retry_until, updated_at = v_now[\s\S]*AND request_limit\.action = p_action;\s*RETURN QUERY SELECT/
    )
  })

  it('adds correlation metadata support to equipment audit events', () => {
    expect(kioskHardeningMigration).toMatch(/ALTER TABLE public\.emp_event_equipment_events[\s\S]*ADD COLUMN IF NOT EXISTS metadata JSONB/)
  })
})
