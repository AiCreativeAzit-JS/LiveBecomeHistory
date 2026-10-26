// AI와 쓰기(실사용자 시험): 편집기의 AI 옆 창이 부르는 서버 함수. 지침서와 API 키는 여기에만 있다.
// - verify_jwt=true: 로그인한 회원만. 관리자가 켠 회원(profiles.ai_enabled)이고 동의(ai_consents)한 사람만 부른다
// - 하루 상한(대표 결정 3,000원, 한국 시각 기준) — ai_usage 합계로 센다. 넘으면 429 daily_limit
// - 모델: Claude Sonnet 5.5(대표 결정). 지침서는 1시간 캐시. 거절(refusal)이면 서버 쪽 대체 모델로 이어 가게 fallbacks 를 켠다
// - 답은 단계(mode)마다 정해진 JSON 모양으로 받는다(output_config.format). 화면은 그 모양만 믿고 그린다
// - 비밀 값: ANTHROPIC_API_KEY (대표가 Supabase 대시보드 → Edge Functions → Secrets 에 직접 넣는다)
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";
import { SYSTEM_PROMPT, PROMPT_VERSION, ASKS } from "./prompt.ts";
import { checkEdit, splitDoc } from "./check.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const MODEL = "claude-sonnet-5-5";
const DAILY_KRW = 3000, FX = 1500;
// 백만 토큰당 달러(Sonnet 5.5): 입력 2 · 출력 10 · 캐시 읽기 0.2 · 1시간 캐시 쓰기 4
const PRICE = { in: 2, out: 10, read: 0.2, write: 4 };
const PIECES = ["장면", "사람", "사건", "마음", "의미"];

// 단계마다 AI에게 주는 지시(prompt.ts 의 ASKS)와 답의 모양. 모든 단계가 같은 모양으로 답한다(지침서 저장을 한 번만 하려고 — v4 시험). 쓰지 않는 칸은 빈 값이고, 화면은 단계마다 필요한 칸만 읽는다
const str = { type: "string" }, strs = { type: "array", items: { type: "string" } };
const obj = (p: Record<string, unknown>) => ({ type: "object", properties: p, required: Object.keys(p), additionalProperties: false });
const UNIFIED = obj({ reply: str, covered: { type: "array", items: { type: "string", enum: PIECES } }, ready: { type: "boolean" }, scenes: strs,
  title: str, body: str, why: strs, changed: { type: "boolean" }, fixes: strs, question: str, proposal: str });
const MODES: Record<string, { ask: string; schema: unknown; effort: string }> = Object.fromEntries(
  Object.entries(ASKS).map(([k, v]) => [k, { ask: v.ask, effort: v.effort, schema: UNIFIED }]));

const client = new Anthropic();   // ANTHROPIC_API_KEY

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body: { mode?: string; book_id?: string; topic?: string; focus?: string; tone?: string; history?: { who: string; text: string }[]; doc?: string; note?: string } = {};
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const M = MODES[body.mode ?? ""]; if (!M) return json({ error: "bad_mode" }, 400);
  const history = Array.isArray(body.history) ? body.history.slice(-80) : [];
  if (JSON.stringify(history).length > 60000 || String(body.doc ?? "").length > 20000) return json({ error: "too_long" }, 413);

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: who } = await admin.auth.getUser(jwt);
  const uid = who?.user?.id; if (!uid) return json({ error: "unauthorized" }, 401);
  const [{ data: prof }, { data: con }] = await Promise.all([
    admin.from("profiles").select("ai_enabled").eq("id", uid).maybeSingle(),
    admin.from("ai_consents").select("user_id").eq("user_id", uid).maybeSingle()]);
  if (!prof?.ai_enabled) return json({ error: "not_enabled" }, 403);
  if (!con) return json({ error: "no_consent" }, 403);

  // 하루 상한: 한국 시각 오늘 0시부터
  const kst = new Date(Date.now() + 9 * 3600e3); kst.setUTCHours(0, 0, 0, 0);
  const since = new Date(kst.getTime() - 9 * 3600e3).toISOString();
  const { data: used } = await admin.from("ai_usage").select("cost_krw").eq("user_id", uid).gte("created_at", since);
  const today = (used ?? []).reduce((a, r) => a + Number(r.cost_krw), 0);
  if (today >= DAILY_KRW) return json({ error: "daily_limit", today }, 429);

  // 대화 → 메시지(사람/AI 번갈아). 첫 줄에 글감, 마지막 사람 말 뒤에 이번 단계 지시와 지금 원고
  const msgs: { role: "user" | "assistant"; content: string }[] = [];
  const push = (role: "user" | "assistant", t: string) => { const last = msgs[msgs.length - 1];
    if (last && last.role === role) last.content += "\n\n" + t; else msgs.push({ role, content: t }); };
  push("user", `[글감] ${String(body.topic ?? "").slice(0, 80)}${body.focus ? `\n[취재 초점] ${String(body.focus).slice(0, 200)}` : ""}${body.tone ? `\n[마무리 결] ${String(body.tone).slice(0, 80)}` : ""}`);
  for (const h of history) push(h.who === "ai" ? "assistant" : "user", String(h.text ?? "").slice(0, 6000));
  push("user", `[모아 화면 지시] ${M.ask}${body.doc ? `\n\n[지금 원고]\n${body.doc}` : ""}${body.note ? `\n\n${body.note}` : ""}`);

  let res;
  try {
    res = await client.beta.messages.create({
      model: MODEL, max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral", ttl: "1h" } }],
      output_config: { effort: M.effort, format: { type: "json_schema", schema: M.schema } },
      messages: msgs,
    } as never) as unknown as Anthropic.Message;
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    return json({ error: status === 429 ? "busy" : "ai_failed" }, status === 429 ? 503 : 502);   // 화면은 「쓰신 답은 그대로 있어요 · 다시 보내기」
  }
  const u = res.usage as { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
  const usd = (u.input_tokens * PRICE.in + u.output_tokens * PRICE.out + (u.cache_read_input_tokens ?? 0) * PRICE.read + (u.cache_creation_input_tokens ?? 0) * PRICE.write) / 1e6;
  await admin.from("ai_usage").insert({ user_id: uid, book_id: body.book_id ?? null, mode: body.mode, model: `${res.model}/${PROMPT_VERSION}`,
    input_tokens: u.input_tokens, output_tokens: u.output_tokens, cache_read_tokens: u.cache_read_input_tokens ?? 0, cache_write_tokens: u.cache_creation_input_tokens ?? 0,
    cost_krw: Math.round(usd * FX * 100) / 100 });
  if (res.stop_reason === "refusal") return json({ error: "refusal" }, 422);
  const text = res.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
  let out: unknown; try { out = JSON.parse(text); } catch { return json({ error: "bad_output" }, 502); }
  // 모델이 본문 첫 줄에 제목을 또 쓰면 걷어 낸다(파일럿 s4). 지침에서는 말하지 않고 여기서 처리한다
  const o = out as { title?: string; body?: string };
  if (o && typeof o.body === "string" && typeof o.title === "string") {
    const lines = o.body.split("\n");
    if (lines[0].trim() === o.title.trim()) o.body = lines.slice(1).join("\n").replace(/^\s*\n/, "");
  }
  // 고치기·퇴고 답은 AI가 쓴 「한 일 목록」을 믿지 않고 고치기 전 원고와 직접 비교한다(check.ts). 결과는 out.check 로 화면에 실어 보낸다
  if (o && (body.mode === "fix" || body.mode === "revise") && body.doc && typeof o.body === "string" && o.body.trim() && (body.mode === "revise" || (out as { changed?: boolean }).changed)) {
    const lastMe = [...history].reverse().find((h) => h.who !== "ai")?.text ?? "";
    const chk = checkEdit(String(body.doc), `${o.title ?? ""}\n\n${o.body}`, String(lastMe));
    if (chk.blocked === "shrunk") {   // 글이 지나치게 줄었으면 반영하지 않는다
      const prev = splitDoc(String(body.doc));
      if (body.mode === "fix") Object.assign(out as object, { changed: false, reply: "원고가 너무 많이 줄어들어서 바꾸지 않았어요. 어디를 어떻게 줄일지 한 번 더 말씀해 주세요.", why: [] });
      else Object.assign(out as object, { title: prev.title, body: prev.body, why: ["새로 쓴 글이 너무 짧아져서 초고를 그대로 두었어요. 고치고 싶은 곳을 말씀해 주세요."] });
    }
    (out as { check?: unknown }).check = chk;
  }
  return json({ ok: true, out, today: today + usd * FX, limit: DAILY_KRW });
});
