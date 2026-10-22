-- Выполни этот SQL в Supabase: SQL Editor -> New query -> Run
create table if not exists public.applications (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  age integer not null check (age >= 13 and age <= 99),
  streamer text not null,
  webcam text not null check (webcam = 'Да'),
  watching text not null,
  discord text not null,
  idea text not null default ''
);

-- Включаем RLS. Браузер напрямую к таблице не обращается:
-- все операции идут через серверную функцию с секретным service role key.
alter table public.applications enable row level security;
