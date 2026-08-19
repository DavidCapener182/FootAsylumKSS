-- Harden the FootAsylum activity log into a trusted, append-only audit trail.

ALTER TABLE public.fa_activity_log
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS correlation_id uuid;

-- Existing rows pre-date source/correlation capture. Give every legacy event
-- an explicit provenance and a unique correlation identifier before applying
-- NOT NULL constraints.
UPDATE public.fa_activity_log
SET source = 'legacy'
WHERE source IS NULL;

UPDATE public.fa_activity_log
SET correlation_id = pg_catalog.gen_random_uuid()
WHERE correlation_id IS NULL;

ALTER TABLE public.fa_activity_log
  ALTER COLUMN source SET DEFAULT 'database_trigger',
  ALTER COLUMN source SET NOT NULL,
  ALTER COLUMN correlation_id SET DEFAULT pg_catalog.gen_random_uuid(),
  ALTER COLUMN correlation_id SET NOT NULL;

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.fa_activity_log'::pg_catalog.regclass
      AND conname = 'fa_activity_log_source_check'
  ) THEN
    ALTER TABLE public.fa_activity_log
      ADD CONSTRAINT fa_activity_log_source_check
      CHECK (source IN ('legacy', 'database_trigger', 'profile_trigger', 'server_action'));
  END IF;
END
$constraint$;

CREATE INDEX IF NOT EXISTS idx_fa_activity_log_correlation_id
  ON public.fa_activity_log (correlation_id);

-- Direct browser/API clients must never be able to forge or mutate audit rows.
-- Existing SELECT policies and grants are intentionally left intact.
DROP POLICY IF EXISTS "System can insert activity logs"
  ON public.fa_activity_log;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON TABLE public.fa_activity_log
  FROM PUBLIC, anon, authenticated;

REVOKE UPDATE, DELETE, TRUNCATE
  ON TABLE public.fa_activity_log
  FROM service_role;

GRANT INSERT
  ON TABLE public.fa_activity_log
  TO service_role;

-- Grants are defense in depth; this trigger also makes the table append-only
-- for privileged API roles. A future controlled maintenance migration can
-- explicitly disable the trigger inside its transaction if correction is ever
-- legally required.
CREATE OR REPLACE FUNCTION public.fa_reject_activity_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  RAISE EXCEPTION 'fa_activity_log is append-only; % is not permitted', TG_OP
    USING ERRCODE = '42501';
END
$function$;

REVOKE ALL ON FUNCTION public.fa_reject_activity_log_mutation()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS fa_activity_log_append_only
  ON public.fa_activity_log;

CREATE TRIGGER fa_activity_log_append_only
  BEFORE UPDATE OR DELETE ON public.fa_activity_log
  FOR EACH ROW
  EXECUTE FUNCTION public.fa_reject_activity_log_mutation();

-- Generic entity audit trigger. It is deliberately fail-closed: an audited
-- write without an authenticated actor is rejected rather than silently
-- creating an unattributable or missing event. Audit details contain only
-- changed field names and a small allowlist of operational values. Free text,
-- people/injury data, addresses, contact details, and document paths are never
-- copied into the permanent activity log.
CREATE OR REPLACE FUNCTION public.fa_log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  raw_old_data jsonb;
  raw_new_data jsonb;
  old_data jsonb;
  new_data jsonb;
  changed_fields text[];
  value_allowlist text[];
  action_type text;
  actor_id uuid;
  affected_entity_id uuid;
  affected_entity_type public.fa_entity_type;
BEGIN
  actor_id := auth.uid();

  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Audited writes require an authenticated actor'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' THEN
    action_type := 'CREATED';
    raw_old_data := '{}'::jsonb;
    raw_new_data := pg_catalog.to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'UPDATED';
    raw_old_data := pg_catalog.to_jsonb(OLD);
    raw_new_data := pg_catalog.to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'DELETED';
    raw_old_data := pg_catalog.to_jsonb(OLD);
    raw_new_data := '{}'::jsonb;
  ELSE
    RAISE EXCEPTION 'Unsupported audit operation: %', TG_OP;
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'fa_incidents' THEN
      affected_entity_type := 'incident'::public.fa_entity_type;
      value_allowlist := ARRAY[
        'reference_no', 'store_id', 'incident_category', 'severity',
        'occurred_at', 'reported_at', 'riddor_reportable', 'status',
        'assigned_investigator_user_id', 'target_close_date', 'closed_at'
      ];
    WHEN 'fa_investigations' THEN
      affected_entity_type := 'investigation'::public.fa_entity_type;
      value_allowlist := ARRAY[
        'incident_id', 'investigation_type', 'status',
        'lead_investigator_user_id', 'started_at', 'completed_at'
      ];
    WHEN 'fa_actions' THEN
      affected_entity_type := 'action'::public.fa_entity_type;
      value_allowlist := ARRAY[
        'incident_id', 'investigation_id', 'priority',
        'assigned_to_user_id', 'due_date', 'status',
        'evidence_required', 'completed_at'
      ];
    WHEN 'fa_stores' THEN
      affected_entity_type := 'store'::public.fa_entity_type;
      value_allowlist := ARRAY[
        'store_code', 'store_name', 'region', 'is_active',
        'compliance_audit_1_date', 'compliance_audit_1_overall_pct',
        'compliance_audit_2_date', 'compliance_audit_2_overall_pct',
        'compliance_audit_2_assigned_manager_user_id',
        'compliance_audit_2_planned_date', 'fire_risk_assessment_date',
        'fire_risk_assessment_pct', 'route_sequence', 'reporting_area'
      ];
    ELSE
      affected_entity_type := NULL;
      value_allowlist := ARRAY[]::text[];
  END CASE;

  IF affected_entity_type IS NULL THEN
    RAISE EXCEPTION 'Unsupported audit table: %', TG_TABLE_NAME;
  END IF;

  affected_entity_id := COALESCE(
    (raw_new_data ->> 'id')::uuid,
    (raw_old_data ->> 'id')::uuid
  );

  -- Include every changed column name so redacted fields still produce a
  -- meaningful audit event, but retain old/new values only for the explicit
  -- low-sensitivity allowlist above. For UPDATE, unchanged values are not
  -- duplicated into the log.
  SELECT COALESCE(pg_catalog.array_agg(field_name ORDER BY field_name), ARRAY[]::text[])
  INTO changed_fields
  FROM (
    SELECT pg_catalog.jsonb_object_keys(raw_old_data) AS field_name
    UNION
    SELECT pg_catalog.jsonb_object_keys(raw_new_data) AS field_name
  ) AS candidate_fields
  WHERE (raw_old_data -> field_name) IS DISTINCT FROM (raw_new_data -> field_name);

  SELECT COALESCE(
    pg_catalog.jsonb_object_agg(field_name, raw_old_data -> field_name),
    '{}'::jsonb
  )
  INTO old_data
  FROM pg_catalog.unnest(changed_fields) AS changed(field_name)
  WHERE field_name = ANY(value_allowlist)
    AND raw_old_data ? field_name;

  SELECT COALESCE(
    pg_catalog.jsonb_object_agg(field_name, raw_new_data -> field_name),
    '{}'::jsonb
  )
  INTO new_data
  FROM pg_catalog.unnest(changed_fields) AS changed(field_name)
  WHERE field_name = ANY(value_allowlist)
    AND raw_new_data ? field_name;

  INSERT INTO public.fa_activity_log (
    entity_type,
    entity_id,
    action,
    performed_by_user_id,
    details,
    source,
    correlation_id,
    created_at
  ) VALUES (
    affected_entity_type,
    affected_entity_id,
    action_type,
    actor_id,
    pg_catalog.jsonb_build_object(
      'changed_fields', pg_catalog.to_jsonb(changed_fields),
      'old', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE old_data END,
      'new', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE new_data END
    ),
    'database_trigger',
    pg_catalog.gen_random_uuid(),
    pg_catalog.statement_timestamp()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END
$function$;

REVOKE ALL ON FUNCTION public.fa_log_activity()
  FROM PUBLIC, anon, authenticated, service_role;

-- Profile auditing is intentionally separate from the generic entity trigger.
-- It observes every UPDATE so account-status fields introduced later are
-- captured without replacing the trigger. INSERT is excluded so trusted invite
-- provisioning is not blocked by the absence of an end-user JWT.
CREATE OR REPLACE FUNCTION public.fa_log_profile_security_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  actor_id uuid;
  old_data jsonb;
  new_data jsonb;
  changes jsonb := '{}'::jsonb;
  action_text text;
BEGIN
  actor_id := auth.uid();

  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Profile security changes require an authenticated actor'
      USING ERRCODE = '42501';
  END IF;

  old_data := pg_catalog.to_jsonb(OLD);
  new_data := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE pg_catalog.to_jsonb(NEW) END;

  IF TG_OP = 'DELETE' THEN
    action_text := 'Deleted user profile';
    changes := pg_catalog.jsonb_build_object(
      'role', pg_catalog.jsonb_build_object('old', old_data -> 'role', 'new', NULL),
      'account_status', pg_catalog.jsonb_build_object('old', old_data -> 'account_status', 'new', NULL)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF (old_data -> 'role') IS DISTINCT FROM (new_data -> 'role') THEN
      changes := changes || pg_catalog.jsonb_build_object(
        'role', pg_catalog.jsonb_build_object('old', old_data -> 'role', 'new', new_data -> 'role')
      );
    END IF;

    IF (old_data -> 'account_status') IS DISTINCT FROM (new_data -> 'account_status') THEN
      changes := changes || pg_catalog.jsonb_build_object(
        'account_status', pg_catalog.jsonb_build_object(
          'old', old_data -> 'account_status',
          'new', new_data -> 'account_status'
        )
      );
    END IF;

    IF changes = '{}'::jsonb THEN
      RETURN NEW;
    END IF;

    IF changes ? 'role' AND changes ? 'account_status' THEN
      action_text := 'Changed user role and account status';
    ELSIF changes ? 'role' THEN
      action_text := 'Changed user role';
    ELSE
      action_text := 'Changed user account status';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported profile audit operation: %', TG_OP;
  END IF;

  INSERT INTO public.fa_activity_log (
    entity_type,
    entity_id,
    action,
    performed_by_user_id,
    details,
    source,
    correlation_id,
    created_at
  ) VALUES (
    'user'::public.fa_entity_type,
    OLD.id,
    action_text,
    actor_id,
    -- Record only the security fields that changed. Profiles may contain home
    -- address or route-planning coordinates that do not belong in this log.
    pg_catalog.jsonb_build_object('changes', changes),
    'profile_trigger',
    pg_catalog.gen_random_uuid(),
    pg_catalog.statement_timestamp()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END
$function$;

REVOKE ALL ON FUNCTION public.fa_log_profile_security_change()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS fa_profiles_security_activity_log
  ON public.fa_profiles;

CREATE TRIGGER fa_profiles_security_activity_log
  AFTER UPDATE OR DELETE ON public.fa_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fa_log_profile_security_change();
