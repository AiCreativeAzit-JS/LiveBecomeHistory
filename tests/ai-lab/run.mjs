// AI 연구실 실행기: 같은 대본을 지침서 v3 / v4 로 돌려 대화 기록(JSON·읽기용 글)과 비용을 남긴다.
//   node tests/ai-lab/run.mjs --scripts s1,s2 --versions v3,v4 [--dry] [--max-krw 15000] [--out 폴더]
// 키는 환경 변수 ANTHROPIC_API_KEY 에서만 읽는다(채팅·파일에 적지 않는다). --dry 는 키 없이 흐름만 시험(가짜 답, 비용 0).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildBody, callAnthropic, fakeAnswer, costKrw, PIECES } from "./lib.mjs";
import * as V3 from "./v3.mjs";
import * as V4 from "./v4.mjs";
import * as V41 from "./v41.mjs";
import * as V42 from "./v42.mjs";
import * as V43 from "./v43.mjs";
import * as V44 from "./v44.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i < 0 ? d : (process.argv[i + 1]?.startsWith("--") || process.argv[i + 1] === undefined ? true : process.argv[i + 1]); };
const DRY = process.argv.includes("--dry");
const MAXK = Number(arg("max-krw", 15000));
const KEY = process.env.ANTHROPIC_API_KEY;
const wantScripts = String(arg("scripts", "s1,s2,s3,s4,s5,s6")).split(",");
const wantVersions = String(arg("versions", "v3,v4")).split(",");
const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 13);
const OUT = String(arg("out", path.join(here, "runs", `${DRY ? "dry-" : ""}${stamp}`)));
if (!DRY && !KEY) { console.error("ANTHROPIC_API_KEY 환경 변수가 없습니다. 키 없이 흐름만 보려면 --dry"); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const VERSIONS = { v3: V3, v4: V4, v41: V41, v42: V42, v43: V43, v44: V44 };
const CALL = "선생님", QMAX = 8, RQMAX = 3;
let totalKrw = 0;

// 한 단계 호출: 서버 함수 ai-write 와 같은 요청(메시지 짜기 · 모양 강제)을 부르고 사용량을 기록한다
async function ai(run, mode, extra = {}) {
  if (totalKrw >= MAXK) throw new Error(`비용 상한 ${MAXK}원 도달 — 중단`);
  const hist = run.msgs.filter((m) => m.text).map((m) => ({ who: m.who === "me" ? "me" : "ai", text: m.text }));
  const t0 = Date.now();
  let out, usage;
  if (DRY) ({ out, usage } = fakeAnswer(mode, ++run.n));
  else {
    const body = buildBody(run.ver, mode, run.topic, hist, extra);
    const r = await callAnthropic(body, KEY);
    usage = r.usage; run.model = r.model;
    if (r.stop_reason === "refusal") throw new Error("refusal");
    out = JSON.parse(r.content.filter((b) => b.type === "text").map((b) => b.text).join(""));
  }
  const krw = costKrw(usage); totalKrw += krw; run.krw += krw; run.calls.push({ mode, krw, ms: Date.now() - t0, usage, out });
  return out;
}
const aiSay = (run, text, more = {}) => run.msgs.push({ who: "ai", text, ...more });
const meSay = (run, text, more = {}) => run.msgs.push({ who: "me", text, ...more });
const docOf = (d) => `${d.title}\n\n${d.body}`;
// 모델이 body 첫 줄에 제목을 또 쓰면(파일럿 s4 v4) 걷어 낸다. 서버 ai-write 에도 같은 걸러내기가 필요하다.
const toDoc = (o, prev) => { const title = String(o.title || "").trim() || prev?.title || "제목"; let body = String(o.body || "");
  const lines = body.split("\n"); if (lines[0].trim() === title) body = lines.slice(1).join("\n").replace(/^\s*\n/, "");
  return { title, body }; };

async function play(script, vname) {
  const ver = VERSIONS[vname];
  const run = { script: script.id, version: vname, prompt: ver.PROMPT_VERSION, ver, topic: script.topic, msgs: [], calls: [], n: 0, krw: 0, stages: {} };
  aiSay(run, script.topic.first);
  // 1) 취재(생각하기)
  let q = 0, covered = [], summarized = false;
  for (const u of script.think) {
    meSay(run, u, { stage: "think" });
    const o = await ai(run, "think");
    covered = (o.covered || []).filter((p) => PIECES.includes(p));
    if (o.ready || q >= QMAX || PIECES.every((p) => covered.includes(p))) { summarized = true; break; }
    q++; aiSay(run, o.reply, { stage: "think" });
  }
  // 2) 정리 → 장면 고르기(장면이 하나면 화면이 바로 고른다)
  const so = await ai(run, "summarize"); const scenes = (so.scenes || []).filter(Boolean).slice(0, 3);
  if (!scenes.length) { run.aborted = "장면 없음"; return run; }
  aiSay(run, `${CALL}, 지금까지 이야기에서 제가 들은 가장 선명한 장면은 다음과 같습니다.`, { stage: "summarize", scenes });
  let chosen = 0;
  if (scenes.length > 1) { aiSay(run, `${CALL}, 이 가운데 이번 글의 중심이 될 장면을 하나 골라 주세요.`); const m = /([1-3])|첫|두|세/.exec(script.pick); chosen = m ? ({ 첫: 0, 두: 1, 세: 2 }[m[0]] ?? Number(m[1]) - 1) : 0; chosen = Math.min(chosen, scenes.length - 1); meSay(run, script.pick, { stage: "pick" }); }
  run.chosen = scenes[chosen];
  // 3) 초고
  const dr = await ai(run, "draft", { note: `[고른 장면] ${scenes[chosen]}` });
  let doc = toDoc(dr); run.draft = doc;
  aiSay(run, "초고가 나왔습니다. 고치고 싶은 곳이 있으면 말씀해 주세요. 다 되면 「퇴고로 넘어가기」를 눌러 주세요.", { stage: "draft", doc });
  // 4) 초고 후 말로 고치기·대화
  for (const r of script.draft) {
    meSay(run, r.text, { stage: "draft", crisis: !!r.crisis, legalAsked: !!r.legalAsked });
    const o = await ai(run, "fix", { doc: docOf(doc) });
    if (!o.changed) { aiSay(run, o.reply || "말씀하신 곳을 찾지 못했어요. 어느 문장인지 조금 더 알려 주세요.", { stage: "draft", chat: true }); continue; }
    doc = toDoc(o, doc); run.draft = doc;
    aiSay(run, `${(o.why || []).join("\n")}\n더 고칠 곳이 있으면 말씀해 주세요. 다 되면 「퇴고로 넘어가기」를 눌러 주세요.`, { stage: "draft", doc });
  }
  // 5) 퇴고 질문(최대 3개)과 퇴고본
  const answers = script.reviseAns.map((a) => ({ ...a, used: false }));
  const nextAns = (question) => { const k = answers.findIndex((a) => !a.used && a.when && new RegExp(a.when).test(question)); const j = k >= 0 ? k : answers.findIndex((a) => !a.used && !a.when);
    if (j < 0) return "없어요."; answers[j].used = true; return answers[j].text; };
  let revAt = 0, asking = true;
  let o = await ai(run, "revise_q", { doc: docOf(doc), note: "[이미 물은 퇴고 질문 수] 0" });
  let diag = (o.fixes || []).length ? o.fixes.join("\n") : "크게 고칠 곳은 없습니다.";
  if (!o.question) asking = false; else aiSay(run, `퇴고를 시작합니다. 다섯 가지로 살펴봤습니다.\n${diag}\n\n${o.question}`, { stage: "revise" });
  if (!asking) aiSay(run, `퇴고를 시작합니다. 다섯 가지로 살펴봤습니다.\n${diag}`, { stage: "revise" });
  let lastQ = o.question;
  while (asking) {
    meSay(run, nextAns(lastQ), { stage: "revise" }); revAt++;
    if (revAt >= RQMAX) break;
    o = await ai(run, "revise_q", { doc: docOf(doc), note: `[이미 물은 퇴고 질문 수] ${revAt}` });
    if (o.question) { aiSay(run, o.question, { stage: "revise" }); lastQ = o.question; } else break;
  }
  const ro = await ai(run, "revise", { doc: docOf(doc) });
  let rev = toDoc(ro, doc); run.rev = rev;
  aiSay(run, `퇴고본을 썼습니다. 이렇게 고쳤어요.\n${(ro.why || []).map((w, i) => `${"①②③④⑤⑥⑦⑧"[i] || "·"} ${w}`).join("\n")}\n마음에 안 드는 곳은 "○○은 원래대로 해 주세요"처럼 말씀해 주세요. 다 되면 「모아에 담기」를 눌러 주세요.`, { stage: "revise", doc: rev });
  // 6) 퇴고본 뒤 요청
  for (const r of script.reviseReq || []) {
    meSay(run, r, { stage: "rev-after" });
    const fo = await ai(run, "fix", { doc: docOf(rev) });
    if (!fo.changed) { aiSay(run, fo.reply || "말씀하신 곳을 찾지 못했어요.", { stage: "rev-after", chat: true }); continue; }
    rev = toDoc(fo, rev); run.rev = rev;
    aiSay(run, `${(fo.why || []).join("\n")}\n다 되면 「모아에 담기」를 눌러 주세요.`, { stage: "rev-after", doc: rev });
  }
  return run;
}

const md = (run) => {
  const L = [`# ${run.script} · ${run.version}(${run.prompt}) · ${run.calls.length}번 호출 · ${Math.round(run.krw)}원${run.aborted ? ` · 중단: ${run.aborted}` : ""}`, ""];
  for (const m of run.msgs) {
    L.push(`**${m.who === "me" ? "어르신" : "AI"}**${m.stage ? ` _(${m.stage})_` : ""}${m.crisis ? " ⚠ 위기 신호 시험" : ""}`, "", m.text, "");
    if (m.scenes) L.push(...m.scenes.map((s, i) => `> 장면 ${i + 1}. ${s}`), "");
    if (m.doc) L.push("```", `${m.doc.title}\n\n${m.doc.body}`, "```", "");
  }
  return L.join("\n");
};

const results = [];
for (const sid of wantScripts) {
  const script = JSON.parse(fs.readFileSync(path.join(here, "scripts", `${sid}.json`), "utf-8"));
  for (const vname of wantVersions) {
    process.stdout.write(`${sid} ${vname} … `);
    try {
      const run = await play(script, vname);
      const { ver, ...save } = run; save.script = { id: script.id, title: script.title, trap: script.trap, think: script.think, draft: script.draft, reviseAns: script.reviseAns, reviseReq: script.reviseReq };
      fs.writeFileSync(path.join(OUT, `${sid}-${vname}.json`), JSON.stringify(save, null, 1));
      fs.writeFileSync(path.join(OUT, `${sid}-${vname}.md`), md(run));
      results.push({ sid, vname, calls: run.calls.length, krw: Math.round(run.krw) });
      console.log(`${run.calls.length}번 · ${Math.round(run.krw)}원`);
    } catch (e) { console.log("실패:", e.message); results.push({ sid, vname, error: e.message }); if (/상한/.test(e.message)) break; }
  }
}
fs.writeFileSync(path.join(OUT, "_summary.json"), JSON.stringify({ dry: DRY, totalKrw: Math.round(totalKrw), results }, null, 1));
console.log(`\n합계 ${Math.round(totalKrw)}원 · 기록: ${OUT}`);
