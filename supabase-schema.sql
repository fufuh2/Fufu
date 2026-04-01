-- DeepTradeScan — Supabase Schema
-- Supabase Dashboard → SQL Editor → New Query → Paste & Run

-- ── PROFILES TABLE ──────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  full_name     text default '',
  plan          text default 'free' check (plan in ('free','pro','elite')),
  daily_analyses int default 0,
  last_analysis_date text default '',
  banned        boolean default false,
  created_at    timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;

-- Anyone can read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Service role can do everything (used by server)
create policy "Service role full access"
  on public.profiles for all
  using (true)
  with check (true);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, plan)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'free'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── USER ANALYSES TABLE ─────────────────────────────────────────
create table if not exists public.user_analyses (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete cascade,
  coin              text not null,
  direction         text,
  entry_mid         float,
  stop              float,
  tp1               float,
  tp2               float,
  tp3               float,
  grade             text default 'A',
  win_rate          float default 80,
  confluence_score  float default 0,
  rr                text,
  entry_method      text,
  result            text default 'OPEN',
  result_r          float default 0,
  created_at        timestamptz default now()
);

-- Add missing columns if they don't exist (safe to re-run)
alter table public.user_analyses add column if not exists entry_method text;
alter table public.user_analyses add column if not exists win_rate float default 80;
alter table public.user_analyses add column if not exists confluence_score float default 0;

-- rr must be float (not text) — backtest.js sends numeric value
alter table public.user_analyses alter column rr type float using (
  case when rr ~ '^[0-9.]+$' then rr::float
       when rr like '%:%' then split_part(rr, ':', 2)::float
       else 2.0 end
);

alter table public.user_analyses enable row level security;

create policy "Users read own analyses"
  on public.user_analyses for select
  using (auth.uid() = user_id);

create policy "Service role full access on analyses"
  on public.user_analyses for all
  using (true)
  with check (true);

-- Index for fast queries
create index if not exists idx_user_analyses_user_id on public.user_analyses(user_id);
create index if not exists idx_user_analyses_created_at on public.user_analyses(created_at desc);

-- ── TRADE LOG OUTCOME COLUMNS (v2.0) ────────────────────────────
-- Run these in Supabase SQL Editor after initial schema
alter table public.user_analyses add column if not exists close_price  float;
alter table public.user_analyses add column if not exists closed_at    timestamptz;
alter table public.user_analyses add column if not exists tp_hit       text;    -- 'TP1','TP2','TP3','SL','PARTIAL','ENTRY_WAITING'
alter table public.user_analyses add column if not exists notes        text;

-- Index for fast open trade queries
create index if not exists idx_user_analyses_result on public.user_analyses(result);

-- ── QUANTUM QUOTA COLUMNS (profiles) ────────────────────────────
alter table public.profiles add column if not exists quantum_analyses_today int default 0;
alter table public.profiles add column if not exists last_quantum_date text default '';

-- ── ADMIN PLAN MANAGEMENT COLUMNS ────────────────────────────────
alter table public.profiles add column if not exists banned boolean default false;
alter table public.profiles add column if not exists plan_set_at timestamptz;
alter table public.profiles add column if not exists plan_expires_at timestamptz;
alter table public.profiles add column if not exists ban_reason text;
alter table public.profiles add column if not exists banned_at timestamptz;

-- ── ADMINS TABLE ─────────────────────────────────────────────────
create table if not exists public.admins (
  id    uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now()
);

-- Service role full access
create policy if not exists "Service role full access on admins"
  on public.admins for all
  using (true)
  with check (true);

-- Insert the main admin (adjust email as needed)
insert into public.admins (email) values ('furkan@deeptradescan.com') on conflict (email) do nothing;

-- ── SUPPORT MESSAGES TABLE ────────────────────────────────────────
create table if not exists public.support_messages (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  user_email      text,
  message         text not null,
  status          text default 'open',
  is_from_admin   boolean default false,
  conversation_id uuid,
  replied_at      timestamptz,
  created_at      timestamptz default now()
);

alter table public.support_messages enable row level security;

create policy if not exists "Service role full access on support"
  on public.support_messages for all
  using (true)
  with check (true);

create index if not exists idx_support_conversation on public.support_messages(conversation_id);
create index if not exists idx_support_user_id on public.support_messages(user_id);
