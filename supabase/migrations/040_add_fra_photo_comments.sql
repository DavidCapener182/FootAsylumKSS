create table if not exists fa_fra_photo_comments (
  id uuid primary key default gen_random_uuid(),
  audit_instance_id uuid not null references fa_audit_instances(id) on delete cascade,
  placeholder_id text not null,
  file_path text not null,
  comment text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fa_fra_photo_comments_unique_file unique (audit_instance_id, file_path)
);

create index if not exists idx_fra_photo_comments_instance
  on fa_fra_photo_comments (audit_instance_id);

create index if not exists idx_fra_photo_comments_placeholder
  on fa_fra_photo_comments (audit_instance_id, placeholder_id);

create or replace function set_fra_photo_comments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_fra_photo_comments_updated_at on fa_fra_photo_comments;
create trigger trg_fra_photo_comments_updated_at
before update on fa_fra_photo_comments
for each row
execute function set_fra_photo_comments_updated_at();

alter table fa_fra_photo_comments enable row level security;

drop policy if exists "Authenticated users can read FRA photo comments" on fa_fra_photo_comments;
create policy "Authenticated users can read FRA photo comments"
  on fa_fra_photo_comments for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert FRA photo comments" on fa_fra_photo_comments;
create policy "Authenticated users can insert FRA photo comments"
  on fa_fra_photo_comments for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "Authenticated users can update FRA photo comments" on fa_fra_photo_comments;
create policy "Authenticated users can update FRA photo comments"
  on fa_fra_photo_comments for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete FRA photo comments" on fa_fra_photo_comments;
create policy "Authenticated users can delete FRA photo comments"
  on fa_fra_photo_comments for delete
  to authenticated
  using (true);
