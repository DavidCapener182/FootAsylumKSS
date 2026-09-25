-- UNAPPLIED, read-only validated seed. Apply only after the one-table draft,
-- account identities, direct Data API RLS, and server-action checks pass.
-- Manager rows require five verified auth users; this transaction fails closed
-- if any account, store ID, area, or active state differs from review.
BEGIN;
CREATE TEMP TABLE fra_reviewed_store(store_id uuid PRIMARY KEY,store_code text,area text,manager_visible boolean) ON COMMIT DROP;
INSERT INTO fra_reviewed_store VALUES
  ('bffb982c-7304-4ce6-972b-99fc8cf2b76d'::uuid,'S0005','AREA1',true),
  ('d165194c-99a2-4c85-ae4e-19ca2d6f44ee'::uuid,'S0006','AREA1',true),
  ('4334a472-66fe-45db-965a-5ef8dcaffbbc'::uuid,'S0007','AREA2',false),
  ('79995d54-b150-471f-99e1-4dfbe6be8f8c'::uuid,'S0012','AREA5',true),
  ('5f83a771-4182-4ef1-8a3f-7f944dacfebf'::uuid,'S0014','AREA4',false),
  ('3f5a6196-19e0-429f-8ddc-9e0f0df45ffe'::uuid,'S0015','AREA2',true),
  ('9c4775b2-03e3-40a4-9456-d491ffb20788'::uuid,'S0017','AREA2',true),
  ('48b65674-42ba-4532-b331-875c8651f12d'::uuid,'S0021','AREA1',true),
  ('c758432b-7012-4420-9ae9-be2ac735f094'::uuid,'S0022','AREA4',true),
  ('3a473b49-c5f5-4fb0-a602-a6a2909cbe57'::uuid,'S0023','AREA4',true),
  ('d238bbb0-6b1c-4a3d-b1de-da965d09c4cb'::uuid,'S0027','AREA5',true),
  ('89dc85a7-d7da-4a2b-973e-05176d474cf9'::uuid,'S0029','AREA4',true),
  ('96dfd121-bc56-4d5e-84ec-175dde6098ee'::uuid,'S0030','AREA5',true),
  ('a2d8a716-0bb3-4c80-807e-b81fa53d47a6'::uuid,'S0032','AREA5',false),
  ('7c8d8486-a5c7-4617-940e-7233eff86f6a'::uuid,'S0037','AREA3',true),
  ('b66e7bec-0277-44cd-9637-6a77537d9076'::uuid,'S0040','AREA2',false),
  ('e291e218-453f-420a-981e-cd3e9759909b'::uuid,'S0042','AREA2',true),
  ('0189e22a-b622-4f15-be01-02982a61e81f'::uuid,'S0044','AREA3',true),
  ('77e3f8b8-779c-414c-9cd7-742da6e4b93b'::uuid,'S0045','AREA4',true),
  ('1fbf08ce-475c-42e6-bb44-04ab9d790f17'::uuid,'S0046','AREA5',true),
  ('1333dc2b-e91e-4367-9612-65c1d6bddcf3'::uuid,'S0047','AREA5',true),
  ('9eec9a7e-6836-4cbe-ac37-27156d54f3be'::uuid,'S0048','AREA3',true),
  ('bc352a59-7366-4f8e-9918-12e3d5a2ca46'::uuid,'S0049','AREA5',true),
  ('c82aa365-0fe0-4b68-bd14-71b0011ccf50'::uuid,'S0051','AREA5',false),
  ('5cbea2e5-fa14-4ed4-a236-f023ad7c71a0'::uuid,'S0053','AREA1',true),
  ('39c50dd0-b387-441e-b0fa-ad3088bbba7c'::uuid,'S0055','AREA4',true),
  ('1d35a49d-f046-405c-80ad-1f955a6e3295'::uuid,'S0056','AREA1',true),
  ('9ec7da29-d7f3-4d37-b9df-243baeac413a'::uuid,'S0057','AREA1',true),
  ('16e8ec38-d4bd-4051-a086-14223c753645'::uuid,'S0060','AREA4',true),
  ('d2745a71-9273-4454-b789-852e7bbf67fe'::uuid,'S0061','AREA4',true),
  ('d38afc4d-97f7-492c-9c9b-fc760a56c527'::uuid,'S0064','AREA5',true),
  ('b341497b-aec3-4888-90df-2583d5969e28'::uuid,'S0065','AREA2',true),
  ('bdf16771-1943-4114-9114-e73b9b493fe2'::uuid,'S0066','AREA1',true),
  ('6bd1c8be-bd18-450b-9de7-e05c98b52ce9'::uuid,'S0067','AREA3',true),
  ('00798b6e-2126-4479-8b95-e2e08852bd63'::uuid,'S0068','AREA2',true),
  ('82af3b5b-b8f0-4430-adcc-578011847ec0'::uuid,'S0069','AREA2',true),
  ('4d42703f-83f7-4511-8c8e-501e5c2fc795'::uuid,'S0070','AREA3',true),
  ('e7da5e32-9fc8-4328-8e65-4601e4ec298e'::uuid,'S0071','AREA2',true),
  ('a98a4899-b301-49b7-b25d-6cf744759bab'::uuid,'S0072','AREA3',true),
  ('66deaeef-b461-4b62-83ad-ecfe07acad8d'::uuid,'S0074','AREA5',true),
  ('0b9fff5f-da2e-4231-82d0-9c6a3b5f5380'::uuid,'S0075','AREA2',true),
  ('00a48441-564c-4ea8-8811-ad3c48f35fb4'::uuid,'S0076','AREA5',true),
  ('ffa7b3a4-f0a5-4e7e-9b80-ae15bafd901b'::uuid,'S0078','AREA3',true),
  ('33e312e5-f2c7-4430-9086-f7ff2123871a'::uuid,'S0079','AREA5',true),
  ('8977b4eb-c0a8-4135-98c7-0751e47e9eb4'::uuid,'S0080','AREA1',true),
  ('05a05796-7b7d-43e3-9aaa-50e0a45aa495'::uuid,'S0081','AREA1',true),
  ('2a782730-2bb3-4966-bd7b-6de921da9f38'::uuid,'S0082','AREA3',true),
  ('fc23c097-1bdf-411a-9f15-d2cdca590b28'::uuid,'S0083','AREA5',true),
  ('928a0a13-13cf-4017-8e26-87098352f2c8'::uuid,'S0084','AREA1',true),
  ('2d51a068-5e89-45c5-98ad-dd2897428529'::uuid,'S0085','AREA5',true),
  ('bc5dff2e-eb4a-4644-9591-fdf8e1ad4174'::uuid,'S0086','AREA5',true),
  ('4c73d354-2e23-48cb-876f-b75e2b672705'::uuid,'S0087','AREA4',true),
  ('4071478f-ef5c-45e4-95d0-2f31f3539251'::uuid,'S0088','AREA5',true),
  ('5dfe7386-e3ce-4791-a46e-ca9f94177a72'::uuid,'S0089','AREA5',true),
  ('81bbeec0-c534-4a6d-8ea1-9c624aeecaa4'::uuid,'S0090','AREA1',true),
  ('098c9478-7edf-47b4-bd40-55e908157446'::uuid,'S0091','AREA1',true),
  ('9bd47346-2fb9-4a4d-ab89-3a40bec03963'::uuid,'S0092','AREA2',true),
  ('8f04b5d8-f514-47dd-b5cf-4b583e4e6770'::uuid,'S0093','AREA3',true),
  ('175d89a2-d4c1-46e2-b786-fb394e934e8a'::uuid,'S0095','AREA3',true),
  ('ca9f97f6-8a76-4e2b-97ed-9ee83c679508'::uuid,'S0096','AREA2',true),
  ('9783f271-811d-452f-9e04-32c4ef4a067a'::uuid,'S0097','AREA4',true),
  ('a145869c-8577-45ee-8794-9253fe987619'::uuid,'S0098','AREA4',true),
  ('d0d2dae9-b15b-4850-9f40-7591f212d258'::uuid,'S0118','AREA3',true),
  ('24f9a8ab-d479-46c0-bfa2-01b03b7754db'::uuid,'S0119','AREA3',true),
  ('6e9b8723-f9fe-4035-8a0d-0d86fbdf5d8f'::uuid,'S0120','AREA2',true),
  ('649aa8a1-6928-4115-a993-6b17023e2d4b'::uuid,'S0121','AREA2',true),
  ('d8a50e1f-c40a-40dd-b90f-5988459825fd'::uuid,'S0122','AREA1',true),
  ('56d176db-bc7c-4f60-b04c-a40cefa89c62'::uuid,'S0125','AREA4',true),
  ('a0fd551a-ee8e-44d1-bd5a-5a5e0641e616'::uuid,'S0777','AREA2',true),
  ('5c7464e3-13fb-4ba9-b02b-bb0615dcf055'::uuid,'S0904','AREA2',true),
  ('1fe9618d-03f9-4b53-8096-c22b7e560f74'::uuid,'S0913','AREA1',true),
  ('55b31e73-f8d2-4966-a05b-b296c999226a'::uuid,'S0914','AREA1',true);
DO $$ BEGIN
  IF (SELECT count(*) FROM fra_reviewed_store) <> 72 OR EXISTS (
    SELECT 1 FROM fra_reviewed_store r LEFT JOIN public.fa_stores s ON s.id=r.store_id
    WHERE s.id IS NULL OR s.store_code IS DISTINCT FROM r.store_code
      OR s.reporting_area IS DISTINCT FROM r.area
      OR s.is_active IS DISTINCT FROM r.manager_visible
  ) THEN RAISE EXCEPTION 'Reviewed Footasylum store roster changed'; END IF;
  IF (SELECT count(*) FROM public.fa_stores WHERE store_code ~ '^S[0-9]{4}$'
      AND reporting_area IN ('AREA1','AREA2','AREA3','AREA4','AREA5')) <> 72 THEN
    RAISE EXCEPTION 'Footasylum estate count changed';
  END IF;
  IF (SELECT count(*) FROM auth.users u JOIN public.fa_profiles p ON p.id=u.id
      WHERE (u.id='1eb36932-44ee-41ac-861d-39b2414d925b'::uuid
        AND lower(u.email)='hannah.lord@footasylum.com' AND p.full_name='Hannah Lord')
         OR (u.id='25903bcd-f26d-4bd4-a160-d663aba45d3b'::uuid
        AND lower(u.email)='toni.shaw@footasylum.com' AND p.full_name='Toni Shaw')) <> 2 THEN
    RAISE EXCEPTION 'Client Admin identities changed';
  END IF;
END $$;
-- Start inactive; activate only after security gates and account review.
INSERT INTO public.fa_fra_store_access(user_id,store_id,access_level,is_active)
SELECT admin_id,r.store_id,'client_admin',false
FROM fra_reviewed_store r CROSS JOIN (VALUES
  ('1eb36932-44ee-41ac-861d-39b2414d925b'::uuid),
  ('25903bcd-f26d-4bd4-a160-d663aba45d3b'::uuid)
) AS admins(admin_id);
-- Area Manager grants are provisioned separately from verified invite user IDs.
COMMIT;
