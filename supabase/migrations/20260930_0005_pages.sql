-- 새 편집기(스튜디오)용 페이지 저장 구조.
-- 책은 format='chapters'(옛 에디터) 또는 'pages'(스튜디오). 옛 chapters 내용은 옮긴 뒤에도 지우지 않고 보관한다.
alter table public.books add column format text not null default 'chapters'
  check (format in ('chapters','pages'));
grant update (format) on public.books to authenticated;

create table public.pages (
  id uuid primary key,
  book_id uuid not null references public.books(id) on delete cascade,
  position integer not null default 0,
  name text not null default '' check (char_length(name) <= 60),
  bg text not null default '#FFFFFF' check (bg ~* '^#[0-9a-f]{6}$'),
  flow_from uuid,                       -- 자동 넘김으로 이어진 앞 페이지
  els jsonb not null default '[]'::jsonb
    check (jsonb_typeof(els) = 'array' and pg_column_size(els) < 400000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pages_book_idx on public.pages(book_id, position);
create trigger pages_updated before update on public.pages
  for each row execute function public.set_updated_at();

alter table public.pages enable row level security;
create policy pages_select on public.pages for select to anon, authenticated
  using (private.book_is_mine(book_id) or private.book_is_public(book_id) or private.is_admin());
create policy pages_write on public.pages for all to authenticated
  using (private.book_is_mine(book_id)) with check (private.book_is_mine(book_id));

-- 서가 뷰에 format 추가
drop view public.shelf_books;
create view public.shelf_books with (security_invoker = true) as
  select id, title, subtitle, author_name, cover_media_id, published_at, format
  from public.books
  where is_public and not admin_hidden and deleted_at is null;
revoke all on public.shelf_books from public;
grant select on public.shelf_books to anon, authenticated;
