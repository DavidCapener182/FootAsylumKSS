-- Swindon is closed.
-- Keep historical audit/FRA/action records, but remove it from active operational views.

UPDATE public.fa_stores
SET
  is_active = false,
  updated_at = NOW()
WHERE lower(trim(store_name)) = 'swindon';
