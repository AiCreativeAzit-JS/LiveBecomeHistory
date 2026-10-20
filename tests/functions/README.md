# 서버 함수 시험 (Node + 가짜 Supabase·가짜 R2)
```bash
cd tests/functions
node --experimental-strip-types --import ./register.mjs ./run.mjs "$PWD/../../supabase/functions/media/index.ts"
node --experimental-strip-types --import ./register.mjs ./load.mjs "$PWD/../../supabase/functions/shared-book/index.ts"
```
- `run.mjs`: media 함수 권한·올리기·서명·옮기기·지우기 + 사진 두 벌 보관(화면용·인쇄용) + D22(승인된 회원만·기록은 서비스 키로·한도) + D40(비로그인은 경로 열 못 읽어도 공개 책 서명)·D39(실제 R2 ↔ 기록 대조 audit) 44건(기준 FAIL 0)
- SigV4 서명은 AWS 공식 예제 값으로 별도 검증함(_shared/r2.ts presign)
