# 서버 함수 시험 (Node + 가짜 Supabase·가짜 R2)
```bash
cd tests/functions
node --experimental-strip-types --import ./register.mjs ./run.mjs "$PWD/../../supabase/functions/media/index.ts"
node --experimental-strip-types --import ./register.mjs ./load.mjs "$PWD/../../supabase/functions/shared-book/index.ts"
```
- `run.mjs`: media 함수 권한·올리기·서명·옮기기·지우기 21건(기준 FAIL 0)
- SigV4 서명은 AWS 공식 예제 값으로 별도 검증함(_shared/r2.ts presign)
