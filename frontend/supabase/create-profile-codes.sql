-- Run after profile_access.sql. Save these private codes for your family.
-- Running again rotates codes; already linked devices remain connected.
begin;
drop table if exists pg_temp.new_profile_codes;
create temporary table new_profile_codes as
select id, name, replace(gen_random_uuid()::text || gen_random_uuid()::text,'-','') as invite_code
from public.profiles;
insert into public.profile_invites(profile_id,token_hash)
select id,encode(sha256(convert_to(invite_code,'UTF8')),'hex') from new_profile_codes
on conflict(profile_id) do update set token_hash=excluded.token_hash,created_at=now();
commit;
select name,invite_code from new_profile_codes order by name;
