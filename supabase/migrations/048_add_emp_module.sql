-- Admin-only Event Management Plan module

CREATE OR REPLACE FUNCTION public.emp_is_allowed_user()
RETURNS boolean AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'david.capener@kssnwltd.co.uk';
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

DO $$ BEGIN
  CREATE TYPE emp_template_field_type AS ENUM ('text', 'textarea', 'date', 'number', 'select');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE emp_plan_status AS ENUM ('draft', 'ready');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE emp_field_value_source AS ENUM ('manual', 'source_doc', 'default');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE emp_source_document_kind AS ENUM (
    'previous_somp',
    'previous_emp',
    'risk_assessment',
    'event_management_plan',
    'site_map',
    'ingress_map',
    'egress_map',
    'emergency_map',
    'route_map',
    'licensing_schedule',
    'contact_sheet',
    'deployment_matrix',
    'kss_profile',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS emp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by_user_id UUID NOT NULL REFERENCES fa_profiles(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS emp_template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES emp_templates(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_id, key)
);

CREATE TABLE IF NOT EXISTS emp_template_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES emp_templates(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES emp_template_sections(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  placeholder TEXT,
  field_type emp_template_field_type NOT NULL DEFAULT 'text',
  order_index INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  options JSONB,
  default_value_text TEXT,
  default_value_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_id, key)
);

CREATE TABLE IF NOT EXISTS emp_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES emp_templates(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  event_name TEXT,
  status emp_plan_status NOT NULL DEFAULT 'draft',
  document_status TEXT,
  selected_annexes JSONB NOT NULL DEFAULT '[]'::jsonb,
  include_kss_profile_appendix BOOLEAN NOT NULL DEFAULT false,
  created_by_user_id UUID NOT NULL REFERENCES fa_profiles(id) ON DELETE RESTRICT,
  updated_by_user_id UUID NOT NULL REFERENCES fa_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS emp_source_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES emp_plans(id) ON DELETE CASCADE,
  document_kind emp_source_document_kind NOT NULL DEFAULT 'other',
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  extracted_text TEXT,
  uploaded_by_user_id UUID NOT NULL REFERENCES fa_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS emp_plan_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES emp_plans(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES emp_template_fields(id) ON DELETE CASCADE,
  value_text TEXT,
  value_json JSONB,
  value_source emp_field_value_source NOT NULL DEFAULT 'manual',
  source_document_id UUID REFERENCES emp_source_documents(id) ON DELETE SET NULL,
  source_excerpt TEXT,
  updated_by_user_id UUID NOT NULL REFERENCES fa_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_id, field_id)
);

CREATE TABLE IF NOT EXISTS emp_master_template_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  event_date TEXT,
  venue_name TEXT,
  client_name TEXT,
  notes TEXT,
  created_by_user_id UUID NOT NULL REFERENCES fa_profiles(id) ON DELETE RESTRICT,
  updated_by_user_id UUID NOT NULL REFERENCES fa_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_template_sections_template_id
  ON emp_template_sections(template_id, order_index);

CREATE INDEX IF NOT EXISTS idx_emp_template_fields_template_id
  ON emp_template_fields(template_id, section_id, order_index);

CREATE INDEX IF NOT EXISTS idx_emp_plans_template_id
  ON emp_plans(template_id);

CREATE INDEX IF NOT EXISTS idx_emp_plans_updated_at
  ON emp_plans(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_emp_source_documents_plan_id
  ON emp_source_documents(plan_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_emp_plan_field_values_plan_id
  ON emp_plan_field_values(plan_id);

CREATE INDEX IF NOT EXISTS idx_emp_master_template_events_updated_at
  ON emp_master_template_events(updated_at DESC);

ALTER TABLE emp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE emp_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE emp_template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE emp_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE emp_source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE emp_plan_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE emp_master_template_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "EMP access to templates" ON emp_templates;
CREATE POLICY "EMP access to templates"
  ON emp_templates FOR ALL
  USING (emp_is_allowed_user())
  WITH CHECK (emp_is_allowed_user());

DROP POLICY IF EXISTS "EMP access to template sections" ON emp_template_sections;
CREATE POLICY "EMP access to template sections"
  ON emp_template_sections FOR ALL
  USING (emp_is_allowed_user())
  WITH CHECK (emp_is_allowed_user());

DROP POLICY IF EXISTS "EMP access to template fields" ON emp_template_fields;
CREATE POLICY "EMP access to template fields"
  ON emp_template_fields FOR ALL
  USING (emp_is_allowed_user())
  WITH CHECK (emp_is_allowed_user());

DROP POLICY IF EXISTS "EMP access to plans" ON emp_plans;
CREATE POLICY "EMP access to plans"
  ON emp_plans FOR ALL
  USING (emp_is_allowed_user())
  WITH CHECK (emp_is_allowed_user());

DROP POLICY IF EXISTS "EMP access to source documents" ON emp_source_documents;
CREATE POLICY "EMP access to source documents"
  ON emp_source_documents FOR ALL
  USING (emp_is_allowed_user())
  WITH CHECK (emp_is_allowed_user());

DROP POLICY IF EXISTS "EMP access to field values" ON emp_plan_field_values;
CREATE POLICY "EMP access to field values"
  ON emp_plan_field_values FOR ALL
  USING (emp_is_allowed_user())
  WITH CHECK (emp_is_allowed_user());

DROP POLICY IF EXISTS "EMP access to master template events" ON emp_master_template_events;
CREATE POLICY "EMP access to master template events"
  ON emp_master_template_events FOR ALL
  USING (emp_is_allowed_user())
  WITH CHECK (emp_is_allowed_user());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'emp-documents',
  'emp-documents',
  false,
  104857600,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "EMP access to emp-documents bucket" ON storage.objects;
CREATE POLICY "EMP access to emp-documents bucket"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'emp-documents'
    AND emp_is_allowed_user()
  )
  WITH CHECK (
    bucket_id = 'emp-documents'
    AND emp_is_allowed_user()
  );
