-- UNAPPLIED DRAFT. Depends on fra_action_persistence.sql,
-- fra_client_roles.sql, fra_client_hierarchy.sql and the publication/PDF
-- origin extensions. Apply only after cross-role RLS and command tests.
-- RPCs are callable by service_role ONLY. The server must derive p_actor from
-- a fresh authenticated session, never from request JSON.
BEGIN;

ALTER TABLE public.fa_fra_actions DROP CONSTRAINT IF EXISTS fa_fra_actions_status_check;
ALTER TABLE public.fa_fra_actions ADD CONSTRAINT fa_fra_actions_status_check
  CHECK (status IN ('open','acknowledged','work_ordered','visit_booked','work_completed',
    'awaiting_verification','further_action_required','verified_closed'));
ALTER TABLE public.fa_fra_action_events DROP CONSTRAINT IF EXISTS fa_fra_action_events_event_type_check;
ALTER TABLE public.fa_fra_action_events ADD CONSTRAINT fa_fra_action_events_event_type_check
  CHECK (event_type IN ('historical_action_migrated','historical_pdf_imported',
    'publication_action_created','acknowledged','approach_recorded',
    'evidence_submitted','kss_verified_closed'));
ALTER TABLE public.fa_fra_action_events DROP CONSTRAINT IF EXISTS fa_fra_action_events_resulting_version_check;
ALTER TABLE public.fa_fra_action_events ADD CONSTRAINT fa_fra_action_events_resulting_version_check
  CHECK (resulting_version > 0);
GRANT UPDATE ON public.fa_fra_actions TO service_role;

CREATE TABLE public.fa_fra_action_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.fa_fra_actions(id) ON DELETE RESTRICT,
  storage_path text NOT NULL UNIQUE CHECK (length(storage_path) BETWEEN 40 AND 300),
  submitted_by uuid NOT NULL REFERENCES public.fa_profiles(id) ON DELETE RESTRICT,
  action_version integer NOT NULL CHECK (action_version > 1),
  note text CHECK (note IS NULL OR length(btrim(note)) BETWEEN 1 AND 5000),
  submitted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (action_id, action_version)
);
ALTER TABLE public.fa_fra_action_evidence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fa_fra_action_evidence FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.fa_fra_action_evidence TO authenticated;
GRANT SELECT, INSERT ON public.fa_fra_action_evidence TO service_role;
CREATE POLICY fra_evidence_kss_read ON public.fa_fra_action_evidence
  FOR SELECT TO authenticated USING (
    fa_private.get_user_role((SELECT auth.uid()))::text IN ('admin','ops')
  );

-- Provision the isolated private `fa-fra-action-evidence` bucket through the
-- Supabase Storage API before enabling uploads: 10 MiB max; JPEG, PNG, WebP
-- and PDF only. Add no direct authenticated object policies. The application
-- uploads through its scoped server endpoint and issues scoped signed reads.

CREATE FUNCTION fa_private.fra_assert_area_manager(p_actor uuid, p_store uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM 1
  FROM public.fa_profiles p
  JOIN public.fa_client_memberships m ON m.user_id=p.id
  JOIN public.fa_client_store_memberships s ON s.client_id=m.client_id AND s.store_id=p_store
  JOIN public.fa_client_area_assignments aa ON aa.user_id=p.id
    AND aa.client_id=m.client_id AND aa.area_id=s.area_id
  WHERE p.id=p_actor AND p.role::text='area_manager' AND p.account_status::text='active'
    AND m.access_level='area_manager' AND m.is_active AND s.manager_visible
  FOR SHARE OF p,m,s,aa;
  IF NOT FOUND THEN RAISE EXCEPTION 'Area Manager is not assigned to this store' USING ERRCODE='42501'; END IF;
END $$;

CREATE FUNCTION fa_private.fra_assert_kss_verifier(p_actor uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM 1 FROM public.fa_profiles p
  WHERE p.id=p_actor AND p.role::text IN ('admin','ops')
    AND p.account_status::text='active'
  FOR SHARE OF p;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active KSS admin or ops verifier required' USING ERRCODE='42501'; END IF;
END $$;

-- Only the versioned commands may change lifecycle fields. Existing action
-- provenance stays immutable and DELETE remains forbidden.
CREATE FUNCTION fa_private.fra_guard_action_workflow() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'FRA actions cannot be deleted' USING ERRCODE='42501'; END IF;
  IF pg_catalog.current_setting('fa.fra_action_command',true) IS DISTINCT FROM 'on'
    OR NEW.version IS DISTINCT FROM OLD.version+1
    OR (pg_catalog.to_jsonb(NEW) - ARRAY['status','version','verified_by','verified_at'])
       IS DISTINCT FROM (pg_catalog.to_jsonb(OLD) - ARRAY['status','version','verified_by','verified_at']) THEN
    RAISE EXCEPTION 'Use a versioned FRA action command' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS fa_fra_actions_immutable ON public.fa_fra_actions;
CREATE TRIGGER fa_fra_actions_workflow_guard BEFORE UPDATE OR DELETE ON public.fa_fra_actions
  FOR EACH ROW EXECUTE FUNCTION fa_private.fra_guard_action_workflow();

CREATE FUNCTION fa_private.fra_lock_action(p_action_id uuid, p_expected_version integer)
RETURNS public.fa_fra_actions LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE a public.fa_fra_actions;
BEGIN
  IF p_expected_version IS NULL OR p_expected_version < 1 THEN RAISE EXCEPTION 'Expected version required'; END IF;
  SELECT * INTO a FROM public.fa_fra_actions WHERE id=p_action_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FRA action not found' USING ERRCODE='P0002'; END IF;
  IF a.version <> p_expected_version THEN RAISE EXCEPTION 'FRA action changed; reload before saving' USING ERRCODE='40001'; END IF;
  RETURN a;
END $$;

CREATE FUNCTION public.fa_fra_acknowledge_action(p_actor uuid,p_action_id uuid,p_expected_version integer)
RETURNS TABLE(status text,version integer) LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE a public.fa_fra_actions;
BEGIN
  a := fa_private.fra_lock_action(p_action_id,p_expected_version);
  PERFORM fa_private.fra_assert_area_manager(p_actor,a.store_id);
  IF a.status <> 'open' THEN RAISE EXCEPTION 'Action cannot be acknowledged from this stage'; END IF;
  PERFORM pg_catalog.set_config('fa.fra_action_command','on',true);
  UPDATE public.fa_fra_actions SET status='acknowledged',version=a.version+1 WHERE id=a.id;
  INSERT INTO public.fa_fra_action_events(action_id,event_type,actor_id,resulting_version,payload)
    VALUES(a.id,'acknowledged',p_actor,a.version+1,'{}'::jsonb);
  RETURN QUERY SELECT 'acknowledged'::text,a.version+1;
END $$;

CREATE FUNCTION public.fa_fra_set_action_approach(p_actor uuid,p_action_id uuid,p_expected_version integer,
  p_approach text,p_booked_date date,p_contractor text,p_note text)
RETURNS TABLE(status text,version integer) LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE a public.fa_fra_actions; next_status text;
BEGIN
  a := fa_private.fra_lock_action(p_action_id,p_expected_version);
  PERFORM fa_private.fra_assert_area_manager(p_actor,a.store_id);
  IF a.status <> 'acknowledged' THEN RAISE EXCEPTION 'Acknowledge this action first'; END IF;
  IF p_approach NOT IN ('repair','make_safe','management','other') THEN RAISE EXCEPTION 'Invalid approach'; END IF;
  IF p_approach='repair' THEN
    IF p_booked_date IS NULL OR p_booked_date < current_date
      OR length(btrim(coalesce(p_contractor,''))) NOT BETWEEN 1 AND 200 THEN
      RAISE EXCEPTION 'Booking date and contractor are required';
    END IF;
    next_status := 'visit_booked';
  ELSE
    IF length(btrim(coalesce(p_note,''))) NOT BETWEEN 1 AND 5000 THEN
      RAISE EXCEPTION 'Describe what was done';
    END IF;
    IF p_booked_date IS NOT NULL OR p_contractor IS NOT NULL THEN RAISE EXCEPTION 'Booking fields are only for repair work'; END IF;
    next_status := 'work_completed';
  END IF;
  IF p_note IS NOT NULL AND length(p_note)>5000 THEN RAISE EXCEPTION 'Note too long'; END IF;
  PERFORM pg_catalog.set_config('fa.fra_action_command','on',true);
  UPDATE public.fa_fra_actions SET status=next_status,version=a.version+1 WHERE id=a.id;
  INSERT INTO public.fa_fra_action_events(action_id,event_type,actor_id,resulting_version,payload)
    VALUES(a.id,'approach_recorded',p_actor,a.version+1,
      pg_catalog.jsonb_build_object('approach',p_approach,'bookedDate',p_booked_date,'contractor',nullif(btrim(p_contractor),''),'note',nullif(btrim(p_note),'')));
  RETURN QUERY SELECT next_status,a.version+1;
END $$;

CREATE FUNCTION public.fa_fra_submit_action_evidence(p_actor uuid,p_action_id uuid,p_expected_version integer,
  p_storage_path text,p_note text)
RETURNS TABLE(status text,version integer) LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE a public.fa_fra_actions;
BEGIN
  a := fa_private.fra_lock_action(p_action_id,p_expected_version);
  PERFORM fa_private.fra_assert_area_manager(p_actor,a.store_id);
  IF a.status NOT IN ('visit_booked','work_completed') THEN RAISE EXCEPTION 'Record the action taken before evidence'; END IF;
  IF p_storage_path IS NULL OR p_storage_path !~
    ('^' || a.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|pdf)$') THEN
    RAISE EXCEPTION 'Invalid evidence path';
  END IF;
  IF p_note IS NOT NULL AND length(btrim(p_note)) NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'Invalid evidence note'; END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects o
    WHERE o.bucket_id='fa-fra-action-evidence' AND o.name=p_storage_path) THEN
    RAISE EXCEPTION 'Evidence object has not been uploaded';
  END IF;
  PERFORM pg_catalog.set_config('fa.fra_action_command','on',true);
  UPDATE public.fa_fra_actions SET status='awaiting_verification',version=a.version+1 WHERE id=a.id;
  INSERT INTO public.fa_fra_action_evidence(action_id,storage_path,submitted_by,action_version,note)
    VALUES(a.id,p_storage_path,p_actor,a.version+1,nullif(btrim(p_note),''));
  INSERT INTO public.fa_fra_action_events(action_id,event_type,actor_id,resulting_version,payload)
    VALUES(a.id,'evidence_submitted',p_actor,a.version+1,
      pg_catalog.jsonb_build_object('evidencePath',p_storage_path,'note',nullif(btrim(p_note),'')));
  RETURN QUERY SELECT 'awaiting_verification'::text,a.version+1;
END $$;

CREATE FUNCTION public.fa_fra_verify_close_action(p_actor uuid,p_action_id uuid,p_expected_version integer,
  p_verification_note text)
RETURNS TABLE(status text,version integer) LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE a public.fa_fra_actions;
BEGIN
  a := fa_private.fra_lock_action(p_action_id,p_expected_version);
  PERFORM fa_private.fra_assert_kss_verifier(p_actor);
  IF a.status <> 'awaiting_verification' THEN RAISE EXCEPTION 'Evidence review required before closure'; END IF;
  IF length(btrim(coalesce(p_verification_note,''))) NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'KSS verification note required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.fa_fra_action_evidence e WHERE e.action_id=a.id AND e.action_version=a.version) THEN
    RAISE EXCEPTION 'Submitted evidence missing';
  END IF;
  PERFORM pg_catalog.set_config('fa.fra_action_command','on',true);
  UPDATE public.fa_fra_actions SET status='verified_closed',version=a.version+1,
    verified_by=p_actor,verified_at=clock_timestamp() WHERE id=a.id;
  INSERT INTO public.fa_fra_action_events(action_id,event_type,actor_id,resulting_version,payload)
    VALUES(a.id,'kss_verified_closed',p_actor,a.version+1,
      pg_catalog.jsonb_build_object('verificationNote',btrim(p_verification_note)));
  RETURN QUERY SELECT 'verified_closed'::text,a.version+1;
END $$;

REVOKE ALL ON FUNCTION fa_private.fra_assert_area_manager(uuid,uuid),fa_private.fra_assert_kss_verifier(uuid),
  fa_private.fra_guard_action_workflow(),fa_private.fra_lock_action(uuid,integer)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION fa_private.fra_assert_area_manager(uuid,uuid),fa_private.fra_assert_kss_verifier(uuid),
  fa_private.fra_guard_action_workflow(),fa_private.fra_lock_action(uuid,integer) TO service_role;
REVOKE ALL ON FUNCTION public.fa_fra_acknowledge_action(uuid,uuid,integer),
  public.fa_fra_set_action_approach(uuid,uuid,integer,text,date,text,text),
  public.fa_fra_submit_action_evidence(uuid,uuid,integer,text,text),
  public.fa_fra_verify_close_action(uuid,uuid,integer,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fa_fra_acknowledge_action(uuid,uuid,integer),
  public.fa_fra_set_action_approach(uuid,uuid,integer,text,date,text,text),
  public.fa_fra_submit_action_evidence(uuid,uuid,integer,text,text),
  public.fa_fra_verify_close_action(uuid,uuid,integer,text) TO service_role;

COMMENT ON TABLE public.fa_fra_actions IS 'Verified FRA actions with versioned Area Manager progress and explicit KSS H&S verification.';
COMMIT;
