begin;
create table if not exists public.profile_invites (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  token_hash text unique not null,
  created_at timestamptz not null default now()
);
alter table public.profile_invites enable row level security;
revoke all on public.profile_invites from anon, authenticated;

create or replace function public.wordtop_my_profile() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('id',p.id,'name',p.name,'avatar',p.avatar,'family_id',p.family_id)
  from public.profile_accounts a join public.profiles p on p.id=a.profile_id
  where a.auth_user_id=auth.uid()
$$;
revoke all on function public.wordtop_my_profile() from public;
grant execute on function public.wordtop_my_profile() to authenticated;

create or replace function public.wordtop_claim_profile(profile_name text, invite_code text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  chosen uuid;
  existing uuid;
begin
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  -- Serialize concurrent claims from the same device account.
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  select profile_id into existing from public.profile_accounts where auth_user_id=uid;
  if existing is not null then return public.wordtop_my_profile(); end if;
  if invite_code is null or length(invite_code) <> 64 then
    raise exception '이름과 초대코드를 확인해 주세요.';
  end if;
  select p.id into chosen from public.profiles p
  join public.profile_invites i on i.profile_id=p.id
  where p.name=profile_name and i.token_hash=encode(sha256(convert_to(invite_code,'UTF8')),'hex');
  if chosen is null then raise exception '이름과 초대코드를 확인해 주세요.'; end if;
  insert into public.profile_accounts(auth_user_id,profile_id) values(uid,chosen);
  return public.wordtop_my_profile();
end;
$$;
revoke all on function public.wordtop_claim_profile(text,text) from public;
grant execute on function public.wordtop_claim_profile(text,text) to authenticated;
commit;
