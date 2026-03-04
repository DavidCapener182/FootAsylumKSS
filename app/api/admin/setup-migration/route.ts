import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MIGRATION_SQL = `
create table if not exists release_notes (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  title text,
  description text,
  content text,
  created_at timestamptz default now(),
  is_active boolean default true
);
alter table release_notes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'release_notes' and policyname = 'auth_read_releases') then
    create policy auth_read_releases on release_notes for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'release_notes' and policyname = 'admin_insert_releases') then
    create policy admin_insert_releases on release_notes for insert to authenticated with check (exists (select 1 from fa_profiles where fa_profiles.id = auth.uid() and fa_profiles.role = 'admin'));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'release_notes' and policyname = 'admin_update_releases') then
    create policy admin_update_releases on release_notes for update to authenticated using (exists (select 1 from fa_profiles where fa_profiles.id = auth.uid() and fa_profiles.role = 'admin'));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'release_notes' and policyname = 'admin_delete_releases') then
    create policy admin_delete_releases on release_notes for delete to authenticated using (exists (select 1 from fa_profiles where fa_profiles.id = auth.uid() and fa_profiles.role = 'admin'));
  end if;
end $$;

create table if not exists user_release_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  release_id uuid references release_notes(id) on delete cascade,
  viewed_at timestamptz default now(),
  unique (user_id, release_id)
);
alter table user_release_views enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'user_release_views' and policyname = 'user_read_own_views') then
    create policy user_read_own_views on user_release_views for select to authenticated using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_release_views' and policyname = 'user_insert_own_views') then
    create policy user_insert_own_views on user_release_views for insert to authenticated with check (user_id = auth.uid());
  end if;
end $$;

create table if not exists user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  type text not null check (type in ('bug', 'feature', 'feedback')),
  title text not null,
  description text,
  page_url text,
  browser_info text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  admin_notes text,
  created_at timestamptz default now(),
  resolved_at timestamptz
);
alter table user_feedback enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'user_feedback' and policyname = 'user_insert_own_feedback') then
    create policy user_insert_own_feedback on user_feedback for insert to authenticated with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_feedback' and policyname = 'user_read_feedback') then
    create policy user_read_feedback on user_feedback for select to authenticated using (user_id = auth.uid() or exists (select 1 from fa_profiles where fa_profiles.id = auth.uid() and fa_profiles.role = 'admin'));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_feedback' and policyname = 'admin_update_feedback') then
    create policy admin_update_feedback on user_feedback for update to authenticated using (exists (select 1 from fa_profiles where fa_profiles.id = auth.uid() and fa_profiles.role = 'admin'));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_feedback' and policyname = 'admin_delete_feedback') then
    create policy admin_delete_feedback on user_feedback for delete to authenticated using (exists (select 1 from fa_profiles where fa_profiles.id = auth.uid() and fa_profiles.role = 'admin'));
  end if;
end $$;
`.trim()

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('fa_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const dbUrl = process.env.DATABASE_URL
      || process.env.POSTGRES_URL
      || process.env.DIRECT_URL
      || process.env.SUPABASE_DB_URL

    if (!dbUrl) {
      return NextResponse.json({
        error: 'No DATABASE_URL found',
        migration_sql: MIGRATION_SQL,
        hint: 'Please run this SQL in the Supabase Dashboard SQL Editor',
        available_env_keys: Object.keys(process.env).filter(k =>
          k.includes('DATABASE') || k.includes('POSTGRES') || k.includes('SUPABASE') || k.includes('DB_URL')
        )
      }, { status: 200 })
    }

    const { Client } = await import('pg')
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
    await client.connect()
    await client.query(MIGRATION_SQL)
    await client.end()

    return NextResponse.json({ success: true, message: 'Migration applied successfully' })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
