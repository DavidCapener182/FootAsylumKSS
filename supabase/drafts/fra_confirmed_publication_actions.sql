-- UNAPPLIED ADDITIVE DRAFT. Apply only after fra_action_persistence.sql and
-- after the print page and publication endpoint use one approved action snapshot.
-- Legacy publications have NULL snapshot fields and are never auto-imported.
BEGIN;

CREATE TABLE public.fa_fra_approved_action_plans (
  instance_id uuid PRIMARY KEY REFERENCES public.fa_audit_instances(id) ON DELETE RESTRICT,
  store_id uuid NOT NULL REFERENCES public.fa_stores(id) ON DELETE RESTRICT,
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  approved_by uuid NOT NULL REFERENCES public.fa_profiles(id) ON DELETE RESTRICT,
  approved_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (snapshot->>'fingerprint' = fingerprint),
  CHECK (snapshot->>'instanceId' = instance_id::text),
  CHECK (snapshot->>'storeId' = store_id::text)
);
ALTER TABLE public.fa_fra_approved_action_plans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fa_fra_approved_action_plans FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.fa_fra_approved_action_plans TO service_role;
CREATE FUNCTION fa_private.fra_validate_approved_action_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM fa_private.fra_assert_kss(NEW.approved_by);
  IF NEW.snapshot->>'approvedBy' IS DISTINCT FROM NEW.approved_by::text
    OR (NEW.snapshot->>'approvedAt')::timestamptz IS DISTINCT FROM NEW.approved_at
    OR jsonb_typeof(NEW.snapshot->'pdfRows') IS DISTINCT FROM 'array'
    OR jsonb_typeof(NEW.snapshot->'trackingRows') IS DISTINCT FROM 'array'
    OR NOT EXISTS (
      SELECT 1 FROM public.fa_audit_instances a
      JOIN public.fa_audit_templates t ON t.id = a.template_id
      WHERE a.id = NEW.instance_id AND a.store_id = NEW.store_id
        AND t.category::text = 'fire_risk_assessment'
    ) THEN RAISE EXCEPTION 'Approved action plan does not match the FRA'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER fa_fra_approved_action_plan_validate
  BEFORE INSERT ON public.fa_fra_approved_action_plans
  FOR EACH ROW EXECUTE FUNCTION fa_private.fra_validate_approved_action_plan();
CREATE TRIGGER fa_fra_approved_action_plans_immutable
  BEFORE UPDATE OR DELETE ON public.fa_fra_approved_action_plans
  FOR EACH ROW EXECUTE FUNCTION fa_private.fra_immutable();

ALTER TABLE public.fa_fra_publications
  ADD COLUMN action_snapshot jsonb,
  ADD COLUMN pdf_action_fingerprint text,
  ADD CONSTRAINT fa_fra_publication_action_binding CHECK (
    (action_snapshot IS NULL AND pdf_action_fingerprint IS NULL)
    OR (jsonb_typeof(action_snapshot) = 'object'
      AND pdf_action_fingerprint ~ '^[a-f0-9]{64}$'
      AND action_snapshot->>'fingerprint' = pdf_action_fingerprint)
  );

CREATE FUNCTION fa_private.fra_publication_action_binding_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.action_snapshot IS DISTINCT FROM OLD.action_snapshot
    OR NEW.pdf_action_fingerprint IS DISTINCT FROM OLD.pdf_action_fingerprint THEN
    RAISE EXCEPTION 'Issued PDF action binding cannot be changed';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER fa_fra_publication_action_binding_immutable
  BEFORE UPDATE ON public.fa_fra_publications
  FOR EACH ROW EXECUTE FUNCTION fa_private.fra_publication_action_binding_immutable();

CREATE OR REPLACE FUNCTION fa_private.fra_assert_publication_action(p_action public.fa_fra_actions)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  pub public.fa_fra_publications;
  approved_row jsonb;
BEGIN
  PERFORM fa_private.fra_assert_kss(p_action.created_by);
  SELECT * INTO STRICT pub FROM public.fa_fra_publications
    WHERE id = p_action.publication_id FOR SHARE;
  IF pub.confirmed_at IS NULL OR pub.action_snapshot IS NULL
    OR pub.pdf_action_fingerprint IS NULL
    OR pub.action_snapshot->>'fingerprint' IS DISTINCT FROM pub.pdf_action_fingerprint
    OR pub.instance_id IS DISTINCT FROM p_action.assessment_instance_id
    OR pub.store_id IS DISTINCT FROM p_action.store_id
    OR pub.pdf_path IS DISTINCT FROM p_action.pdf_path
    OR lower(pub.pdf_sha256) IS DISTINCT FROM p_action.pdf_sha256
    OR p_action.status <> 'open' OR p_action.version <> 1
    OR p_action.pdf_page IS NOT NULL OR p_action.pdf_row_ordinal IS NOT NULL
    OR p_action.source_review_id IS NOT NULL OR p_action.staging_key IS NOT NULL
    OR p_action.verified_by IS NOT NULL OR p_action.verified_at IS NOT NULL THEN
    RAISE EXCEPTION 'Publication action is not bound to an issued FRA';
  END IF;
  SELECT value INTO approved_row FROM jsonb_array_elements(pub.action_snapshot->'trackingRows')
    WHERE (value->>'sourceActionId')::uuid = p_action.source_action_id;
  IF approved_row IS NULL OR approved_row->>'kind' <> 'remedial'
    OR approved_row->>'recommendation' IS DISTINCT FROM p_action.recommendation
    OR approved_row->>'priority' IS DISTINCT FROM p_action.priority
    OR nullif(approved_row->>'targetDate','')::date IS DISTINCT FROM p_action.target_date
    OR p_action.publication_action_snapshot IS DISTINCT FROM approved_row
    OR p_action.source_key IS DISTINCT FROM pg_catalog.encode(pg_catalog.sha256(
      pg_catalog.convert_to(pub.id::text || ':' || p_action.source_action_id::text, 'UTF8')), 'hex')
    OR (p_action.target_date IS NOT NULL AND p_action.target_date_evidence_ref IS DISTINCT FROM 'approved_publication_snapshot') THEN
    RAISE EXCEPTION 'Action does not match the approved remedial PDF row';
  END IF;
END $$;

-- One RPC means a failed action insert rolls back publication confirmation too.
-- The caller must first verify the saved PDF hash and approved snapshot used
-- by the print renderer. This RPC rechecks the immutable database binding.
CREATE FUNCTION public.fa_confirm_fra_publication_with_actions(
  p_publication_id uuid, p_confirming_user uuid, p_assessment_time timestamptz
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  pub public.fa_fra_publications;
  action_row jsonb;
  action_id uuid;
  expected_count integer;
BEGIN
  PERFORM fa_private.fra_assert_kss(p_confirming_user);
  SELECT * INTO STRICT pub FROM public.fa_fra_publications
    WHERE id = p_publication_id FOR UPDATE;
  IF pub.action_snapshot IS NULL OR pub.pdf_action_fingerprint IS NULL
    OR pub.action_snapshot->>'fingerprint' IS DISTINCT FROM pub.pdf_action_fingerprint
    OR pub.action_snapshot->>'instanceId' IS DISTINCT FROM pub.instance_id::text
    OR pub.action_snapshot->>'storeId' IS DISTINCT FROM pub.store_id::text
    OR coalesce(pub.action_snapshot->>'approvedBy','') = ''
    OR coalesce(pub.action_snapshot->>'approvedAt','') = ''
    OR jsonb_typeof(pub.action_snapshot->'pdfRows') IS DISTINCT FROM 'array'
    OR jsonb_typeof(pub.action_snapshot->'trackingRows') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Approved PDF action snapshot is required';
  END IF;
  PERFORM fa_private.fra_assert_kss((pub.action_snapshot->>'approvedBy')::uuid);
  IF pub.action_snapshot->'trackingRows' IS DISTINCT FROM (
    SELECT coalesce(jsonb_agg(p.value ORDER BY p.ordinality), '[]'::jsonb)
    FROM jsonb_array_elements(pub.action_snapshot->'pdfRows') WITH ORDINALITY AS p(value, ordinality)
    WHERE p.value->>'kind' = 'remedial'
  ) THEN RAISE EXCEPTION 'Tracked actions must exactly match remedial PDF rows'; END IF;
  SELECT count(*) INTO expected_count FROM jsonb_array_elements(pub.action_snapshot->'trackingRows');
  IF expected_count <> (
    SELECT count(DISTINCT value->>'sourceActionId')
    FROM jsonb_array_elements(pub.action_snapshot->'trackingRows')
  ) THEN RAISE EXCEPTION 'Duplicate source action ID'; END IF;

  IF pub.confirmed_at IS NULL THEN
    PERFORM public.fa_confirm_fra_publication(p_publication_id,p_confirming_user,p_assessment_time);
  END IF;
  FOR action_row IN SELECT value FROM jsonb_array_elements(pub.action_snapshot->'trackingRows') LOOP
    INSERT INTO public.fa_fra_actions (
      store_id, source_origin, publication_action_snapshot, source_action_id,
      source_key, assessment_instance_id, publication_id, pdf_path, pdf_sha256,
      recommendation, priority, target_date, target_date_evidence_ref, created_by
    ) VALUES (
      pub.store_id, 'confirmed_publication', action_row,
      (action_row->>'sourceActionId')::uuid,
      pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
        pub.id::text || ':' || (action_row->>'sourceActionId')::uuid::text, 'UTF8')), 'hex'),
      pub.instance_id, pub.id, pub.pdf_path, lower(pub.pdf_sha256),
      action_row->>'recommendation', action_row->>'priority',
      nullif(action_row->>'targetDate','')::date,
      CASE WHEN action_row ? 'targetDate' THEN 'approved_publication_snapshot' ELSE NULL END,
      p_confirming_user
    ) ON CONFLICT (publication_id, source_action_id) DO NOTHING RETURNING id INTO action_id;
    IF action_id IS NULL AND NOT EXISTS (
      SELECT 1 FROM public.fa_fra_actions a WHERE a.publication_id = pub.id
        AND a.source_action_id = (action_row->>'sourceActionId')::uuid
        AND a.source_origin = 'confirmed_publication'
        AND a.publication_action_snapshot = action_row
    ) THEN RAISE EXCEPTION 'Publication action retry changed an existing row'; END IF;
    action_id := NULL;
  END LOOP;
  IF (SELECT count(*) FROM public.fa_fra_actions a WHERE a.publication_id = pub.id
      AND a.source_origin = 'confirmed_publication') <> expected_count THEN
    RAISE EXCEPTION 'Publication action count mismatch';
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.fa_confirm_fra_publication_with_actions(uuid,uuid,timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fa_confirm_fra_publication_with_actions(uuid,uuid,timestamptz)
  TO service_role;
REVOKE ALL ON FUNCTION fa_private.fra_assert_publication_action(public.fa_fra_actions)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION fa_private.fra_assert_publication_action(public.fa_fra_actions)
  TO service_role;
REVOKE ALL ON FUNCTION fa_private.fra_publication_action_binding_immutable()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION fa_private.fra_publication_action_binding_immutable()
  TO service_role;
REVOKE ALL ON FUNCTION fa_private.fra_validate_approved_action_plan()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION fa_private.fra_validate_approved_action_plan()
  TO service_role;
COMMIT;
