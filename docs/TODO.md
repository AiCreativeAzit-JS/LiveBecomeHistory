# 남은 일 메모

## 🔴 실제 화면 재테스트 결과 (2026-10-01, 정선C)
- [x] #1 자동 저장 — 해결 확인
- [x] #11 영상 지우고 다시 넣기 → 지금 쪽에 들어감 — 해결 확인
- [x] #11-1 (고침: 지우면 견본 자리 복원 + 안내 글 있는 틀 상자는 안 지움) **새 버그**: 영상을 다시 넣으면 그 **아래 설명 글상자가 사라짐**
      (추정: addMediaPage의 `onThisPage`가 '겹치는 빈 글상자'를 치우는데, 빈 설명 상자도 지움 → 빈 상자는 남기고 영상 위치만 피하도록)
- [ ] #8 인쇄용도 밀리의서재처럼 **넘겨 보는** 형태 원함 (현재 인쇄용 HTML은 세로로 한 장씩 나열 → 두 쪽 펼침 보기 + 인쇄 시엔 한 장씩)
- [x] #12 (고침: 고른 글이 있는 줄만 정렬, 고른 게 없으면 상자 전체) 글상자 안 **일부만 선택해서 정렬**(가운데 등) 바꾸기 — 지금은 글상자 전체 정렬. 문단(줄) 단위 정렬 필요
- [ ] #10 넘친 글 이어 쓰기·끌어오기 — 재확인 필요

### 다음에 먼저 확인할 것 (비용 적은 순)
1. ~~어느 브랜치가 배포되는지~~ → **확인 완료(2026-10-01)**: 테스트 주소 https://aicreativeazit-js.github.io/LiveBecomeHistory/editor/ 는
   `claude/confident-lovelace-w2mnqp` 브랜치의 최신 커밋이 정상 배포됨(Actions「pages build and deployment」 성공). 옛 버전 배포 문제 아님.
2. 강력 새로고침(Ctrl+Shift+R) 또는 시크릿 창에서 재확인 — 브라우저 캐시 가능성만 남음.
3. 그래도 같다면 = **실제 환경 버그**: 가짜 서버 테스트와 실제(Supabase·한글 입력·휴대폰)의 차이. 정선C에게 기기·브라우저와
   「무엇을 누르고 → 무엇을 기대했고 → 무엇이 보였는지」를 항목별로 받아 그대로 재현한 뒤 수정.

## 🧩 미룬 기능
- [ ] #9 서가 발행 승인(대기/승인/반려) + 자동·사람 검열 — 별도 스프린트

## 기타 열린 일
- 저장소가 공개(public) 상태: 비공개 전환 여부 결정(Pages 유지하려면 GitHub Pro 또는 호스팅 이전)
- 프로그램 등록: 위원회 상담(AI 활용 기재 방법·제출 형식) 후 진행
- 약관·방침 노란 칸 채우기(오픈 전, docs/OPERATIONS.md 0번)
- 도메인 연결, Supabase Pro·백업

## ⏸ 가입 승인제 — DB 작업 중단(2026-10-01, Supabase 커넥터 쓰기 시간 초과 반복)
- 적용됨: `profiles.approved` 컬럼(기본 false). 아직 아무 규칙도 이 값을 쓰지 않아 **서비스 영향 없음**.
- 남은 DB 작업(파일 `supabase/migrations/20261001_0009_signup_approval.sql`의 나머지, 한 문장씩·lock_timeout 걸고):
  1. `update profiles set approved=true` (운영자 계정 먼저 승인!) 2. 프로필 UPDATE 권한을 display_name만으로
  3. `private.is_approved()`, `admin_set_approved()` 4. RESTRICTIVE 정책 7개(books·pages·media·snapshots·shares·storage)
- 남은 화면 작업: 내 서재 「승인 대기」 화면, 관리자 회원 탭 「승인」 버튼·대시보드 대기 인원.
- ⚠️ 순서 주의: 4번(정책)은 반드시 1번 뒤에. 거꾸로 하면 운영자도 책을 못 쓴다.

## 운영 방침 (2026-10-02)
- 표기: 대표 영문 이름 **Jeongsun Kim** (김정선). 영문 서비스명 Archive for Everyone. 대외 문서·신청서에 이 표기 사용.
- 가입: Supabase「Allow new users to sign up」끔 → 운영자가 Authentication → Users → Add user(Auto Confirm)로만 계정 생성. 승인제 코드 개발은 문을 열 때 다시 검토.
- [x] (완료 2026-10-02) 「내 정보」 화면: 작가 이름·비밀번호 바꾸기 (Add user로 만든 계정은 이름이 비어 있고 비밀번호를 못 바꿈)
- 무료 요금제 잠듦 방지: 매주 1회 로그인·서가 열기. 남의 책이 생기면 Pro 전환(백업 포함). (아스트라 mvp 프로젝트는 삭제 확인 2026-10-13)
- 메일: 문의 메일함은 Zoho Mail(contact@archive4everyone.com, 가비아 DNS 연결 완료). Gmail SMTP는 실패해서 쓰지 않음(지금 인증 메일은 Supabase 기본 발신).
- [ ] 가입 열기 전: 인증 메일 발신을 noreply@archive4everyone.com(Resend 또는 Zoho ZeptoMail)으로, Reply-To는 contact@. 한국어 메일 문구. 개인정보 처리방침 위탁 표에 발송 업체 추가.
- [x] 개인정보 처리방침에 문의 수집 항목·1년 보관·Zoho(미국 DC)·Google Forms 위탁 추가(10-20 개정에 포함)
- [ ] 구글폼 설명에 개인정보 안내 문구 넣기(정선C)

## 📦 파일 저장소 R2 전환 (2026-10-13 코드 완료)
- [x] Edge Function `media` + `_shared/r2.ts`·`_shared/sign.ts`, shared-book·delete-account R2 대응, 화면 4곳(studio·editor·shelf·admin) 연결
- [x] 개인정보 처리방침 개정(국외 이전: Cloudflare, 시행 2026-10-20), 기술설명서·DESIGN 갱신
- [ ] 정선C: Cloudflare 가입 → R2 버킷 `book-media`(위치 Asia-Pacific) → CORS → API 토큰(이 버킷만, Object Read & Write)
- [ ] 정선C: Supabase Edge Functions → Secrets에 R2_ACCOUNT_ID·R2_ACCESS_KEY_ID·R2_SECRET_ACCESS_KEY·R2_BUCKET 등록 (**10월 20일 이후**, 방침 시행일)
- [ ] 등록 후: 실제 올리기·보기·지우기 확인 → 관리자로 `migrate` 실행해서 예전 파일 옮기기(남은 수 0까지) → Supabase 저장소 비었는지 확인
- [ ] 올리기만 하고 commit하지 않은 R2 고아 파일 정리(가끔 목록 비교) — 회원이 늘면 자동화
- 참고: `shrink-test`(큰 사진 1920px 줄이기) 2건은 R2 작업 전부터 실패하던 테스트. 실제 화면에서 확인 필요

## 🔐 가입한 서비스 점검 (2026-10-13 시작)
- 핵심(2단계 인증 필수): GitHub(AiCreativeAzit-JS) · 가비아 · Supabase · Cloudflare
- 운영: Zoho Mail(contact@) · Google(구글폼) · 0502 고객센터 번호 업체(업체명 확인)
- 나중: Resend(가입 문 열 때)
- 안 씀: Vercel(프로젝트·도메인 0개 확인) → 삭제 또는 2FA만
- 확인: archive4everyone.help@gmail.com 정리 여부, 아스트라 시절 계정·결제 수단
- [ ] GitHub: 2FA·복구 코드, Pages(브랜치·도메인·Enforce HTTPS), 도메인 인증(TXT), 연결된 앱, 아스트라 저장소 정리
