// 회원 탈퇴: 로그인한 본인의 계정과 모든 데이터를 지운다.
// - verify_jwt=true: 로그인한 사람만 부를 수 있고, 지우는 대상은 "토큰의 주인" 하나뿐이다(다른 사람 번호를 보낼 방법이 없음).
// - 실수 방지: 요청 본문에 { confirm: "탈퇴" } 가 있어야 한다.
// - 순서: ① 저장소 파일(사진·영상·노래) → ② 계정 삭제. 계정을 지우면 DB 규칙(on delete cascade)으로
//   프로필·책·페이지·발행본·비밀 링크·미디어 기록·신고가 함께 지워진다.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const BUCKET = "book-media";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  let body: { confirm?: string } = {};
  try { body = await req.json(); } catch { /* 빈 요청 */ }
  if (body?.confirm !== "탈퇴") return json({ error: "confirm_required" }, 400);

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: who, error: whoErr } = await admin.auth.getUser(jwt);
  if (whoErr || !who?.user) return json({ error: "unauthorized" }, 401);
  const uid = who.user.id;

  // ① 저장소 파일: 기록(media)에 있는 경로 + 내 폴더(uid/책/파일)에 남은 파일까지 모두
  const paths = new Set<string>();
  const { data: ms, error: mErr } = await admin.from("media").select("storage_path").eq("owner_id", uid);
  if (mErr) return json({ error: "list_failed" }, 500);
  (ms ?? []).forEach((m) => m.storage_path && paths.add(m.storage_path));
  const { data: folders } = await admin.storage.from(BUCKET).list(uid, { limit: 1000 });
  for (const f of folders ?? []) {
    let offset = 0;
    for (;;) {
      const { data: files } = await admin.storage.from(BUCKET).list(`${uid}/${f.name}`, { limit: 1000, offset });
      if (!files?.length) break;
      files.forEach((x) => x.id && paths.add(`${uid}/${f.name}/${x.name}`));
      if (files.length < 1000) break;
      offset += 1000;
    }
  }
  const list = [...paths].filter((p) => p.startsWith(uid + "/")); // 내 폴더 밖은 절대 건드리지 않음
  for (let i = 0; i < list.length; i += 100) {
    const { error } = await admin.storage.from(BUCKET).remove(list.slice(i, i + 100));
    if (error) return json({ error: "storage_failed" }, 500);
  }

  // ② 계정 삭제(연결된 DB 기록은 cascade로 함께 삭제)
  const { error: delErr } = await admin.auth.admin.deleteUser(uid);
  if (delErr) return json({ error: "delete_failed" }, 500);
  return json({ ok: true, files: list.length });
});
