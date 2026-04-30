-- Croydon and Manchester Womans are closed.
-- Keep historical audit/FRA/action records, but remove them from active operational views.

UPDATE public.fa_stores
SET
  is_active = false,
  updated_at = NOW()
WHERE store_code IN ('S0032', 'S0007')
  OR lower(trim(store_name)) IN (
    'croydon',
    'manchester womans',
    'manchester womens',
    'manchester women''s'
  );
