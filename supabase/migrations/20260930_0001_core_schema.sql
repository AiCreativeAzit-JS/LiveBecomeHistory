-- 인물대백과사 · 멀티 전자책 에디터 — 핵심 스키마 v1
-- 원칙: (1) 내 책은 언제든 통째로 내려받을 수 있다(내보내기 우선)
--       (2) 표준 Postgres + S3 호환 저장소만 사용(이사 가능)
--       (3) "영구 보존" 문구를 약속하지 않는다
--       (4) 본인 책은 본인만, 공개한 책만 서가에서 보인다(RLS)

-- ───────── 공통 ─────────
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$ begin new.updated_at = now(); return new; end $$;

-- ───────── 프로필 ─────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 관리자 목록: 일반 사용자는 읽기/쓰기 불가(정책 없음). 관리자 지정은 SQL로만.
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = ''
as $$ select exists (select 1 from public.admin_users where user_id = (select auth.uid())) $$;

-- 가입 시 프로필 자동 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(left(new.raw_user_meta_data->>'name', 40), ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────── 책 ─────────
create table public.books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '제목 없는 책' check (char_length(title) between 1 and 120),
  subtitle text not null default '' check (char_length(subtitle) <= 200),
  author_name text not null default '' check (char_length(author_name) <= 40),
  cover_media_id uuid,
  is_public boolean not null default false,   -- 작가가 서가 공개를 누르면 true
  published_at timestamptz,
  admin_hidden boolean not null default false, -- 관리자만 변경(함수 admin_set_hidden)
  admin_note text not null default '',
  deleted_at timestamptz,                      -- 소프트 삭제(복구 가능)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index books_owner_idx on public.books(owner_id) where deleted_at is null;
create index books_shelf_idx on public.books(published_at desc)
  where is_public and not admin_hidden and deleted_at is null;
create trigger books_updated before update on public.books
  for each row execute function public.set_updated_at();

-- ───────── 장(챕터) ─────────
create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  position integer not null default 0,
  title text not null default '' check (char_length(title) <= 120),
  content text not null default '' check (char_length(content) <= 200000), -- 정제된 HTML
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index chapters_book_idx on public.chapters(book_id, position);
create trigger chapters_updated before update on public.chapters
  for each row execute function public.set_updated_at();

-- ───────── 미디어(이미지/영상/노래) ─────────
create table public.media (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('image','video','audio','link')),
  storage_path text,             -- 저장소 파일 경로: {owner_id}/{book_id}/{파일명}
  external_url text check (external_url is null or external_url ~* '^https://'),
  caption text not null default '' check (char_length(caption) <= 300),
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  created_at timestamptz not null default now(),
  check (storage_path is not null or external_url is not null)
);
create index media_book_idx on public.media(book_id);
alter table public.books
  add constraint books_cover_fk foreign key (cover_media_id) references public.media(id) on delete set null;

-- ───────── 신고 ─────────
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 1000),
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now(),
  unique (book_id, reporter_id)
);

-- ───────── 공개 여부 판별 ─────────
create or replace function public.book_is_public(b uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$ select exists (select 1 from public.books
  where id = b and is_public and not admin_hidden and deleted_at is null) $$;

create or replace function public.book_is_mine(b uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$ select exists (select 1 from public.books
  where id = b and owner_id = (select auth.uid())) $$;

-- ───────── 서가용 뷰(최소 정보만 노출) ─────────
create view public.shelf_books with (security_invoker = false) as
  select id, title, subtitle, author_name, cover_media_id, published_at
  from public.books
  where is_public and not admin_hidden and deleted_at is null;
revoke all on public.shelf_books from public;
grant select on public.shelf_books to anon, authenticated;

-- ───────── 관리자 전용 함수 ─────────
create or replace function public.admin_set_hidden(b uuid, hidden boolean, note text default '')
returns void language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.books set admin_hidden = hidden, admin_note = coalesce(note,'') where id = b;
end $$;
revoke all on function public.admin_set_hidden(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_hidden(uuid, boolean, text) to authenticated;

-- ───────── RLS ─────────
alter table public.profiles    enable row level security;
alter table public.admin_users enable row level security;
alter table public.books       enable row level security;
alter table public.chapters    enable row level security;
alter table public.media       enable row level security;
alter table public.reports     enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- books: 본인 전체, 관리자 조회. 공개 열람은 뷰(shelf_books)와 본문 정책으로.
create policy books_select_own on public.books for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin());
create policy books_insert_own on public.books for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy books_update_own on public.books for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy books_delete_own on public.books for delete to authenticated
  using (owner_id = (select auth.uid()));
-- 작가는 관리자 전용 컬럼을 바꿀 수 없다
revoke update on public.books from authenticated;
grant update (title, subtitle, author_name, cover_media_id, is_public, published_at, deleted_at)
  on public.books to authenticated;

-- chapters
create policy chapters_select on public.chapters for select to anon, authenticated
  using (public.book_is_mine(book_id) or public.book_is_public(book_id) or public.is_admin());
create policy chapters_write on public.chapters for all to authenticated
  using (public.book_is_mine(book_id)) with check (public.book_is_mine(book_id));

-- media
create policy media_select on public.media for select to anon, authenticated
  using (public.book_is_mine(book_id) or public.book_is_public(book_id) or public.is_admin());
create policy media_write on public.media for all to authenticated
  using (owner_id = (select auth.uid()) and public.book_is_mine(book_id))
  with check (owner_id = (select auth.uid()) and public.book_is_mine(book_id));

-- reports: 신고자는 자기 신고만, 관리자는 전체
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and public.book_is_public(book_id));
create policy reports_select on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_admin());
create policy reports_admin_update on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ───────── 파일 저장소(비공개 버킷) ─────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('book-media', 'book-media', false, 52428800)  -- 파일당 50MB
on conflict (id) do nothing;

create policy "book-media owner all" on storage.objects for all to authenticated
  using (bucket_id = 'book-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'book-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "book-media public read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'book-media' and exists (
    select 1 from public.media m
    where m.storage_path = storage.objects.name and public.book_is_public(m.book_id)));
create policy "book-media admin read" on storage.objects for select to authenticated
  using (bucket_id = 'book-media' and public.is_admin());
