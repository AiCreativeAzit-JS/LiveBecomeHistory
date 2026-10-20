-- D21(RT-202) 점검 SQL — 읽기만 한다. Supabase SQL 편집기나 MCP execute_sql 에서 그대로 실행.
-- 적용 전: 1·2 가 0 이면 정책을 바꿔도 정상 파일은 하나도 안 막힌다(바뀐 조건에 걸리는 기록이 없다).
-- 적용 후: 3 의 정책 본문에 foldername 대조가 들어 있고, 4 가 예전 그대로(공개 책 미디어는 함수 sign 으로 서빙) 인지 본다.
select '1 주인 폴더 밖을 가리키는 media 기록(0 이어야)' as check_, count(*)::text as value
  from public.media m
 where m.storage_path is not null
   and split_part(case when m.storage_path like 'r2:%' then substr(m.storage_path, 4) else m.storage_path end, '/', 1) <> m.owner_id::text
union all
select '2 예전 저장소(storage.objects) 파일 수(지금 0)', count(*)::text
  from storage.objects o where o.bucket_id = 'book-media'
union all
select '3 공개 읽기 정책 본문에 foldername 대조', case when position('foldername' in coalesce(qual,'')) > 0 then 'yes' else 'no' end
  from pg_policies where schemaname='storage' and tablename='objects' and policyname='book-media public read'
union all
select '4 공개 책 media 기록 수(참고)', count(*)::text
  from public.media m where private.book_is_public(m.book_id);
