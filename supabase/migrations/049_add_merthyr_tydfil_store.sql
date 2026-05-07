-- Add Merthyr Tydfil using the Cyfarthfa Shopping Park details.
-- Reporting area is aligned with Cardiff.

UPDATE public.fa_stores AS stores
SET
  store_code = 'S0125',
  store_name = 'Merthyr Tydfil',
  address_line_1 = 'Unit 5A, Cyfarthfa Shopping Park, Swansea Road',
  city = 'Merthyr Tydfil',
  postcode = 'CF48 1HY',
  region = 'A6',
  is_active = true,
  latitude = 51.750098,
  longitude = -3.39274,
  reporting_area = 'AREA4',
  reporting_area_manager_name = 'Brett Llewellyn',
  reporting_area_manager_email = 'brett.llewellyn@footasylum.com',
  updated_at = NOW()
WHERE (
  lower(trim(coalesce(stores.store_name, ''))) IN ('merthyr tydfil', 'merthyr')
  OR lower(trim(coalesce(stores.postcode, ''))) = 'cf48 1hy'
  OR lower(coalesce(stores.address_line_1, '')) LIKE '%cyfarthfa%'
)
AND NOT EXISTS (
  SELECT 1
  FROM public.fa_stores AS existing
  WHERE existing.store_code = 'S0125'
    AND existing.id <> stores.id
);

INSERT INTO public.fa_stores (
  store_code,
  store_name,
  address_line_1,
  city,
  postcode,
  region,
  is_active,
  latitude,
  longitude,
  reporting_area,
  reporting_area_manager_name,
  reporting_area_manager_email
)
VALUES (
  'S0125',
  'Merthyr Tydfil',
  'Unit 5A, Cyfarthfa Shopping Park, Swansea Road',
  'Merthyr Tydfil',
  'CF48 1HY',
  'A6',
  true,
  51.750098,
  -3.39274,
  'AREA4',
  'Brett Llewellyn',
  'brett.llewellyn@footasylum.com'
)
ON CONFLICT (store_code) DO UPDATE
SET
  store_name = EXCLUDED.store_name,
  address_line_1 = EXCLUDED.address_line_1,
  city = EXCLUDED.city,
  postcode = EXCLUDED.postcode,
  region = EXCLUDED.region,
  is_active = EXCLUDED.is_active,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  reporting_area = EXCLUDED.reporting_area,
  reporting_area_manager_name = EXCLUDED.reporting_area_manager_name,
  reporting_area_manager_email = EXCLUDED.reporting_area_manager_email,
  updated_at = NOW();
