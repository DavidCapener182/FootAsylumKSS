-- UNAPPLIED DRAFT. Run as a separate migration transaction before the
-- hierarchy draft. No existing `client` account is converted automatically.
ALTER TYPE public.fa_user_role ADD VALUE IF NOT EXISTS 'client_admin';
ALTER TYPE public.fa_user_role ADD VALUE IF NOT EXISTS 'area_manager';
