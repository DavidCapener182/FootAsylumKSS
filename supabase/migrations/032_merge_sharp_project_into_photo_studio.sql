DO $$
DECLARE
  photo_studio_id UUID;
  sharp_project_id UUID;
BEGIN
  SELECT id
  INTO photo_studio_id
  FROM public.fa_stores
  WHERE lower(trim(store_name)) = 'photo studio'
  ORDER BY is_active DESC, id
  LIMIT 1;

  SELECT id
  INTO sharp_project_id
  FROM public.fa_stores
  WHERE lower(trim(store_name)) = 'sharp project'
  ORDER BY is_active ASC, id
  LIMIT 1;

  IF photo_studio_id IS NULL OR sharp_project_id IS NULL OR photo_studio_id = sharp_project_id THEN
    RETURN;
  END IF;

  IF to_regclass('public.fa_incidents') IS NOT NULL THEN
    UPDATE public.fa_incidents
    SET store_id = photo_studio_id
    WHERE store_id = sharp_project_id;
  END IF;

  IF to_regclass('public.fa_closed_incidents') IS NOT NULL THEN
    UPDATE public.fa_closed_incidents
    SET store_id = photo_studio_id
    WHERE store_id = sharp_project_id;
  END IF;

  IF to_regclass('public.fa_store_actions') IS NOT NULL THEN
    UPDATE public.fa_store_actions
    SET store_id = photo_studio_id
    WHERE store_id = sharp_project_id;
  END IF;

  IF to_regclass('public.fa_store_contacts') IS NOT NULL THEN
    UPDATE public.fa_store_contacts
    SET store_id = photo_studio_id
    WHERE store_id = sharp_project_id;
  END IF;

  IF to_regclass('public.fa_store_notes') IS NOT NULL THEN
    UPDATE public.fa_store_notes
    SET store_id = photo_studio_id
    WHERE store_id = sharp_project_id;
  END IF;

  IF to_regclass('public.fa_store_contact_tracker') IS NOT NULL THEN
    UPDATE public.fa_store_contact_tracker
    SET store_id = photo_studio_id
    WHERE store_id = sharp_project_id;
  END IF;

  IF to_regclass('public.fa_audit_instances') IS NOT NULL THEN
    UPDATE public.fa_audit_instances
    SET store_id = photo_studio_id
    WHERE store_id = sharp_project_id;
  END IF;

  IF to_regclass('public.fa_route_visit_times') IS NOT NULL THEN
    UPDATE public.fa_route_visit_times
    SET store_id = photo_studio_id
    WHERE store_id = sharp_project_id;
  END IF;

  IF to_regclass('public.fa_activity_log') IS NOT NULL THEN
    UPDATE public.fa_activity_log
    SET entity_id = photo_studio_id
    WHERE entity_type = 'store'
      AND entity_id::text = sharp_project_id::text;
  END IF;

  UPDATE public.fa_stores AS target
  SET
    address_line_1 = COALESCE(target.address_line_1, source.address_line_1),
    city = COALESCE(target.city, source.city),
    postcode = COALESCE(target.postcode, source.postcode),
    region = COALESCE(target.region, source.region),
    compliance_audit_1_date = COALESCE(target.compliance_audit_1_date, source.compliance_audit_1_date),
    compliance_audit_1_overall_pct = COALESCE(target.compliance_audit_1_overall_pct, source.compliance_audit_1_overall_pct),
    action_plan_1_sent = COALESCE(target.action_plan_1_sent, source.action_plan_1_sent),
    compliance_audit_1_pdf_path = COALESCE(target.compliance_audit_1_pdf_path, source.compliance_audit_1_pdf_path),
    compliance_audit_2_date = COALESCE(target.compliance_audit_2_date, source.compliance_audit_2_date),
    compliance_audit_2_overall_pct = COALESCE(target.compliance_audit_2_overall_pct, source.compliance_audit_2_overall_pct),
    action_plan_2_sent = COALESCE(target.action_plan_2_sent, source.action_plan_2_sent),
    compliance_audit_2_pdf_path = COALESCE(target.compliance_audit_2_pdf_path, source.compliance_audit_2_pdf_path),
    compliance_audit_2_assigned_manager_user_id = COALESCE(target.compliance_audit_2_assigned_manager_user_id, source.compliance_audit_2_assigned_manager_user_id),
    compliance_audit_2_planned_date = COALESCE(target.compliance_audit_2_planned_date, source.compliance_audit_2_planned_date),
    compliance_audit_3_date = COALESCE(target.compliance_audit_3_date, source.compliance_audit_3_date),
    compliance_audit_3_overall_pct = COALESCE(target.compliance_audit_3_overall_pct, source.compliance_audit_3_overall_pct),
    action_plan_3_sent = COALESCE(target.action_plan_3_sent, source.action_plan_3_sent),
    area_average_pct = COALESCE(target.area_average_pct, source.area_average_pct),
    total_audits_to_date = GREATEST(COALESCE(target.total_audits_to_date, 0), COALESCE(source.total_audits_to_date, 0)),
    fire_risk_assessment_date = COALESCE(target.fire_risk_assessment_date, source.fire_risk_assessment_date),
    fire_risk_assessment_pdf_path = COALESCE(target.fire_risk_assessment_pdf_path, source.fire_risk_assessment_pdf_path),
    fire_risk_assessment_notes = COALESCE(target.fire_risk_assessment_notes, source.fire_risk_assessment_notes),
    fire_risk_assessment_pct = COALESCE(target.fire_risk_assessment_pct, source.fire_risk_assessment_pct),
    is_active = true
  FROM public.fa_stores AS source
  WHERE target.id = photo_studio_id
    AND source.id = sharp_project_id;
END $$;
