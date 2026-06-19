-- Plan-level Event Day stock controls for radios, earpieces, and meal tokens.

ALTER TABLE public.emp_event_day_settings
  ADD COLUMN IF NOT EXISTS meal_token_total INTEGER;

DO $$ BEGIN
  ALTER TABLE public.emp_event_day_settings
    ADD CONSTRAINT emp_event_day_settings_meal_token_total_non_negative
      CHECK (meal_token_total IS NULL OR meal_token_total >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.emp_event_equipment_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.emp_plans(id) ON DELETE CASCADE,
  equipment_type public.emp_event_equipment_type NOT NULL,
  item_number TEXT,
  quantity_total INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by_user_id UUID REFERENCES public.fa_profiles(id) ON DELETE SET NULL,
  updated_by_user_id UUID REFERENCES public.fa_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT emp_event_equipment_stock_quantity_non_negative CHECK (quantity_total >= 0),
  CONSTRAINT emp_event_equipment_stock_item_number_not_blank CHECK (
    item_number IS NULL OR length(trim(item_number)) > 0
  )
);

CREATE INDEX IF NOT EXISTS idx_emp_event_equipment_stock_plan
  ON public.emp_event_equipment_stock(plan_id);

CREATE INDEX IF NOT EXISTS idx_emp_event_equipment_stock_plan_type
  ON public.emp_event_equipment_stock(plan_id, equipment_type);

CREATE UNIQUE INDEX IF NOT EXISTS idx_emp_event_equipment_stock_serialised_item
  ON public.emp_event_equipment_stock(plan_id, equipment_type, lower(item_number))
  WHERE item_number IS NOT NULL AND trim(item_number) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_emp_event_equipment_stock_unserialised_item
  ON public.emp_event_equipment_stock(plan_id, equipment_type)
  WHERE item_number IS NULL;

ALTER TABLE public.emp_event_equipment_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "EMP can view event equipment stock" ON public.emp_event_equipment_stock;
DROP POLICY IF EXISTS "EMP can create event equipment stock" ON public.emp_event_equipment_stock;
DROP POLICY IF EXISTS "EMP can update event equipment stock" ON public.emp_event_equipment_stock;
CREATE POLICY "EMP can view event equipment stock"
  ON public.emp_event_equipment_stock FOR SELECT TO authenticated
  USING (public.emp_is_allowed_user());
CREATE POLICY "EMP can create event equipment stock"
  ON public.emp_event_equipment_stock FOR INSERT TO authenticated
  WITH CHECK (public.emp_is_allowed_user());
CREATE POLICY "EMP can update event equipment stock"
  ON public.emp_event_equipment_stock FOR UPDATE TO authenticated
  USING (public.emp_is_allowed_user())
  WITH CHECK (public.emp_is_allowed_user());

REVOKE ALL ON TABLE public.emp_event_equipment_stock FROM anon;

GRANT SELECT, INSERT, UPDATE ON TABLE public.emp_event_equipment_stock
TO authenticated, service_role;
