-- Plan-linked live Event Day Operations for EMP events

DO $$ BEGIN
  CREATE TYPE public.emp_event_staff_shift_status AS ENUM (
    'scheduled',
    'clocked_in',
    'completed',
    'no_show',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.emp_event_clock_event_type AS ENUM (
    'clock_in',
    'clock_out',
    'admin_adjustment'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.emp_event_equipment_type AS ENUM (
    'hi_vis',
    'radio',
    'earpiece',
    'clicker',
    'search_wand',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.emp_event_equipment_status AS ENUM (
    'issued',
    'returned',
    'replaced',
    'damaged',
    'lost',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.emp_event_day_settings (
  plan_id UUID PRIMARY KEY REFERENCES public.emp_plans(id) ON DELETE CASCADE,
  kiosk_enabled BOOLEAN NOT NULL DEFAULT false,
  kiosk_token_hash TEXT,
  kiosk_pin_hash TEXT,
  timezone TEXT NOT NULL DEFAULT 'Europe/London',
  kiosk_label TEXT,
  created_by_user_id UUID REFERENCES public.fa_profiles(id) ON DELETE SET NULL,
  updated_by_user_id UUID REFERENCES public.fa_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_emp_event_day_settings_kiosk_token_hash
  ON public.emp_event_day_settings(kiosk_token_hash)
  WHERE kiosk_token_hash IS NOT NULL AND trim(kiosk_token_hash) <> '';

CREATE TABLE IF NOT EXISTS public.emp_event_staff_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.emp_plans(id) ON DELETE CASCADE,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  uploaded_by_user_id UUID REFERENCES public.fa_profiles(id) ON DELETE SET NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_event_staff_import_batches_plan
  ON public.emp_event_staff_import_batches(plan_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.emp_event_staff_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.emp_plans(id) ON DELETE CASCADE,
  import_batch_id UUID REFERENCES public.emp_event_staff_import_batches(id) ON DELETE SET NULL,
  staff_name TEXT NOT NULL,
  staff_name_normalised TEXT NOT NULL,
  agency TEXT,
  email TEXT,
  phone TEXT,
  sia_badge_number TEXT,
  sia_expiry_date DATE,
  position TEXT,
  area TEXT,
  shift_start TIMESTAMPTZ,
  shift_end TIMESTAMPTZ,
  status public.emp_event_staff_shift_status NOT NULL DEFAULT 'scheduled',
  clocked_in_at TIMESTAMPTZ,
  clocked_out_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  clocked_in_via TEXT,
  clocked_out_via TEXT,
  admin_notes TEXT,
  staff_notes TEXT,
  is_walk_up BOOLEAN NOT NULL DEFAULT false,
  created_by_user_id UUID REFERENCES public.fa_profiles(id) ON DELETE SET NULL,
  updated_by_user_id UUID REFERENCES public.fa_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT emp_event_staff_shifts_staff_name_not_blank CHECK (length(trim(staff_name)) > 0),
  CONSTRAINT emp_event_staff_shifts_staff_name_normalised_not_blank CHECK (length(trim(staff_name_normalised)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_emp_event_staff_shifts_plan
  ON public.emp_event_staff_shifts(plan_id);

CREATE INDEX IF NOT EXISTS idx_emp_event_staff_shifts_plan_status
  ON public.emp_event_staff_shifts(plan_id, status);

CREATE INDEX IF NOT EXISTS idx_emp_event_staff_shifts_plan_name
  ON public.emp_event_staff_shifts(plan_id, staff_name_normalised);

CREATE INDEX IF NOT EXISTS idx_emp_event_staff_shifts_plan_start
  ON public.emp_event_staff_shifts(plan_id, shift_start);

CREATE TABLE IF NOT EXISTS public.emp_event_staff_clock_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.emp_plans(id) ON DELETE CASCADE,
  staff_shift_id UUID NOT NULL REFERENCES public.emp_event_staff_shifts(id) ON DELETE CASCADE,
  event_type public.emp_event_clock_event_type NOT NULL,
  event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  captured_via TEXT NOT NULL,
  captured_by_user_id UUID REFERENCES public.fa_profiles(id) ON DELETE SET NULL,
  device_label TEXT,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT emp_event_clock_admin_adjustment_reason CHECK (
    event_type <> 'admin_adjustment'
    OR length(trim(coalesce(reason, ''))) > 0
  )
);

CREATE INDEX IF NOT EXISTS idx_emp_event_staff_clock_events_plan
  ON public.emp_event_staff_clock_events(plan_id, event_time DESC);

CREATE INDEX IF NOT EXISTS idx_emp_event_staff_clock_events_shift
  ON public.emp_event_staff_clock_events(staff_shift_id, event_time DESC);

CREATE TABLE IF NOT EXISTS public.emp_event_equipment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.emp_plans(id) ON DELETE CASCADE,
  staff_shift_id UUID NOT NULL REFERENCES public.emp_event_staff_shifts(id) ON DELETE CASCADE,
  equipment_type public.emp_event_equipment_type NOT NULL,
  item_number TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  status public.emp_event_equipment_status NOT NULL DEFAULT 'issued',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_via TEXT,
  issued_by_user_id UUID REFERENCES public.fa_profiles(id) ON DELETE SET NULL,
  returned_at TIMESTAMPTZ,
  returned_via TEXT,
  returned_by_user_id UUID REFERENCES public.fa_profiles(id) ON DELETE SET NULL,
  replaced_by_assignment_id UUID REFERENCES public.emp_event_equipment_assignments(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT emp_event_equipment_assignments_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_emp_event_equipment_assignments_plan
  ON public.emp_event_equipment_assignments(plan_id);

CREATE INDEX IF NOT EXISTS idx_emp_event_equipment_assignments_shift
  ON public.emp_event_equipment_assignments(staff_shift_id);

CREATE INDEX IF NOT EXISTS idx_emp_event_equipment_assignments_plan_type
  ON public.emp_event_equipment_assignments(plan_id, equipment_type);

CREATE INDEX IF NOT EXISTS idx_emp_event_equipment_assignments_plan_type_number
  ON public.emp_event_equipment_assignments(plan_id, equipment_type, item_number);

CREATE INDEX IF NOT EXISTS idx_emp_event_equipment_assignments_plan_status
  ON public.emp_event_equipment_assignments(plan_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_emp_event_active_serialised_equipment
  ON public.emp_event_equipment_assignments(plan_id, equipment_type, lower(item_number))
  WHERE item_number IS NOT NULL
    AND trim(item_number) <> ''
    AND status = 'issued'
    AND equipment_type IN ('radio', 'clicker', 'search_wand');

CREATE TABLE IF NOT EXISTS public.emp_event_equipment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.emp_plans(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.emp_event_equipment_assignments(id) ON DELETE CASCADE,
  staff_shift_id UUID NOT NULL REFERENCES public.emp_event_staff_shifts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  performed_by_user_id UUID REFERENCES public.fa_profiles(id) ON DELETE SET NULL,
  performed_via TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT emp_event_equipment_events_type_not_blank CHECK (length(trim(event_type)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_emp_event_equipment_events_plan
  ON public.emp_event_equipment_events(plan_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_emp_event_equipment_events_assignment
  ON public.emp_event_equipment_events(assignment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_emp_event_equipment_events_shift
  ON public.emp_event_equipment_events(staff_shift_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.emp_event_meal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.emp_plans(id) ON DELETE CASCADE,
  staff_shift_id UUID NOT NULL REFERENCES public.emp_event_staff_shifts(id) ON DELETE CASCADE,
  token_date DATE NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_by_user_id UUID REFERENCES public.fa_profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_id, staff_shift_id, token_date)
);

CREATE INDEX IF NOT EXISTS idx_emp_event_meal_tokens_plan_date
  ON public.emp_event_meal_tokens(plan_id, token_date DESC);

CREATE INDEX IF NOT EXISTS idx_emp_event_meal_tokens_shift
  ON public.emp_event_meal_tokens(staff_shift_id, token_date DESC);

ALTER TABLE public.emp_event_day_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emp_event_staff_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emp_event_staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emp_event_staff_clock_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emp_event_equipment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emp_event_equipment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emp_event_meal_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "EMP can view event day settings" ON public.emp_event_day_settings;
DROP POLICY IF EXISTS "EMP can create event day settings" ON public.emp_event_day_settings;
DROP POLICY IF EXISTS "EMP can update event day settings" ON public.emp_event_day_settings;
CREATE POLICY "EMP can view event day settings"
  ON public.emp_event_day_settings FOR SELECT TO authenticated
  USING (public.emp_is_allowed_user());
CREATE POLICY "EMP can create event day settings"
  ON public.emp_event_day_settings FOR INSERT TO authenticated
  WITH CHECK (public.emp_is_allowed_user());
CREATE POLICY "EMP can update event day settings"
  ON public.emp_event_day_settings FOR UPDATE TO authenticated
  USING (public.emp_is_allowed_user())
  WITH CHECK (public.emp_is_allowed_user());

DROP POLICY IF EXISTS "EMP can view event staff import batches" ON public.emp_event_staff_import_batches;
DROP POLICY IF EXISTS "EMP can create event staff import batches" ON public.emp_event_staff_import_batches;
CREATE POLICY "EMP can view event staff import batches"
  ON public.emp_event_staff_import_batches FOR SELECT TO authenticated
  USING (public.emp_is_allowed_user());
CREATE POLICY "EMP can create event staff import batches"
  ON public.emp_event_staff_import_batches FOR INSERT TO authenticated
  WITH CHECK (public.emp_is_allowed_user());

DROP POLICY IF EXISTS "EMP can view event staff shifts" ON public.emp_event_staff_shifts;
DROP POLICY IF EXISTS "EMP can create event staff shifts" ON public.emp_event_staff_shifts;
DROP POLICY IF EXISTS "EMP can update event staff shifts" ON public.emp_event_staff_shifts;
CREATE POLICY "EMP can view event staff shifts"
  ON public.emp_event_staff_shifts FOR SELECT TO authenticated
  USING (public.emp_is_allowed_user());
CREATE POLICY "EMP can create event staff shifts"
  ON public.emp_event_staff_shifts FOR INSERT TO authenticated
  WITH CHECK (public.emp_is_allowed_user());
CREATE POLICY "EMP can update event staff shifts"
  ON public.emp_event_staff_shifts FOR UPDATE TO authenticated
  USING (public.emp_is_allowed_user())
  WITH CHECK (public.emp_is_allowed_user());

DROP POLICY IF EXISTS "EMP can view event staff clock events" ON public.emp_event_staff_clock_events;
DROP POLICY IF EXISTS "EMP can create event staff clock events" ON public.emp_event_staff_clock_events;
CREATE POLICY "EMP can view event staff clock events"
  ON public.emp_event_staff_clock_events FOR SELECT TO authenticated
  USING (public.emp_is_allowed_user());
CREATE POLICY "EMP can create event staff clock events"
  ON public.emp_event_staff_clock_events FOR INSERT TO authenticated
  WITH CHECK (public.emp_is_allowed_user());

DROP POLICY IF EXISTS "EMP can view event equipment assignments" ON public.emp_event_equipment_assignments;
DROP POLICY IF EXISTS "EMP can create event equipment assignments" ON public.emp_event_equipment_assignments;
DROP POLICY IF EXISTS "EMP can update event equipment assignments" ON public.emp_event_equipment_assignments;
CREATE POLICY "EMP can view event equipment assignments"
  ON public.emp_event_equipment_assignments FOR SELECT TO authenticated
  USING (public.emp_is_allowed_user());
CREATE POLICY "EMP can create event equipment assignments"
  ON public.emp_event_equipment_assignments FOR INSERT TO authenticated
  WITH CHECK (public.emp_is_allowed_user());
CREATE POLICY "EMP can update event equipment assignments"
  ON public.emp_event_equipment_assignments FOR UPDATE TO authenticated
  USING (public.emp_is_allowed_user())
  WITH CHECK (public.emp_is_allowed_user());

DROP POLICY IF EXISTS "EMP can view event equipment events" ON public.emp_event_equipment_events;
DROP POLICY IF EXISTS "EMP can create event equipment events" ON public.emp_event_equipment_events;
CREATE POLICY "EMP can view event equipment events"
  ON public.emp_event_equipment_events FOR SELECT TO authenticated
  USING (public.emp_is_allowed_user());
CREATE POLICY "EMP can create event equipment events"
  ON public.emp_event_equipment_events FOR INSERT TO authenticated
  WITH CHECK (public.emp_is_allowed_user());

DROP POLICY IF EXISTS "EMP can view event meal tokens" ON public.emp_event_meal_tokens;
DROP POLICY IF EXISTS "EMP can create event meal tokens" ON public.emp_event_meal_tokens;
CREATE POLICY "EMP can view event meal tokens"
  ON public.emp_event_meal_tokens FOR SELECT TO authenticated
  USING (public.emp_is_allowed_user());
CREATE POLICY "EMP can create event meal tokens"
  ON public.emp_event_meal_tokens FOR INSERT TO authenticated
  WITH CHECK (public.emp_is_allowed_user());

REVOKE ALL ON TABLE
  public.emp_event_day_settings,
  public.emp_event_staff_import_batches,
  public.emp_event_staff_shifts,
  public.emp_event_staff_clock_events,
  public.emp_event_equipment_assignments,
  public.emp_event_equipment_events,
  public.emp_event_meal_tokens
FROM anon;

GRANT SELECT, INSERT, UPDATE ON TABLE
  public.emp_event_day_settings,
  public.emp_event_staff_shifts,
  public.emp_event_equipment_assignments
TO authenticated, service_role;

GRANT SELECT, INSERT ON TABLE
  public.emp_event_staff_import_batches,
  public.emp_event_staff_clock_events,
  public.emp_event_equipment_events,
  public.emp_event_meal_tokens
TO authenticated, service_role;
