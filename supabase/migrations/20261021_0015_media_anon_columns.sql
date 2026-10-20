-- 비로그인(anon)에게 사진 기록의 주인 계정 id·저장 경로를 숨기기 — 레드팀 RT-602(D40). RT-012(books) 를 사진 쪽까지.
-- 지금까지 anon 은 공개 책 media 행의 모든 열(owner_id, storage_path = "주인id/책id/파일" …)을 읽을 수 있었다.
-- 서가·체험 편집기는 사진 번호(id)만 서버 함수 media(sign)에 보내면 되고, 함수는 볼 수 있는 행인지(부른 사람 권한)만 확인한 뒤
-- 경로는 서비스 키로 읽는다(media 함수 v10). → anon 에는 id·book_id·kind 세 열만 남긴다.
-- 행 정책(media_select: 공개 책 행만)은 그대로. anon 의 쓰기 권한(INSERT·UPDATE·DELETE·TRUNCATE…)도 함께 거둔다(지금은 행 정책만 막고 있었음).
--
-- ⚠ 배포 순서: ① media 함수 v10 배포 ② 화면(서가 storage_path 안 읽기) 푸시·반영 ③ 이 마이그레이션.
--   거꾸로 하면 옛 서가 화면·옛 함수가 anon 으로 storage_path 를 읽다가 거부되어 서가 사진이 안 보인다.
revoke all on public.media from anon;
grant select (id, book_id, kind) on public.media to anon;

-- 되돌리기(rollback)
-- revoke all on public.media from anon;
-- grant all on public.media to anon;
