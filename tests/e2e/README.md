# 화면 자동 시험 (Playwright + 가짜 Supabase)

실제 서버 대신 `fake-supabase.js`(메모리 DB)를 끼워 화면 로직을 시험한다. 실서버·실제 한글 입력기는 따로 확인.

```bash
cd tests/e2e
for t in test online-test studio-test share-test shelf-test admin-test me-test newbook-test real-book-test demo-test sample-test mouse-test prefetch-test flow-test dialog-test pick-test output-test ux-test photo2-test r02-test r03-test r04-test r05-test r06-test r07-test r08-test r09-test r10-test r11-test alt-test save-test recover-test flow-order-test approval-test home-test; do
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
- `r05-test`: 체험 원고를 이 기기(IndexedDB)에만 임시 보관 → 이어 쓰기/지우고 새로 시작 → 로그인 뒤 「내 서재로 옮기기」(견본 미디어는 빈 자리로, 실제 견본 책과 같은 구조로 시험)·「지우기」(수정요청서 1차 R05 T15 + 정선C 결정). 체험 화면을 여러 번 여는 시험은 `indexedDB.deleteDatabase('moa-demo')`로 매번 새 기기처럼 시작
- `r06-test`: 편집 중 창 크기 변경·최대화/복원·확대/축소·한글 조립 중(수정요청서 1차 R06, T16)
- `r07-test`: 9:16·1:1·16:9 영상을 실제 비율 상자에 · 편집·미리보기·화면용 전자책·서가에서 전체 보기(수정요청서 2차 R07, T29). 시험 영상 `media/tall.webm`·`square.webm`
- `r09-test`: 넣을 곳은 파일을 고른 순간에 — 올리는 동안 다른 쪽 이동·완료 순서 역전·쪽 삭제(수정요청서 2차 R09, T32). 가짜 Supabase `window.__mediaDelays`
- `r08-test`: 화면용 전자책의 책장 넘기기 장치를 못 받아 오면(404·통신 실패·빈 응답) 성공이라 하지 않기(수정요청서 2차 R08, T30)
- `r10-test`: 발행 뒤 제목만 바꿔도 「다시 발행」·비밀 링크 「새로 고침」 감지, 발행본 제목 일치(수정요청서 2차 R10, T33)
- `r11-test`: 마우스 없이 Tab·Enter·F2·Esc로 기존 제목·본문·설명 고치기(수정요청서 2차 R11, T34)
- `alt-test`: 사진 설명(대체 텍스트) 쓰기·편집/내려받기/서가에 반영, 미리보기를 지금 쪽부터·「처음부터」(정선C 결정 2026-10-19)
- `save-test`: 저장을 한 묶음(rpc save_pages)으로 + 판 번호(rev) 잠금 — 두 탭에서 같은 책을 열면 알림(#multiBar), 나중 저장이 덮어쓰지 않고 충돌 대화상자(#cfDlg), 재시도 점증, 열 때 ✓(레드팀 RT-101·106, D13·D16). 가짜 Supabase `window.__multiTab`·`__slowWrite`·`__failWrite`
- `recover-test`: 끊김·로그인 풀림에도 글이 남게 — 기기 사본(keepLocal)·복구 제안(#rcDlg)·저장 실패 종류(auth/perm/err) 안내·재로그인 창(#reDlg)(RT-102·103, D14·D15). `__authExpired`·`__denyWrite`·`__fireAuth`
- `flow-order-test`: 이어진 원고 사이에 쪽을 끼우고 앞쪽에 글을 더해 넘친 뒤 끼운 쪽을 지워도 읽는 순서가 그대로(워드 순서) + 열 때 healFlow(RT-401, D24)
- `approval-test`: 가입 승인제 — 승인 전 회원은 내 서재에 「승인 대기」 안내와 「새 책 만들기」 잠금, 승인되면 풀림(RT-001, D1). 가입 창 닫힘 안내는 `test`(D12), 관리자 회원 탭의 승인·취소 버튼은 `admin-test`
- 윈도우: `run-all.ps1`(`-Label`·`-Tests a,b`), 로그 `logs/<Label>.log`. 저장소·크로미움 경로는 `MOA_ROOT`·`PW_CHROME` 환경 변수로
- 기준(2026-10-21 2차 점호, 판 10-21 08:29): 34개 710건 FAIL 0 (shelf 20, admin 38, save 25 — 나머지는 아래 1차 기준과 같음). save-test 점호 3건: 세 번째 탭 C → 점호해도 살아 있는 탭은 남음 → C 의 BroadcastChannel 을 닫아(닫힘 신호 없이 사라진 탭) 점호 → 3초 남짓 뒤 띠 사라짐
- 기준(2026-10-21 2차, 판 10-21 07:58): 34개 707건 FAIL 0 (shelf 20, admin 38, save 22 — 나머지는 아래 1차 기준과 같음)
- `ai-proto-test`(시제품 브랜치 `proto/ai-side-panel` 전용, run-all 기본 목록에는 넣지 않음 → `-Tests ai-proto-test`): AI 옆 창 시제품(`studio/ai-proto.js`, 체험 편집기 `?ai=proto`) — 동의 → 글감 고르기 → 생각하기(질문 5개) → 초고(문장 표시·빠른 고침) → 퇴고(다섯 진단·편집자 질문·바뀐 곳) → 담기(자리 고르기·새 쪽·긴 글 「(이어서)」) → 되돌리기 한 번, 좁은 화면 전체 화면, 밖으로 나가는 요청 없음. 대표 의견(2026-10-26): 견본 책이면 빈 책으로 열기(체험 원고 질문 먼저) · 「내 글」 목록 · 지난 단계 보기·더 이야기하기·이전 판·다시 다듬어 한 번 더 담기 · Ctrl+Enter · AI 부른 횟수. 2차(같은 날): 바뀐 곳 카드(전→후·이유·이대로 좋아요/원래대로, AI 안 씀) · 「더 다듬기」 버튼별 「AI 안 씀/AI n번」 · 담지 않고 더 다듬기 · 담은 뒤 「AI와 한 번 더 퇴고」 → 「바꿔 담기」(새 쪽 없이 그 쪽 글만, 되돌리기 한 번) · 어림 비용(PRD 8장 모델). `AI_SHOTS=<폴더>`면 단계별 화면을 PNG로 남김
- `home-test`: 홈(랜딩) 상단 메뉴의 「로그인」(로그인 기록이 있으면 「내 서재」) — 컴퓨터·폰(375·320px) 모두 보이고 가로 넘침 없음, /editor/ 로 이동(대표 지적 D47)
- 2차 수정(2026-10-21): save-test +3(D41 불러온 뒤 띠 기본 문구·다른 탭 닫으면 띠 사라짐), shelf-test +1(D40 서가가 media 의 경로·주인 열을 읽지 않음 — 가짜 Supabase `window.__selects`), admin-test +2(D39 「실제 파일과 대조」). 가짜 media 함수에 `audit`(`window.__orphans`·`__orphanBytes`)
- 기준(2026-10-21, 윈도우 PC·run-all.ps1): 위 34개 모두 FAIL 0, 총 701건 (test 67, online 34, studio 92, share 19, shelf 19, admin 36, me 3, newbook 13, real-book 7, demo 16, sample 9, mouse 12, prefetch 2, flow 57, dialog 14, pick 22, output 33, ux 27, photo2 15, r02 40, r03 12, r04 9, r05 22, r06 12, r07 7, r08 4, r09 6, r10 8, r11 13, alt 11, save 19, recover 25, flow-order 10, approval 6). r04·r07-test 는 윈도우에서 `/tmp`·`file://` 때문에 끊기던 것을 고침(OS 임시 폴더, http(s)만 가로채기). save-test 는 다른 탭 저장 알림 뒤 서버 반영을 최대 6초 기다림
- 기준(2026-10-19): 위 30개 모두 FAIL 0 (flow-test 57개, dialog-test 14개, pick-test 22개, output-test 33개, ux-test 27개, photo2-test 15개, r02-test 34개, r03-test 12개, r04-test 9개, r05-test 22개, r06-test 12개, r07-test 7개, r08-test 4개, r09-test 6개, r10-test 8개, r11-test 13개 · r02-test는 40개)
