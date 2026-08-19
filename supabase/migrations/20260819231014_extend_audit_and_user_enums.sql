-- Keep enum additions in their own migration. PostgreSQL requires a newly
-- added enum value to be committed before it can be used by later migrations.

ALTER TYPE public.fa_user_role
  ADD VALUE IF NOT EXISTS 'pending';

ALTER TYPE public.fa_entity_type
  ADD VALUE IF NOT EXISTS 'user';
