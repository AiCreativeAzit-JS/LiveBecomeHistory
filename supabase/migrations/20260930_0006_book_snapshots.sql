-- 초안 → 발행: 작가는 계속 고치고(pages = 초안), 서가 독자는 '발행본'(snapshot)만 본다.
-- 「발행하기」를 눌러야 초안이 발행본으로 복사된다.
create table public.book_snapshots (
  book_id uuid primary key references public.books(id) on delete cascade,
  title text not null default '' check (char_length(title) <= 120),
  author_name text not null default '' check (char_length(author_name) <= 40),
  pages jsonb not null default '[]'::jsonb
    check (jsonb_typeof(pages) = 'array' and pg_column_size(pages) < 8000000),
  published_at timestamptz not null default now()
);
alter table public.book_snapshots enable row level security;
create policy snapshots_select on public.book_snapshots for select to anon, authenticated
  using (private.book_is_mine(book_id) or private.book_is_public(book_id) or private.is_admin());
create policy snapshots_write on public.book_snapshots for all to authenticated
  using (private.book_is_mine(book_id)) with check (private.book_is_mine(book_id));
