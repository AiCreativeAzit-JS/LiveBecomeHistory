# 화면 자동 시험 (Playwright + 가짜 Supabase)

실제 서버 대신 `fake-supabase.js`(메모리 DB)를 끼워 화면 로직을 시험한다. 실서버·실제 한글 입력기는 따로 확인.

```bash
cd tests/e2e
for t in test online-test studio-test share-test shelf-test admin-test me-test newbook-test real-book-test demo-test sample-test mouse-test prefetch-test flow-test; do
  r=$(node $t.mjs "$PWD/fake-supabase.js" 2>&1); echo "$t PASS=$(echo "$r"|grep -c '^PASS') FAIL=$(echo "$r"|grep -c '^FAIL')"; echo "$r"|grep '^FAIL'
done
```
- 크로미움: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (경로가 다르면 각 파일의 executablePath 수정)
- 저장소 경로는 `/home/user/LiveBecomeHistory`로 고정되어 있음(ROOT)
- `studio-test`는 예전 체험 견본 3쪽(`demo-fixture.json`)을 바탕으로 편집 기능을 시험
- `flow-test`: 글 흐름 엔진(수정요청서 1차 T01~T06 + 문단 경계·제목 상자). 재현 원고 `docs/qa/모아_재현용_16문단.txt`를 `?blank=1` 2쪽 본문에 붙여 넣고 시작
- 기준(2026-10-19): 위 14개 모두 FAIL 0 (flow-test 44개, 창 1440×1000·1024×700 모두 확인)
