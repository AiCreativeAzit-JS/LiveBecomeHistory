# 서버 함수 시험 (Node + 가짜 Supabase·가짜 R2)
```bash
cd tests/functions
node --experimental-strip-types --import ./register.mjs ./run.mjs "$PWD/../../supabase/functions/media/index.ts"
node --experimental-strip-types --import ./register.mjs ./load.mjs "$PWD/../../supabase/functions/shared-book/index.ts"
```
- `run.mjs`: media 함수 권한·올리기·서명·옮기기·지우기 + 사진 두 벌 보관(화면용·인쇄용) + D22(승인된 회원만·기록은 서비스 키로·한도) + D40(비로그인은 경로 열 못 읽어도 공개 책 서명)·D39(실제 R2 ↔ 기록 대조 audit) 44건(기준 FAIL 0)
- SigV4 서명은 AWS 공식 예제 값으로 별도 검증함(_shared/r2.ts presign)
- 보안 강화 시험(2026-10): `run.mjs` 끝부분(형식 허용 목록 · 올릴 자리 속도 제한 · 올리다 만 파일 정리 cleanup · 서명 응답 no-store) 10건 추가, `sensitive-detect.mjs`(주민번호·카드·계좌 모양 감지), `ai-write-check.mjs`(고치기 점검), `shared-book-limit.mjs`(열쇠 맞히기 시도 제한)
  ```bash
  node --experimental-strip-types --import ./register.mjs ./shared-book-limit.mjs "$PWD/../../supabase/functions/shared-book/index.ts"
  node tests/functions/sensitive-detect.mjs
  ```
