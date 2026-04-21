-- Admin-only Crowd Management Plan module

CREATE OR REPLACE FUNCTION public.cmp_is_allowed_user()
RETURNS boolean AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'david.capener@kssnwltd.co.uk';
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

DO $$ BEGIN
  CREATE TYPE cmp_template_field_type AS ENUM ('text', 'textarea', 'date', 'number', 'select');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cmp_plan_status AS ENUM ('draft', 'ready');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cmp_field_value_source AS ENUM ('manual', 'source_doc', 'default');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cmp_source_document_kind AS ENUM (
    'previous_somp',
    'previous_cmp',
    'risk_assessment',
    'event_management_plan',
    'site_map',
    'licensing_schedule',
    'contact_sheet',
    'deployment_matrix',
    'kss_profile',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS cmp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by_user_id UUID NOT NULL REFERENCES fa_profiles(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cmp_template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES cmp_templates(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_id, key)
);

CREATE TABLE IF NOT EXISTS cmp_template_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES cmp_templates(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES cmp_template_sections(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  placeholder TEXT,
  field_type cmp_template_field_type NOT NULL DEFAULT 'text',
  order_index INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  options JSONB,
  default_value_text TEXT,
  default_value_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_id, key)
);

CREATE TABLE IF NOT EXISTS cmp_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES cmp_templates(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  event_name TEXT,
  status cmp_plan_status NOT NULL DEFAULT 'draft',
  document_status TEXT,
  selected_annexes JSONB NOT NULL DEFAULT '[]'::jsonb,
  include_kss_profile_appendix BOOLEAN NOT NULL DEFAULT false,
  created_by_user_id UUID NOT NULL REFERENCES fa_profiles(id) ON DELETE RESTRICT,
  updated_by_user_id UUID NOT NULL REFERENCES fa_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cmp_source_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES cmp_plans(id) ON DELETE CASCADE,
  document_kind cmp_source_document_kind NOT NULL DEFAULT 'other',
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  extracted_text TEXT,
  uploaded_by_user_id UUID NOT NULL REFERENCES fa_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cmp_plan_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES cmp_plans(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES cmp_template_fields(id) ON DELETE CASCADE,
  value_text TEXT,
  value_json JSONB,
  value_source cmp_field_value_source NOT NULL DEFAULT 'manual',
  source_document_id UUID REFERENCES cmp_source_documents(id) ON DELETE SET NULL,
  source_excerpt TEXT,
  updated_by_user_id UUID NOT NULL REFERENCES fa_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_cmp_template_sections_template_id
  ON cmp_template_sections(template_id, order_index);

CREATE INDEX IF NOT EXISTS idx_cmp_template_fields_template_id
  ON cmp_template_fields(template_id, section_id, order_index);

CREATE INDEX IF NOT EXISTS idx_cmp_plans_template_id
  ON cmp_plans(template_id);

CREATE INDEX IF NOT EXISTS idx_cmp_plans_updated_at
  ON cmp_plans(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_cmp_source_documents_plan_id
  ON cmp_source_documents(plan_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cmp_plan_field_values_plan_id
  ON cmp_plan_field_values(plan_id);

ALTER TABLE cmp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cmp_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE cmp_template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE cmp_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE cmp_source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE cmp_plan_field_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CMP access to templates" ON cmp_templates;
CREATE POLICY "CMP access to templates"
  ON cmp_templates FOR ALL
  USING (cmp_is_allowed_user())
  WITH CHECK (cmp_is_allowed_user());

DROP POLICY IF EXISTS "CMP access to template sections" ON cmp_template_sections;
CREATE POLICY "CMP access to template sections"
  ON cmp_template_sections FOR ALL
  USING (cmp_is_allowed_user())
  WITH CHECK (cmp_is_allowed_user());

DROP POLICY IF EXISTS "CMP access to template fields" ON cmp_template_fields;
CREATE POLICY "CMP access to template fields"
  ON cmp_template_fields FOR ALL
  USING (cmp_is_allowed_user())
  WITH CHECK (cmp_is_allowed_user());

DROP POLICY IF EXISTS "CMP access to plans" ON cmp_plans;
CREATE POLICY "CMP access to plans"
  ON cmp_plans FOR ALL
  USING (cmp_is_allowed_user())
  WITH CHECK (cmp_is_allowed_user());

DROP POLICY IF EXISTS "CMP access to source documents" ON cmp_source_documents;
CREATE POLICY "CMP access to source documents"
  ON cmp_source_documents FOR ALL
  USING (cmp_is_allowed_user())
  WITH CHECK (cmp_is_allowed_user());

DROP POLICY IF EXISTS "CMP access to field values" ON cmp_plan_field_values;
CREATE POLICY "CMP access to field values"
  ON cmp_plan_field_values FOR ALL
  USING (cmp_is_allowed_user())
  WITH CHECK (cmp_is_allowed_user());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cmp-documents',
  'cmp-documents',
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

DROP POLICY IF EXISTS "CMP access to cmp-documents bucket" ON storage.objects;
CREATE POLICY "CMP access to cmp-documents bucket"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'cmp-documents'
    AND cmp_is_allowed_user()
  )
  WITH CHECK (
    bucket_id = 'cmp-documents'
    AND cmp_is_allowed_user()
  );
