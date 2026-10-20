-- 저장소 "공개 읽기" 정책이 기록의 주인 폴더를 대조하도록 — 레드팀 RT-202(D21).
-- 지금까지는 「어느 공개 책의 media 기록이 이 파일 이름(storage_path)을 가리키면 누구나 읽을 수 있다」였다.
-- 기록이 가리키는 경로가 그 기록 주인의 폴더({owner_id}/...) 안인지 보지 않아, 자기 공개 책 기록에
-- 남의 파일 이름을 넣으면 남의 비공개 파일이 열리고, 게시를 내려도 서빙될 수 있는 설계 결함이었다.
-- (0011 로 회원이 storage_path 를 직접 쓸 수 없게 되어 실제 위험은 더 낮아졌지만, 정책 자체도 서버 함수 _shared/sign.ts 의
--  pathOk 와 같은 규칙 — 「파일의 첫 폴더 = 기록 주인」 — 을 지켜야 한다. 예전 Supabase 저장소 파일에만 해당, 지금 미디어는 전부 R2.)
drop policy if exists "book-media public read" on storage.objects;
create policy "book-media public read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'book-media' and exists (
    select 1 from public.media m
    where m.storage_path = storage.objects.name
      and (storage.foldername(storage.objects.name))[1] = m.owner_id::text
      and private.book_is_public(m.book_id)));

-- 되돌리기(rollback): 0002 판 정책
-- drop policy if exists "book-media public read" on storage.objects;
-- create policy "book-media public read" on storage.objects for select to anon, authenticated
--   using (bucket_id = 'book-media' and exists (
--     select 1 from public.media m
--     where m.storage_path = storage.objects.name and private.book_is_public(m.book_id)));
