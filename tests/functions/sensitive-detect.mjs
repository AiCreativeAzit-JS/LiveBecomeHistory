// 주민번호·카드·계좌 모양 감지(studio/index.html 의 window.moaSensitive)를 HTML 에서 꺼내 시험한다. node tests/functions/sensitive-detect.mjs
import fs from "node:fs";
const src = fs.readFileSync(new URL("../../studio/index.html", import.meta.url), "utf8");
globalThis.window = {}; eval(src.slice(src.indexOf("window.moaSensitive=function"), src.indexOf("function sensitiveInBook")));
const cases = [["900101-1234567", "주민등록번호"], ["9001011234567", "주민등록번호"], ["900101-123456", "주민등록번호"], ["901301-1234567", null], ["1234-5678-9012-3456", "카드번호"],
  ["110-123-456789", "계좌번호"], ["010-1234-5678", null], ["02-123-4567", null], ["2024-10-28", null], ["1945년 3월 2일, 월급 120000원", null]];
let bad = 0;
for (const [t, want] of cases) { const got = window.moaSensitive(t)[0] ?? null; const ok = got === want; if (!ok) bad++; console.log(ok ? "PASS" : "FAIL", JSON.stringify(t), got); }
console.log(`${cases.length - bad} PASS / ${bad} FAIL`); process.exit(bad ? 1 : 0);
