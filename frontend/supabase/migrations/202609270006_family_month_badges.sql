begin;
create or replace function public.wordtop_family_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare family uuid;
begin
 select p.family_id into family from public.profile_accounts a join public.profiles p on p.id=a.profile_id where a.auth_user_id=auth.uid();
 if family is null then raise exception '프로필 연결이 필요합니다.'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'avatar',p.avatar,
 'total',coalesce(jsonb_array_length(s.snapshot->'deck'->'words'),0),
 'mastered',(select count(*) from jsonb_array_elements(s.snapshot->'deck'->'words') w where w->>'status'='mastered'),
 'scrap',(select count(*) from jsonb_array_elements(s.snapshot->'deck'->'words') w where w->>'status'='scrap'),
 'today_total',case when s.snapshot->'accuracy'->>'date'=to_char(now() at time zone 'Asia/Seoul','YYYY-MM-DD') then coalesce(s.snapshot->'accuracy'->'total','0'::jsonb) else '0'::jsonb end,
 'today_correct',case when s.snapshot->'accuracy'->>'date'=to_char(now() at time zone 'Asia/Seoul','YYYY-MM-DD') then coalesce(s.snapshot->'accuracy'->'correct','0'::jsonb) else '0'::jsonb end,
 'active_ms',coalesce(s.snapshot->'activeMs','0'::jsonb),'updated_at',s.updated_at,
 'badges',(select count(*) from public.earned_badges b where b.profile_id=p.id),
 'month_badges',(select jsonb_build_object(
   'month',to_char(now() at time zone 'Asia/Seoul','YYYY-MM'),
   'gold',count(*) filter (where b.tier='gold'),
   'silver',count(*) filter (where b.tier='silver'),
   'bronze',count(*) filter (where b.tier='bronze'))
   from public.earned_badges b where b.profile_id=p.id
   and b.awarded_at >= (date_trunc('month',now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')
   and b.awarded_at < ((date_trunc('month',now() at time zone 'Asia/Seoul') + interval '1 month') at time zone 'Asia/Seoul'))) order by p.name),'[]'::jsonb)
 from public.profiles p left join public.study_sync_snapshots s on s.profile_id=p.id where p.family_id=family);
end; $$;
revoke all on function public.wordtop_family_overview() from public,anon;
grant execute on function public.wordtop_family_overview() to authenticated;
notify pgrst, 'reload schema';
commit;
