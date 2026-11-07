-- Cancellation retains evidence and answers, and serializes against save/completion.
create function public.fa_cancel_studio_audit(p_audit uuid, p_revision integer, p_user uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare a public.fa_audit_studio_audits;
begin
 if not exists(select 1 from public.fa_profiles where id=p_user and role='admin' and account_status='active') then
  raise exception 'Active Admin required';
 end if;
 select * into a from public.fa_audit_studio_audits where id=p_audit for update;
 if not found then raise exception 'Audit not found'; end if;
 if exists(select 1 from public.fa_audit_studio_archive where audit_id=p_audit) then return; end if;
 if a.status <> 'draft' then raise exception 'Only unfinished drafts can be cancelled'; end if;
 if a.revision <> p_revision then raise exception 'REVISION_CONFLICT'; end if;
 insert into public.fa_audit_studio_archive(audit_id,reason)
 values(p_audit,'Cancelled by ' || p_user::text);
end $$;
revoke all on function public.fa_cancel_studio_audit(uuid,integer,uuid) from public,anon,authenticated;
grant execute on function public.fa_cancel_studio_audit(uuid,integer,uuid) to service_role;

-- Even a save/completion already in flight must not revive a cancelled draft.
create function public.fa_studio_archive_readonly() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 if exists(select 1 from public.fa_audit_studio_archive where audit_id=old.id) then
  raise exception 'Cancelled audit is read-only';
 end if;
 return new;
end $$;
create trigger studio_archive_readonly before update on public.fa_audit_studio_audits
 for each row execute function public.fa_studio_archive_readonly();
