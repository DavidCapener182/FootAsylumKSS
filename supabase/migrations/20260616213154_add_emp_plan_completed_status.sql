ALTER TYPE public.emp_plan_status ADD VALUE IF NOT EXISTS 'complete';
ALTER TYPE public.emp_plan_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE public.emp_plan_status ADD VALUE IF NOT EXISTS 'archived';
