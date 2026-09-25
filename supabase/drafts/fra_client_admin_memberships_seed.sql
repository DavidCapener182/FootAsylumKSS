-- SUPERSEDED: DO NOT APPLY. The broad hierarchy rollout was rejected; see fra_store_access_service_only.sql.
-- UNAPPLIED DRAFT. Depends on hierarchy + reviewed Footasylum roster seed.
-- Creates INACTIVE memberships only; no role changes or invitations.
-- Run after the scoped code and database gates pass. Recheck the verified
-- account identities immediately before execution.
BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.fa_clients
    WHERE id='10000000-0000-4000-8000-000000000001'::uuid AND name='Footasylum') THEN
    RAISE EXCEPTION 'Reviewed Footasylum client seed is missing';
  END IF;
  IF (SELECT count(*) FROM auth.users u JOIN public.fa_profiles p ON p.id=u.id
    WHERE (u.id='1eb36932-44ee-41ac-861d-39b2414d925b'::uuid
      AND lower(u.email)='hannah.lord@footasylum.com' AND p.full_name='Hannah Lord'
      AND p.role::text='client' AND p.account_status::text='active')
       OR (u.id='25903bcd-f26d-4bd4-a160-d663aba45d3b'::uuid
      AND lower(u.email)='toni.shaw@footasylum.com' AND p.full_name='Toni Shaw'
      AND p.role::text='client' AND p.account_status::text='active')) <> 2 THEN
    RAISE EXCEPTION 'Confirmed Client Admin identities changed';
  END IF;
END $$;
INSERT INTO public.fa_client_memberships(user_id,client_id,access_level,is_active) VALUES
  ('1eb36932-44ee-41ac-861d-39b2414d925b'::uuid,'10000000-0000-4000-8000-000000000001'::uuid,'client_admin',false),
  ('25903bcd-f26d-4bd4-a160-d663aba45d3b'::uuid,'10000000-0000-4000-8000-000000000001'::uuid,'client_admin',false);
COMMIT;
