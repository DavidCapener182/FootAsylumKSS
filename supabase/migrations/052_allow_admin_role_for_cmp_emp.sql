-- Allow every admin role user to access CMP and EMP modules.

CREATE OR REPLACE FUNCTION public.cmp_is_allowed_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, auth, fa_private, pg_temp
AS $$
  SELECT fa_private.get_user_role(auth.uid()) = 'admin'::public.fa_user_role;
$$;

CREATE OR REPLACE FUNCTION public.emp_is_allowed_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, auth, fa_private, pg_temp
AS $$
  SELECT fa_private.get_user_role(auth.uid()) = 'admin'::public.fa_user_role;
$$;
