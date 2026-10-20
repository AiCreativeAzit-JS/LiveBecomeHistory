-- D23(RT-012·RT-203) 점검 SQL — 읽기만 한다.
-- 적용 전: 1 에 owner_id·rev 가 들어 있고, 2 의 roles 에 anon 이 있다. 적용 후: 1 은 10개 열(owner_id·rev·created_at·updated_at 없음), 2 는 {authenticated}, 3 은 비어 있음.
-- 4 는 shelf_books 뷰를 anon 권한으로 읽어 본다(적용 뒤에도 서가 목록이 나와야 한다) — 트랜잭션 안에서 역할만 바꾸고 되돌린다.
select '1 books anon SELECT 열' as check_, coalesce(string_agg(column_name, ',' order by column_name), '(없음)') as value
  from information_schema.column_privileges where grantee='anon' and table_schema='public' and table_name='books' and privilege_type='SELECT'
union all
select '2 pages_select 정책 roles', roles::text from pg_policies where schemaname='public' and tablename='pages' and policyname='pages_select'
union all
select '3 pages anon 표 권한', coalesce(string_agg(privilege_type, ','), '(없음)')
  from information_schema.table_privileges where grantee='anon' and table_schema='public' and table_name='pages'
union all
select '4 공개 책 수(참고)', count(*)::text from public.books where is_public and not admin_hidden and deleted_at is null;
-- 적용 뒤 별도 실행(역할 바꿔 보기):
-- begin; set local role anon; select count(*) from public.shelf_books; rollback;                 -- 공개 책 수와 같아야
-- begin; set local role anon; select count(*) from public.pages; rollback;                        -- permission denied 여야
-- begin; set local role anon; select owner_id from public.books limit 1; rollback;               -- permission denied 여야
