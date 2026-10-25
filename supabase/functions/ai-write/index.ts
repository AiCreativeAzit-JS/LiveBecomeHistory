// AI와 쓰기(실사용자 시험): 편집기의 AI 옆 창이 부르는 서버 함수. 지침서와 API 키는 여기에만 있다.
// - verify_jwt=true: 로그인한 회원만. 관리자가 켠 회원(profiles.ai_enabled)이고 동의(ai_consents)한 사람만 부른다
// - 하루 상한(대표 결정 3,000원, 한국 시각 기준) — ai_usage 합계로 센다. 넘으면 429 daily_limit
// - 모델: Claude Sonnet 5.5(대표 결정). 지침서는 1시간 캐시. 거절(refusal)이면 서버 쪽 대체 모델로 이어 가게 fallbacks 를 켠다
// - 답은 단계(mode)마다 정해진 JSON 모양으로 받는다(output_config.format). 화면은 그 모양만 믿고 그린다
// - 비밀 값: ANTHROPIC_API_KEY (대표가 Supabase 대시보드 → Edge Functions → Secrets 에 직접 넣는다)
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";
import { SYSTEM_PROMPT, PROMPT_VERSION } from "./prompt.ts";

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

// 단계마다 AI에게 주는 지시(마지막 사람 말 뒤에 붙인다)와 답의 모양
const str = { type: "string" }, strs = { type: "array", items: { type: "string" } };
const obj = (p: Record<string, unknown>) => ({ type: "object", properties: p, required: Object.keys(p), additionalProperties: false });
const MODES: Record<string, { ask: string; schema: unknown; effort: string }> = {
  think: { effort: "low",
    ask: "생각하기 단계입니다. 선생님의 마지막 답을 받아 되비추기 1~2문장과 질문 하나로 답하세요(합쳐 3문장 이내). covered 에는 지금까지 대화로 채워진 관점(장면·사람·사건·마음·의미 가운데)을 모두 넣고, 다섯이 웬만큼 채워졌거나 질문이 8개에 이르렀으면 ready 를 true 로 하고 reply 는 빈 문자열로 두세요.",
    schema: obj({ reply: str, covered: { type: "array", items: { type: "string", enum: PIECES } }, ready: { type: "boolean" } }) },
  summarize: { effort: "medium",
    ask: "생각하기를 마칩니다(12장). 선생님 표현을 살린 가장 선명한 장면을 최대 3개 scenes 에 넣으세요. 초고는 쓰지 않습니다.",
    schema: obj({ scenes: strs }) },
  draft: { effort: "medium",
    ask: "고른 장면을 중심으로 초고를 쓰세요(13~19장). 첫 줄 고정 문장과 마지막 안내 문장은 화면이 넣으니 쓰지 말고, 제목과 본문만 주세요. 본문의 문단은 빈 줄로 나눕니다.",
    schema: obj({ title: str, body: str }) },
  fix: { effort: "medium",
    ask: "선생님이 원고를 고쳐 달라고 하셨습니다. 그 말만큼만 고친 원고 전체와, 무엇을 왜 고쳤는지 한 줄씩을 주세요. 고칠 수 없는 말이면 changed 를 false 로 하고 reply 에 한두 문장으로 답하세요.",
    schema: obj({ changed: { type: "boolean" }, reply: str, title: str, body: str, why: strs }) },
  revise_q: { effort: "medium",
    ask: "퇴고 단계입니다(25~26장, 39장). 지금 원고를 다섯 가지로 진단하고, 고칠 곳만 fixes 에 '번호 이름 — 한 줄' 모양으로 넣으세요. 구체적인 장면이나 실제 대사가 꼭 더 필요하면 question 에 질문 하나를, 아니면 빈 문자열을 넣으세요. 이미 물은 질문 수가 3이면 빈 문자열입니다.",
    schema: obj({ fixes: strs, question: str }) },
  revise: { effort: "medium",
    ask: "퇴고본을 쓰세요(21~28장). 답하신 말은 알맞은 자리에 넣고, '기억 안 나요'인 자리는 비워 둡니다. 제목과 본문, 무엇을 왜 고쳤는지 한 줄씩을 주세요.",
    schema: obj({ title: str, body: str, why: strs }) },
};

const client = new Anthropic();   // ANTHROPIC_API_KEY

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body: { mode?: string; book_id?: string; topic?: string; history?: { who: string; text: string }[]; doc?: string; note?: string } = {};
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
  push("user", `[글감] ${String(body.topic ?? "").slice(0, 80)}`);
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
  return json({ ok: true, out, today: today + usd * FX, limit: DAILY_KRW });
});
