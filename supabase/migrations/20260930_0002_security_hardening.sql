-- 보안 강화: 도우미 함수를 외부 비노출 스키마로 이동, 서가 뷰를 invoker 방식으로 교체,
-- 관리자 메모를 별도 관리자 전용 테이블로 분리.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- 1) 기존 정책 제거 (public 함수에 의존)
drop policy profiles_select on public.profiles;
drop policy books_select_own on public.books;
drop policy chapters_select on public.chapters;
drop policy chapters_write on public.chapters;
drop policy media_select on public.media;
drop policy media_write on public.media;
drop policy reports_insert on public.reports;
drop policy reports_select on public.reports;
drop policy reports_admin_update on public.reports;
drop policy "book-media public read" on storage.objects;
drop policy "book-media admin read" on storage.objects;
drop view public.shelf_books;
drop function public.admin_set_hidden(uuid, boolean, text);
drop function public.book_is_public(uuid);
drop function public.book_is_mine(uuid);
drop function public.is_admin();
drop trigger on_auth_user_created on auth.users;
drop function public.handle_new_user();

-- 2) 관리자 메모 분리
alter table public.books drop column admin_note;
create table public.book_admin_notes (
  book_id uuid primary key references public.books(id) on delete cascade,
  note text not null default '' check (char_length(note) <= 2000),
  updated_at timestamptz not null default now()
);
alter table public.book_admin_notes enable row level security;

-- 3) private 스키마 함수
create function private.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admin_users where user_id = (select auth.uid())) $$;

create function private.book_is_public(b uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.books
  where id = b and is_public and not admin_hidden and deleted_at is null) $$;

create function private.book_is_mine(b uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.books
  where id = b and owner_id = (select auth.uid())) $$;

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(left(new.raw_user_meta_data->>'name', 40), ''));
  return new;
end $$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

revoke all on function private.is_admin(), private.book_is_public(uuid), private.book_is_mine(uuid) from public;
grant execute on function private.is_admin(), private.book_is_public(uuid), private.book_is_mine(uuid) to anon, authenticated;

-- 4) 관리자 전용 함수(공개 API, 로그인 + 관리자만 성공)
create function public.admin_set_hidden(b uuid, hidden boolean, note text default '')
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  update public.books set admin_hidden = hidden where id = b;
  insert into public.book_admin_notes (book_id, note) values (b, coalesce(note,''))
  on conflict (book_id) do update set note = excluded.note, updated_at = now();
end $$;
revoke all on function public.admin_set_hidden(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_hidden(uuid, boolean, text) to authenticated;

-- 5) 정책 재생성
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.is_admin());

create policy books_select_own on public.books for select to authenticated
  using (owner_id = (select auth.uid()) or private.is_admin());
create policy books_select_public on public.books for select to anon, authenticated
  using (is_public and not admin_hidden and deleted_at is null);

create policy admin_notes_admin on public.book_admin_notes for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy chapters_select on public.chapters for select to anon, authenticated
  using (private.book_is_mine(book_id) or private.book_is_public(book_id) or private.is_admin());
create policy chapters_write on public.chapters for all to authenticated
  using (private.book_is_mine(book_id)) with check (private.book_is_mine(book_id));

create policy media_select on public.media for select to anon, authenticated
  using (private.book_is_mine(book_id) or private.book_is_public(book_id) or private.is_admin());
create policy media_write on public.media for all to authenticated
  using (owner_id = (select auth.uid()) and private.book_is_mine(book_id))
  with check (owner_id = (select auth.uid()) and private.book_is_mine(book_id));

create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and private.book_is_public(book_id));
create policy reports_select on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or private.is_admin());
create policy reports_admin_update on public.reports for update to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "book-media public read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'book-media' and exists (
    select 1 from public.media m
    where m.storage_path = storage.objects.name and private.book_is_public(m.book_id)));
create policy "book-media admin read" on storage.objects for select to authenticated
  using (bucket_id = 'book-media' and private.is_admin());

-- 6) 서가 뷰: invoker 방식(호출자 권한 + RLS 적용)
create view public.shelf_books with (security_invoker = true) as
  select id, title, subtitle, author_name, cover_media_id, published_at
  from public.books
  where is_public and not admin_hidden and deleted_at is null;
revoke all on public.shelf_books from public;
grant select on public.shelf_books to anon, authenticated;
