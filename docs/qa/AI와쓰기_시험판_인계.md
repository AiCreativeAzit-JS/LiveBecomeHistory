# AI와 쓰기 시험판 인계 (웹 세션용, 2026-10-27)

> 데스크탑 세션 사용량이 다 차서 Claude Code 웹에서 이어 하려고 저장소에 옮겨 적음. 브랜치 `proto/ai-side-panel`.
> 꼭 지킬 것: 운영(DB 적용·함수 배포·배포 브랜치 push)은 단계마다 대표 승인. 비밀 키는 채팅으로 받지 않음(대표가 Supabase 대시보드 → Edge Functions → Secrets 에 `ANTHROPIC_API_KEY` 직접 입력). 모델 claude-sonnet-5-5, 1인 하루 3,000원. API 키 권장: 전용 키 이름 moa-ai-test, 월 한도 $40, 알림 $10/$25.


## 어디에
- 작업 폴더(git worktree): `C:\모아\LiveBecomeHistory-ai-proto`, 브랜치 `proto/ai-side-panel` (배포 브랜치 `claude/confident-lovelace-w2mnqp` 2704a25에서 갈라짐). **푸시하지 않음.**
- 운영 체크아웃 `C:\모아\LiveBecomeHistory`는 건드리지 않음(브랜치 그대로).
- 바뀐 파일: `studio/ai-proto.js`(새 파일, 시제품 전부), `studio/index.html`(맨 아래 2줄: 체험 모드 + `?ai=proto`일 때만 불러오기), `tests/e2e/ai-proto-test.mjs`(새 시험), `tests/e2e/README.md`(시험 설명 1줄).
- 켜는 법: 체험 편집기 주소 `/studio/?ai=proto`. 로그인한 내 책(`?book=`, `?new=1`)에서는 불러오지 않음.
- 미리보기: `C:\모아\.claude\launch.json`의 `moa-ai-proto`(이 폴더의 `serve-proto.mjs`, 포트 8810) → `http://localhost:8810/studio/?ai=proto`. **8790은 r09-test가 쓰므로 피함.**
- 스크린샷: 이 폴더 `ai-proto-shots/` (시험이 `AI_SHOTS`로 남김, 1366×768).

## 구조 메모(다음 단계 개발자용)
- `ai-proto.js`는 편집기 전역 이름(`state`, `snap`, `settle`, `flowsInto`, `renderAll`, `undo`, `T`, `MX/CW/PH/MB`, `toast`, `fitZoom`, `redrawCanvas`, `pickMedia`)을 그대로 씀. 편집기 코드는 고치지 않음.
- 담기: `snap()` 한 번 → 새 쪽(제목 상자 + 아래 여백까지 닿는 본문 상자) `splice` → `settle(at)`로 넘친 글은 「(이어서)」 쪽. 되돌리기 한 번 = 담기 전. 이어진 원고 사이에는 넣지 않고 그 원고 끝 쪽 뒤로(`chainEnd`).
- 예상 쪽 수: 빈 책 배열로 `state.pages`를 잠깐 바꿔 `settle(0)`을 돌려 셈(finally로 복구).
- 쪽 목록 「여기」·「새 글」 표시: `#thumbs` MutationObserver(childList)로 다시 붙임(클래스·data 속성만 바꿔 루프 없음). 되돌리기로 담은 쪽이 사라지면 자리 고르기로, 다시 하기로 살아나면 「담았어요」로.
- 「직접 고르기」일 때 `#thumbs` 클릭은 capture 단계에서 가로채 자리 고르기로.
- AI 창 안 키 입력은 stopPropagation(상자 지우기·방향키 이동 방지), Ctrl+Z·Y만 통과.
- 가짜 답: `SAMPLE`(예시 답 5개 + 맞춘 AI 답·장면·초고 문장·다시 쓴 문장·퇴고 문장), `SAMPLE_EDIT`(편집자 질문·예시 답), 직접 쓴 답은 `mirror()` + `GQ` 질문. 실제 AI로 바꿀 자리는 `aiSay`·`buildDraft`·`applyMarks`·`quickFix`·`enterRevise`·`makeRevision`.
- 일부러 넣은 지어낸 문장: 초고 s3 「그날 새벽 공기는 유난히 매서웠다.」(made:true)

## 시험
- `ai-proto-test`: run-all 기본 목록에 넣지 않음 → `.\run-all.ps1 -Label x -Tests ai-proto-test`
- 기존 35개 전체(2026-10-26, 시제품 브랜치): **724건 FAIL 0** (직전 기준 34개 710건 + home 14건과 같음). 로그 `tests/e2e/logs/proto-all.log`(git 제외)
- ai-proto-test: **69건 FAIL 0** (로그 `logs/ai3.log`)
- 커밋: `468566b` (proto/ai-side-panel), 푸시 안 함

## 2차 손질(대표 의견 A~G, 같은 날)
- A 견본 책이 펼쳐진 체험 화면에서 「AI와 쓰기」 → `?blank=1&ai=proto&aiopen=1`로 다시 열고 AI 창 자동(이 기기 체험 원고가 있으면 그 질문을 먼저). 안내 띠 링크도 `ai=proto` 유지
- B 첫 화면: 이번 주 글감(아직일 때만 크게) → 「내 글 · n편」(쓰는 중·담음·담긴 쪽, 눌러서 이어 가기) → 남겨 둔 장면 → 다른 글감/내가 정하기
- C 단계 표시 눌러 지난 단계 보기(읽기 전용 + 돌아가서 고치기) · 「이 장면 더 이야기하기」(생각하기로 돌아가 2개까지 더 묻고 그 장면 뒤에 넣어 초고 다시) · 「이전 판으로」(초고·퇴고본, AI 안 부름) · 담은 뒤 「이 글 다시 다듬기」(퇴고로, 다시 담으면 새 쪽으로 하나 더, 예전 쪽 그대로) · 되돌리기/다시 하기는 모든 글에서 맞춤(`syncPlaced`)
- D 「이 장면을 길게」 → 「이 장면 더 이야기하기」 · E Ctrl+Enter 보내기(한글 조합 중 제외) · F 담은 뒤 「사진 넣기」 뺌 · G 창 아래 「AI 부름 n번」(시제품 전용)
- 시험: ai-proto-test 89건 FAIL 0, 기존 체험 관련 5개(studio·demo·sample·r05·home) 153건 FAIL 0. studio/index.html은 1차 커밋 뒤 바뀌지 않음(1차 때 기존 35개 724건 FAIL 0)

## 3차 손질(대표 의견 H~L, 같은 날) — 「기능 변경은 AI 호출 비용으로 판단」(대표 요청, 메모리에 저장)
- 원고 모형: 문장 `{id,p,t}`, AI가 고친 문장 `{was,now,why,pick}`. 「이대로 좋아요/원래대로」는 pick만(AI 안 씀). 다음 AI 고침 때 고른 대로 굳힘(`flat`)
- H 바뀐 곳 카드(전→후 · 한 줄 이유 · 고르기). 퇴고 이유는 SAMPLE의 `revWhy`. 지금 프롬프트 v3 28장(「고친 이유·목록을 쓰지 않는다」)과 다름 → 실제로 하려면 지시문 손질(결정 항목)
- I 「더 다듬기」: 문장 누르면 빼 주세요·제가 한 말이 아니에요(바로, AI 안 씀) / 다시 써 주세요(모아서 AI 1번) · 더 담백하게·더 짧게(AI 1번) · 이 장면 더 이야기하기(초고만) · 내가 한 줄 더하기 · 이전 판으로. 따로 있던 「다시 고쳐 주세요」 없앰
- J 담기 화면 「퇴고본으로 돌아가기」 → 「담지 않고 더 다듬기」
- K 담은 뒤 「AI와 한 번 더 퇴고」: 지면의 지금 글(`pageDoc`)을 바탕으로(가짜 답 `AGAIN`) → 「바꿔 담기」(`replaceWriting`: 제목·본문 상자 글만 바꾸고 이어진 쪽은 비워 글 흐름이 다시 채움, 사진 등은 그대로, snap 한 번) · 「새 자리에 하나 더」 · 「바꾸지 않고 두기」. 담기 화면에도 「이미 담은 쪽을 이 글로 바꾸기」가 기본
- L 창 아래 「시제품 · 이 글 AI n번 · 약 m원」(PRD 8장 모델, Opus, 고치기·한 번 더 퇴고는 바뀐 문장만 받는 셈). 시험 흐름: 초고까지 8번 약 470원, 퇴고까지 15번 약 940원, 한 번 더 퇴고 1번 약 48원
- 시험: ai-proto-test 98건 FAIL 0 · studio·demo·sample·r05·home 153건 FAIL 0(studio/index.html은 1차 뒤 그대로)

## 4차 — 최소 기능판으로 다시 짬(대표: 「엉킨다, 최소 기능으로」, 커밋 0c27831)
- **2·3차의 문장 메뉴·바뀐 곳 고르기·더 다듬기 묶음·지난 단계 보기·버튼 비용 꼬리표는 모두 걷어 냄**(위 2·3차 메모는 이력으로만)
- 글감 하나 = 대화 하나(`s.msgs`에 AI/나 말 + 원고 카드 스냅숏). 단계: think → draft → revise → place → done
- 생각하기: `s.covered`(장면·사람·사건·마음·의미) 다 차면 정리, 상한 `QMAX=8`. 예시: w1(길게, 5번) · p3 첫 출근(짧게, 7번). 직접 쓴 답은 길이로 관점 채움 흉내(`PQ`로 빈 관점 질문)
- 초고·퇴고: 말로 고치기 `fixRules`(유난히/아니에요 · 아버지+빼 · 담백 · 짧 · 원래+그러고 보니 · 여운). 퇴고 질문 `RQMAX=3`, 답을 다 들은 뒤 `makeRevision` 한 번 + 고친 까닭 한 줄씩
- 담기 `doPlace`: fill(빈 쪽 제목·본문 상자) / swap(새 쪽 + 빈 쪽 삭제) / after / end. 빈 쪽 = 글상자만 있고 모두 빈 쪽. fill 되돌림 감지는 본문이 다시 비었는지(`placedAlive`)
- 주의: 이 파일 안 상수 이름이 편집기 전역(PH 등)을 가리면 안 됨 — 안내 문구 상수를 `PH`로 했다가 새 쪽 본문 높이가 NaN이 됐음(`HINT`로 고침)
- 시험 ai-proto-test 77건 FAIL 0

## 5차 — 실사용자 시험으로 진행 중(2026-10-27, 대표 승인: 홈페이지·편집기 배포까지)
대표 결정: 모델 Sonnet 5.5 · 1인 하루 3,000원 · 보관 시험 기간+1년 · 시험 기간에는 운영자가 대화 열람 · API 크레딧 $100(콘솔 월 한도 $40, 알림 $10/$25 권함)
- 끝남(커밋 fa96ba9, 브랜치 proto/ai-side-panel, 푸시 안 함): `supabase/migrations/20261027_0016_ai_writing.sql`(적용 전), `supabase/functions/ai-write/{index.ts,prompt.ts}`(배포 전)
- 남은 일(순서대로):
  1. 편집기 연결: 로그인 편집기(ONLINE)에서 profiles.ai_enabled 인 회원에게만 `studio/ai-write.js` 불러오기. ai-proto.js 의 가짜 답 자리(send·summarize·writeDraft·fixByTalk·toRevise·revAnswer)를 ai-write 함수 호출로(모드 think/summarize/draft/fix/revise_q/revise, history=[{who,text}], doc=원고 글). 실패하면 「쓰신 답은 그대로 있어요 · 다시 보내기」. 동의는 ai_consents insert. 대화는 ai_threads(book_id, topic_key) upsert(1.5초 묶어서)
  2. 관리자: 회원 탭에 「AI 시험」 켜기(admin_set_ai) · 사용량(ai_usage 합계) · 대화 보기(ai_threads 읽기)
  3. 개인정보 처리방침(privacy/): 위탁·국외 이전에 Anthropic(미국) 추가, AI에 보내는 것·보관 기간·운영자 열람(시험 기간)·삭제 방법 → 대표 문구 확인
  4. 시험: fake-supabase 에 새 표·함수 흉내, ai-write 화면 시험, run-all 35개 FAIL 0
  5. 운영 반영(단계마다 대표 승인): 이전 적용(Supabase MCP apply_migration) → 대표가 ANTHROPIC_API_KEY 비밀 값 입력 → deploy_edge_function ai-write(verify_jwt=true) → 관리자에서 시험 참여자 켜기 → 배포 브랜치에 병합·푸시
- 웹에서 이어 가려면 이 브랜치를 GitHub에 올려야 함(대표 승인 필요)

## 대표 결정 대기(시제품을 보고)
- (4차) 퇴고 질문 상한 3개 · 퇴고 뒤 「무엇을 왜 고쳤는지 한 줄」 → 프롬프트 v3(질문 하나 · 해설 쓰지 않기) 손질 · 생각하기는 v1(관점 채움 + 상한 8)과 v3(되비추기)를 합친 판으로 모의고사 비교
- (3차 추가) 프롬프트 v3 28장 손질: 퇴고 답을 「바뀐 문장 + 이유 꼬리표」로 받기 · 한 편에 「한 번 더 퇴고」 몇 번까지 · 「제가 한 말이 아니에요」를 다음 AI 호출에 어떻게 알릴지
- (2차 추가) 다시 다듬은 글을 담을 때 예전 쪽과 바꿔 넣을지(지금은 새 쪽으로 하나 더) · AI 품질: 모의고사 문제집(채점표 + 가상 어르신 대본) 먼저 → AI 연결 시험판(API 키 필요, 따로 승인) · 한도 원칙(과정 전체 금액, AI 안 부르는 손질 0원, 한도 다 써도 원고 잠기지 않음)
창 폭 340px로 충분한지 · 바뀐 곳 보기를 퇴고본 안에 섞을지/아래 따로 둘지 · 「이 장면을 길게」 처리 · 프롬프트 v3의 「'다음으로 넘어가 주세요'라고 말씀해 주세요」 문장들을 버튼 이름으로 바꾸는 손질 · 동의 세 줄 문구(학습 미사용·삭제 가능은 AI 회사 약관·삭제 기능과 맞춰야) · 「잘 모르겠어요」도 질문 5개에 셀지 · 호칭 「선생님」 · 이어진 글 사이에 담지 않는 규칙

## 6차 (2026-10-27 03:35) — 커밋 c9b216e (proto/ai-side-panel, push 안 함)
- 편집기 진짜 AI 연결(studio/ai-proto.js REAL 부분 + studio/index.html loadAI: 로그인+profiles.ai_enabled 일 때만 불러옴, 체험 ?ai=proto 는 바로)
- 관리자(admin/index.html): 회원 줄에 AI 시험 켜기/끄기(admin_set_ai)·사용량·대화 보기. 0016 전에는 AI 줄 숨김
- 처리방침 안(privacy/index.html, 대표 승인 전): Anthropic 국외이전·항목·보관(시험 끝+1년)·시험 기간 운영자 열람·「나만 보기」 예외. 동의 문구 같은 말로
- 시험: 기존 35개 724 PASS / FAIL 0, ai-proto-test 77/0, 새 ai-real-test 21/0(가짜 ai-write). fake-supabase 에 ai 표·onConflict·neq 추가
- 대표 결정 대기: ① 약관 제9조 「나만 보기」 문장에도 예외 넣을지 ② 처리방침 10/27 바로 시행(동의자만) 괜찮은지
- 남은 운영 단계(하나씩 승인): 0016 적용 → 대표가 ANTHROPIC_API_KEY 비밀값 입력 → ai-write 배포(verify_jwt=true) → 배포 브랜치 합치고 push → 관리자에서 시험 회원 켜기

## 7차 (2026-10-26) — 운영 반영 끝, 품질 개선(v4) 준비 중
- **운영 반영 완료**: 0016 적용(apply_migration `ai_writing`) · `ANTHROPIC_API_KEY` 비밀값 입력(대표) · `ai-write` 배포(버전 1, verify_jwt=true, Sonnet 5.5) · 배포 브랜치 `claude/confident-lovelace-w2mnqp` 에 병합·푸시(2704a25→8dad8c8) · 시험 회원 1명 켬(대표 계정). 크레딧 $100(11월 21일 만료, 결제수단 없음), 월 한도 $80.
- **대표 실사용 결과**: 실제 AI 연결은 잘 됨. 그러나 딱딱함(조언·평가 세 번 거절 「제 역할이 아니어서」, 초고 건조, 질문 틀 반복). 원인은 모델이 아니라 설계(v3 지침서의 금지 목록, JSON 틀). 21번 호출 약 960원. 지침서 저장(캐시 쓰기)이 단계마다 6번(약 390원) — 답 모양을 통일하면 줄 것으로 추정(미확인).
- **방향(대표 결정)**: 지침서 v4 = 약속 3개 + 말투 + 단계별 짧은 지시 + 예시. 사실 보호는 「특정할 수 있는 사실의 창작」만 막음, 문체·완성도·조언은 허용. 챕터 정보는 글감 데이터(`[글감]`·`[취재 초점]`·`[마무리 결]`)로. 생각하기 effort high. **Opus 비교 안 함**(Sonnet 5.5 하나). 위기 신호는 「곁에 있겠다」까지, **번호 안내·전문 상담 권유 없음**. 실명·병력은 쓰는 동안 경고 없이 **퇴고에서 옵션**. 전문 영역 걱정은 딱딱한 법률 말 없이 따뜻한 대안.
- **파일**: `docs/qa/지침서_v4_초안.md` · `docs/qa/채점표_v0.md`(안전검사 8 + 성적표 100점) · `docs/qa/모의대본_파일럿6_초안.md`(대본 확정) · `tests/ai-lab/`(실행기·자동 검사, 키 없이 `--dry` 로 흐름 시험 통과).
- **다음**: ① 실제 API 로 파일럿(6편×v3/v4, 약 1만 원) — 키는 대표가 환경 변수로만 넣음(채팅 금지). 이 세션 환경엔 키가 없음 ② 결과를 `check.mjs` + 사람이 읽기로 채점, 판정 AI·사람 보정은 본시험(24편)에서 ③ v4 가 이기면 `ai-write` 에 반영(지침서·통일 답 모양·글감 데이터 전달·effort) → 배포는 대표 승인 ④ 화면 쪽: 글감 꾸러미에 `focus`·`tone`, 퇴고 옵션 UI, 「바뀐 문장만 받기」.

## 8차 (2026-10-26) — v4.3 배포(대표 결정: 「더 시험하지 말고 배포해서 직접 써 보며 고치자」)
- **ai-write 버전 2 배포**(Supabase MCP, verify_jwt=true, 프로젝트 qsucbnvicaviatdpnfxx): 지침서 v4.3(`PROMPT_VERSION` `v4.3-moa1`, 원본 `tests/ai-lab/v43.mjs`), 모든 단계 같은 답 모양, 생각하기 effort high, 글감 초점·마무리 결 받기, 본문 첫 줄 제목 중복 걷어내기. 배포된 파일을 다시 받아 읽어 글자 깨짐 없음 확인. 이전(버전 1·v3-moa1)으로 되돌리려면 커밋 `8dad8c8`의 `supabase/functions/ai-write/`를 다시 배포.
- **배포 브랜치**(`claude/confident-lovelace-w2mnqp` 8dad8c8→228d3c3): `studio/ai-proto.js`(글감마다 취재 초점·마무리 결 보냄)와 `supabase/functions/ai-write/*` 두 파일만 올림. `tests/ai-lab/`(지침서 원문·시험 기록)과 docs는 올리지 않음.
- **시험 전 확인**: 화면 시험 ai-real-test 21/0 · ai-proto-test 77/0 · studio-test 96/0. 새 지침서(v4.3)를 진짜 AI로 돌려 본 적은 없음(v4.1·v4.2까지 파일럿). 대표 직접 사용으로 확인.
- **알아 둘 것**: 배포 브랜치(공개 사이트)에는 이미 `supabase/functions/ai-write/prompt.ts`가 있어 지침서 글이 주소로 열릴 수 있음(이전 판 때부터). 지침서를 숨기려면 서버 코드를 사이트 브랜치 밖에 두는 정리가 필요.
- 쓰면서 고칠 곳은 `tests/ai-lab/v43.mjs`를 고친 뒤 `prompt.ts`를 다시 만들고(`PROMPT_VERSION` 올림) 같은 방법으로 배포.

## 9차 (2026-10-26) — v4.4 배포 (대표 결정: 순서 제안은 선택지 두 개 · AI 말투 해요체 · 실존 인물 옵션 넣기 · 「시험 없이 배포해 쓰면서 고치기」)
- 근거: 대표가 v4.3으로 쓴 대화 한 편(「인생이 바뀐 날」, 41개 메시지) 분석 + AI 자문위원 4명(편집자·어르신 대변인·레드팀·엔지니어) 의견. 결과: 모델이 「1년 문장은 빼지 않았다」고 보고했지만 최종 원고에서 「1년」이 사라짐 · 흐름 불만에 순서를 바꿔 논리가 깨짐 · 알리지 않은 인과 이음말 「그래서」.
- **ai-write 버전 3 배포**(Supabase MCP, verify_jwt=true, 배포 파일을 다시 받아 읽어 확인): 지침서 v4.4(`v4.4-moa1`, 원본 `tests/ai-lab/v44.mjs`) + **`check.ts`**(새 파일). v4.3으로 되돌리려면 커밋 `228d3c3`의 `supabase/functions/ai-write/`를 다시 배포.
  - 서버 코드 점검(`check.ts`): 고치기·퇴고 답을 이전 원고와 비교해 빠진 숫자·기간(「1년/일 년/한 해」 같은 값)·따옴표 대사·이름, AI가 새로 늘린 인과 이음말(그래서·결국·그러나·때문에…), 글이 70% 아래로 줄면 반영 거부. 결과는 응답 `out.check`. 시험 `tests/functions/ai-write-check.mjs` 20/0.
  - 지침: 해요체 · 순서는 바꾸지 않고 `proposal`로 제안 · 인과·대비 이음말은 어르신이 쓴 것만 · 장면은 한 순간(요약문 금지) · 의미 질문은 사건·사람·마음 뒤 · 길이 3~4문장 · 실존 인물 비판 묘사는 퇴고 때 한 번 옵션.
- **화면(`studio/ai-proto.js`)**: AI 말에 단추(「이렇게 바꿔요 / 그대로 두기」, 서버가 찾은 빠진 것이 있으면 경고 + 「방금 고친 것 되돌리기 / 그대로 두기」), 화면이 직접 하는 말 해요체, 「…다.를 중심으로」 문구 고침. 시험 ai-real-test 27/0 · ai-proto-test 77/0 · studio 96 · demo 16 · sample 9.
- **공개 사이트 브랜치**(`claude/confident-lovelace-w2mnqp`): `studio/ai-proto.js`와 `supabase/functions/ai-write/*` 네 파일만 올림.
- 하지 않은 것(2단계 후보): 바뀐 문장만 받기(`from→to`), 대화 기록 접기·캐시, 바뀐 곳 문장별 되돌리기, 실패 호출 기록. 4차에서 대표가 「엉킨다」며 걷은 문장별 선택 기능은 되살리지 않음.
- 알려진 한계: 검사는 정규식·정해 둔 목록이라 놓치거나 잘못 잡을 수 있음(예: 「줄」이 든 요청은 줄어듦 방지를 느슨하게 함). v4.4 지침서는 진짜 AI로 시험해 보지 않고 배포했으니 쓰면서 이상한 대답을 모아 주세요.
