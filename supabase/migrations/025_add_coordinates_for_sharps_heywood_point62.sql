-- Add coordinates for confirmed audit/FRA locations:
-- S0900 (Sharps Project), WH003 (Heywood Unit M3), WH004 (Point 62)
-- Coordinates are postcode-level centroids for:
-- M40 5BJ, OL10 2TT, M24 2RP

UPDATE public.fa_stores
SET
  latitude = 53.501447,
  longitude = -2.195506
WHERE UPPER(COALESCE(store_code, '')) IN ('S0900', 'EXT-SHARPPROJECT', 'SHARP PROJECT', 'SHARPS PROJECT');

UPDATE public.fa_stores
SET
  latitude = 53.581329,
  longitude = -2.238981
WHERE UPPER(COALESCE(store_code, '')) IN ('WH003', 'M3');

UPDATE public.fa_stores
SET
  latitude = 53.563600,
  longitude = -2.166744
WHERE UPPER(COALESCE(store_code, '')) IN ('WH004', 'POINT 62', 'POINT62', 'P62');
