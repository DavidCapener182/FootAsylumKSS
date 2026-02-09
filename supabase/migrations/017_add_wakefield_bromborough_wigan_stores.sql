-- Add missing stores to fa_stores and align Stockton code
-- Areas:
--   A2 = Yorkshire & Midlands
--   A4 = Lancashire & Merseyside

-- If Stockton was ever saved under S0913, correct it to S0914 (only when S0914 is not already present)
UPDATE fa_stores
SET
  store_code = 'S0914',
  store_name = 'Stockton',
  address_line_1 = 'Unit 37-38, Wellington Square',
  city = 'Stockton',
  postcode = 'TS18 1RG',
  region = 'A1',
  is_active = true,
  latitude = 54.565495,
  longitude = -1.314389,
  updated_at = NOW()
WHERE store_code = 'S0913'
  AND (
    store_name ILIKE 'Stockton%'
    OR city ILIKE 'Stockton%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM fa_stores existing WHERE existing.store_code = 'S0914'
  );

-- Ensure Stockton exists as S0914 with the correct details
INSERT INTO fa_stores (
  store_code,
  store_name,
  address_line_1,
  city,
  postcode,
  region,
  is_active,
  latitude,
  longitude
) VALUES (
  'S0914',
  'Stockton',
  'Unit 37-38, Wellington Square',
  'Stockton',
  'TS18 1RG',
  'A1',
  true,
  54.565495,
  -1.314389
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

-- Add / update Wakefield, Bromborough and Wigan
INSERT INTO fa_stores (
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
VALUES
  (
    'S0118',
    'Wakefield',
    'Unit G16, Trinity Walk',
    'Wakefield',
    'WF1 1QU',
    'A2',
    true,
    53.685574,
    -1.495074
  ),
  (
    'S0120',
    'Bromborough',
    'The Croft Retail Park, Welton Road',
    'Bromborough',
    'CH62 3PN',
    'A4',
    true,
    53.340696,
    -2.976265
  ),
  (
    'S0121',
    'Wigan',
    'Unit 11B, Robin Retail Park, Loire Drive',
    'Wigan',
    'WN5 0UH',
    'A4',
    true,
    53.546446,
    -2.652252
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
