-- UNAPPLIED, AFTER verified manager invitations and scoped security gates.
-- Grants 67 active retail stores to the five verified manager accounts,
-- initially inactive. No invitations, role changes, or activation here.
BEGIN;
CREATE TEMP TABLE fra_manager_roster(store_id uuid PRIMARY KEY,store_code text,area text) ON COMMIT DROP;
INSERT INTO fra_manager_roster VALUES
  ('bffb982c-7304-4ce6-972b-99fc8cf2b76d'::uuid,'S0005','AREA1'),
  ('d165194c-99a2-4c85-ae4e-19ca2d6f44ee'::uuid,'S0006','AREA1'),
  ('79995d54-b150-471f-99e1-4dfbe6be8f8c'::uuid,'S0012','AREA5'),
  ('3f5a6196-19e0-429f-8ddc-9e0f0df45ffe'::uuid,'S0015','AREA2'),
  ('9c4775b2-03e3-40a4-9456-d491ffb20788'::uuid,'S0017','AREA2'),
  ('48b65674-42ba-4532-b331-875c8651f12d'::uuid,'S0021','AREA1'),
  ('c758432b-7012-4420-9ae9-be2ac735f094'::uuid,'S0022','AREA4'),
  ('3a473b49-c5f5-4fb0-a602-a6a2909cbe57'::uuid,'S0023','AREA4'),
  ('d238bbb0-6b1c-4a3d-b1de-da965d09c4cb'::uuid,'S0027','AREA5'),
  ('89dc85a7-d7da-4a2b-973e-05176d474cf9'::uuid,'S0029','AREA4'),
  ('96dfd121-bc56-4d5e-84ec-175dde6098ee'::uuid,'S0030','AREA5'),
  ('7c8d8486-a5c7-4617-940e-7233eff86f6a'::uuid,'S0037','AREA3'),
  ('e291e218-453f-420a-981e-cd3e9759909b'::uuid,'S0042','AREA2'),
  ('0189e22a-b622-4f15-be01-02982a61e81f'::uuid,'S0044','AREA3'),
  ('77e3f8b8-779c-414c-9cd7-742da6e4b93b'::uuid,'S0045','AREA4'),
  ('1fbf08ce-475c-42e6-bb44-04ab9d790f17'::uuid,'S0046','AREA5'),
  ('1333dc2b-e91e-4367-9612-65c1d6bddcf3'::uuid,'S0047','AREA5'),
  ('9eec9a7e-6836-4cbe-ac37-27156d54f3be'::uuid,'S0048','AREA3'),
  ('bc352a59-7366-4f8e-9918-12e3d5a2ca46'::uuid,'S0049','AREA5'),
  ('5cbea2e5-fa14-4ed4-a236-f023ad7c71a0'::uuid,'S0053','AREA1'),
  ('39c50dd0-b387-441e-b0fa-ad3088bbba7c'::uuid,'S0055','AREA4'),
  ('1d35a49d-f046-405c-80ad-1f955a6e3295'::uuid,'S0056','AREA1'),
  ('9ec7da29-d7f3-4d37-b9df-243baeac413a'::uuid,'S0057','AREA1'),
  ('16e8ec38-d4bd-4051-a086-14223c753645'::uuid,'S0060','AREA4'),
  ('d2745a71-9273-4454-b789-852e7bbf67fe'::uuid,'S0061','AREA4'),
  ('d38afc4d-97f7-492c-9c9b-fc760a56c527'::uuid,'S0064','AREA5'),
  ('b341497b-aec3-4888-90df-2583d5969e28'::uuid,'S0065','AREA2'),
  ('bdf16771-1943-4114-9114-e73b9b493fe2'::uuid,'S0066','AREA1'),
  ('6bd1c8be-bd18-450b-9de7-e05c98b52ce9'::uuid,'S0067','AREA3'),
  ('00798b6e-2126-4479-8b95-e2e08852bd63'::uuid,'S0068','AREA2'),
  ('82af3b5b-b8f0-4430-adcc-578011847ec0'::uuid,'S0069','AREA2'),
  ('4d42703f-83f7-4511-8c8e-501e5c2fc795'::uuid,'S0070','AREA3'),
  ('e7da5e32-9fc8-4328-8e65-4601e4ec298e'::uuid,'S0071','AREA2'),
  ('a98a4899-b301-49b7-b25d-6cf744759bab'::uuid,'S0072','AREA3'),
  ('66deaeef-b461-4b62-83ad-ecfe07acad8d'::uuid,'S0074','AREA5'),
  ('0b9fff5f-da2e-4231-82d0-9c6a3b5f5380'::uuid,'S0075','AREA2'),
  ('00a48441-564c-4ea8-8811-ad3c48f35fb4'::uuid,'S0076','AREA5'),
  ('ffa7b3a4-f0a5-4e7e-9b80-ae15bafd901b'::uuid,'S0078','AREA3'),
  ('33e312e5-f2c7-4430-9086-f7ff2123871a'::uuid,'S0079','AREA5'),
  ('8977b4eb-c0a8-4135-98c7-0751e47e9eb4'::uuid,'S0080','AREA1'),
  ('05a05796-7b7d-43e3-9aaa-50e0a45aa495'::uuid,'S0081','AREA1'),
  ('2a782730-2bb3-4966-bd7b-6de921da9f38'::uuid,'S0082','AREA3'),
  ('fc23c097-1bdf-411a-9f15-d2cdca590b28'::uuid,'S0083','AREA5'),
  ('928a0a13-13cf-4017-8e26-87098352f2c8'::uuid,'S0084','AREA1'),
  ('2d51a068-5e89-45c5-98ad-dd2897428529'::uuid,'S0085','AREA5'),
  ('bc5dff2e-eb4a-4644-9591-fdf8e1ad4174'::uuid,'S0086','AREA5'),
  ('4c73d354-2e23-48cb-876f-b75e2b672705'::uuid,'S0087','AREA4'),
  ('4071478f-ef5c-45e4-95d0-2f31f3539251'::uuid,'S0088','AREA5'),
  ('5dfe7386-e3ce-4791-a46e-ca9f94177a72'::uuid,'S0089','AREA5'),
  ('81bbeec0-c534-4a6d-8ea1-9c624aeecaa4'::uuid,'S0090','AREA1'),
  ('098c9478-7edf-47b4-bd40-55e908157446'::uuid,'S0091','AREA1'),
  ('9bd47346-2fb9-4a4d-ab89-3a40bec03963'::uuid,'S0092','AREA2'),
  ('8f04b5d8-f514-47dd-b5cf-4b583e4e6770'::uuid,'S0093','AREA3'),
  ('175d89a2-d4c1-46e2-b786-fb394e934e8a'::uuid,'S0095','AREA3'),
  ('ca9f97f6-8a76-4e2b-97ed-9ee83c679508'::uuid,'S0096','AREA2'),
  ('9783f271-811d-452f-9e04-32c4ef4a067a'::uuid,'S0097','AREA4'),
  ('a145869c-8577-45ee-8794-9253fe987619'::uuid,'S0098','AREA4'),
  ('d0d2dae9-b15b-4850-9f40-7591f212d258'::uuid,'S0118','AREA3'),
  ('24f9a8ab-d479-46c0-bfa2-01b03b7754db'::uuid,'S0119','AREA3'),
  ('6e9b8723-f9fe-4035-8a0d-0d86fbdf5d8f'::uuid,'S0120','AREA2'),
  ('649aa8a1-6928-4115-a993-6b17023e2d4b'::uuid,'S0121','AREA2'),
  ('d8a50e1f-c40a-40dd-b90f-5988459825fd'::uuid,'S0122','AREA1'),
  ('56d176db-bc7c-4f60-b04c-a40cefa89c62'::uuid,'S0125','AREA4'),
  ('a0fd551a-ee8e-44d1-bd5a-5a5e0641e616'::uuid,'S0777','AREA2'),
  ('5c7464e3-13fb-4ba9-b02b-bb0615dcf055'::uuid,'S0904','AREA2'),
  ('1fe9618d-03f9-4b53-8096-c22b7e560f74'::uuid,'S0913','AREA1'),
  ('55b31e73-f8d2-4966-a05b-b296c999226a'::uuid,'S0914','AREA1');
CREATE TEMP TABLE fra_manager_emails(area text PRIMARY KEY,email text NOT NULL UNIQUE) ON COMMIT DROP;
INSERT INTO fra_manager_emails VALUES
  ('AREA1','jill.gunn@footasylum.com'),
  ('AREA2','stuart.hunter@footasylum.com'),
  ('AREA3','liam.harvey@footasylum.com'),
  ('AREA4','brett.llewellyn@footasylum.com'),
  ('AREA5','shaynul.uddin@footasylum.com');
DO $$ BEGIN
  IF (SELECT count(*) FROM fra_manager_roster) <> 67 OR EXISTS (
    SELECT 1 FROM fra_manager_roster r LEFT JOIN public.fa_stores s ON s.id=r.store_id
    WHERE s.id IS NULL OR s.store_code IS DISTINCT FROM r.store_code
      OR s.reporting_area IS DISTINCT FROM r.area OR NOT s.is_active
  ) THEN RAISE EXCEPTION 'Reviewed active manager roster changed'; END IF;
  IF (SELECT count(*) FROM auth.users u JOIN public.fa_profiles p ON p.id=u.id
      JOIN fra_manager_emails m ON lower(u.email)=m.email) <> 5 THEN
    RAISE EXCEPTION 'Five verified Area Manager accounts required';
  END IF;
END $$;
INSERT INTO public.fa_fra_store_access(user_id,store_id,access_level,is_active)
SELECT u.id,r.store_id,'area_manager',false
FROM fra_manager_roster r JOIN fra_manager_emails m ON m.area=r.area
JOIN auth.users u ON lower(u.email)=m.email
JOIN public.fa_profiles p ON p.id=u.id;
COMMIT;
