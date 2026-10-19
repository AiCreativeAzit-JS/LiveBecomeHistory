# 인물대백과사 · 모아 편집기 (Archive for Everyone)

멀티미디어 자서전 전자책 서비스. 대표 김정선(Jeongsun Kim, "정선C"). archive4everyone.com

## 소통
- 정선C는 개발 초보. 새 작업은 **왜 필요한지 쉬운 비유로 먼저**, 할 일은 단계별로.
- 화면 안내는 **로그인 첫 화면부터 전체 경로**로, 정선C 화면의 메뉴 이름(번역된 이름 포함)에 맞춰서.
- 비밀 키·토큰은 채팅에 받지 않는다(정선C가 대시보드에 직접 입력).

## 꼭 지킬 원칙
- **저작권 보호 최우선**: 서가·비밀 링크는 복사·인쇄·내려받기 차단, 미디어는 서명 주소로만.
- "영구 보존"을 약속하지 않는다(내보내기 우선). 개인정보 처리방침과 실제 동작이 항상 일치해야 함.
- 사실과 다르게 과장하지 않는다(AI 기능이 없으면 있다고 쓰지 않음).

## 구조
- 정적 사이트(GitHub Pages) = 브랜치 `claude/confident-lovelace-w2mnqp` (main 아님). 도메인 CNAME, DNS는 가비아.
- 화면: `index.html`(랜딩) · `studio/`(편집기, 로그인 없으면 체험 모드) · `editor/`(로그인·내 서재) · `shelf/`(서가) · `admin/` · `terms/` · `privacy/`
- 공통: `lib/book-viewer.js`(책 넘김 보기) · `lib/book-render.js` · `lib/media-client.js`(미디어 창구)
- Supabase 프로젝트 `qsucbnvicaviatdpnfxx`(서울): DB·인증·Edge Functions `media` · `shared-book` · `delete-account`
- 미디어 파일: Cloudflare R2 버킷 `book-media`(APAC). media.storage_path가 `r2:`로 시작. 서명은 `supabase/functions/_shared/r2.ts`
- 함수 배포: Supabase MCP `deploy_edge_function`(파일에 `../_shared/*.ts` 함께), media·shared-book은 verify_jwt=false

## 작업 전에 읽을 것
- 할 일·순서: `docs/qa/작업메모_다음세션.md`, `docs/TODO.md`
- 설계: `docs/DESIGN.md` (사진 두 벌 보관 설계 포함)

## 시험
- 화면: `tests/e2e/README.md` (Playwright + 가짜 Supabase, 기준 FAIL 0)
- 서버 함수: `tests/functions/README.md`
- 고친 뒤 관련 시험을 돌리고, 커밋 후 위 브랜치에 push.
