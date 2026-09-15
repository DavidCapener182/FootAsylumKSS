-- Allow a separate reporting group; store moves run through the authenticated app.
ALTER TABLE public.fa_stores DROP CONSTRAINT fa_stores_reporting_area_check;
ALTER TABLE public.fa_stores ADD CONSTRAINT fa_stores_reporting_area_check
  CHECK (reporting_area IS NULL OR reporting_area IN
    ('AREA1', 'AREA2', 'AREA3', 'AREA4', 'AREA5', 'NON_RETAIL'));
