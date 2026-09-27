-- Step 3: private, versioned study snapshots. Existing records are untouched.
-- Apply ONLY this file after 001 and 002. Never rerun invite-code creation.
begin;

create table if not exists public.study_sync_snapshots (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  revision bigint not null default 1 check (revision > 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.study_sync_snapshots enable row level security;
revoke all on public.study_sync_snapshots from public, anon, authenticated;

create or replace function public.wordtop_load_study() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  owner_id uuid;
  saved public.study_sync_snapshots%rowtype;
begin
  select profile_id into owner_id from public.profile_accounts where auth_user_id = auth.uid();
  if owner_id is null then raise exception '프로필 연결이 필요합니다.'; end if;
  select * into saved from public.study_sync_snapshots where profile_id = owner_id;
  if not found then
    return jsonb_build_object('profile_id', owner_id, 'revision', 0, 'snapshot', null);
  end if;
  return jsonb_build_object('profile_id', owner_id, 'revision', saved.revision,
    'snapshot', saved.snapshot, 'updated_at', saved.updated_at);
end;
$$;

create or replace function public.wordtop_save_study(expected_revision bigint, new_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  owner_id uuid;
  saved public.study_sync_snapshots%rowtype;
  current_revision bigint;
begin
  -- Profile identity comes only from the authenticated device binding.
  select profile_id into owner_id from public.profile_accounts where auth_user_id = auth.uid();
  if owner_id is null then raise exception '프로필 연결이 필요합니다.'; end if;
  if expected_revision is null or expected_revision < 0 then raise exception '잘못된 기록 버전입니다.'; end if;
  if new_snapshot is null or jsonb_typeof(new_snapshot) <> 'object' then
    raise exception '학습 기록 형식이 올바르지 않습니다.';
  end if;
  if new_snapshot->>'schemaVersion' is distinct from '1' then
    raise exception '지원하지 않는 학습 기록 버전입니다.';
  end if;
  if jsonb_typeof(new_snapshot->'deck') is distinct from 'object'
    or jsonb_typeof(new_snapshot->'deck'->'words') is distinct from 'array' then
    raise exception '단어장 형식이 올바르지 않습니다.';
  end if;
  if jsonb_array_length(new_snapshot->'deck'->'words') not between 1 and 10000
    or octet_length(new_snapshot::text) > 8388608 then
    raise exception '학습 기록 크기 제한을 초과했습니다.';
  end if;
  -- Serializes writes across every device bound to this profile, including first save.
  perform pg_advisory_xact_lock(hashtextextended('wordtop-study:' || owner_id::text, 0));
  select * into saved from public.study_sync_snapshots where profile_id = owner_id;
  current_revision := coalesce(saved.revision, 0);
  if current_revision <> expected_revision then
    return jsonb_build_object('conflict', true, 'profile_id', owner_id,
      'revision', current_revision, 'snapshot', saved.snapshot, 'updated_at', saved.updated_at);
  end if;
  insert into public.study_sync_snapshots(profile_id, revision, snapshot)
    values(owner_id, 1, new_snapshot)
  on conflict (profile_id) do update
    set revision = public.study_sync_snapshots.revision + 1,
        snapshot = excluded.snapshot, updated_at = now()
  returning * into saved;
  return jsonb_build_object('conflict', false, 'profile_id', owner_id,
    'revision', saved.revision, 'updated_at', saved.updated_at);
end;
$$;

revoke all on function public.wordtop_load_study() from public, anon;
revoke all on function public.wordtop_save_study(bigint, jsonb) from public, anon;
grant execute on function public.wordtop_load_study() to authenticated;
grant execute on function public.wordtop_save_study(bigint, jsonb) to authenticated;

commit;
