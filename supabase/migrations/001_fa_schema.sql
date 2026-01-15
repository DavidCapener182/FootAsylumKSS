-- KSS x Footasylum Assurance Platform Schema
-- All tables and enums prefixed with fa_ for shared database

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE fa_user_role AS ENUM ('admin', 'ops', 'readonly');
CREATE TYPE fa_incident_category AS ENUM ('accident', 'near_miss', 'security', 'fire', 'health_safety', 'other');
CREATE TYPE fa_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE fa_incident_status AS ENUM ('open', 'under_investigation', 'actions_in_progress', 'closed', 'cancelled');
CREATE TYPE fa_investigation_type AS ENUM ('light_touch', 'formal');
CREATE TYPE fa_investigation_status AS ENUM ('not_started', 'in_progress', 'awaiting_actions', 'complete');
CREATE TYPE fa_action_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE fa_action_status AS ENUM ('open', 'in_progress', 'blocked', 'complete', 'cancelled');
CREATE TYPE fa_entity_type AS ENUM ('incident', 'investigation', 'action', 'store');

-- ============================================
-- TABLES
-- ============================================

-- Profiles (extends auth.users)
CREATE TABLE fa_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role fa_user_role NOT NULL DEFAULT 'readonly',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stores
CREATE TABLE fa_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_code TEXT UNIQUE,
  store_name TEXT NOT NULL,
  address_line_1 TEXT,
  city TEXT,
  postcode TEXT,
  region TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Incidents
CREATE TABLE fa_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_no TEXT NOT NULL UNIQUE,
  store_id UUID NOT NULL REFERENCES fa_stores(id) ON DELETE RESTRICT,
  reported_by_user_id UUID NOT NULL REFERENCES fa_profiles(id) ON DELETE RESTRICT,
  incident_category fa_incident_category NOT NULL,
  severity fa_severity NOT NULL,
  summary TEXT NOT NULL,
  description TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  persons_involved JSONB,
  injury_details JSONB,
  witnesses JSONB,
  riddor_reportable BOOLEAN NOT NULL DEFAULT false,
  status fa_incident_status NOT NULL DEFAULT 'open',
  assigned_investigator_user_id UUID REFERENCES fa_profiles(id) ON DELETE SET NULL,
  target_close_date DATE,
  closed_at TIMESTAMPTZ,
  closure_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Investigations
CREATE TABLE fa_investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES fa_incidents(id) ON DELETE CASCADE,
  investigation_type fa_investigation_type NOT NULL,
  status fa_investigation_status NOT NULL DEFAULT 'not_started',
  lead_investigator_user_id UUID NOT NULL REFERENCES fa_profiles(id) ON DELETE RESTRICT,
  root_cause TEXT,
  contributing_factors TEXT,
  findings TEXT,
  recommendations TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Actions
CREATE TABLE fa_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES fa_incidents(id) ON DELETE CASCADE,
  investigation_id UUID REFERENCES fa_investigations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority fa_action_priority NOT NULL,
  assigned_to_user_id UUID NOT NULL REFERENCES fa_profiles(id) ON DELETE RESTRICT,
  due_date DATE NOT NULL,
  status fa_action_status NOT NULL DEFAULT 'open',
  evidence_required BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Attachments
CREATE TABLE fa_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type fa_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by_user_id UUID NOT NULL REFERENCES fa_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity Log (Audit Trail)
CREATE TABLE fa_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type fa_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  performed_by_user_id UUID NOT NULL REFERENCES fa_profiles(id) ON DELETE RESTRICT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_incidents_store_id ON fa_incidents(store_id);
CREATE INDEX idx_incidents_occurred_at ON fa_incidents(occurred_at);
CREATE INDEX idx_incidents_status ON fa_incidents(status);
CREATE INDEX idx_incidents_severity ON fa_incidents(severity);
CREATE INDEX idx_incidents_assigned_investigator ON fa_incidents(assigned_investigator_user_id);
CREATE INDEX idx_incidents_reference_no ON fa_incidents(reference_no);

CREATE INDEX idx_actions_assigned_to ON fa_actions(assigned_to_user_id);
CREATE INDEX idx_actions_due_date ON fa_actions(due_date);
CREATE INDEX idx_actions_status ON fa_actions(status);
CREATE INDEX idx_actions_priority ON fa_actions(priority);
CREATE INDEX idx_actions_incident_id ON fa_actions(incident_id);

CREATE INDEX idx_attachments_entity ON fa_attachments(entity_type, entity_id);
CREATE INDEX idx_activity_log_entity ON fa_activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created_at ON fa_activity_log(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE fa_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fa_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE fa_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE fa_investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fa_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fa_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fa_activity_log ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION fa_get_user_role(user_id UUID)
RETURNS fa_user_role AS $$
  SELECT role FROM fa_profiles WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================
-- RLS POLICIES - fa_profiles
-- ============================================

-- Admin: Full access
CREATE POLICY "Admin full access to profiles"
  ON fa_profiles FOR ALL
  USING (fa_get_user_role(auth.uid()) = 'admin');

-- Ops/Readonly: Can view all profiles
CREATE POLICY "Users can view profiles"
  ON fa_profiles FOR SELECT
  USING (fa_get_user_role(auth.uid()) IN ('admin', 'ops', 'readonly'));

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON fa_profiles FOR SELECT
  USING (id = auth.uid());

-- ============================================
-- RLS POLICIES - fa_stores
-- ============================================

-- Admin: Full access
CREATE POLICY "Admin full access to stores"
  ON fa_stores FOR ALL
  USING (fa_get_user_role(auth.uid()) = 'admin');

-- Ops/Readonly: Can view stores
CREATE POLICY "Users can view stores"
  ON fa_stores FOR SELECT
  USING (fa_get_user_role(auth.uid()) IN ('admin', 'ops', 'readonly'));

-- ============================================
-- RLS POLICIES - fa_incidents
-- ============================================

-- Admin: Full access
CREATE POLICY "Admin full access to incidents"
  ON fa_incidents FOR ALL
  USING (fa_get_user_role(auth.uid()) = 'admin');

-- Ops: Read/Write
CREATE POLICY "Ops can manage incidents"
  ON fa_incidents FOR ALL
  USING (fa_get_user_role(auth.uid()) = 'ops');

-- Readonly: Read only
CREATE POLICY "Readonly can view incidents"
  ON fa_incidents FOR SELECT
  USING (fa_get_user_role(auth.uid()) = 'readonly');

-- ============================================
-- RLS POLICIES - fa_investigations
-- ============================================

-- Admin: Full access
CREATE POLICY "Admin full access to investigations"
  ON fa_investigations FOR ALL
  USING (fa_get_user_role(auth.uid()) = 'admin');

-- Ops: Read/Write
CREATE POLICY "Ops can manage investigations"
  ON fa_investigations FOR ALL
  USING (fa_get_user_role(auth.uid()) = 'ops');

-- Readonly: Read only
CREATE POLICY "Readonly can view investigations"
  ON fa_investigations FOR SELECT
  USING (fa_get_user_role(auth.uid()) = 'readonly');

-- ============================================
-- RLS POLICIES - fa_actions
-- ============================================

-- Admin: Full access
CREATE POLICY "Admin full access to actions"
  ON fa_actions FOR ALL
  USING (fa_get_user_role(auth.uid()) = 'admin');

-- Ops: Read/Write
CREATE POLICY "Ops can manage actions"
  ON fa_actions FOR ALL
  USING (fa_get_user_role(auth.uid()) = 'ops');

-- Readonly: Read only
CREATE POLICY "Readonly can view actions"
  ON fa_actions FOR SELECT
  USING (fa_get_user_role(auth.uid()) = 'readonly');

-- Users can update actions assigned to them
CREATE POLICY "Users can update assigned actions"
  ON fa_actions FOR UPDATE
  USING (assigned_to_user_id = auth.uid() AND fa_get_user_role(auth.uid()) IN ('ops', 'admin'));

-- ============================================
-- RLS POLICIES - fa_attachments
-- ============================================

-- Admin: Full access
CREATE POLICY "Admin full access to attachments"
  ON fa_attachments FOR ALL
  USING (fa_get_user_role(auth.uid()) = 'admin');

-- Ops: Read/Write
CREATE POLICY "Ops can manage attachments"
  ON fa_attachments FOR ALL
  USING (fa_get_user_role(auth.uid()) = 'ops');

-- Readonly: Read only
CREATE POLICY "Readonly can view attachments"
  ON fa_attachments FOR SELECT
  USING (fa_get_user_role(auth.uid()) = 'readonly');

-- ============================================
-- RLS POLICIES - fa_activity_log
-- ============================================

-- All authenticated users can view activity logs
CREATE POLICY "Users can view activity logs"
  ON fa_activity_log FOR SELECT
  USING (fa_get_user_role(auth.uid()) IN ('admin', 'ops', 'readonly'));

-- Only system can insert (via triggers)
CREATE POLICY "System can insert activity logs"
  ON fa_activity_log FOR INSERT
  WITH CHECK (true);

-- ============================================
-- TRIGGERS - Activity Logging
-- ============================================

-- Function to log activity
CREATE OR REPLACE FUNCTION fa_log_activity()
RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  action_type TEXT;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_type := 'CREATED';
    new_data := to_jsonb(NEW);
    old_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'UPDATED';
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'DELETED';
    old_data := to_jsonb(OLD);
    new_data := NULL;
  END IF;

  -- Insert activity log
  INSERT INTO fa_activity_log (
    entity_type,
    entity_id,
    action,
    performed_by_user_id,
    details
  ) VALUES (
    CASE 
      WHEN TG_TABLE_NAME = 'fa_incidents' THEN 'incident'::fa_entity_type
      WHEN TG_TABLE_NAME = 'fa_investigations' THEN 'investigation'::fa_entity_type
      WHEN TG_TABLE_NAME = 'fa_actions' THEN 'action'::fa_entity_type
      WHEN TG_TABLE_NAME = 'fa_stores' THEN 'store'::fa_entity_type
      ELSE 'incident'::fa_entity_type
    END,
    COALESCE((NEW.id)::TEXT, (OLD.id)::TEXT)::UUID,
    action_type,
    auth.uid(),
    jsonb_build_object(
      'old', old_data,
      'new', new_data
    )
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for activity logging
CREATE TRIGGER fa_incidents_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON fa_incidents
  FOR EACH ROW EXECUTE FUNCTION fa_log_activity();

CREATE TRIGGER fa_investigations_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON fa_investigations
  FOR EACH ROW EXECUTE FUNCTION fa_log_activity();

CREATE TRIGGER fa_actions_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON fa_actions
  FOR EACH ROW EXECUTE FUNCTION fa_log_activity();

CREATE TRIGGER fa_stores_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON fa_stores
  FOR EACH ROW EXECUTE FUNCTION fa_log_activity();

-- ============================================
-- TRIGGERS - Updated At
-- ============================================

CREATE OR REPLACE FUNCTION fa_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fa_stores_updated_at
  BEFORE UPDATE ON fa_stores
  FOR EACH ROW EXECUTE FUNCTION fa_update_updated_at();

CREATE TRIGGER fa_incidents_updated_at
  BEFORE UPDATE ON fa_incidents
  FOR EACH ROW EXECUTE FUNCTION fa_update_updated_at();

CREATE TRIGGER fa_investigations_updated_at
  BEFORE UPDATE ON fa_investigations
  FOR EACH ROW EXECUTE FUNCTION fa_update_updated_at();

CREATE TRIGGER fa_actions_updated_at
  BEFORE UPDATE ON fa_actions
  FOR EACH ROW EXECUTE FUNCTION fa_update_updated_at();

-- ============================================
-- STORAGE BUCKET
-- ============================================

-- Note: Storage bucket creation should be done via Supabase Dashboard or API
-- Bucket name: fa-attachments
-- Public: false
-- Allowed MIME types: All
-- File size limit: Configure as needed

-- Storage policies (for fa-attachments bucket)
-- These will be created via Supabase Dashboard or API, but here's the SQL:

-- Admin: Full access
-- CREATE POLICY "Admin full access to attachments bucket"
--   ON storage.objects FOR ALL
--   USING (bucket_id = 'fa-attachments' AND fa_get_user_role(auth.uid()) = 'admin');

-- Ops: Upload and view
-- CREATE POLICY "Ops can upload attachments"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'fa-attachments' AND fa_get_user_role(auth.uid()) = 'ops');

-- CREATE POLICY "Ops can view attachments"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'fa-attachments' AND fa_get_user_role(auth.uid()) IN ('ops', 'admin'));

-- Readonly: View only
-- CREATE POLICY "Readonly can view attachments"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'fa-attachments' AND fa_get_user_role(auth.uid()) = 'readonly');

-- ============================================
-- FUNCTIONS - Reference Number Generation
-- ============================================

CREATE OR REPLACE FUNCTION fa_generate_incident_reference()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
  ref_no TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_no FROM 9) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM fa_incidents
  WHERE reference_no LIKE 'INC-' || year_part || '-%';
  
  -- Format: INC-YYYY-XXXXXX (6 digits)
  ref_no := 'INC-' || year_part || '-' || LPAD(seq_num::TEXT, 6, '0');
  
  RETURN ref_no;
END;
$$ LANGUAGE plpgsql;


