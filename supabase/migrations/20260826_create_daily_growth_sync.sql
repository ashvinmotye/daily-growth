-- Daily Growth shares the existing Forge / Level90 Supabase project.
-- Run this migration once in that project's SQL editor.

create table if not exists public.daily_growth_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  store_name text not null check (store_name in ('packs', 'lessons', 'progress', 'reflections', 'settings')),
  record_id text not null,
  payload jsonb,
  deleted boolean not null default false,
  client_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, store_name, record_id),
  constraint daily_growth_record_payload_check check (deleted or payload is not null)
);

create index if not exists daily_growth_records_user_updated_idx
  on public.daily_growth_records (user_id, updated_at desc);

alter table public.daily_growth_records enable row level security;

drop policy if exists "Daily Growth users can read their records" on public.daily_growth_records;
create policy "Daily Growth users can read their records"
  on public.daily_growth_records
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Daily Growth users can insert their records" on public.daily_growth_records;
create policy "Daily Growth users can insert their records"
  on public.daily_growth_records
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Daily Growth users can update their records" on public.daily_growth_records;
create policy "Daily Growth users can update their records"
  on public.daily_growth_records
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Daily Growth users can delete their records" on public.daily_growth_records;
create policy "Daily Growth users can delete their records"
  on public.daily_growth_records
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.daily_growth_keep_newest_record()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.client_updated_at < old.client_updated_at then
    return old;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists daily_growth_keep_newest_record_trigger on public.daily_growth_records;
create trigger daily_growth_keep_newest_record_trigger
before update on public.daily_growth_records
for each row
execute function public.daily_growth_keep_newest_record();

grant select, insert, update, delete on public.daily_growth_records to authenticated;
