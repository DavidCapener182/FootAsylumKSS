-- Add new FootAsylum stores: Darlington and Stockton On Tees
-- Both stores are in A1 region (Scotland & North East), same as Newcastle and Sunderland

-- Add Darlington store
INSERT INTO fa_stores (
  id,
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
  gen_random_uuid(),
  'S0913',
  'Darlington',
  'Unit 24, Cornmill Shopping Centre',
  'Darlington',
  'DL1 1LS',
  'A1',
  true,
  54.52549, -- Latitude for DL1 1LS
  -1.547067 -- Longitude for DL1 1LS
) ON CONFLICT (store_code) DO NOTHING;

-- Add Stockton On Tees store
INSERT INTO fa_stores (
  id,
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
  gen_random_uuid(),
  'S0914',
  'Stockton On Tees',
  'Unit 20A, Teesside Shopping Park, Sandown Way',
  'Stockton-on-Tees',
  'TS17 7BT',
  'A1',
  true,
  54.556336, -- Latitude for TS17 7BT
  -1.278792 -- Longitude for TS17 7BT
) ON CONFLICT (store_code) DO NOTHING;
