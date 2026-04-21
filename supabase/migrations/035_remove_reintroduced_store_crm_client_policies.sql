-- Remove CRM client policies that were reintroduced by 034_repair_store_crm_tables.sql.
-- 029_harden_client_profile_and_crm_access.sql intentionally removed this access.

DROP POLICY IF EXISTS "Client can view store contacts" ON public.fa_store_contacts;
DROP POLICY IF EXISTS "Client can view store notes" ON public.fa_store_notes;
DROP POLICY IF EXISTS "Client can view store contact tracker" ON public.fa_store_contact_tracker;
