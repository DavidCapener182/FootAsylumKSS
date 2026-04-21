-- Add Glasgow Silverburn using the live Footasylum store locator details.
-- Keep the internal naming consistent with the existing Glasgow store records.

-- Normalize any existing manual Silverburn entry onto the official store code/details
-- before the upsert below runs, to avoid duplicate Glasgow Silverburn rows.
UPDATE public.fa_stores AS stores
SET
  store_code = 'S0122',
  store_name = 'Glasgow Silverburn',
  address_line_1 = 'Unit B7, Silverburn Shopping Centre, Barrhead Rd',
  city = 'Glasgow',
  postcode = 'G53 6AG',
  region = 'A1',
  is_active = true,
  latitude = 55.876325,
  longitude = -4.3684111,
  updated_at = NOW()
WHERE (
  lower(trim(coalesce(stores.store_name, ''))) IN ('glasgow silverburn', 'silverburn')
  OR lower(trim(coalesce(stores.postcode, ''))) = 'g53 6ag'
  OR lower(coalesce(stores.address_line_1, '')) LIKE '%silverburn%'
)
AND NOT EXISTS (
  SELECT 1
  FROM public.fa_stores AS existing
  WHERE existing.store_code = 'S0122'
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
  longitude
)
VALUES (
  'S0122',
  'Glasgow Silverburn',
  'Unit B7, Silverburn Shopping Centre, Barrhead Rd',
  'Glasgow',
  'G53 6AG',
  'A1',
  true,
  55.876325,
  -4.3684111
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
  updated_at = NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fa_stores'
      AND column_name = 'reporting_area'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fa_stores'
      AND column_name = 'reporting_area_manager_name'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fa_stores'
      AND column_name = 'reporting_area_manager_email'
  ) THEN
    UPDATE public.fa_stores
    SET
      reporting_area = 'AREA1',
      reporting_area_manager_name = 'Jill Gunn',
      reporting_area_manager_email = 'Jill.Gunn@footasylum.com',
      updated_at = NOW()
    WHERE store_code = 'S0122';
  END IF;
END
$$;
