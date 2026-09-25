-- Additive FRA action schema. Locally tested against PGlite and checked against
-- the linked project's existing table/column catalog before rollout.
-- Historical source binding requires a freshly generated candidate with
-- sourceItemJson. The existing 2026-09-25 inventory lacks this field and
-- intentionally fails closed. The stored-response review/import endpoint must
-- remain disabled until trusted candidate lookup and issued-PDF verification.
-- Initial KSS-only persistence. Client/manager reads and all direct writes are
-- denied until the separately reviewed hierarchy/operational-leak rollout.
BEGIN;

CREATE SCHEMA IF NOT EXISTS fa_private;

CREATE TABLE public.fa_fra_historical_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  staging_key text NOT NULL CHECK (length(btrim(staging_key)) BETWEEN 1 AND 1000),
  store_id uuid NOT NULL REFERENCES public.fa_stores(id) ON DELETE RESTRICT,
  source_item_sha256 text NOT NULL CHECK (source_item_sha256 ~ '^[a-f0-9]{64}$'),
  assessment_instance_id uuid REFERENCES public.fa_audit_instances(id) ON DELETE RESTRICT,
  publication_id uuid REFERENCES public.fa_fra_publications(id) ON DELETE RESTRICT,
  decision text NOT NULL CHECK (decision IN ('open_migrate','closed_archive','routine_exclude','duplicate_link','not_fra_exclude','needs_evidence')),
  migration_eligible boolean GENERATED ALWAYS AS (decision = 'open_migrate') STORED,
  candidate_snapshot jsonb NOT NULL CHECK (jsonb_typeof(candidate_snapshot) = 'object'),
  review_data jsonb NOT NULL CHECK (jsonb_typeof(review_data) = 'object'),
  request_payload jsonb NOT NULL,
  reviewed_by uuid NOT NULL REFERENCES public.fa_profiles(id) ON DELETE RESTRICT,
  reviewed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  idempotency_key uuid NOT NULL,
  supersedes_review_id uuid REFERENCES public.fa_fra_historical_reviews(id) ON DELETE RESTRICT,
  UNIQUE (reviewed_by, idempotency_key)
);
CREATE INDEX fa_fra_reviews_latest ON public.fa_fra_historical_reviews(staging_key, review_sequence DESC);
CREATE INDEX fa_fra_reviews_store ON public.fa_fra_historical_reviews(store_id);
CREATE INDEX fa_fra_reviews_instance ON public.fa_fra_historical_reviews(assessment_instance_id);
CREATE INDEX fa_fra_reviews_publication ON public.fa_fra_historical_reviews(publication_id);
CREATE INDEX fa_fra_reviews_supersedes ON public.fa_fra_historical_reviews(supersedes_review_id);

CREATE TABLE public.fa_fra_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.fa_stores(id) ON DELETE RESTRICT,
  source_origin text NOT NULL DEFAULT 'historical_review' CONSTRAINT fa_fra_actions_origin_check
    CHECK (source_origin IN ('historical_review','confirmed_publication')),
  source_review_id uuid UNIQUE REFERENCES public.fa_fra_historical_reviews(id) ON DELETE RESTRICT,
  staging_key text UNIQUE,
  publication_action_snapshot jsonb,
  source_action_id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE CHECK (source_key ~ '^[a-f0-9]{64}$'),
  assessment_instance_id uuid REFERENCES public.fa_audit_instances(id) ON DELETE RESTRICT,
  publication_id uuid REFERENCES public.fa_fra_publications(id) ON DELETE RESTRICT,
  pdf_path text NOT NULL,
  pdf_sha256 text NOT NULL CHECK (pdf_sha256 ~ '^[a-f0-9]{64}$'),
  pdf_page integer CHECK (pdf_page > 0),
  pdf_row_ordinal integer CHECK (pdf_row_ordinal > 0),
  recommendation text NOT NULL CHECK (length(btrim(recommendation)) BETWEEN 1 AND 10000),
  priority text NOT NULL CHECK (priority IN ('Low','Medium','High')),
  target_date date,
  target_date_evidence_ref text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','work_ordered','visit_booked','work_completed','awaiting_verification','further_action_required','verified_closed')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid NOT NULL REFERENCES public.fa_profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  verified_by uuid REFERENCES public.fa_profiles(id) ON DELETE RESTRICT,
  verified_at timestamptz,
  CONSTRAINT fa_fra_actions_origin_shape_check CHECK ((source_origin = 'historical_review' AND source_review_id IS NOT NULL AND staging_key IS NOT NULL
      AND pdf_page IS NOT NULL AND pdf_row_ordinal IS NOT NULL AND publication_action_snapshot IS NULL)
    OR (source_origin = 'confirmed_publication' AND source_review_id IS NULL AND staging_key IS NULL
      AND publication_id IS NOT NULL AND assessment_instance_id IS NOT NULL
      AND publication_action_snapshot IS NOT NULL AND jsonb_typeof(publication_action_snapshot) = 'object')),
  CHECK (target_date IS NULL OR (target_date_evidence_ref IS NOT NULL AND length(btrim(target_date_evidence_ref)) > 0)),
  CHECK ((status = 'verified_closed' AND verified_by IS NOT NULL AND verified_at IS NOT NULL)
    OR (status <> 'verified_closed' AND verified_by IS NULL AND verified_at IS NULL)),
  UNIQUE (publication_id, source_action_id),
  UNIQUE (store_id, pdf_sha256, pdf_page, pdf_row_ordinal)
);
CREATE INDEX fa_fra_actions_store_status ON public.fa_fra_actions(store_id, status);
CREATE INDEX fa_fra_actions_instance ON public.fa_fra_actions(assessment_instance_id);
CREATE INDEX fa_fra_actions_created_by ON public.fa_fra_actions(created_by);
CREATE INDEX fa_fra_actions_verified_by ON public.fa_fra_actions(verified_by);

CREATE TABLE public.fa_fra_action_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.fa_fra_actions(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('historical_action_migrated','historical_pdf_imported','publication_action_created')),
  actor_id uuid NOT NULL REFERENCES public.fa_profiles(id) ON DELETE RESTRICT,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  resulting_version integer NOT NULL CHECK (resulting_version = 1),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  UNIQUE (action_id, resulting_version)
);
CREATE INDEX fa_fra_events_actor ON public.fa_fra_action_events(actor_id);

-- Queue B is source discovery, never an invented action/candidate.
CREATE TABLE public.fa_fra_source_investigations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.fa_stores(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('needs_source','pdf_located','source_verified')),
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 10000),
  evidence_ref text NOT NULL CHECK (length(btrim(evidence_ref)) > 0),
  missing_evidence_reason text,
  issued_pdf_verified boolean NOT NULL DEFAULT false,
  source_reference text,
  pdf_sha256 text CHECK (pdf_sha256 ~ '^[a-f0-9]{64}$'),
  reviewed_by uuid NOT NULL REFERENCES public.fa_profiles(id) ON DELETE RESTRICT,
  reviewed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  idempotency_key uuid NOT NULL,
  request_payload jsonb NOT NULL,
  UNIQUE (reviewed_by, idempotency_key),
  CHECK (status = 'needs_source' OR (source_reference IS NOT NULL AND length(btrim(source_reference)) > 0 AND pdf_sha256 IS NOT NULL)),
  CHECK (status <> 'source_verified' OR issued_pdf_verified),
  CHECK (status <> 'needs_source' OR (missing_evidence_reason IS NOT NULL AND length(btrim(missing_evidence_reason)) > 0))
);
CREATE INDEX fa_fra_investigations_store ON public.fa_fra_source_investigations(store_id, reviewed_at DESC);

CREATE FUNCTION fa_private.fra_assert_kss(p_actor uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  -- Row lock prevents a completed account revocation racing a checked command.
  PERFORM 1 FROM public.fa_profiles
    WHERE id = p_actor AND account_status::text = 'active' AND role::text IN ('admin','ops')
    FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active KSS reviewer required' USING ERRCODE = '42501'; END IF;
END $$;

CREATE FUNCTION fa_private.fra_immutable() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'FRA provenance and history are immutable; append a new review' USING ERRCODE = '42501';
END $$;

CREATE FUNCTION fa_private.fra_source_key(p_store uuid, p_hash text, p_page integer, p_row integer, p_wording text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT SECURITY INVOKER SET search_path = '' AS $$
  SELECT pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
    '{"storeId":' || pg_catalog.to_jsonb(p_store::text)::text ||
    ',"pdfSha256":' || pg_catalog.to_jsonb(lower(p_hash))::text ||
    ',"page":' || p_page::text || ',"rowOrdinal":' || p_row::text ||
    ',"wording":' || pg_catalog.to_jsonb(p_wording)::text || '}', 'UTF8')), 'hex');
$$;

CREATE FUNCTION fa_private.fra_assert_stored_source(p_candidate jsonb) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  source public.fa_audit_responses;
  source_item jsonb;
  raw_item text := p_candidate->>'sourceItemJson';
  item_index integer;
  item_count integer;
BEGIN
  IF coalesce(p_candidate->>'sourceOrdinal','') !~ '^[1-9][0-9]{0,5}$'
    OR coalesce(p_candidate->>'responseId','') !~ '^[0-9a-fA-F-]{36}$'
    OR coalesce(p_candidate->>'assessmentInstanceId','') !~ '^[0-9a-fA-F-]{36}$'
    OR coalesce(length(raw_item),0) NOT BETWEEN 2 AND 100000 THEN
    RAISE EXCEPTION 'Stored source identity required';
  END IF;
  item_index := (p_candidate->>'sourceOrdinal')::integer - 1;
  IF p_candidate->>'sourceJsonPath' IS DISTINCT FROM 'fra_extracted_data.actionPlanItems[' || item_index || ']'
    OR p_candidate->>'stagingKey' IS DISTINCT FROM
      ((p_candidate->>'assessmentInstanceId') || ':' || (p_candidate->>'responseId') || ':' || (p_candidate->>'sourceOrdinal')) THEN
    RAISE EXCEPTION 'Stored source path or staging identity mismatch';
  END IF;
  IF lower(p_candidate->>'sourceItemSha256') IS DISTINCT FROM
    pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(raw_item,'UTF8')),'hex') THEN
    RAISE EXCEPTION 'Stored source serialization hash mismatch';
  END IF;
  SELECT r.* INTO source FROM public.fa_audit_responses r
    WHERE r.id=(p_candidate->>'responseId')::uuid
      AND r.audit_instance_id=(p_candidate->>'assessmentInstanceId')::uuid FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stored FRA response missing or moved'; END IF;
  IF pg_catalog.jsonb_typeof(source.response_json #> '{fra_extracted_data,actionPlanItems}') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Stored FRA action array missing';
  END IF;
  item_count := pg_catalog.jsonb_array_length(source.response_json #> '{fra_extracted_data,actionPlanItems}');
  IF item_index >= item_count THEN RAISE EXCEPTION 'Stored FRA action ordinal missing'; END IF;
  source_item := source.response_json #> ARRAY['fra_extracted_data','actionPlanItems',item_index::text];
  IF source_item IS DISTINCT FROM raw_item::jsonb
    OR p_candidate->>'recommendation' IS DISTINCT FROM source_item->>'recommendation'
    OR p_candidate->>'priority' IS DISTINCT FROM source_item->>'priority' THEN
    RAISE EXCEPTION 'Stored FRA action item changed';
  END IF;
END $$;

CREATE FUNCTION fa_private.fra_validate_review() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  d jsonb := NEW.review_data;
  issued jsonb := d->'issuedFra';
  pub public.fa_fra_publications;
  prev public.fa_fra_historical_reviews;
  check_name text;
BEGIN
  PERFORM fa_private.fra_assert_kss(NEW.reviewed_by);
  IF jsonb_typeof(d->'reason') IS DISTINCT FROM 'string' OR length(btrim(d->>'reason')) NOT BETWEEN 1 AND 10000 THEN
    RAISE EXCEPTION 'Review reason required';
  END IF;
  IF d->>'caseId' IS DISTINCT FROM 'fra-action:' || NEW.staging_key
    OR d->>'storeId' IS DISTINCT FROM NEW.store_id::text
    OR NEW.candidate_snapshot->>'stagingKey' IS DISTINCT FROM NEW.staging_key
    OR NEW.candidate_snapshot->>'storeId' IS DISTINCT FROM NEW.store_id::text
    OR d->>'stagingKey' IS DISTINCT FROM NEW.staging_key
    OR d->>'assessmentInstanceId' IS DISTINCT FROM NEW.candidate_snapshot->>'assessmentInstanceId'
    OR d->>'publicationId' IS DISTINCT FROM NEW.candidate_snapshot->>'publicationId'
    OR d->>'sourceItemSha256' IS DISTINCT FROM NEW.candidate_snapshot->>'sourceItemSha256'
    OR NEW.source_item_sha256 IS DISTINCT FROM lower(NEW.candidate_snapshot->>'sourceItemSha256')
    OR NEW.assessment_instance_id IS DISTINCT FROM (NEW.candidate_snapshot->>'assessmentInstanceId')::uuid
    OR NEW.publication_id IS DISTINCT FROM (NEW.candidate_snapshot->>'publicationId')::uuid THEN
    RAISE EXCEPTION 'Candidate identity mismatch';
  END IF;
  IF octet_length(d::text) > 100000 OR octet_length(NEW.candidate_snapshot::text) > 100000 THEN
    RAISE EXCEPTION 'Review payload too large';
  END IF;
  IF NEW.supersedes_review_id IS NOT NULL THEN
    SELECT * INTO STRICT prev FROM public.fa_fra_historical_reviews WHERE id = NEW.supersedes_review_id;
    IF prev.staging_key <> NEW.staging_key OR prev.store_id <> NEW.store_id
      OR prev.source_item_sha256 IS DISTINCT FROM NEW.source_item_sha256
      OR prev.assessment_instance_id IS DISTINCT FROM NEW.assessment_instance_id
      OR prev.publication_id IS DISTINCT FROM NEW.publication_id THEN RAISE EXCEPTION 'Invalid review chain'; END IF;
  END IF;
  IF NEW.assessment_instance_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.fa_audit_instances a JOIN public.fa_audit_templates t ON t.id = a.template_id
    WHERE a.id = NEW.assessment_instance_id AND a.store_id = NEW.store_id AND t.category::text = 'fire_risk_assessment'
  ) THEN RAISE EXCEPTION 'Source must be an FRA for the reviewed store'; END IF;
  PERFORM fa_private.fra_assert_stored_source(NEW.candidate_snapshot);
  IF NEW.publication_id IS NOT NULL THEN
    SELECT * INTO STRICT pub FROM public.fa_fra_publications WHERE id = NEW.publication_id FOR SHARE;
    IF pub.store_id <> NEW.store_id OR pub.confirmed_at IS NULL
      OR pub.instance_id IS DISTINCT FROM NEW.assessment_instance_id THEN RAISE EXCEPTION 'Invalid issued publication'; END IF;
  END IF;
  IF NEW.decision = 'needs_evidence' THEN
    IF coalesce(length(btrim(d->>'missingEvidenceReason')),0) = 0 THEN RAISE EXCEPTION 'Missing evidence reason required'; END IF;
    -- Deliberately no PDF/hash/completion requirement for an unresolved review.
  ELSE
    FOREACH check_name IN ARRAY ARRAY['issuedPdfVerified','fraOriginVerified','notFraOriginVerified','remedialVerified','routineVerified',
      'outstandingVerified','completedVerified','completionEvidenceChecked','duplicateChecked','priorityAndTargetChecked'] LOOP
      IF jsonb_typeof(d->'checks'->check_name) IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Explicit review check required: %', check_name; END IF;
    END LOOP;
  END IF;
  IF NEW.decision = 'not_fra_exclude' AND (d->'checks'->'notFraOriginVerified' IS DISTINCT FROM 'true'::jsonb
    OR coalesce(length(btrim(d->>'notFraEvidenceRef')),0)=0) THEN RAISE EXCEPTION 'Non-FRA origin evidence required'; END IF;
  IF NEW.decision IN ('open_migrate','closed_archive','routine_exclude','duplicate_link') THEN
    IF jsonb_typeof(issued) IS DISTINCT FROM 'object'
      OR coalesce(length(btrim(issued->>'pdfPath')),0) = 0
      OR coalesce(issued->>'pdfSha256','') !~ '^[a-fA-F0-9]{64}$'
      OR coalesce(issued->>'page','') !~ '^[1-9][0-9]*$'
      OR coalesce(issued->>'rowOrdinal','') !~ '^[1-9][0-9]*$'
      OR coalesce(length(btrim(issued->>'exactRecommendation')),0) NOT BETWEEN 1 AND 10000 THEN
      RAISE EXCEPTION 'Exact issued PDF identity and action row required';
    END IF;
    IF NEW.publication_id IS NOT NULL AND (pub.pdf_path IS DISTINCT FROM issued->>'pdfPath'
      OR lower(pub.pdf_sha256) IS DISTINCT FROM lower(issued->>'pdfSha256')) THEN
      RAISE EXCEPTION 'Issued PDF does not match confirmed publication';
    END IF;
    FOREACH check_name IN ARRAY ARRAY['issuedPdfVerified','fraOriginVerified'] LOOP
      IF d->'checks'->check_name IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Required evidence check missing: %', check_name; END IF;
    END LOOP;
  END IF;
  IF NEW.decision IN ('open_migrate','closed_archive','duplicate_link') THEN
    FOREACH check_name IN ARRAY ARRAY['remedialVerified','completionEvidenceChecked'] LOOP
      IF d->'checks'->check_name IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Required evidence check missing: %', check_name; END IF;
    END LOOP;
    IF coalesce(length(btrim(d->>'completionEvidenceRef')),0) = 0 THEN RAISE EXCEPTION 'Completion evidence reference required'; END IF;
  END IF;
  IF NEW.decision = 'open_migrate' THEN
    FOREACH check_name IN ARRAY ARRAY['outstandingVerified','duplicateChecked','priorityAndTargetChecked'] LOOP
      IF d->'checks'->check_name IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Required evidence check missing: %', check_name; END IF;
    END LOOP;
    IF d->'checks'->'routineVerified' IS DISTINCT FROM 'false'::jsonb
      OR d->'checks'->'completedVerified' IS DISTINCT FROM 'false'::jsonb
      OR d->'checks'->'notFraOriginVerified' IS DISTINCT FROM 'false'::jsonb
      OR d->>'duplicateDisposition' IS DISTINCT FROM 'new'
      OR coalesce(length(btrim(d->>'duplicateOfFraActionId')),0)>0 THEN
      RAISE EXCEPTION 'Open migration contains contradictory or duplicate evidence';
    END IF;
    IF coalesce(d->>'priority','') NOT IN ('Low','Medium','High') THEN RAISE EXCEPTION 'Confirmed priority required'; END IF;
    IF d ? 'targetDate' AND d->'targetDate' <> 'null'::jsonb THEN
      IF coalesce(d->>'targetDate','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        OR coalesce(length(btrim(d->>'targetDateEvidenceRef')),0) = 0 THEN RAISE EXCEPTION 'Evidenced target date required'; END IF;
      PERFORM (d->>'targetDate')::date; -- PostgreSQL rejects impossible calendar dates.
    END IF;
  END IF;
  IF NEW.decision = 'closed_archive' AND (d->'checks'->'completedVerified' IS DISTINCT FROM 'true'::jsonb
    OR d->'checks'->'outstandingVerified' IS DISTINCT FROM 'false'::jsonb) THEN RAISE EXCEPTION 'Verified completion required'; END IF;
  IF NEW.decision = 'routine_exclude' AND (d->'checks'->'routineVerified' IS DISTINCT FROM 'true'::jsonb
    OR d->'checks'->'remedialVerified' IS DISTINCT FROM 'false'::jsonb) THEN RAISE EXCEPTION 'Routine non-remedial classification required'; END IF;
  IF NEW.decision = 'duplicate_link' AND d->'checks'->'duplicateChecked' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Duplicate check required'; END IF;
  IF NEW.decision = 'duplicate_link' AND NOT EXISTS (
    SELECT 1 FROM public.fa_fra_actions a WHERE a.id = (d->>'duplicateOfFraActionId')::uuid AND a.store_id = NEW.store_id
  ) THEN RAISE EXCEPTION 'Duplicate must link an existing FRA action at this store'; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER fa_fra_review_validate BEFORE INSERT ON public.fa_fra_historical_reviews
  FOR EACH ROW EXECUTE FUNCTION fa_private.fra_validate_review();
CREATE TRIGGER fa_fra_reviews_immutable BEFORE UPDATE OR DELETE ON public.fa_fra_historical_reviews
  FOR EACH ROW EXECUTE FUNCTION fa_private.fra_immutable();
CREATE TRIGGER fa_fra_events_immutable BEFORE UPDATE OR DELETE ON public.fa_fra_action_events
  FOR EACH ROW EXECUTE FUNCTION fa_private.fra_immutable();
CREATE TRIGGER fa_fra_actions_immutable BEFORE UPDATE OR DELETE ON public.fa_fra_actions
  FOR EACH ROW EXECUTE FUNCTION fa_private.fra_immutable();
CREATE TRIGGER fa_fra_investigations_immutable BEFORE UPDATE OR DELETE ON public.fa_fra_source_investigations
  FOR EACH ROW EXECUTE FUNCTION fa_private.fra_immutable();

CREATE FUNCTION public.fa_fra_record_historical_review(
  p_actor uuid, p_candidate jsonb, p_review jsonb, p_idempotency_key uuid,
  p_expected_latest_review_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  existing public.fa_fra_historical_reviews;
  latest_id uuid;
  result_id uuid;
  request jsonb;
  canonical jsonb;
BEGIN
  PERFORM fa_private.fra_assert_kss(p_actor);
  IF jsonb_typeof(p_candidate) IS DISTINCT FROM 'object' OR jsonb_typeof(p_review) IS DISTINCT FROM 'object'
    OR p_idempotency_key IS NULL THEN RAISE EXCEPTION 'Candidate, review and idempotency key required'; END IF;
  canonical := p_review - ARRAY['reviewerUserId','reviewedAt','migrationEligible','sourceKey'];
  request := jsonb_build_object('candidate',p_candidate,'review',canonical);
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('fra-review-key:' || p_actor::text || p_idempotency_key::text,0));
  SELECT * INTO existing FROM public.fa_fra_historical_reviews WHERE reviewed_by=p_actor AND idempotency_key=p_idempotency_key;
  IF FOUND THEN
    IF existing.request_payload IS DISTINCT FROM request THEN RAISE EXCEPTION 'Idempotency key reused with different review'; END IF;
    RETURN existing.id;
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('fra-candidate:' || (p_candidate->>'stagingKey'),0));
  SELECT id INTO latest_id FROM public.fa_fra_historical_reviews WHERE staging_key=p_candidate->>'stagingKey' ORDER BY review_sequence DESC LIMIT 1;
  IF latest_id IS DISTINCT FROM p_expected_latest_review_id THEN RAISE EXCEPTION 'Review version conflict'; END IF;
  IF EXISTS (SELECT 1 FROM public.fa_fra_actions WHERE staging_key=p_candidate->>'stagingKey') THEN
    RAISE EXCEPTION 'Candidate already migrated; use the action lifecycle to correct it';
  END IF;
  INSERT INTO public.fa_fra_historical_reviews(staging_key,store_id,source_item_sha256,assessment_instance_id,publication_id,
    decision,candidate_snapshot,review_data,request_payload,reviewed_by,idempotency_key,supersedes_review_id)
  VALUES (p_candidate->>'stagingKey',(p_candidate->>'storeId')::uuid,lower(p_candidate->>'sourceItemSha256'),
    (p_candidate->>'assessmentInstanceId')::uuid,(p_candidate->>'publicationId')::uuid,canonical->>'decision',p_candidate,
    canonical || jsonb_build_object('reviewerUserId',p_actor,'reviewedAt',clock_timestamp()),request,p_actor,p_idempotency_key,latest_id)
  RETURNING id INTO result_id;
  RETURN result_id;
END $$;

CREATE FUNCTION public.fa_fra_migrate_reviewed_action(p_actor uuid, p_review_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  r public.fa_fra_historical_reviews;
  d jsonb;
  issued jsonb;
  existing public.fa_fra_actions;
  latest_id uuid;
  result_id uuid;
BEGIN
  PERFORM fa_private.fra_assert_kss(p_actor);
  SELECT * INTO STRICT r FROM public.fa_fra_historical_reviews WHERE id=p_review_id;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('fra-candidate:' || r.staging_key,0));
  SELECT * INTO existing FROM public.fa_fra_actions WHERE staging_key=r.staging_key;
  IF FOUND THEN
    IF existing.source_review_id <> r.id THEN RAISE EXCEPTION 'Candidate already migrated from another review'; END IF;
    RETURN existing.id;
  END IF;
  SELECT id INTO latest_id FROM public.fa_fra_historical_reviews WHERE staging_key=r.staging_key ORDER BY review_sequence DESC LIMIT 1;
  IF latest_id IS DISTINCT FROM r.id THEN RAISE EXCEPTION 'Review superseded'; END IF;
  IF r.decision <> 'open_migrate' THEN RAISE EXCEPTION 'Only Open - migrate is eligible'; END IF;
  PERFORM fa_private.fra_assert_stored_source(r.candidate_snapshot);
  PERFORM fa_private.fra_assert_kss(r.reviewed_by);
  d := r.review_data;
  issued := d->'issuedFra';
  -- Insert validation binds the immutable review, source and issued PDF again.
  INSERT INTO public.fa_fra_actions(store_id,source_review_id,staging_key,source_key,assessment_instance_id,publication_id,
    pdf_path,pdf_sha256,pdf_page,pdf_row_ordinal,recommendation,priority,target_date,target_date_evidence_ref,created_by)
  VALUES (r.store_id,r.id,r.staging_key,fa_private.fra_source_key(r.store_id,issued->>'pdfSha256',(issued->>'page')::integer,
    (issued->>'rowOrdinal')::integer,issued->>'exactRecommendation'),r.assessment_instance_id,r.publication_id,
    issued->>'pdfPath',lower(issued->>'pdfSha256'),(issued->>'page')::integer,(issued->>'rowOrdinal')::integer,
    issued->>'exactRecommendation',d->>'priority',(d->>'targetDate')::date,d->>'targetDateEvidenceRef',p_actor)
  RETURNING id INTO result_id;
  RETURN result_id;
END $$;

CREATE FUNCTION fa_private.fra_assert_publication_action(p_action public.fa_fra_actions) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'Publication action command not installed';
END $$;

CREATE FUNCTION fa_private.fra_assert_historical_pdf_action(p_action public.fa_fra_actions) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'Historical PDF action command not installed';
END $$;

CREATE FUNCTION fa_private.fra_validate_action() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE r public.fa_fra_historical_reviews; issued jsonb; latest_id uuid;
BEGIN
  PERFORM fa_private.fra_assert_kss(NEW.created_by);
  -- The additive publication draft installs this validator. Before it exists,
  -- inserts still fail closed. Historical imports use the branch below.
  IF NEW.source_origin = 'confirmed_publication' THEN
    PERFORM fa_private.fra_assert_publication_action(NEW);
    RETURN NEW;
  END IF;
  IF NEW.source_origin = 'historical_pdf' THEN
    PERFORM fa_private.fra_assert_historical_pdf_action(NEW);
    RETURN NEW;
  END IF;
  IF NEW.source_origin <> 'historical_review' THEN RAISE EXCEPTION 'Unknown FRA action origin'; END IF;
  SELECT * INTO STRICT r FROM public.fa_fra_historical_reviews WHERE id=NEW.source_review_id;
  PERFORM fa_private.fra_assert_stored_source(r.candidate_snapshot);
  PERFORM fa_private.fra_assert_kss(r.reviewed_by);
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('fra-candidate:' || r.staging_key,0));
  SELECT id INTO latest_id FROM public.fa_fra_historical_reviews WHERE staging_key=r.staging_key ORDER BY review_sequence DESC LIMIT 1;
  issued := r.review_data->'issuedFra';
  IF r.decision <> 'open_migrate' OR latest_id IS DISTINCT FROM r.id OR NEW.store_id <> r.store_id
    OR NEW.staging_key <> r.staging_key OR NEW.status <> 'open' OR NEW.version <> 1
    OR NEW.assessment_instance_id IS DISTINCT FROM r.assessment_instance_id OR NEW.publication_id IS DISTINCT FROM r.publication_id
    OR NEW.pdf_path IS DISTINCT FROM issued->>'pdfPath' OR NEW.pdf_sha256 IS DISTINCT FROM lower(issued->>'pdfSha256')
    OR NEW.pdf_page IS DISTINCT FROM (issued->>'page')::integer OR NEW.pdf_row_ordinal IS DISTINCT FROM (issued->>'rowOrdinal')::integer
    OR NEW.recommendation IS DISTINCT FROM issued->>'exactRecommendation' OR NEW.priority IS DISTINCT FROM r.review_data->>'priority'
    OR NEW.target_date IS DISTINCT FROM (r.review_data->>'targetDate')::date
    OR NEW.target_date_evidence_ref IS DISTINCT FROM r.review_data->>'targetDateEvidenceRef'
    OR NEW.source_key IS DISTINCT FROM fa_private.fra_source_key(NEW.store_id,NEW.pdf_sha256,NEW.pdf_page,NEW.pdf_row_ordinal,NEW.recommendation)
  THEN RAISE EXCEPTION 'Action must exactly match the latest eligible reviewed FRA row'; END IF;
  IF r.publication_id IS NOT NULL THEN
    PERFORM 1 FROM public.fa_fra_publications WHERE id=r.publication_id FOR SHARE;
  END IF;
  IF r.publication_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.fa_fra_publications p WHERE p.id=r.publication_id AND p.confirmed_at IS NOT NULL
      AND p.store_id=r.store_id AND p.instance_id=r.assessment_instance_id
      AND p.pdf_path=NEW.pdf_path AND lower(p.pdf_sha256)=NEW.pdf_sha256
  ) THEN RAISE EXCEPTION 'Issued publication changed after review'; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION fa_private.fra_created_event() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.fa_fra_action_events(action_id,event_type,actor_id,resulting_version,payload)
  VALUES (NEW.id,CASE NEW.source_origin
      WHEN 'confirmed_publication' THEN 'publication_action_created'
      WHEN 'historical_pdf' THEN 'historical_pdf_imported'
      ELSE 'historical_action_migrated' END,
    NEW.created_by,1,
    CASE NEW.source_origin
      WHEN 'confirmed_publication' THEN jsonb_build_object('publicationId',NEW.publication_id,'sourceActionId',NEW.source_action_id,'status','open')
      WHEN 'historical_pdf' THEN jsonb_build_object('pdfPath',NEW.pdf_path,'page',NEW.pdf_page,'rowOrdinal',NEW.pdf_row_ordinal,
        'sourceKey',NEW.source_key,'completionStatus','unknown','status','open')
      ELSE jsonb_build_object('reviewId',NEW.source_review_id,'sourceKey',NEW.source_key,'status','open') END);
  RETURN NEW;
END $$;
CREATE TRIGGER fa_fra_action_validate BEFORE INSERT ON public.fa_fra_actions
  FOR EACH ROW EXECUTE FUNCTION fa_private.fra_validate_action();
CREATE TRIGGER fa_fra_action_created AFTER INSERT ON public.fa_fra_actions
  FOR EACH ROW EXECUTE FUNCTION fa_private.fra_created_event();

CREATE FUNCTION public.fa_fra_record_source_investigation(p_actor uuid, p_store_id uuid, p_data jsonb, p_idempotency_key uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE existing public.fa_fra_source_investigations; result_id uuid; request jsonb;
BEGIN
  PERFORM fa_private.fra_assert_kss(p_actor);
  IF jsonb_typeof(p_data) IS DISTINCT FROM 'object' OR p_idempotency_key IS NULL THEN RAISE EXCEPTION 'Investigation payload required'; END IF;
  request := jsonb_build_object('storeId',p_store_id,'data',p_data - ARRAY['reviewerUserId','reviewedAt']);
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('fra-source:' || p_actor::text || p_idempotency_key::text,0));
  SELECT * INTO existing FROM public.fa_fra_source_investigations WHERE reviewed_by=p_actor AND idempotency_key=p_idempotency_key;
  IF FOUND THEN
    IF existing.request_payload IS DISTINCT FROM request THEN RAISE EXCEPTION 'Idempotency key reused with different investigation'; END IF;
    RETURN existing.id;
  END IF;
  IF p_data->>'caseId' IS DISTINCT FROM 'legacy-store:' || p_store_id::text
    OR p_data->>'storeId' IS DISTINCT FROM p_store_id::text THEN RAISE EXCEPTION 'Source investigation identity mismatch'; END IF;
  INSERT INTO public.fa_fra_source_investigations(store_id,status,reason,evidence_ref,missing_evidence_reason,issued_pdf_verified,source_reference,pdf_sha256,
    reviewed_by,idempotency_key,request_payload)
  VALUES (p_store_id,p_data->>'status',p_data->>'notes',p_data->>'evidenceRef',p_data->>'missingEvidenceReason',
    coalesce(p_data->'issuedPdfVerified' = 'true'::jsonb,false),
    nullif(btrim(p_data->'issuedFra'->>'pdfPath'),''),nullif(lower(btrim(p_data->'issuedFra'->>'pdfSha256')),''),p_actor,p_idempotency_key,request)
  RETURNING id INTO result_id;
  RETURN result_id;
END $$;

ALTER TABLE public.fa_fra_historical_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fa_fra_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fa_fra_action_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fa_fra_source_investigations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fa_fra_historical_reviews, public.fa_fra_actions, public.fa_fra_action_events,
  public.fa_fra_source_investigations FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.fa_fra_historical_reviews, public.fa_fra_actions, public.fa_fra_action_events,
  public.fa_fra_source_investigations TO authenticated;
GRANT SELECT, INSERT ON public.fa_fra_historical_reviews, public.fa_fra_actions, public.fa_fra_action_events,
  public.fa_fra_source_investigations TO service_role;
REVOKE ALL ON SEQUENCE public.fa_fra_historical_reviews_review_sequence_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.fa_fra_historical_reviews_review_sequence_seq TO service_role;
CREATE POLICY fra_reviews_kss_read ON public.fa_fra_historical_reviews FOR SELECT TO authenticated
  USING (fa_private.get_user_role((SELECT auth.uid()))::text IN ('admin','ops'));
CREATE POLICY fra_actions_kss_read ON public.fa_fra_actions FOR SELECT TO authenticated
  USING (fa_private.get_user_role((SELECT auth.uid()))::text IN ('admin','ops','readonly'));
CREATE POLICY fra_events_kss_read ON public.fa_fra_action_events FOR SELECT TO authenticated
  USING (fa_private.get_user_role((SELECT auth.uid()))::text IN ('admin','ops','readonly'));
CREATE POLICY fra_source_investigations_kss_read ON public.fa_fra_source_investigations FOR SELECT TO authenticated
  USING (fa_private.get_user_role((SELECT auth.uid()))::text IN ('admin','ops'));

REVOKE ALL ON FUNCTION fa_private.fra_assert_kss(uuid), fa_private.fra_immutable(),
  fa_private.fra_source_key(uuid,text,integer,integer,text), fa_private.fra_assert_stored_source(jsonb), fa_private.fra_validate_review(),
  fa_private.fra_validate_action(), fa_private.fra_created_event(),
  fa_private.fra_assert_publication_action(public.fa_fra_actions),
  fa_private.fra_assert_historical_pdf_action(public.fa_fra_actions) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION fa_private.fra_assert_kss(uuid), fa_private.fra_immutable(),
  fa_private.fra_source_key(uuid,text,integer,integer,text), fa_private.fra_assert_stored_source(jsonb), fa_private.fra_validate_review(),
  fa_private.fra_validate_action(), fa_private.fra_created_event(),
  fa_private.fra_assert_publication_action(public.fa_fra_actions),
  fa_private.fra_assert_historical_pdf_action(public.fa_fra_actions) TO service_role;
GRANT USAGE ON SCHEMA fa_private TO service_role;
REVOKE ALL ON FUNCTION public.fa_fra_record_historical_review(uuid,jsonb,jsonb,uuid,uuid),
  public.fa_fra_migrate_reviewed_action(uuid,uuid), public.fa_fra_record_source_investigation(uuid,uuid,jsonb,uuid)
  FROM PUBLIC, anon, authenticated;
-- The historical JSON review/migration commands remain disabled until their
-- candidate payload is bound to the locked stored response row/item hash.
-- In particular, never grant these two functions to service_role during the
-- PDF import rollout. The separate PDF-row command has its own source checks.
GRANT EXECUTE ON FUNCTION public.fa_fra_record_source_investigation(uuid,uuid,jsonb,uuid)
  TO service_role;

COMMENT ON TABLE public.fa_fra_actions IS 'Historical reviewed FRA actions only. Client access and future lifecycle commands remain disabled pending scoped authorization rollout.';
COMMIT;
