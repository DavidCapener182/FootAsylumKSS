-- UNAPPLIED ADDITIVE DRAFT. Apply only after fra_action_persistence.sql.
-- Read-only PDF extraction must be byte-verified before this import command is used.
-- The command records PDF action-plan rows as New with unknown historical completion.
-- It does not mark any item completed or verify that it remains outstanding today.
BEGIN;

ALTER TABLE public.fa_fra_actions
  ADD COLUMN historical_pdf_reference_kind text,
  ADD COLUMN historical_completion_unknown boolean NOT NULL DEFAULT false;

ALTER TABLE public.fa_fra_actions DROP CONSTRAINT fa_fra_actions_origin_check;
ALTER TABLE public.fa_fra_actions ADD CONSTRAINT fa_fra_actions_origin_check
  CHECK (source_origin IN ('historical_review','historical_pdf','confirmed_publication'));
ALTER TABLE public.fa_fra_actions DROP CONSTRAINT fa_fra_actions_origin_shape_check;
ALTER TABLE public.fa_fra_actions ADD CONSTRAINT fa_fra_actions_origin_shape_check CHECK (
  (source_origin = 'historical_review' AND source_review_id IS NOT NULL AND staging_key IS NOT NULL
    AND pdf_page IS NOT NULL AND pdf_row_ordinal IS NOT NULL AND publication_action_snapshot IS NULL
    AND historical_pdf_reference_kind IS NULL AND NOT historical_completion_unknown)
  OR (source_origin = 'historical_pdf' AND source_review_id IS NULL AND staging_key IS NULL
    AND publication_action_snapshot IS NULL AND pdf_page IS NOT NULL AND pdf_row_ordinal IS NOT NULL
    AND historical_pdf_reference_kind IN ('confirmed_publication_pdf','current_store_pdf_reference')
    AND historical_completion_unknown)
  OR (source_origin = 'confirmed_publication' AND source_review_id IS NULL AND staging_key IS NULL
    AND publication_id IS NOT NULL AND assessment_instance_id IS NOT NULL
    AND publication_action_snapshot IS NOT NULL AND jsonb_typeof(publication_action_snapshot) = 'object'
    AND historical_pdf_reference_kind IS NULL AND NOT historical_completion_unknown)
);

CREATE OR REPLACE FUNCTION fa_private.fra_assert_historical_pdf_action(p_action public.fa_fra_actions)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM fa_private.fra_assert_kss(p_action.created_by);
  IF p_action.status <> 'open' OR p_action.version <> 1
    OR p_action.verified_by IS NOT NULL OR p_action.verified_at IS NOT NULL
    OR p_action.target_date IS NOT NULL OR p_action.target_date_evidence_ref IS NOT NULL
    OR p_action.source_review_id IS NOT NULL OR p_action.staging_key IS NOT NULL
    OR p_action.pdf_page IS NULL OR p_action.pdf_row_ordinal IS NULL
    OR p_action.source_key IS DISTINCT FROM fa_private.fra_source_key(
      p_action.store_id,p_action.pdf_sha256,p_action.pdf_page,p_action.pdf_row_ordinal,p_action.recommendation)
  THEN RAISE EXCEPTION 'Historical PDF action identity or initial state invalid'; END IF;

  IF p_action.historical_pdf_reference_kind = 'confirmed_publication_pdf' THEN
    IF p_action.publication_id IS NULL OR p_action.assessment_instance_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.fa_fra_publications p WHERE p.id=p_action.publication_id
        AND p.confirmed_at IS NOT NULL AND p.store_id=p_action.store_id
        AND p.instance_id=p_action.assessment_instance_id AND p.pdf_path=p_action.pdf_path
        AND lower(p.pdf_sha256)=p_action.pdf_sha256
    ) THEN RAISE EXCEPTION 'Confirmed publication PDF identity mismatch'; END IF;
  ELSIF p_action.historical_pdf_reference_kind = 'current_store_pdf_reference' THEN
    IF p_action.publication_id IS NOT NULL OR p_action.assessment_instance_id IS NOT NULL OR NOT EXISTS (
      SELECT 1 FROM public.fa_stores s WHERE s.id=p_action.store_id
        AND s.fire_risk_assessment_pdf_path=p_action.pdf_path
    ) THEN RAISE EXCEPTION 'Current store FRA PDF reference changed'; END IF;
  ELSE
    RAISE EXCEPTION 'Historical PDF provenance required';
  END IF;
END $$;

-- Only the trusted server/import runner may call this. The RPC is idempotent by
-- physical PDF row, and refuses changed wording/priority at the same location.
CREATE FUNCTION public.fa_fra_import_historical_pdf_action(p_actor uuid, p_row jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_store uuid;
  v_hash text;
  v_page integer;
  v_ordinal integer;
  v_key text;
  v_existing public.fa_fra_actions;
  v_id uuid;
BEGIN
  PERFORM fa_private.fra_assert_kss(p_actor);
  IF jsonb_typeof(p_row) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'PDF row object required'; END IF;
  v_store := (p_row->>'storeId')::uuid;
  v_hash := lower(p_row->>'pdfSha256');
  v_page := (p_row->>'page')::integer;
  v_ordinal := (p_row->>'rowOrdinal')::integer;
  IF v_hash !~ '^[a-f0-9]{64}$' OR v_page < 1 OR v_ordinal < 1
    OR p_row->>'priority' NOT IN ('Low','Medium','High')
    OR length(btrim(p_row->>'wording')) NOT BETWEEN 1 AND 10000
    OR p_row->>'pdfPath' !~ '^(store|fra)/[A-Za-z0-9/_-]+\.pdf$'
    OR p_row->>'completionStatus' IS DISTINCT FROM 'unknown'
    OR p_row->>'provenance' NOT IN ('confirmed_publication_pdf','current_store_pdf_reference')
  THEN RAISE EXCEPTION 'Invalid PDF action row'; END IF;
  v_key := fa_private.fra_source_key(v_store,v_hash,v_page,v_ordinal,p_row->>'wording');
  IF p_row->>'sourceKey' IS DISTINCT FROM v_key THEN RAISE EXCEPTION 'PDF source key mismatch'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'fra-pdf:' || v_store::text || ':' || v_hash || ':' || v_page::text || ':' || v_ordinal::text,0));
  SELECT * INTO v_existing FROM public.fa_fra_actions
    WHERE store_id=v_store AND pdf_sha256=v_hash AND pdf_page=v_page AND pdf_row_ordinal=v_ordinal;
  IF FOUND THEN
    IF v_existing.source_origin <> 'historical_pdf' OR v_existing.source_key <> v_key
      OR v_existing.recommendation <> p_row->>'wording' OR v_existing.priority <> p_row->>'priority'
      OR v_existing.pdf_path <> p_row->>'pdfPath'
    THEN RAISE EXCEPTION 'PDF row already imported with different source details'; END IF;
    RETURN v_existing.id;
  END IF;
  INSERT INTO public.fa_fra_actions(store_id,source_origin,source_key,assessment_instance_id,publication_id,
    pdf_path,pdf_sha256,pdf_page,pdf_row_ordinal,recommendation,priority,status,created_by,
    historical_pdf_reference_kind,historical_completion_unknown)
  VALUES (v_store,'historical_pdf',v_key,(p_row->>'assessmentInstanceId')::uuid,
    (p_row->>'publicationId')::uuid,p_row->>'pdfPath',v_hash,v_page,v_ordinal,
    p_row->>'wording',p_row->>'priority','open',p_actor,p_row->>'provenance',true)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.fa_fra_import_historical_pdf_action(uuid,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fa_fra_import_historical_pdf_action(uuid,jsonb) TO service_role;

COMMENT ON COLUMN public.fa_fra_actions.historical_completion_unknown IS
  'Historical PDF row appeared in FRA Action Plan; completion at import time was not established.';
COMMIT;
