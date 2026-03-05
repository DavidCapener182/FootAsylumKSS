-- Rename product feedback/release tables to use FA prefix.
-- Non-destructive: preserves existing rows, policies, and constraints.

DO $$
BEGIN
  IF to_regclass('public.fa_release_notes') IS NULL
     AND to_regclass('public.release_notes') IS NOT NULL THEN
    ALTER TABLE public.release_notes RENAME TO fa_release_notes;
  END IF;

  IF to_regclass('public.fa_user_release_views') IS NULL
     AND to_regclass('public.user_release_views') IS NOT NULL THEN
    ALTER TABLE public.user_release_views RENAME TO fa_user_release_views;
  END IF;

  IF to_regclass('public.fa_user_feedback') IS NULL
     AND to_regclass('public.user_feedback') IS NOT NULL THEN
    ALTER TABLE public.user_feedback RENAME TO fa_user_feedback;
  END IF;
END $$;
