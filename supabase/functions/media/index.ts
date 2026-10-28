// 사진·영상·노래 파일 창구: 권한을 확인한 뒤 Cloudflare R2(또는 예전 Supabase 저장소)의 임시 주소를 준다.
// - verify_jwt=false: 로그인하지 않은 서가 독자도 '공개된 책'의 파일 주소는 받아야 해서. 로그인 여부는 함수 안에서 확인한다.
// - 누가 어떤 파일을 볼 수 있는지는 DB 규칙(RLS)이 정한다: 부른 사람의 권한으로 media 기록을 읽어서, 읽히는 것만 서명한다.
// - 동작(action)
//   sign    { ids, ttl, variant? }             → { urls }        볼 수 있는 파일의 임시 주소(공개 책 1시간, 내 책 최대 7일)
//           variant:'print' → 내 책 사진은 인쇄용 원본 주소(없으면 화면용). 남의 책에는 주지 않는다(원본 보호)
//   upload  { book_id, kind, type, size, ext, print? } → { backend, key, url?, print_key?, print_url? }  올릴 자리(내 책만).
//           R2면 PUT 서명 주소(10분, 크기·종류 고정). 사진은 print:{size}를 주면 인쇄용 원본 자리도 함께(두 벌 보관)
//   commit  { book_id, kind, key, backend, ttl, print_key? } → { media, url } 올린 파일(두 벌이면 둘 다)을 확인하고 기록을 만든다.
//           size_bytes = 두 벌 합계(용량 한도·관리자 저장 공간 계산이 두 벌을 함께 센다)
//           기록은 서비스 키로 만든다(회원은 media 표에 직접 쓸 수 없다, 마이그레이션 0011): 크기·경로·소유자는 서버가 확인한 값만.
//           upload·commit 은 승인된 회원만(am_i_approved, 가입 승인제 0009) → 아니면 { error:'not_approved' }
//   purge   { book_id }                        → { files }       책을 완전히 지우기 전에 그 책의 파일을 모두 지운다(내 책만)
//   migrate { limit }                          → { moved, remaining }  관리자: 예전 저장소 파일을 R2로 옮긴다
//   audit   { scope? }                         → { r2_files, r2_bytes, rows, row_bytes, orphan_files, orphan_bytes, missing_files }
//           실제 R2 파일과 media 기록 대조(읽기만). 관리자는 전체, 회원은 자기 폴더만(레드팀 RT-601·D39)
import { createClient } from "npm:@supabase/supabase-js@2";
import { R2_PREFIX, r2Ready, r2Url, r2Head, r2Delete, r2Put, r2DeletePrefix, r2ListSized } from "../_shared/r2.ts";
import { BUCKET, printKey, signRows } from "../_shared/sign.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400", // 브라우저가 사전 확인(OPTIONS)을 매번 하지 않게
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } }); // 서명 주소는 어디에도 저장되지 않게
const LIMIT: Record<string, number> = { image: 15 * 1048576, video: 50 * 1048576, audio: 30 * 1048576 };
// 올릴 수 있는 파일 형식(종류별). 목록에 없는 형식은 올릴 자리를 주지 않는다
const ALLOWED: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/svg+xml"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  audio: ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/m4a", "audio/aac", "audio/wav", "audio/x-wav", "audio/ogg", "audio/webm", "audio/flac"],
};
const typeOk = (kind: string, t: unknown) => typeof t === "string" && !!ALLOWED[kind]?.includes(t.toLowerCase().split(";")[0].trim());
// 올릴 자리 발급 속도 제한: 한 회원이 10분에 60번까지(이 서버 안에서만 세는 보조 장치). 올리다 만 파일은 cleanup 이 정리한다
const SIGN_MAX = 60, SIGN_WINDOW = 600_000;
const signLog = new Map<string, number[]>();
const signTooFast = (uid: string) => {
  const now = Date.now(), recent = (signLog.get(uid) ?? []).filter((t) => now - t < SIGN_WINDOW);
  if (recent.length >= SIGN_MAX) { signLog.set(uid, recent); return true; }
  recent.push(now); signLog.set(uid, recent); return false;
};
const BOOK_QUOTA = 200 * 1048576;
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const isUuid = (s: unknown) => typeof s === "string" && new RegExp(`^${UUID}$`, "i").test(s);
const clampTtl = (t: unknown, max: number) => Math.max(60, Math.min(max, Math.floor(Number(t) || 3600)));

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body: any = {};
  try { body = await req.json(); } catch { /* 빈 요청 */ }

  const URL_ = Deno.env.get("SUPABASE_URL")!;
  const apikey = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY")!;
  const auth = req.headers.get("Authorization") ?? "";
  // 부른 사람의 권한 그대로(RLS 적용)
  const user = createClient(URL_, apikey, { auth: { persistSession: false }, global: { headers: auth ? { Authorization: auth } : {} } });
  // 서비스 키(서명·파일 정리용. 권한 판단에는 쓰지 않는다)
  const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const jwt = auth.replace(/^Bearer\s+/i, "");
  const me = async () => {
    if (!jwt || jwt.startsWith("sb_")) return null; // 공개용 키(로그인 안 함)
    const { data } = await admin.auth.getUser(jwt);
    return data?.user?.id ?? null;
  };
  // 승인된 회원인가(부른 사람 권한으로 DB 함수에 묻는다). 함수가 없거나 오류면 닫힌 쪽(거절)으로
  const approved = async () => {
    const { data } = await user.rpc("am_i_approved");
    return data === true;
  };
  const myBook = async (uid: string, bookId: unknown) => {
    if (!isUuid(bookId)) return false;
    const { data } = await user.from("books").select("id").eq("id", bookId).eq("owner_id", uid).maybeSingle();
    return !!data;
  };

  try {
    switch (body.action) {
      case "sign": {
        const ids = (Array.isArray(body.ids) ? body.ids : []).filter(isUuid).slice(0, 500);
        if (!ids.length) return json({ urls: {} });
        // 볼 수 있는 기록인지는 부른 사람 권한(RLS)으로 고른다(id 만 읽음). 비로그인은 id·book_id·kind 열만 읽을 수 있으므로(마이그레이션 0015)
        // 저장 경로·주인은 그렇게 고른 행만 서비스 키로 읽는다(레드팀 RT-602·D40)
        const { data: vis, error } = await user.from("media").select("id").in("id", ids);
        if (error) return json({ error: "read_failed" });
        const visIds = (vis ?? []).map((m) => m.id);
        if (!visIds.length) return json({ urls: {} });
        const { data: rows, error: rowErr } = await admin.from("media").select("id,owner_id,storage_path,kind").in("id", visIds);
        if (rowErr) return json({ error: "read_failed" });
        const uid = await me();
        let mine = (rows ?? []).filter((m) => uid && m.owner_id === uid);
        if (body.variant === "print" && r2Ready()) { // 내 사진만 인쇄용 원본으로 바꿔 서명(예전 사진처럼 없으면 화면용 그대로)
          mine = await Promise.all(mine.map(async (m) => {
            if (m.kind !== "image" || !m.storage_path?.startsWith(R2_PREFIX)) return m;
            const pk = printKey(m.storage_path.slice(R2_PREFIX.length));
            return (await r2Head(pk)) ? { ...m, storage_path: R2_PREFIX + pk } : m;
          }));
        }
        const others = (rows ?? []).filter((m) => !(uid && m.owner_id === uid));
        const urls = {
          ...(await signRows(admin, others, clampTtl(body.ttl, 3600))), // 남의 책(공개 서가·관리자): 1시간까지
          ...(await signRows(admin, mine, clampTtl(body.ttl, 604800))), // 내 책(편집·내려받기): 7일까지
        };
        return json({ urls });
      }
      case "upload": {
        const uid = await me();
        if (!uid) return json({ error: "unauthorized" });
        const { book_id, kind, type } = body;
        const size = Number(body.size);
        if (!(kind in LIMIT) || typeof type !== "string" || !type.startsWith(kind + "/") || type.length > 100 || !typeOk(kind, type)) return json({ error: "type" });
        if (!(size > 0) || size > LIMIT[kind]) return json({ error: "too_big" });
        const pSize = kind === "image" && body.print ? Number(body.print.size) : 0; // 인쇄용 원본(사진만, 화면용과 같은 종류)
        if (body.print && kind === "image" && (!(pSize > 0) || pSize > LIMIT.image)) return json({ error: "too_big" });
        if (!(await approved())) return json({ error: "not_approved" });
        if (!(await myBook(uid, book_id))) return json({ error: "forbidden" });
        if (signTooFast(uid)) return json({ error: "rate_limit" }); // 다른 오류처럼 200 으로(화면이 error 글자를 읽어 안내한다)
        const { data: used } = await user.from("media").select("size_bytes").eq("book_id", book_id);
        if ((used ?? []).reduce((n, m) => n + Number(m.size_bytes || 0), 0) + size + pSize > BOOK_QUOTA) return json({ error: "quota" });
        const ext = String(body.ext ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
        const key = `${uid}/${book_id}/${crypto.randomUUID()}.${ext}`;
        if (!r2Ready()) return json({ backend: "supabase", key }); // 예전 저장소는 한 벌만
        const url = await r2Url("PUT", key, 600, { "content-type": type, "content-length": String(size) });
        const out: any = { backend: "r2", key, url, headers: { "Content-Type": type } };
        if (pSize) { out.print_key = printKey(key); out.print_url = await r2Url("PUT", out.print_key, 600, { "content-type": type, "content-length": String(pSize) }); }
        return json(out);
      }
      case "commit": {
        const uid = await me();
        if (!uid) return json({ error: "unauthorized" });
        const { book_id, kind, key, backend } = body;
        if (!(kind in LIMIT)) return json({ error: "forbidden" });
        if (!(await approved())) return json({ error: "not_approved" });
        if (!(await myBook(uid, book_id))) return json({ error: "forbidden" });
        if (typeof key !== "string" || !new RegExp(`^${uid}/${book_id}/${UUID}\\.[a-z0-9]{1,8}$`, "i").test(key)) return json({ error: "forbidden" });
        let info: { size: number; type: string } | null = null, pinfo: { size: number; type: string } | null = null;
        const r2 = backend === "r2";
        const pk = r2 && kind === "image" && body.print_key ? printKey(key) : null;
        if (pk && body.print_key !== pk) return json({ error: "forbidden" });
        if (r2) {
          if (!r2Ready()) return json({ error: "not_configured" });
          [info, pinfo] = await Promise.all([r2Head(key), pk ? r2Head(pk) : null]);
        } else {
          const dir = key.slice(0, key.lastIndexOf("/")), name = key.slice(key.lastIndexOf("/") + 1);
          const { data } = await admin.storage.from(BUCKET).list(dir, { search: name, limit: 5 });
          const f = (data ?? []).find((x: any) => x.name === name);
          if (f) info = { size: Number(f.metadata?.size ?? -1), type: String(f.metadata?.mimetype ?? "") };
        }
        const drop = () => r2 ? Promise.all([r2Delete(key), pk ? r2Delete(pk) : true]) : admin.storage.from(BUCKET).remove([key]);
        if (!info || (pk && !pinfo)) { await drop(); return json({ error: "missing" }); } // 두 벌이면 둘 다 있어야
        const bad = (f: { size: number; type: string }) => !(f.size > 0) || f.size > LIMIT[kind] || !f.type.startsWith(kind + "/") || !typeOk(kind, f.type);
        if (bad(info) || (pinfo && bad(pinfo))) { await drop(); return json({ error: "too_big" }); }
        const path = r2 ? R2_PREFIX + key : key;
        // 기록은 서비스 키로(회원 권한에는 media INSERT 가 없다). 책이 내 것인지는 위에서 부른 사람 권한(RLS)으로 확인했고,
        // 크기는 저장소에 실제 올라간 파일에서 읽은 값만 쓴다. 용량 한도(200MB)는 DB 트리거가 서비스 키에도 그대로 건다(54000)
        const { data: media, error } = await admin.from("media")
          .insert({ book_id, owner_id: uid, kind, storage_path: path, size_bytes: info.size + (pinfo?.size ?? 0) }).select().single();
        if (error) { await drop(); return json({ error: error.code === "54000" ? "quota" : "insert_failed" }); }
        const urls = await signRows(admin, [media], clampTtl(body.ttl, 604800));
        return json({ media, url: urls[media.id] ?? null });
      }
      case "purge": {
        const uid = await me();
        if (!uid) return json({ error: "unauthorized" });
        if (!(await myBook(uid, body.book_id))) return json({ error: "forbidden" });
        const { data: rows } = await admin.from("media").select("storage_path").eq("book_id", body.book_id);
        const prefix = `${uid}/${body.book_id}/`;
        const old = (rows ?? []).map((m) => m.storage_path).filter((p) => p && !p.startsWith(R2_PREFIX) && p.startsWith(prefix));
        for (let i = 0; i < old.length; i += 100) {
          const { error } = await admin.storage.from(BUCKET).remove(old.slice(i, i + 100));
          if (error) return json({ error: "storage_failed" });
        }
        const n = r2Ready() ? await r2DeletePrefix(prefix) : 0;
        return json({ files: old.length + n });
      }
      case "audit": { // 실제 R2 파일과 media 기록 대조(읽기만). 인쇄용 사본(@print)은 화면용 기록이 있으면 기록 있는 것으로 센다
        const uid = await me();
        if (!uid) return json({ error: "unauthorized" });
        if (!r2Ready()) return json({ error: "not_configured" });
        const { data: isAdm } = await user.rpc("am_i_admin");
        const all = isAdm === true && body.scope !== "mine";
        const prefix = all ? "" : uid + "/";
        const objs = await r2ListSized(prefix);
        let q = admin.from("media").select("storage_path,size_bytes,owner_id");
        if (!all) q = q.eq("owner_id", uid);
        const { data: rows, error } = await q;
        if (error) return json({ error: "read_failed" });
        const r2rows = (rows ?? []).filter((m: any) => typeof m.storage_path === "string" && m.storage_path.startsWith(R2_PREFIX + prefix));
        const keys = new Set(r2rows.map((m: any) => m.storage_path.slice(R2_PREFIX.length)));
        const base = (k: string) => k.replace(/@print(\.[a-z0-9]{1,8})$/i, "$1");
        const orphans = objs.filter((o) => !keys.has(base(o.key)));
        const have = new Set(objs.map((o) => o.key));
        return json({
          scope: all ? "all" : "mine",
          r2_files: objs.length, r2_bytes: objs.reduce((n, o) => n + o.size, 0),
          rows: r2rows.length, row_bytes: r2rows.reduce((n: number, m: any) => n + Number(m.size_bytes || 0), 0),
          orphan_files: orphans.length, orphan_bytes: orphans.reduce((n, o) => n + o.size, 0),
          missing_files: [...keys].filter((k) => !have.has(k)).length,
        });
      }
      case "cleanup": { // 관리자: 올리다 만 파일(기록 없는 R2 파일) 정리. 기본은 목록만 보여 주고, apply:true 일 때만 지운다. 최근 1시간 안에 올린 것은 건드리지 않는다
        const uid = await me();
        if (!uid) return json({ error: "unauthorized" });
        const { data: isAdm } = await user.rpc("am_i_admin");
        if (isAdm !== true) return json({ error: "forbidden" });
        if (!r2Ready()) return json({ error: "not_configured" });
        const objs = await r2ListSized("");
        const { data: rows, error } = await admin.from("media").select("storage_path");
        if (error) return json({ error: "read_failed" });
        const keys = new Set((rows ?? []).filter((m: any) => typeof m.storage_path === "string" && m.storage_path.startsWith(R2_PREFIX)).map((m: any) => m.storage_path.slice(R2_PREFIX.length)));
        const base = (k: string) => k.replace(/@print(\.[a-z0-9]{1,8})$/i, "$1");
        const old = Date.now() - 3600_000;
        const stale = objs.filter((o) => !keys.has(base(o.key)) && o.at > 0 && o.at < old);
        if (body.apply === true) for (const o of stale) await r2Delete(o.key);
        return json({ applied: body.apply === true, files: stale.length, bytes: stale.reduce((n, o) => n + o.size, 0) });
      }
      case "migrate": {
        const uid = await me();
        if (!uid) return json({ error: "unauthorized" });
        const { data: isAdm } = await user.rpc("am_i_admin");
        if (!isAdm) return json({ error: "forbidden" });
        if (!r2Ready()) return json({ error: "not_configured" });
        const limit = Math.max(1, Math.min(20, Number(body.limit) || 10));
        const { data: rows } = await admin.from("media").select("id,owner_id,storage_path,kind")
          .not("storage_path", "is", null).not("storage_path", "like", R2_PREFIX + "%").limit(limit);
        let moved = 0;
        const failed: string[] = [];
        for (const m of rows ?? []) {
          const p = m.storage_path as string;
          const { data: blob, error } = await admin.storage.from(BUCKET).download(p);
          const type = blob?.type || ({ image: "image/jpeg", video: "video/mp4", audio: "audio/mpeg" } as any)[m.kind] || "application/octet-stream";
          if (error || !blob || !(await r2Put(p, blob, type))) { failed.push(m.id); continue; }
          const { error: upErr } = await admin.from("media").update({ storage_path: R2_PREFIX + p }).eq("id", m.id);
          if (upErr) { await r2Delete(p); failed.push(m.id); continue; }
          await admin.storage.from(BUCKET).remove([p]);
          moved++;
        }
        const { count } = await admin.from("media").select("id", { count: "exact", head: true })
          .not("storage_path", "is", null).not("storage_path", "like", R2_PREFIX + "%");
        return json({ moved, failed, remaining: count ?? null });
      }
    }
    return json({ error: "action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "server" }, 500);
  }
});
