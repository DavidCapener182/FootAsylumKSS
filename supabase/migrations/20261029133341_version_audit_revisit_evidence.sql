-- New immutable rows supersede evidence; no original audit or prior file is changed.
alter table public.fa_audit_revisits add column replaces_id uuid
 references public.fa_audit_revisits(id) on delete restrict,
 add constraint fa_revisit_not_self check (replaces_id is distinct from id);
-- One successor per version serializes competing replacements without allowing branches.
create unique index fa_revisit_one_successor on public.fa_audit_revisits(replaces_id) where replaces_id is not null;

create function public.fa_validate_revisit_version() returns trigger
language plpgsql security invoker set search_path='' as $$
declare previous public.fa_audit_revisits;
begin
 if new.replaces_id is not null then
  select * into previous from public.fa_audit_revisits where id=new.replaces_id;
  if not found or previous.original_history_id is distinct from new.original_history_id
   or previous.revisit_date is distinct from new.revisit_date
  then raise exception 'Replacement must retain the original audit and revisit date'; end if;
 end if;
 return new;
end $$;
revoke all on function public.fa_validate_revisit_version() from public,anon,authenticated;
create trigger fa_validate_revisit_version before insert on public.fa_audit_revisits
for each row execute function public.fa_validate_revisit_version();

-- Existing add-evidence callers cannot accidentally reuse a replacement request ID.
create or replace function public.fa_append_audit_revisit(
 p_id uuid,p_actor uuid,p_history uuid,p_date date,p_notes text,p_path text,p_sha256 text,
 p_type text,p_size integer,p_name text
) returns public.fa_audit_revisits language plpgsql security invoker set search_path='' as $$
declare original public.fa_store_audit_history; result public.fa_audit_revisits;
begin
 if not exists(select 1 from public.fa_profiles where id=p_actor and role in ('admin','ops') and account_status='active')
 then raise exception 'Active audit manager required'; end if;
 select * into original from public.fa_store_audit_history where id=p_history and kind='H&S';
 if not found then raise exception 'Original audit unavailable'; end if;
 if p_date < original.visit_date then raise exception 'Revisit predates original audit'; end if;
 if p_path !~ ('^'||p_history::text||'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|docx|jpg|png|webp)$')
 then raise exception 'Invalid evidence path'; end if;
 -- Unique constraints serialize concurrent attempts. A later call with a new request ID
 -- and the same original/date/content is also a retry, not a second revisit.
 insert into public.fa_audit_revisits(id,original_history_id,revisit_date,notes,storage_path,file_sha256,mime_type,file_size,file_name,created_by)
 values(p_id,p_history,p_date,p_notes,p_path,p_sha256,p_type,p_size,p_name,p_actor)
 on conflict do nothing returning * into result;
 if found then return result; end if;
 select * into result from public.fa_audit_revisits where id=p_id;
 if not found then
  select * into result from public.fa_audit_revisits
  where original_history_id=p_history and revisit_date=p_date and file_sha256=p_sha256;
 end if;
 if not found or result.replaces_id is not null or result.original_history_id is distinct from p_history or result.revisit_date is distinct from p_date
 or result.file_sha256 is distinct from p_sha256 or result.notes is distinct from p_notes
 or result.mime_type is distinct from p_type or result.file_size is distinct from p_size
 then raise exception 'Submission conflicts with existing revisit; use a new submission for different evidence'; end if;
 return result;
end $$;
revoke all on function public.fa_append_audit_revisit(uuid,uuid,uuid,date,text,text,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.fa_append_audit_revisit(uuid,uuid,uuid,date,text,text,text,text,integer,text) to service_role;


create function public.fa_replace_audit_revisit(
 p_id uuid,p_actor uuid,p_history uuid,p_date date,p_notes text,p_path text,p_sha256 text,
 p_type text,p_size integer,p_name text,p_replaces uuid
) returns public.fa_audit_revisits language plpgsql security invoker set search_path='' as $$
declare previous public.fa_audit_revisits; result public.fa_audit_revisits;
begin
 if not exists(select 1 from public.fa_profiles where id=p_actor and role in ('admin','ops') and account_status='active')
 then raise exception 'Active audit manager required'; end if;
 select * into previous from public.fa_audit_revisits where id=p_replaces;
 if not found or previous.original_history_id is distinct from p_history or previous.revisit_date is distinct from p_date
 then raise exception 'Replacement must retain the original audit and revisit date'; end if;
 if p_path !~ ('^'||p_history::text||'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|docx|jpg|png|webp)$')
 then raise exception 'Invalid evidence path'; end if;
 insert into public.fa_audit_revisits(id,original_history_id,revisit_date,notes,storage_path,file_sha256,mime_type,file_size,file_name,created_by,replaces_id)
 values(p_id,p_history,p_date,p_notes,p_path,p_sha256,p_type,p_size,p_name,p_actor,p_replaces)
 on conflict do nothing returning * into result;
 if found then return result; end if;
 -- Replaying an already committed request remains safe even after a later version exists.
 select * into result from public.fa_audit_revisits where id=p_id;
 if not found then
  select * into result from public.fa_audit_revisits where replaces_id=p_replaces;
  -- A fresh request aimed at an older version must never appear to replace a newer report.
  if found and exists(select 1 from public.fa_audit_revisits where replaces_id=result.id)
  then raise exception 'Report already replaced; reload history and select the current report'; end if;
 end if;
 if not found or result.replaces_id is distinct from p_replaces
  or result.original_history_id is distinct from p_history or result.revisit_date is distinct from p_date
  or result.file_sha256 is distinct from p_sha256 or result.notes is distinct from p_notes
  or result.mime_type is distinct from p_type or result.file_size is distinct from p_size
  or result.file_name is distinct from p_name
 then raise exception 'Report already replaced or submission conflicts; reload history and select the current report'; end if;
 return result;
end $$;
revoke all on function public.fa_replace_audit_revisit(uuid,uuid,uuid,date,text,text,text,text,integer,text,uuid) from public,anon,authenticated;
grant execute on function public.fa_replace_audit_revisit(uuid,uuid,uuid,date,text,text,text,text,integer,text,uuid) to service_role;
