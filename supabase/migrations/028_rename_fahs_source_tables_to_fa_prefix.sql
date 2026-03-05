-- Rename legacy FAHS source/import tables to FA-prefixed names.
-- Non-destructive: no rows dropped, table identities preserved.

DO $$
BEGIN
  IF to_regclass('public."FAHS-incidents"') IS NOT NULL
     AND to_regclass('public.fa_hs_incidents') IS NULL THEN
    ALTER TABLE public."FAHS-incidents" RENAME TO fa_hs_incidents;
  END IF;

  IF to_regclass('public."FAHS-claims"') IS NOT NULL
     AND to_regclass('public.fa_hs_claims') IS NULL THEN
    ALTER TABLE public."FAHS-claims" RENAME TO fa_hs_claims;
  END IF;

  IF to_regclass('public."FAHS-sites"') IS NOT NULL
     AND to_regclass('public.fa_hs_sites') IS NULL THEN
    ALTER TABLE public."FAHS-sites" RENAME TO fa_hs_sites;
  END IF;

  IF to_regclass('public."FAHS-monthly_summary"') IS NOT NULL
     AND to_regclass('public.fa_hs_monthly_summary') IS NULL THEN
    ALTER TABLE public."FAHS-monthly_summary" RENAME TO fa_hs_monthly_summary;
  END IF;
END $$;
