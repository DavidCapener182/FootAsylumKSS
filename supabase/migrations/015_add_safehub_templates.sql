-- SafeHub Audit Templates System
-- This migration creates tables for audit templates, sections, questions,
-- audit instances, responses, and media

-- ============================================
-- ENUMS
-- ============================================

-- Template categories
CREATE TYPE fa_audit_template_category AS ENUM ('footasylum_audit', 'fire_risk_assessment', 'custom');

-- Question types
CREATE TYPE fa_question_type AS ENUM ('yesno', 'text', 'multiple', 'checkbox', 'number', 'date', 'slider', 'signature', 'media', 'location');

-- ============================================
-- TEMPLATE TABLES
-- ============================================

-- fa_audit_templates table
CREATE TABLE fa_audit_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category fa_audit_template_category NOT NULL DEFAULT 'custom',
  created_by_user_id UUID NOT NULL REFERENCES fa_profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- fa_audit_template_sections table
CREATE TABLE fa_audit_template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES fa_audit_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- fa_audit_template_questions table
CREATE TABLE fa_audit_template_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES fa_audit_template_sections(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type fa_question_type NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  options JSONB, -- For multiple choice, checkbox options
  conditional_logic JSONB, -- For question branching
  scoring_rules JSONB, -- Scoring configuration
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- AUDIT INSTANCE TABLES
-- ============================================

-- fa_audit_instances table (completed audits)
CREATE TABLE fa_audit_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES fa_audit_templates(id),
  store_id UUID NOT NULL REFERENCES fa_stores(id),
  conducted_by_user_id UUID NOT NULL REFERENCES fa_profiles(id),
  conducted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  overall_score NUMERIC(5, 2), -- Percentage score
  status TEXT NOT NULL DEFAULT 'draft', -- draft, in_progress, completed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- fa_audit_responses table (answers to questions)
CREATE TABLE fa_audit_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_instance_id UUID NOT NULL REFERENCES fa_audit_instances(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES fa_audit_template_questions(id),
  response_value TEXT, -- For text, yesno, number, date
  response_json JSONB, -- For multiple choice, checkbox arrays, media URLs
  score NUMERIC(5, 2), -- Individual question score
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- fa_audit_media table (uploaded media files)
CREATE TABLE fa_audit_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_instance_id UUID NOT NULL REFERENCES fa_audit_instances(id) ON DELETE CASCADE,
  question_id UUID REFERENCES fa_audit_template_questions(id),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_audit_templates_created_by ON fa_audit_templates(created_by_user_id);
CREATE INDEX idx_audit_templates_active ON fa_audit_templates(is_active);
CREATE INDEX idx_audit_template_sections_template ON fa_audit_template_sections(template_id);
CREATE INDEX idx_audit_template_questions_section ON fa_audit_template_questions(section_id);
CREATE INDEX idx_audit_instances_template ON fa_audit_instances(template_id);
CREATE INDEX idx_audit_instances_store ON fa_audit_instances(store_id);
CREATE INDEX idx_audit_instances_conducted_by ON fa_audit_instances(conducted_by_user_id);
CREATE INDEX idx_audit_instances_status ON fa_audit_instances(status);
CREATE INDEX idx_audit_responses_instance ON fa_audit_responses(audit_instance_id);
CREATE INDEX idx_audit_responses_question ON fa_audit_responses(question_id);
CREATE INDEX idx_audit_media_instance ON fa_audit_media(audit_instance_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE fa_audit_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE fa_audit_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE fa_audit_template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fa_audit_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE fa_audit_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fa_audit_media ENABLE ROW LEVEL SECURITY;

-- Templates: Admin can manage all, others can view active
CREATE POLICY "Admin can manage all templates"
  ON fa_audit_templates FOR ALL
  USING (fa_get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can view active templates"
  ON fa_audit_templates FOR SELECT
  USING (is_active = true OR fa_get_user_role(auth.uid()) = 'admin');

-- Template sections: Admin can manage all, others can view from active templates
CREATE POLICY "Admin can manage all template sections"
  ON fa_audit_template_sections FOR ALL
  USING (fa_get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can view sections from active templates"
  ON fa_audit_template_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fa_audit_templates t
      WHERE t.id = fa_audit_template_sections.template_id
      AND (t.is_active = true OR fa_get_user_role(auth.uid()) = 'admin')
    )
  );

-- Template questions: Admin can manage all, others can view from active templates
CREATE POLICY "Admin can manage all template questions"
  ON fa_audit_template_questions FOR ALL
  USING (fa_get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can view questions from active templates"
  ON fa_audit_template_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fa_audit_template_sections s
      JOIN fa_audit_templates t ON t.id = s.template_id
      WHERE s.id = fa_audit_template_questions.section_id
      AND (t.is_active = true OR fa_get_user_role(auth.uid()) = 'admin')
    )
  );

-- Audit instances: Admin can manage all, users can manage their own, ops can create/view
CREATE POLICY "Admin can manage all audit instances"
  ON fa_audit_instances FOR ALL
  USING (fa_get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can manage their own audit instances"
  ON fa_audit_instances FOR ALL
  USING (conducted_by_user_id = auth.uid())
  WITH CHECK (conducted_by_user_id = auth.uid());

CREATE POLICY "Ops can view audit instances"
  ON fa_audit_instances FOR SELECT
  USING (fa_get_user_role(auth.uid()) IN ('ops', 'admin'));

CREATE POLICY "Ops can create audit instances"
  ON fa_audit_instances FOR INSERT
  WITH CHECK (fa_get_user_role(auth.uid()) IN ('ops', 'admin'));

-- Audit responses: Based on instance access
CREATE POLICY "Users can manage responses for accessible instances"
  ON fa_audit_responses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM fa_audit_instances ai
      WHERE ai.id = fa_audit_responses.audit_instance_id
      AND (
        ai.conducted_by_user_id = auth.uid()
        OR fa_get_user_role(auth.uid()) IN ('admin', 'ops')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fa_audit_instances ai
      WHERE ai.id = fa_audit_responses.audit_instance_id
      AND (
        ai.conducted_by_user_id = auth.uid()
        OR fa_get_user_role(auth.uid()) IN ('admin', 'ops')
      )
    )
  );

-- Audit media: Based on instance access
CREATE POLICY "Users can manage media for accessible instances"
  ON fa_audit_media FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM fa_audit_instances ai
      WHERE ai.id = fa_audit_media.audit_instance_id
      AND (
        ai.conducted_by_user_id = auth.uid()
        OR fa_get_user_role(auth.uid()) IN ('admin', 'ops')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fa_audit_instances ai
      WHERE ai.id = fa_audit_media.audit_instance_id
      AND (
        ai.conducted_by_user_id = auth.uid()
        OR fa_get_user_role(auth.uid()) IN ('admin', 'ops')
      )
    )
  );

-- ============================================
-- INITIAL SEED DATA
-- ============================================

-- Insert default templates (will use admin user ID)
-- Note: created_by_user_id will need to be set to actual admin user ID in application code
-- This is a placeholder structure - actual seeding will be done via server actions
