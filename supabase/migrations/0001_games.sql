-- Run this once in the Supabase SQL Editor for this project
-- (https://supabase.com/dashboard/project/apruhvgamlsmoponrqaf/sql/new).
-- Creates the table the async 2-player mode reads/writes with the anon key.
-- RLS is intentionally open (no auth system yet — room codes are the only
-- gate) since this is a casual game with no sensitive data in play.

create table if not exists public.games (
  id text primary key,
  status text not null default 'waiting',
  guild_a text not null,
  guild_b text,
  seed text not null,
  state jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.games enable row level security;

drop policy if exists "public read" on public.games;
create policy "public read" on public.games for select using (true);

drop policy if exists "public insert" on public.games;
create policy "public insert" on public.games for insert with check (true);

drop policy if exists "public update" on public.games;
create policy "public update" on public.games for update using (true) with check (true);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists games_set_updated_at on public.games;
create trigger games_set_updated_at before update on public.games
for each row execute function public.set_updated_at();
