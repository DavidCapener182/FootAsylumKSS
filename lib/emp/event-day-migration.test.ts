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
})
