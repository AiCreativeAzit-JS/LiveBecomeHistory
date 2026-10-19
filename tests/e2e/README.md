# 화면 자동 시험 (Playwright + 가짜 Supabase)

실제 서버 대신 `fake-supabase.js`(메모리 DB)를 끼워 화면 로직을 시험한다. 실서버·실제 한글 입력기는 따로 확인.

```bash
cd tests/e2e
for t in test online-test studio-test share-test shelf-test admin-test me-test newbook-test real-book-test demo-test sample-test mouse-test prefetch-test flow-test dialog-test pick-test output-test ux-test photo2-test r02-test r03-test r04-test r05-test r06-test; do
  r=$(node $t.mjs "$PWD/fake-supabase.js" 2>&1); echo "$t PASS=$(echo "$r"|grep -c '^PASS') FAIL=$(echo "$r"|grep -c '^FAIL')"; echo "$r"|grep '^FAIL'
done
```
- 크로미움: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (경로가 다르면 각 파일의 executablePath 수정)
- 저장소 경로는 `/home/user/LiveBecomeHistory`로 고정되어 있음(ROOT)
- `studio-test`는 예전 체험 견본 3쪽(`demo-fixture.json`)을 바탕으로 편집 기능을 시험
- `flow-test`: 글 흐름 엔진(수정요청서 1차 T01~T06 + 문단 경계·제목 상자). 재현 원고 `docs/qa/모아_재현용_16문단.txt`를 `?blank=1` 2쪽 본문에 붙여 넣고 시작
- `dialog-test`: 팝업(내려받기·새 쪽 종류·미리보기·가입 안내)이 떠 있을 때 뒤 원고 보존(수정요청서 2차 F07, T17·T18)
- `pick-test`: 「n쪽 고르기」 ✓ 버튼은 누른 쪽만·Ctrl+클릭·키보드·일괄 대상(수정요청서 2차 F05, T19·T20)
- `output-test`: 인쇄 QR(체험·미발행·비밀 링크·발행) · 투명 PNG · 열리지 않는 사진·영상·노래(수정요청서 2차 F08~F10, T23~T26·T28)
- 시험용 미디어 `media/`: 1초 WebM 영상·1초 MP3 노래·61초 WebM. 시험용 크로미움은 MP4(H.264)를 못 열어 영상은 WebM으로. 가짜 바이트 파일은 이제 「열리지 않는 파일」로 거부되므로 넣기 시험엔 이 파일을 쓴다
- `ux-test`: 설명 글 겹침(틀 설명·반복·쪽 아래 공간 부족) · 썸네일 키보드 포커스 · 팝업 닫을 때 포커스 복원(수정요청서 2차 F06·F11, T21·T22·T27)
- `photo2-test`: 사진 두 벌 보관(화면용 1400px · 인쇄용 원본 2700px) — 어디에 어느 벌이 쓰이는지, 예전 사진·작은 사진·투명 사진, 예전 서버 함수와 섞여도 안전
- `r02-test`: 5쪽 넘게 이어진 원고(32문단)의 대량 삭제·이어진 쪽 이동·복제·삭제·독립 글상자(수정요청서 1차 R02, T08~T10)
- `r03-test`: 느린 저장 중 추가 수정·저장 중 이동·임시저장·인터넷 끊김과 재연결(수정요청서 1차 R03, T11·T12). 가짜 Supabase의 `window.__slowWrite`(ms)·`window.__failWrite`
- `r04-test`: 15MB 아래·위 영상·노래를 화면용 전자책 안에 담기, 인터넷 없이 열기, 미디어 1건 담기 실패 안내(수정요청서 1차 R04 T13·T14, 2차 R08 T31)
- `r05-test`: 체험 원고 보존 범위 안내·로그인 전환 전 내려받기 길·떠나기 전 확인(수정요청서 1차 R05, T15)
- `r06-test`: 편집 중 창 크기 변경·최대화/복원·확대/축소·한글 조립 중(수정요청서 1차 R06, T16)
- 기준(2026-10-19): 위 24개 모두 FAIL 0 (flow-test 57개, dialog-test 14개, pick-test 22개, output-test 33개, ux-test 27개, photo2-test 15개, r02-test 34개, r03-test 12개, r04-test 9개, r05-test 9개, r06-test 12개)
