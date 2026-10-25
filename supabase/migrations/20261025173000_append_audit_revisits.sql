-- Append-only child evidence. Original history, scores, answers, pointers and actions are untouched.
create table public.fa_audit_revisits (
 id uuid primary key,
 original_history_id uuid not null references public.fa_store_audit_history(id) on delete restrict,
 revisit_date date not null,
 notes text not null check(length(notes)<=2000),
 storage_path text not null unique,
 file_name text not null check(length(file_name) between 1 and 200),
 file_sha256 text not null check(file_sha256 ~ '^[0-9a-f]{64}$'),
 mime_type text not null check(mime_type in ('application/pdf','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
 file_size integer not null check(file_size between 1 and 4194304),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(original_history_id,revisit_date,file_sha256)
);
create index on public.fa_audit_revisits(original_history_id,revisit_date desc,created_at desc);
alter table public.fa_audit_revisits enable row level security;
revoke all on public.fa_audit_revisits from public,anon,authenticated,service_role;
grant select,insert on public.fa_audit_revisits to service_role;

create function public.fa_revisit_immutable() returns trigger
language plpgsql set search_path='' as $$
begin raise exception 'Revisit evidence is append-only'; end $$;
revoke all on function public.fa_revisit_immutable() from public,anon,authenticated;
create trigger fa_revisit_immutable before update or delete on public.fa_audit_revisits
for each row execute function public.fa_revisit_immutable();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('fa-audit-revisit-evidence','fa-audit-revisit-evidence',false,4194304,
 array['application/pdf','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
-- Restrictive exclusion also protects against unrelated broad permissive storage policies.
-- No direct browser access: the server authorizes store access on every read/write.
create policy fa_revisit_server_only on storage.objects as restrictive for all to public
using(bucket_id <> 'fa-audit-revisit-evidence') with check(bucket_id <> 'fa-audit-revisit-evidence');

create function public.fa_append_audit_revisit(
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
 if not found or result.original_history_id is distinct from p_history or result.revisit_date is distinct from p_date
 or result.file_sha256 is distinct from p_sha256 or result.notes is distinct from p_notes
 or result.mime_type is distinct from p_type or result.file_size is distinct from p_size
 then raise exception 'Submission conflicts with existing revisit; use a new submission for different evidence'; end if;
 return result;
end $$;
revoke all on function public.fa_append_audit_revisit(uuid,uuid,uuid,date,text,text,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.fa_append_audit_revisit(uuid,uuid,uuid,date,text,text,text,text,integer,text) to service_role;
