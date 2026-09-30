-- 비밀 링크: 서가에 공개하지 않아도, 링크를 받은 사람만 '발행본'을 볼 수 있게 한다.
-- 링크 열쇠(token)는 작가만 볼 수 있고, 읽기는 서버 함수(shared-book)가 대신한다.
create table public.book_shares (
  book_id uuid primary key references public.books(id) on delete cascade,
  token text not null unique check (token ~ '^[A-Za-z0-9_-]{32,64}$'),
  created_at timestamptz not null default now()
);
alter table public.book_shares enable row level security;
create policy shares_owner on public.book_shares for all to authenticated
  using (private.book_is_mine(book_id)) with check (private.book_is_mine(book_id));
