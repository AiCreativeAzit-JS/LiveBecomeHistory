-- 공개 책의 익명 읽기 범위 축소 — 레드팀 RT-012·RT-203(D23).
-- ① books: 서가 방문자(anon)는 지금 공개 책 행의 열 14개(작가 계정 번호 owner_id, 관리자 숨김, 판 번호 rev …)를 전부 읽을 수 있다.
--    서가 화면은 shelf_books 뷰(security_invoker)만 쓰므로, anon 의 열 권한을 뷰가 내보내는 7개 + 뷰의 WHERE 가 보는 3개로 줄인다.
--    (RLS 정책 books_select_public 은 그대로: 공개·비숨김·비삭제 행만)
revoke select on public.books from anon;
grant select (id, title, subtitle, author_name, cover_media_id, published_at, format,  -- shelf_books 뷰가 내보내는 열
              is_public, admin_hidden, deleted_at)                                        -- 뷰의 WHERE 절이 읽는 열(값은 정책이 이미 고정)
  on public.books to anon;

-- ② pages(초안 쪽): 독자는 발행본(book_snapshots)만 본다. 공개 책이라도 작가가 고치는 중인 초안을 anon 이 읽을 수 있던 분기를 없앤다.
--    서가 화면의 「발행본이 없으면 초안을 보여 주는」 예비 경로도 함께 「발행본 없음」 안내로 바꿨다(shelf/index.html).
drop policy if exists pages_select on public.pages;
create policy pages_select on public.pages for select to authenticated
  using (private.book_is_mine(book_id) or private.is_admin());
-- anon 에게 남아 있던 pages 표 권한(기본 grant)도 거둔다: 정책이 없어 이미 0행이었지만, 권한 자체를 없애 「permission denied」로 분명히 막는다
revoke all on public.pages from anon;

-- 되돌리기(rollback)
-- grant select on public.books to anon;
-- drop policy if exists pages_select on public.pages;
-- create policy pages_select on public.pages for select to anon, authenticated
--   using (private.book_is_mine(book_id) or private.book_is_public(book_id) or private.is_admin());
-- grant select on public.pages to anon;
