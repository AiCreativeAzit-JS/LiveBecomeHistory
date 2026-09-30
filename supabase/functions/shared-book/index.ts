// 비밀 링크로 책 보기: 링크 열쇠(token)가 맞으면 그 책의 '발행본'과 미디어 임시 주소(1시간)를 돌려준다.
// - 로그인 없이 부르는 함수라 verify_jwt=false. 대신 추측할 수 없는 긴 열쇠(32자 이상)로만 연다.
// - 서비스 키는 이 함수 안에서만 쓰이고 브라우저로 나가지 않는다.
// - 휴지통에 있거나 관리자가 숨긴 책은 열리지 않는다. 작가가 링크를 끊으면(열쇠 삭제) 바로 막힌다.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let token = "";
  try { token = String((await req.json())?.token ?? ""); } catch { /* 빈 요청 */ }
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) return json({ error: "not_found" }, 404);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: share } = await sb.from("book_shares").select("book_id").eq("token", token).maybeSingle();
  if (!share) return json({ error: "not_found" }, 404);
  const { data: book } = await sb.from("books").select("id,deleted_at,admin_hidden").eq("id", share.book_id).maybeSingle();
  if (!book || book.deleted_at || book.admin_hidden) return json({ error: "not_found" }, 404);
  const { data: snap } = await sb.from("book_snapshots").select("title,author_name,pages").eq("book_id", book.id).maybeSingle();
  if (!snap) return json({ error: "not_found" }, 404);

  // 발행본에 쓰인 미디어만 서명한다(이 책의 파일만)
  const ids = new Set<string>();
  for (const p of Array.isArray(snap.pages) ? snap.pages : []) {
    for (const e of Array.isArray(p?.els) ? p.els : []) if (e && typeof e.media_id === "string") ids.add(e.media_id);
  }
  const urls: Record<string, string> = {};
  if (ids.size) {
    const { data: ms } = await sb.from("media").select("id,storage_path").eq("book_id", book.id).in("id", [...ids]);
    const list = (ms ?? []).filter((m) => m.storage_path);
    if (list.length) {
      const { data: signed } = await sb.storage.from("book-media").createSignedUrls(list.map((m) => m.storage_path), 3600);
      (signed ?? []).forEach((s, i) => { if (s?.signedUrl) urls[list[i].id] = s.signedUrl; });
    }
  }
  return json({ title: snap.title, author_name: snap.author_name, pages: snap.pages, urls });
});
