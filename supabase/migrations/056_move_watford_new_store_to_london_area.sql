-- Watford New Store belongs in the London internal audit area, not Wales.
UPDATE public.fa_stores
SET
  region = 'A8',
  updated_at = NOW()
WHERE id = '5dfe7386-e3ce-4791-a46e-ca9f94177a72'
  OR store_code = 'S0089';
