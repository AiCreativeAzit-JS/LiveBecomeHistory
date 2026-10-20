-- D39(RT-601)·D40(RT-602) 점검 SQL — 읽기만(역할 바꿔 보기는 rollback).
-- 적용 전: 1 에 DELETE 있음, 2 = media_write(ALL), 3 에 owner_id·storage_path, 4 에 INSERT·UPDATE·DELETE.
-- 적용 후: 1 = REFERENCES·TRIGGER·TRUNCATE·DELETE 없음(SELECT 만 + UPDATE(caption) 열 권한), 2 = media_update_own(UPDATE), 3 = book_id,id,kind, 4 = SELECT 만(열 단위).
select '1 authenticated media 표 권한' as check_, coalesce(string_agg(privilege_type, ',' order by privilege_type), '(없음)') as value
  from information_schema.table_privileges where grantee='authenticated' and table_schema='public' and table_name='media'
union all
select '2 media 회원 쓰기 정책', string_agg(policyname||':'||cmd, ', ') from pg_policies where schemaname='public' and tablename='media' and roles::text like '%authenticated%' and cmd<>'SELECT'
union all
select '3 anon media SELECT 열', coalesce(string_agg(column_name, ',' order by column_name), '(없음)')
  from information_schema.column_privileges where grantee='anon' and table_schema='public' and table_name='media' and privilege_type='SELECT'
union all
select '4 anon media 표 권한', coalesce(string_agg(privilege_type, ',' order by privilege_type), '(없음)')
  from information_schema.table_privileges where grantee='anon' and table_schema='public' and table_name='media';
-- 적용 뒤 별도 실행:
-- begin; set local role anon; select owner_id from public.media limit 1; rollback;            -- permission denied 여야
-- begin; set local role anon; select count(*) from public.media; rollback;                     -- 공개 책 사진 수(id 만 세므로 됨)
-- begin; set local role authenticated; select set_config('request.jwt.claims','{"sub":"12faf8f0-da59-42d1-997d-93e2b7be2cdf","role":"authenticated"}',true);
--   delete from public.media where owner_id='12faf8f0-da59-42d1-997d-93e2b7be2cdf'; rollback;  -- permission denied 여야
-- 책 연쇄 삭제가 여전히 되는지(임시 책, rollback): postgres 로 임시 책+media 행을 만든 뒤 test1 역할로 그 책을 지우고 media 행 0 확인
