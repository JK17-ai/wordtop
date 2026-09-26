-- Phase 1 foundation. Run once in a NEW Supabase project's SQL Editor.
-- All personal data is private by default. Account binding and validated
-- scoring RPCs will be added before enabling app writes.
begin;

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  avatar text not null,
  unique (family_id, name)
);
-- A device/account is linked to ONE chosen family profile.
-- Provisioning is server-only; clients cannot choose another user's ID.
create table public.profile_accounts (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  title text not null,
  created_at timestamptz not null default now()
);
create table public.words (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  ordinal integer not null check (ordinal >= 0),
  word text not null,
  meaning text not null,
  unique (deck_id, ordinal)
);
create table public.word_progress (
  profile_id uuid not null references public.profiles(id),
  word_id uuid not null references public.words(id) on delete cascade,
  status text not null default 'new' check (status in ('new','scrap','mastered')),
  updated_at timestamptz not null default now(),
  primary key (profile_id, word_id)
);
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  deck_id uuid not null references public.decks(id),
  active_ms bigint not null default 0 check (active_ms >= 0),
  current_word_id uuid references public.words(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create table public.answer_events (
  id uuid primary key, -- Client event UUID allows idempotent offline retries.
  session_id uuid not null references public.study_sessions(id),
  word_id uuid not null references public.words(id),
  selected_meaning text,
  outcome text not null check (outcome in ('correct','wrong','timeout')),
  active_ms integer not null check (active_ms between 0 and 600000),
  answered_at timestamptz not null,
  received_at timestamptz not null default now()
);
create table public.badge_awards (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  streak_run_id uuid not null,
  tier text not null check (tier in ('bronze','silver','gold')),
  answer_event_id uuid not null references public.answer_events(id),
  awarded_at timestamptz not null default now(),
  unique (profile_id, streak_run_id, tier)
);
create index profiles_family_idx on public.profiles(family_id);
create index profile_accounts_profile_idx on public.profile_accounts(profile_id);
create index sessions_profile_idx on public.study_sessions(profile_id, started_at);
create index answers_session_idx on public.answer_events(session_id, answered_at);
create index badges_profile_idx on public.badge_awards(profile_id, awarded_at);

-- Deny access until family authentication and RPC policies are installed.
alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_accounts enable row level security;
alter table public.decks enable row level security;
alter table public.words enable row level security;
alter table public.word_progress enable row level security;
alter table public.study_sessions enable row level security;
alter table public.answer_events enable row level security;
alter table public.badge_awards enable row level security;
revoke all on public.families, public.profiles, public.profile_accounts,
  public.decks, public.words, public.word_progress, public.study_sessions,
  public.answer_events, public.badge_awards from anon, authenticated;

-- Public health probe contains no family or learning data.
create function public.wordtop_health() returns text
language sql immutable set search_path = ''
as $$ select 'wordtop-v1'::text $$;
revoke all on function public.wordtop_health() from public;
grant execute on function public.wordtop_health() to anon, authenticated;

with family as (
  insert into public.families(name) values ('우리 가족') returning id
)
insert into public.profiles(family_id, name, avatar)
select family.id, names.name, names.avatar from family
cross join (values ('제이크','👨'),('지니','👩'),('새우깡','🦐'),('갈매기','🕊️')) as names(name,avatar);

commit;
