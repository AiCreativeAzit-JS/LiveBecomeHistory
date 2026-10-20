# DB 규칙 점검 SQL (읽기만)

운영 DB 에 마이그레이션을 적용하기 전·후에 돌려 보는 확인용 쿼리. 쓰기는 없다.

- `public_book_read_scope_check.sql`: D23(RT-012·RT-203) — anon 의 books 열 권한이 서가 뷰 범위(10개)로 줄었는지, pages_select 가 authenticated 전용인지, anon 의 pages 권한이 없는지(적용 전 owner_id 포함·anon 있음 → 적용 후 없음)
- `storage_public_read_check.sql`: D21(RT-202) — 저장소 "공개 읽기" 정책이 기록 주인 폴더를 대조하는지, 바꾼 조건에 걸리는 정상 파일이 없는지(적용 전 1·2 = 0, 적용 후 3 = yes)
