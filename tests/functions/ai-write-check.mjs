// ai-write 의 사실 비교(check.ts) 시험: 실제 사용 기록(「인생이 바뀐 날」)에서 「1년」이 사라진 일을 포함한다
//   node --experimental-strip-types tests/functions/ai-write-check.mjs
import { checkEdit, numbersOf, quotesOf, namesOf, splitDoc } from "../../supabase/functions/ai-write/check.ts";
let pass = 0, fail = 0;
const ok = (n, c) => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + n); };
const prev = `처음 온 곳 같지 않던 교육장

2023년, 외국계 IT 회사에 입사했다.
교육생은 나까지 4명이었다.
길 건너편은 고급 외제차 매장이 보이는 건물이었고, 왕복 8차선의 큰 대로로 시야가 트였다.
그 회사에서 엄청난 고생을 했다.
"정선님, 이상한 소리 좀 안 낼 수 없어요?"
1년을 다니고 계약이 종료됐다.
먼저 그만둘까도 생각했지만 계약 연장을 위해 최선을 다했다.
하지만 연장에만 집착하면 힘들어질까 봐 플랜B를 세웠다.`;
const same = checkEdit(prev, prev, "순서를 바꿔 주세요");
ok("그대로면 걸리는 것 없음", !same.missing.length && !same.added.length && !same.blocked);
const lost = prev.replace("1년을 다니고 계약이 종료됐다.\n", "");
const r1 = checkEdit(prev, lost, "흐름을 매끄럽게 윤문해 주세요");
ok("「1년」이 사라지면 잡는다", r1.missing.includes("1년"));
ok("그 밖의 것은 오탐 없음", r1.missing.length === 1);
const r2 = checkEdit(prev, lost.replace("2023년", "2023년"), "1년 문장은 빼 주세요");
ok("어르신이 「1년」을 빼 달라고 했으면 빠짐으로 치지 않는다", !r2.missing.includes("1년"));
const r3 = checkEdit(prev, prev.replace("1년을 다니고", "일 년을 다니고"), "다듬어 주세요");
ok("「1년」→「일 년」은 같은 값", !r3.missing.length);
const r4 = checkEdit(prev, prev.replace("1년을 다니고", "한 해를 다니고"), "다듬어 주세요");
ok("「1년」→「한 해」도 같은 값", !r4.missing.length);
const r5 = checkEdit(prev, prev.replace("교육생은 나까지 4명", "교육생은 나까지 다섯 명"), "다듬어 주세요");
ok("숫자가 바뀌면 빠짐(4명)으로 잡는다", r5.missing.includes("4명"));
const r6 = checkEdit(prev, prev.replace("\"정선님, 이상한 소리 좀 안 낼 수 없어요?\"", "선배가 불평했다."), "다듬어 주세요");
ok("따옴표 대사가 사라지면 잡는다", r6.missing.some((x) => x.includes("이상한 소리")));
ok("대사에 든 이름(정선)도 같이 잡는다", r6.missing.includes("정선"));
const r7 = checkEdit(prev, prev.replace("먼저 그만둘까도", "그래서 먼저 그만둘까도"), "다듬어 주세요");
ok("AI가 새로 늘린 「그래서」를 잡는다", r7.added.includes("그래서"));
const r8 = checkEdit(prev, prev.replace("먼저 그만둘까도", "그래서 먼저 그만둘까도"), "그래서를 넣어 주세요");
ok("어르신이 말한 이음말은 잡지 않는다", !r8.added.length);
const r9 = checkEdit(prev, "제목\n\n짧은 글", "다듬어 주세요");
ok("글이 70% 아래로 줄면 막는다", r9.blocked === "shrunk");
const r10 = checkEdit(prev, "제목\n\n짧은 글", "반으로 줄여 주세요");
ok("줄여 달라는 요청이면 막지 않는다", !r10.blocked);
ok("한국어 숫자 정규화: 두 해=2년", numbersOf("두 해 동안").has("2년"));
ok("「이 해」(올해)는 숫자로 보지 않는다", numbersOf("이 해에는").size === 0);
ok("「한 번」은 숫자로 보지 않는다", numbersOf("한 번 더").size === 0);
ok("4자리 연도", numbersOf("2023년에").has("2023년"));
ok("quotesOf 두 줄", quotesOf('"가나다라" 그리고 “마바사아”').length === 2);
ok("namesOf 영문 소문자 통일", namesOf("외국계 IT 회사").includes("it"));
const sp = splitDoc("제목입니다\n\n첫 줄\n둘째 줄");
ok("splitDoc", sp.title === "제목입니다" && sp.body === "첫 줄\n둘째 줄");
console.log(`\n${pass} PASS / ${fail} FAIL`); process.exit(fail ? 1 : 0);
