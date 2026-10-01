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
- 가입: Supabase「Allow new users to sign up」끔 → 운영자가 Authentication → Users → Add user(Auto Confirm)로만 계정 생성. 승인제 코드 개발은 문을 열 때 다시 검토.
- [x] (완료 2026-10-02) 「내 정보」 화면: 작가 이름·비밀번호 바꾸기 (Add user로 만든 계정은 이름이 비어 있고 비밀번호를 못 바꿈)
- 무료 요금제 잠듦 방지: 매주 1회 로그인·서가 열기. 남의 책이 생기면 Pro 전환(백업 포함), 그 전에 아스트라 mvp 프로젝트 삭제.
- 메일: Gmail SMTP(archive4everyone.help) 연결. 회원이 늘면 Resend 등 거래 메일 서비스로.
