-- 가입 승인제: 가입은 누구나, 책 만들기·저장·올리기·발행은 관리자가 승인한 회원만.
-- 화면이 아니라 DB 규칙(RESTRICTIVE 정책)으로 막는다 → 화면을 우회해도 못 쓴다.
-- 운영 적용 이력: approved 열만 2026-10-01 적용, 나머지는 2026-10-21 적용(레드팀 RT-001 수정, D1).
--   운영 적용 때는 열 추가를 건너뛰고, 기존 회원 일괄 승인 대신 관리자(admin_users)만 승인했다.
--   그 밖의 계정 승인·취소는 public.admin_set_approved(uuid, boolean) 로 한다.
alter table public.profiles add column if not exists approved boolean not null default false;
update public.profiles set approved = true where id in (select user_id from public.admin_users);

-- 본인이 스스로 승인하지 못하게: 프로필은 이름만 고칠 수 있다
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

create function private.is_approved() returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select approved from public.profiles where id = (select auth.uid())), false) or private.is_admin() $$;
revoke all on function private.is_approved() from public;
grant execute on function private.is_approved() to authenticated;

-- 승인 전에는 쓰기 금지(기존 허용 규칙에 '그리고 승인됨'을 더한다)
create policy books_need_approval   on public.books          as restrictive for insert to authenticated with check (private.is_approved());
create policy pages_need_approval_i on public.pages          as restrictive for insert to authenticated with check (private.is_approved());
create policy pages_need_approval_u on public.pages          as restrictive for update to authenticated using (private.is_approved());
create policy media_need_approval   on public.media          as restrictive for insert to authenticated with check (private.is_approved());
create policy snap_need_approval    on public.book_snapshots as restrictive for insert to authenticated with check (private.is_approved());
create policy share_need_approval   on public.book_shares    as restrictive for insert to authenticated with check (private.is_approved());
create policy upload_need_approval  on storage.objects       as restrictive for insert to authenticated
  with check (bucket_id <> 'book-media' or private.is_approved());

-- 관리자: 승인 / 승인 취소
create function public.admin_set_approved(u uuid, ok boolean) returns void
language plpgsql security definer set search_path = ''
as $$ begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  update public.profiles set approved = ok where id = u;
end $$;
revoke all on function public.admin_set_approved(uuid, boolean) from public, anon;
grant execute on function public.admin_set_approved(uuid, boolean) to authenticated;

-- 되돌리기(rollback)
-- drop policy if exists books_need_approval on public.books;
-- drop policy if exists pages_need_approval_i on public.pages;
-- drop policy if exists pages_need_approval_u on public.pages;
-- drop policy if exists media_need_approval on public.media;
-- drop policy if exists snap_need_approval on public.book_snapshots;
-- drop policy if exists share_need_approval on public.book_shares;
-- drop policy if exists upload_need_approval on storage.objects;
-- drop function if exists public.admin_set_approved(uuid, boolean);
-- drop function if exists private.is_approved();
-- grant update on public.profiles to authenticated;
