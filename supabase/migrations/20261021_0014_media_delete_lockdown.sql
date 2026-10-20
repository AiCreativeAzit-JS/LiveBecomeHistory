-- 회원이 사진 기록(media)을 직접 지우지 못하게 — 레드팀 RT-601(D39).
-- 지금까지는 주인이 media 행을 REST 로 지울 수 있었다. 행이 지워져도 Cloudflare R2 의 실제 파일은 남고(파일은 책 전체를 지울 때만 정리),
-- 책당 200MB 한도는 media 행의 크기 합으로 세므로 「올리기 → 행 지우기 → 다시 올리기」로 한도를 피해 저장소를 채울 수 있었다.
-- 화면(편집기·내 서재)은 media 행을 직접 지우지 않는다(사진을 빼도 기록은 책에 남고, 책을 완전히 지울 때 서버 함수 purge 가 R2 를 비운 뒤
-- 책 행 삭제의 연쇄(on delete cascade)로 기록이 함께 지워진다. 연쇄 삭제는 회원 권한과 무관하게 동작한다).
-- → 회원 권한에서 DELETE(와 쓰지 않는 TRUNCATE·REFERENCES·TRIGGER)를 거두고, 행 정책도 「설명(caption) 고치기」만 남긴다.
revoke delete, truncate, references, trigger on public.media from authenticated;

drop policy if exists media_write on public.media;
create policy media_update_own on public.media for update to authenticated
  using (owner_id = (select auth.uid()) and private.book_is_mine(book_id))
  with check (owner_id = (select auth.uid()) and private.book_is_mine(book_id));

-- 되돌리기(rollback)
-- drop policy if exists media_update_own on public.media;
-- create policy media_write on public.media for all to authenticated
--   using (owner_id = (select auth.uid()) and private.book_is_mine(book_id))
--   with check (owner_id = (select auth.uid()) and private.book_is_mine(book_id));
-- grant delete, truncate, references, trigger on public.media to authenticated;
