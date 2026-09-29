begin;
create or replace function public.wordtop_list_devices() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',a.auth_user_id,'connected_at',a.created_at,'current',a.auth_user_id=auth.uid()) order by a.created_at),'[]'::jsonb)
 from public.profile_accounts a where a.profile_id=(select profile_id from public.profile_accounts where auth_user_id=auth.uid())
$$;

-- Revocation rotates the recovery secret too: the removed device may know the old one.
create or replace function public.wordtop_revoke_device(device_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare pid uuid; result jsonb;
begin
 select profile_id into pid from public.profile_accounts where auth_user_id=auth.uid();
 if pid is null then raise exception '기기 연결이 필요합니다.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(pid::text,17));
 if device_id=auth.uid() then raise exception '현재 기기는 로그아웃을 이용해 주세요.'; end if;
 delete from public.profile_accounts where auth_user_id=device_id and profile_id=pid;
 if not found then raise exception '연결된 기기를 찾지 못했어요.'; end if;
 result:=public.wordtop_issue_recovery();
 return result;
end $$;

create or replace function public.wordtop_disconnect_device() returns boolean
language plpgsql security definer set search_path='' as $$
begin
 delete from public.profile_accounts where auth_user_id=auth.uid();
 return true;
end $$;

create or replace function public.wordtop_delete_account(confirmation text) returns boolean
language plpgsql security definer set search_path='' as $$
declare pid uuid; fid uuid; devices uuid[];
begin
 if confirmation is distinct from '계정 삭제' then raise exception '계정 삭제를 정확히 입력해 주세요.'; end if;
 select p.id,p.family_id into pid,fid from public.profile_accounts a join public.profiles p on p.id=a.profile_id where a.auth_user_id=auth.uid();
 if pid is null then raise exception '기기 연결이 필요합니다.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(pid::text,17));
 select array_agg(auth_user_id) into devices from public.profile_accounts where profile_id=pid;
 delete from public.earned_badges where profile_id=pid;
 delete from public.verified_streaks where profile_id=pid;
 delete from public.verified_answers where profile_id=pid;
 delete from public.badge_awards where profile_id=pid or answer_event_id in
 (select e.id from public.answer_events e join public.study_sessions s on s.id=e.session_id where s.profile_id=pid);
 delete from public.answer_events where session_id in(select id from public.study_sessions where profile_id=pid);
 delete from public.study_sessions where profile_id=pid;
 delete from public.word_progress where profile_id=pid;
 delete from public.decks where profile_id=pid;
 delete from public.profiles where id=pid;
 delete from public.profile_recovery_attempts where auth_user_id=any(devices);
 -- Only unlinked anonymous device identities belonging to this account are removed.
 delete from auth.users where id=any(devices) and not exists(select 1 from public.profile_accounts a where a.auth_user_id=auth.users.id);
 delete from public.families where id=fid and not exists(select 1 from public.profiles where family_id=fid);
 return true;
end $$;
revoke all on function public.wordtop_list_devices(),public.wordtop_revoke_device(uuid),public.wordtop_disconnect_device(),public.wordtop_delete_account(text) from public,anon;
grant execute on function public.wordtop_list_devices(),public.wordtop_revoke_device(uuid),public.wordtop_disconnect_device(),public.wordtop_delete_account(text) to authenticated;
notify pgrst,'reload schema';
commit;
