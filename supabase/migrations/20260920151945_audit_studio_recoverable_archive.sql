create table public.fa_audit_studio_archive (
 audit_id uuid primary key references public.fa_audit_studio_audits(id),
 archived_at timestamptz not null default now(),
 reason text not null
);
alter table public.fa_audit_studio_archive enable row level security;
revoke all on public.fa_audit_studio_archive from anon, authenticated;
grant select on public.fa_audit_studio_archive to authenticated;
grant all on public.fa_audit_studio_archive to service_role;
create policy studio_admin_read on public.fa_audit_studio_archive for select to authenticated using ((select fa_private.get_user_role(auth.uid())) = 'admin');
