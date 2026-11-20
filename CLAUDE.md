# 인물대백과사 · 모아 편집기 (Archive for Everyone)

멀티미디어 자서전 전자책 서비스. 대표 김정선(Jeongsun Kim, "정선C"). archive4everyone.com

## 작업 전에 읽을 것 (이 순서로)
1. **`docs/결정기록.md`**: 대표가 정한 것 모음. 여기와 다르게 만들기 전에 반드시 대표께 물어요.
2. `docs/qa/작업메모_다음세션.md`: 지금 상태, 남은 일, 일하는 방식
3. `docs/qa/모바일_전자책_인계.md`: 폰 작업 배경과 배포 방법
4. 필요할 때: `docs/DESIGN.md`(설계, 글 흐름 엔진, 사진 두 벌), `docs/TODO.md`, `docs/OPERATIONS.md`

## 소통
- 정선C는 개발 초보. 새 작업은 **왜 필요한지 쉬운 비유로 먼저**, 할 일은 단계별로.
- 화면 안내는 **로그인 첫 화면부터 전체 경로**로, 정선C 화면의 메뉴 이름(번역된 이름 포함)에 맞춰서.
- 비밀 키·토큰은 채팅에 받지 않는다(정선C가 대시보드에 직접 입력).
- **바꾸기 전에 승인**: 코드·파일·서비스를 바꾸기 전에 할 일과 영향을 보여 주고 허락을 받는다. 승인은 그 단계에만 유효하고, push·배포·운영 DB 쓰기는 따로 묻는다.
- 기능을 바꿀 때는 「AI 안 씀 / AI 1번, 약 ○원」을 함께 적는다.

## 꼭 지킬 원칙
- **저작권 보호 최우선**: 서가·비밀 링크는 복사·인쇄·내려받기 차단, 미디어는 서명 주소로만.
- "영구 보존"을 약속하지 않는다(내보내기 우선). 개인정보 처리방침과 실제 동작이 항상 일치해야 함.
- 사실과 다르게 과장하지 않는다(AI 기능이 없으면 있다고 쓰지 않음).
- 이 저장소는 GitHub에 **공개**되어 있다. 기관 이름·가격·고객 사정·개인정보·AI 지침서 본문은 저장소에 올리지 않는다.
- 모바일 정식 버전까지는 외부 AI 연결과 모바일 고도화 말고는 새 기능을 더하지 않는다(`docs/결정기록.md` 0번).

## 구조
- 정적 사이트(GitHub Pages) = 브랜치 `claude/confident-lovelace-w2mnqp` (main 아님). 도메인 CNAME, DNS는 가비아. `_config.yml`의 exclude로 supabase·docs·tests·CLAUDE.md는 사이트 주소로 안 열림(저장소에는 공개).
- 화면: `index.html`(랜딩) · `studio/`(편집기, 로그인 없으면 체험 모드) · `editor/`(로그인·내 서재) · `shelf/`(서가) · `admin/`(대표 전용 관리자) · `terms/` · `privacy/`
- AI와 쓰기: `studio/ai-proto.js`(편집기 옆 창, 폰에서는 전체 화면). 로그인 + 관리자가 켠 회원(`profiles.ai_enabled`) + 동의한 회원만 진짜 AI. 로그인 없이 `?ai=proto`는 가짜 답 체험.
- 폰 원고 화면: `studio/ms.js`(주소 `?ms=1`). 폰에서 내 서재로 들어오면 자동으로 붙는다. 말로 쓰기는 `lib/voice.js`(브라우저 음성 인식, https에서만).
- 공통: `lib/book-viewer.js`(책 넘김 보기) · `lib/book-render.js` · `lib/media-client.js`(미디어 창구) · `lib/version.js`(판 번호 `MOA_VERSION`, 오픈채팅 주소 `MOA_OPENCHAT_URL`)
- Supabase 프로젝트 `qsucbnvicaviatdpnfxx`(서울): DB·인증·Edge Functions `media` · `shared-book` · `delete-account` · `ai-write`
- AI 지침서: DB 표 `ai_prompts`의 켜진 줄을 `ai-write`가 읽는다. 저장소에 두지 않는다.
- 미디어 파일: Cloudflare R2 버킷 `book-media`(APAC). media.storage_path가 `r2:`로 시작. 서명은 `supabase/functions/_shared/r2.ts`
- 함수 배포: Supabase MCP `deploy_edge_function`(파일에 `../_shared/*.ts` 함께), media·shared-book은 verify_jwt=false, ai-write는 true

## 브랜치와 배포
- 배포 브랜치 `claude/confident-lovelace-w2mnqp`에 push하면 1~2분 뒤 사이트에 반영(브라우저 캐시 포함 최대 10분).
- 개발 브랜치 `proto/ai-side-panel`(AI와 쓰기·폰 화면 개발). 개발 브랜치를 통째로 합치지 않고, 임시 작업 폴더(git worktree)에서 배포 브랜치 위에 **필요한 커밋·파일만** 올린다. 배포 브랜치에는 `tests/ai-lab`·일부 `tests/functions`·`shots-*.mjs`가 없다.
- 대표 PC의 작업 폴더: `C:\모아\LiveBecomeHistory`(배포 브랜치), `C:\모아\LiveBecomeHistory-ai-proto`(개발 브랜치), `C:\모아\LiveBecomeHistory-library`(대도서관 시험판, 멈춤).
- 화면 파일을 고쳐 올릴 때마다 `lib/version.js`의 판 번호(한국 시각 「월-일 시:분」)를 바꾸고 대표께 알린다. 스크립트 주소의 `?v=` 버전표도 함께 올린다.

## 시험
- 화면: `tests/e2e/README.md` (Playwright + 가짜 Supabase, 기준 FAIL 0)
  - 윈도우(대표 PC): 샌드박스 안에서는 브라우저가 안 뜬다. 터미널 탭에서 `tests/e2e`로 가서 `powershell -ExecutionPolicy Bypass -File .\run-all.ps1 -Label 이름 -Tests a,b`(이름 없이 돌리면 전체 35개, 약 12분). 문법 오류가 있으면 PASS=0 FAIL=0으로 나오니 숫자를 꼭 본다.
  - 기본 목록에 없는 시험: `mobile-ms-test`, `ai-proto-test`, `ai-real-test`(폰·AI를 고치면 함께 돌린다)
  - 가끔 실패하는 시험(고치기 전 판에서도 실패함): `studio-test`의 「미니 도구 창」, `r06-test` T16. 다시 돌려 확인한다.
- 서버 함수: `tests/functions/README.md`
- 고친 뒤 관련 시험을 돌리고, 커밋 후 대표 허락을 받아 위 브랜치에 push.

## 작업을 마칠 때 (대표와 2026-11-20 합의)
- 그날 대표가 새로 정한 것을 `docs/결정기록.md`에 날짜·근거와 함께 더한다.
- `docs/qa/작업메모_다음세션.md` 맨 위 「지금 상태」를 고친다(배포 판 번호, 브랜치, 남은 일).
- 구조·브랜치·시험 방법이 바뀌었으면 이 파일도 고친다.
