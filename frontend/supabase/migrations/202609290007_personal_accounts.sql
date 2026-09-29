-- Personal accounts preserve all existing profile IDs and learning records.
begin;
create sequence if not exists public.personal_guest_number;
revoke all on sequence public.personal_guest_number from public,anon,authenticated;
create table if not exists public.profile_details (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 gender text check(gender in ('female','male')),
 age_band text check(age_band in ('under10','teens','20s','30plus')),
 created_at timestamptz not null default now()
);
create table if not exists public.profile_recovery_codes (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.profiles(id) on delete cascade,
 token_hash text unique not null,
 created_at timestamptz not null default now(), revoked_at timestamptz
);
create unique index if not exists one_active_recovery_code on public.profile_recovery_codes(profile_id) where revoked_at is null;
create table if not exists public.profile_recovery_attempts (
 auth_user_id uuid primary key references auth.users(id) on delete cascade,
 window_started timestamptz not null default now(), attempts integer not null default 0
);
alter table public.profile_details enable row level security;
alter table public.profile_recovery_codes enable row level security;
alter table public.profile_recovery_attempts enable row level security;
revoke all on public.profile_details,public.profile_recovery_codes,public.profile_recovery_attempts from public,anon,authenticated;

create or replace function public.wordtop_my_profile() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',p.id,'name',p.name,'avatar',p.avatar,'family_id',p.family_id,
 'gender',d.gender,'age_band',d.age_band,'has_recovery',exists(select 1 from public.profile_recovery_codes r where r.profile_id=p.id and r.revoked_at is null))
 from public.profile_accounts a join public.profiles p on p.id=a.profile_id
 left join public.profile_details d on d.profile_id=p.id where a.auth_user_id=auth.uid()
$$;

create or replace function public.wordtop_issue_recovery() returns jsonb
language plpgsql security definer set search_path='' as $$
declare pid uuid; token text; entropy bytea; letters text:='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'; symbols text:='!@#$%&*?'; parts text[]:=array[]::text[]; i integer; j integer; swap text;
begin
 select profile_id into pid from public.profile_accounts where auth_user_id=auth.uid();
 if pid is null then raise exception '기기 연결을 먼저 확인해 주세요.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(pid::text,17));
 entropy:=sha256(convert_to(gen_random_uuid()::text||gen_random_uuid()::text,'UTF8'));
 -- Ten ASCII characters, including a letter, digit and symbol.
 parts:=array_append(parts,substr(letters,(get_byte(entropy,0)%52)+1,1));
 parts:=array_append(parts,substr('0123456789',(get_byte(entropy,1)%10)+1,1));
 parts:=array_append(parts,substr(symbols,(get_byte(entropy,2)%8)+1,1));
 for i in 3..9 loop parts:=array_append(parts,substr(letters||'0123456789'||symbols,(get_byte(entropy,i)%70)+1,1));end loop;
 for i in reverse 10..2 loop j:=(get_byte(entropy,16+i)%i)+1;swap:=parts[i];parts[i]:=parts[j];parts[j]:=swap;end loop;
 token:=array_to_string(parts,'');
 update public.profile_recovery_codes set revoked_at=now() where profile_id=pid and revoked_at is null;
 insert into public.profile_recovery_codes(profile_id,token_hash) values(pid,encode(sha256(convert_to(token,'UTF8')),'hex'));
 return jsonb_build_object('profile',public.wordtop_my_profile(),'recovery_code',token);
end $$;

create or replace function public.wordtop_create_personal(display_name text,gender_value text default null,age_value text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); fid uuid; pid uuid; guest_number text; generated_name text;
begin
 if uid is null then raise exception '기기 연결이 필요합니다.'; end if;

 if gender_value is not null and gender_value not in ('female','male') then raise exception '성별 선택을 확인해 주세요.'; end if;
 if age_value is not null and age_value not in ('under10','teens','20s','30plus') then raise exception '나이대 선택을 확인해 주세요.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select profile_id into pid from public.profile_accounts where auth_user_id=uid;
 if pid is not null then return jsonb_build_object('profile',public.wordtop_my_profile()); end if;
 -- Each new person gets an isolated family so existing family reports remain private.
 insert into public.families(name) values('내 학습 공간') returning id into fid;
 guest_number:=nextval('public.personal_guest_number')::text;
 generated_name:='GUEST'||case when length(guest_number)<2 then lpad(guest_number,2,'0') else guest_number end;
 insert into public.profiles(family_id,name,avatar) values(fid,generated_name,'🌱') returning id into pid;
 insert into public.profile_accounts(auth_user_id,profile_id) values(uid,pid);
 insert into public.profile_details(profile_id,gender,age_band) values(pid,gender_value,age_value);
 return public.wordtop_issue_recovery();
end $$;

create or replace function public.wordtop_recover_personal(recovery_code text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); pid uuid; existing uuid; token text; tries integer;
begin
 if uid is null then raise exception '기기 연결이 필요합니다.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 insert into public.profile_recovery_attempts(auth_user_id,attempts) values(uid,1)
 on conflict(auth_user_id) do update set
 attempts=case when public.profile_recovery_attempts.window_started<now()-interval '15 minutes' then 1 else public.profile_recovery_attempts.attempts+1 end,
 window_started=case when public.profile_recovery_attempts.window_started<now()-interval '15 minutes' then now() else public.profile_recovery_attempts.window_started end
 returning attempts into tries;
 if tries>10 then return jsonb_build_object('error','잠시 후 다시 시도해 주세요.'); end if;
 token:=normalize(trim(coalesce(recovery_code,'')),NFC);
 if regexp_replace(token,'[[:space:]-]','','g') ~ '^[A-Fa-f0-9]{32}$' then
   token:=upper(regexp_replace(token,'[[:space:]-]','','g'));
 elsif (token !~ '^[가-힣A-Za-z!@#$%&*?]{10}$' or token !~ '[가-힣]' or token !~ '[A-Za-z]' or token !~ '[!@#$%&*?]') and (token !~ '^[A-Za-z0-9!@#$%&*?]{10}$' or token !~ '[0-9]' or token !~ '[A-Za-z]' or token !~ '[!@#$%&*?]') then
   return jsonb_build_object('error','복구 코드를 확인해 주세요.');
 end if;
 select profile_id into pid from public.profile_recovery_codes where token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') and revoked_at is null;
 if pid is null then return jsonb_build_object('error','복구 코드를 확인해 주세요.'); end if;
 perform pg_advisory_xact_lock(hashtextextended(pid::text,17));
 if not exists(select 1 from public.profile_recovery_codes where profile_id=pid and token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') and revoked_at is null) then return jsonb_build_object('error','복구 코드를 확인해 주세요.'); end if;
 select profile_id into existing from public.profile_accounts where auth_user_id=uid;
 if existing is not null and existing<>pid then return jsonb_build_object('error','이미 다른 학습 공간에 연결된 기기입니다.'); end if;
 insert into public.profile_accounts(auth_user_id,profile_id) values(uid,pid) on conflict do nothing;
 delete from public.profile_recovery_attempts where auth_user_id=uid;
 return jsonb_build_object('profile',public.wordtop_my_profile(),'recovery_code',token);
end $$;

create or replace function public.wordtop_update_personal(display_name text,gender_value text default null,age_value text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare pid uuid;
begin
 select profile_id into pid from public.profile_accounts where auth_user_id=auth.uid();
 if pid is null then raise exception '기기 연결이 필요합니다.'; end if;
 if display_name is null or char_length(trim(display_name)) not between 1 and 30 or display_name ~ '[[:cntrl:]]' then raise exception '이름은 1~30자로 입력해 주세요.'; end if;
 update public.profiles set name=trim(display_name) where id=pid;
 insert into public.profile_details(profile_id,gender,age_band) values(pid,gender_value,age_value)
 on conflict(profile_id) do update set gender=excluded.gender,age_band=excluded.age_band;
 return public.wordtop_my_profile();
end $$;
-- Remove public name-only entry. Already bound family devices keep their profiles.
revoke execute on function public.wordtop_select_character(text) from public,anon,authenticated;
revoke execute on function public.wordtop_claim_profile(text,text) from public,anon,authenticated;
revoke all on function public.wordtop_my_profile(),public.wordtop_issue_recovery(),public.wordtop_create_personal(text,text,text),public.wordtop_recover_personal(text),public.wordtop_update_personal(text,text,text) from public,anon;
grant execute on function public.wordtop_my_profile(),public.wordtop_issue_recovery(),public.wordtop_create_personal(text,text,text),public.wordtop_recover_personal(text),public.wordtop_update_personal(text,text,text) to authenticated;

-- Register the cryptographically generated code already shown on the first screen.
create or replace function public.wordtop_create_personal_with_code(display_name text,gender_value text,age_value text,initial_code text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); token text:=normalize(trim(coalesce(initial_code,'')),NFC); result jsonb; pid uuid;
begin
 if uid is null then raise exception '기기 연결이 필요합니다.'; end if;
 if token !~ '^[A-Za-z0-9!@#$%&*?]{10}$' or token !~ '[0-9]' or token !~ '[A-Za-z]' or token !~ '[!@#$%&*?]' then raise exception '복구 코드를 확인해 주세요.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select profile_id into pid from public.profile_accounts where auth_user_id=uid;
 if pid is not null then return jsonb_build_object('profile',public.wordtop_my_profile()); end if;
 result:=public.wordtop_create_personal(display_name,gender_value,age_value);
 pid:=(result->'profile'->>'id')::uuid;
 update public.profile_recovery_codes set token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') where profile_id=pid and revoked_at is null;
 return jsonb_build_object('profile',result->'profile','recovery_code',token);
end $$;
revoke all on function public.wordtop_create_personal_with_code(text,text,text,text) from public,anon;
grant execute on function public.wordtop_create_personal_with_code(text,text,text,text) to authenticated;

notify pgrst,'reload schema';
commit;
