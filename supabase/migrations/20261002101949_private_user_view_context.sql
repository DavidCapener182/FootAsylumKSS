-- One current page and last document per account; no browsing history.
create table public.fa_user_view_context (
  user_id uuid primary key references auth.users(id) on delete cascade,
  page_path text,
  page_title text,
  viewing_document text,
  page_seen_at timestamptz,
  document_title text,
  document_opened_at timestamptz
);
alter table public.fa_user_view_context enable row level security;
revoke all on public.fa_user_view_context from public, anon, authenticated;
grant select, insert, update, delete on public.fa_user_view_context to service_role;
comment on table public.fa_user_view_context is 'Server-only latest view context; reads require the verified David Capener account.';
