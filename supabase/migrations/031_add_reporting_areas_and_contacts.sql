ALTER TABLE public.fa_stores
ADD COLUMN IF NOT EXISTS reporting_area TEXT,
ADD COLUMN IF NOT EXISTS reporting_area_manager_name TEXT,
ADD COLUMN IF NOT EXISTS reporting_area_manager_email TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fa_stores_reporting_area_check'
  ) THEN
    ALTER TABLE public.fa_stores
    ADD CONSTRAINT fa_stores_reporting_area_check
    CHECK (
      reporting_area IS NULL
      OR reporting_area IN ('AREA1', 'AREA2', 'AREA3', 'AREA4', 'AREA5')
    );
  END IF;
END $$;

COMMENT ON COLUMN public.fa_stores.reporting_area IS
'Footasylum reporting area used for newsletters and reporting outputs.';

COMMENT ON COLUMN public.fa_stores.reporting_area_manager_name IS
'Area manager name for the store''s reporting area.';

COMMENT ON COLUMN public.fa_stores.reporting_area_manager_email IS
'Area manager email for the store''s reporting area.';

UPDATE public.fa_stores
SET reporting_area = CASE
  WHEN lower(trim(store_name)) IN (
    'preston', 'middlesbrough', 'glasgow argyle', 'dundee', 'glasgow fort',
    'glasgow', 'sunderland', 'carlisle', 'blackpool', 'braehead', 'newcastle',
    'metro new', 'aberdeen', 'darlington', 'stockton'
  ) THEN 'AREA1'
  WHEN lower(trim(store_name)) IN (
    'manchester arndale', 'liverpool one', 'bolton', 'trafford', 'speke',
    'blackburn', 'broughton park', 'bury', 'denton', 'warrington',
    'wrexham', 'bromborough', 'wigan', 'seven', 'edge lane',
    'heywood', 'middleton', 'manchester womans', 'sandbrook',
    'sevenstore', 'trafford mega', 'photo studio', 'sharp project'
  ) THEN 'AREA2'
  WHEN lower(trim(store_name)) IN (
    'nottingham', 'nottingham clumber st.', 'bradford', 'bradford broadway',
    'bradford forster square', 'hull', 'white rose', 'derby',
    'fosse park', 'wakefield', 'huddersfield'
  )
    OR lower(trim(store_name)) = 'leeds'
    OR lower(trim(store_name)) LIKE 'leeds %'
  THEN 'AREA3'
  WHEN lower(trim(store_name)) IN (
    'hanley', 'birmingham fort', 'cardiff', 'merry hill', 'coventry',
    'walsall', 'newport', 'meadowhall', 'bullring', 'doncaster',
    'rotherham', 'west brom', 'west bromwich', 'parc trostre',
    'bull ring new'
  ) THEN 'AREA4'
  WHEN lower(trim(store_name)) IN (
    'bluewater', 'stratford', 'croydon', 'portsmouth', 'bromley',
    'plymouth', 'milton keynes', 'thanet', 'brighton', 'southampton',
    'white city', 'cheshunt', 'oxford street', 'lakeside', 'lakeside new',
    'watford', 'watford new store', 'romford', 'swindon', 'bristol'
  ) THEN 'AREA5'
  ELSE reporting_area
END;

UPDATE public.fa_stores
SET
  reporting_area_manager_name = CASE reporting_area
    WHEN 'AREA1' THEN 'Jill Gunn'
    WHEN 'AREA2' THEN 'Stu Hunter'
    WHEN 'AREA3' THEN 'Liam Harvey'
    WHEN 'AREA4' THEN 'Brett Llewellyn'
    WHEN 'AREA5' THEN 'Shaynul Uddin'
    ELSE reporting_area_manager_name
  END,
  reporting_area_manager_email = CASE reporting_area
    WHEN 'AREA1' THEN 'Jill.Gunn@footasylum.com'
    WHEN 'AREA2' THEN 'Stuart.Hunter@footasylum.com'
    WHEN 'AREA3' THEN 'Liam.Harvey@footasylum.com'
    WHEN 'AREA4' THEN 'brett.llewellyn@footasylum.com'
    WHEN 'AREA5' THEN 'Shaynul.Uddin@footasylum.com'
    ELSE reporting_area_manager_email
  END
WHERE reporting_area IS NOT NULL;
