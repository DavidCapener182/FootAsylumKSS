-- GDPR hardening:
-- 1) Restrict client visibility on fa_profiles to own record only
--    (via existing "Users can view own profile" policy).
-- 2) Remove direct client access to CRM contact/notes/tracker tables.
-- 3) Tighten claims readonly policy so it only applies to readonly role.

-- --------------------------------------------
-- fa_profiles
-- --------------------------------------------
DROP POLICY IF EXISTS "Client can view profiles" ON public.fa_profiles;

-- --------------------------------------------
-- fa_store_contacts / fa_store_notes / fa_store_contact_tracker
-- --------------------------------------------
DROP POLICY IF EXISTS "Client can view store contacts" ON public.fa_store_contacts;
DROP POLICY IF EXISTS "Client can view store notes" ON public.fa_store_notes;
DROP POLICY IF EXISTS "Client can view store contact tracker" ON public.fa_store_contact_tracker;

-- --------------------------------------------
-- fa_claims
-- --------------------------------------------
DROP POLICY IF EXISTS "Readonly can view claims" ON public.fa_claims;

CREATE POLICY "Readonly can view claims"
  ON public.fa_claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.fa_profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'readonly'
    )
  );
