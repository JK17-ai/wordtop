-- Explicit shared-family mode: any site visitor can select one of these profiles.
-- No invite tokens are sent to the browser. Existing profile IDs and study data remain.
begin;
create table if not exists public.character_entry_profiles (
 profile_id uuid primary key references public.profiles(id)
);
alter table public.character_entry_profiles enable row level security;
revoke all on public.character_entry_profiles from public,anon,authenticated;
do $$
declare target_family uuid;
begin
 if (select count(*) from public.families) <> 1 then
   raise exception '여러 가족이 있어 자동 연결 대상을 정할 수 없습니다. 운영자가 대상 가족을 지정해야 합니다.';
 end if;
 select id into target_family from public.families;
 insert into public.character_entry_profiles(profile_id)
 select id from public.profiles where family_id=target_family and name in ('제이크','지니','새우깡','갈매기')
 on conflict do nothing;
 if (select count(*) from public.character_entry_profiles) <> 4 then
   raise exception '연결할 네 캐릭터를 확인해 주세요.';
 end if;
end $$;
create or replace function public.wordtop_select_character(profile_name text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); chosen uuid; existing uuid;
begin
 if uid is null then raise exception '기기 연결이 필요합니다.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select p.id into chosen from public.profiles p join public.character_entry_profiles c on c.profile_id=p.id where p.name=profile_name;
 if chosen is null then raise exception '등록된 캐릭터를 선택해 주세요.'; end if;
 select profile_id into existing from public.profile_accounts where auth_user_id=uid;
 if existing is not null and existing<>chosen then
   raise exception '이미 다른 캐릭터로 연결된 기기입니다.';
 end if;
 insert into public.profile_accounts(auth_user_id,profile_id) values(uid,chosen) on conflict do nothing;
 return public.wordtop_my_profile();
end $$;
revoke all on function public.wordtop_select_character(text) from public,anon;
grant execute on function public.wordtop_select_character(text) to authenticated;
notify pgrst, 'reload schema';
commit;
