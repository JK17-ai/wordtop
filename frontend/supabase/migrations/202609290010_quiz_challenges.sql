begin;
create table if not exists public.quiz_challenges (
 id uuid primary key, profile_id uuid not null references public.profiles(id) on delete cascade,
 device_id uuid not null, catalog_id text not null references public.learning_catalog(id),
 issued_at timestamptz not null default clock_timestamp(), expires_at timestamptz not null,
 submitted boolean not null default false, selected_meaning text, receipt jsonb
);
create index if not exists quiz_challenges_profile_idx on public.quiz_challenges(profile_id,issued_at desc);
alter table public.quiz_challenges enable row level security;
revoke all on public.quiz_challenges from public,anon,authenticated;
create or replace function public.wordtop_issue_question(request_id uuid,word_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare pid uuid; q public.quiz_challenges%rowtype; term public.learning_catalog%rowtype; result jsonb;
begin
 select profile_id into pid from public.profile_accounts where auth_user_id=auth.uid();
 if pid is null then raise exception '기기 연결이 필요합니다.'; end if;
 if request_id is null then raise exception using errcode='22023',message='출제 ID가 필요합니다.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('wordtop-awards:'||pid::text,0));
 select * into q from public.quiz_challenges where id=request_id;
 if found then
  if q.profile_id<>pid or q.device_id<>auth.uid() or q.catalog_id<>word_id then raise exception using errcode='22023',message='출제 ID가 일치하지 않습니다.'; end if;
 else
  select * into term from public.learning_catalog where id=word_id;
  if not found then raise exception using errcode='22023',message='등록되지 않은 단어입니다.'; end if;
  for q in select * from public.quiz_challenges where profile_id=pid and not submitted loop
   if q.expires_at>clock_timestamp() then raise exception using errcode='22023',message='진행 중인 문제가 있습니다.'; end if;
   result:=public.wordtop_record_answer(q.id,q.catalog_id,null,10000);
   update public.quiz_challenges set submitted=true,receipt=result where id=q.id;
  end loop;
  insert into public.quiz_challenges(id,profile_id,device_id,catalog_id,expires_at)
   values(request_id,pid,auth.uid(),word_id,clock_timestamp()+interval '10 seconds') returning * into q;
 end if;
 select * into term from public.learning_catalog where id=q.catalog_id;
 return jsonb_build_object('id',q.id,'word',term.word,'meaning',term.meaning,'expires_at',q.expires_at,'submitted',q.submitted);
end $$;
create or replace function public.wordtop_submit_question(challenge_id uuid,answer text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare pid uuid; q public.quiz_challenges%rowtype; elapsed integer; result jsonb;
begin
 select profile_id into pid from public.profile_accounts where auth_user_id=auth.uid();
 if pid is null then raise exception '기기 연결이 필요합니다.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('wordtop-awards:'||pid::text,0));
 select * into q from public.quiz_challenges where id=challenge_id for update;
 if not found or q.profile_id<>pid or q.device_id<>auth.uid() then raise exception using errcode='22023',message='발급받은 문제를 확인해 주세요.'; end if;
 if q.submitted then
  if q.selected_meaning is distinct from answer then raise exception using errcode='22023',message='이미 제출한 답안입니다.'; end if;
  return q.receipt||jsonb_build_object('duplicate',true);
 end if;
 if length(answer)>4000 then raise exception using errcode='22023',message='답안이 너무 깁니다.'; end if;
 elapsed:=least(10000,greatest(0,floor(extract(epoch from(clock_timestamp()-q.issued_at))*1000)::integer));
 result:=public.wordtop_record_answer(q.id,q.catalog_id,answer,elapsed);
 update public.quiz_challenges set submitted=true,selected_meaning=answer,receipt=result where id=q.id;
 return result;
end $$;
-- Existing answers and badges are preserved. New awards require a server-issued ticket.
revoke all on function public.wordtop_record_answer(uuid,text,text,integer) from public,anon,authenticated;
revoke all on function public.wordtop_issue_question(uuid,text),public.wordtop_submit_question(uuid,text) from public,anon;
grant execute on function public.wordtop_issue_question(uuid,text),public.wordtop_submit_question(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
