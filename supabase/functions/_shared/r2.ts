// Cloudflare R2(S3 호환 저장소) 접근 도구: 외부 라이브러리 없이 표준 Web Crypto로 SigV4 서명 주소를 만든다.
// - 열쇠(R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY)는 서버 함수 비밀 값으로만 쓰이고 브라우저로 나가지 않는다.
// - 브라우저에는 '정해진 파일 하나 · 정해진 동작 하나 · 정해진 시간'만 허락하는 서명 주소만 건넨다.
const env = (k: string) => (globalThis as any).Deno?.env.get(k) ?? "";
export const R2 = {
  account: env("R2_ACCOUNT_ID"), key: env("R2_ACCESS_KEY_ID"), secret: env("R2_SECRET_ACCESS_KEY"), bucket: env("R2_BUCKET"),
};
export const r2Ready = () => !!(R2.account && R2.key && R2.secret && R2.bucket);
export const R2_PREFIX = "r2:"; // media.storage_path가 이걸로 시작하면 R2, 아니면 예전 Supabase 저장소

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha256 = async (s: string) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
async function hmac(key: ArrayBuffer | Uint8Array, s: string) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, enc.encode(s));
}
// RFC 3986 방식 인코딩(S3 규칙): 영문·숫자·-._~ 만 그대로 둔다
const uri = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

export interface PresignArgs {
  method: string; host: string; path: string; region: string; accessKey: string; secret: string;
  expires: number; now?: Date; headers?: Record<string, string>; query?: Record<string, string>;
}
// 서명 주소(쿼리 서명, UNSIGNED-PAYLOAD). headers에 넣은 값(예: content-type, content-length)도 서명에 묶여서 바꿀 수 없다.
export async function presign(a: PresignArgs): Promise<string> {
  const now = a.now ?? new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const day = amzDate.slice(0, 8);
  const scope = `${day}/${a.region}/s3/aws4_request`;
  const hdrs: Record<string, string> = { host: a.host };
  for (const [k, v] of Object.entries(a.headers ?? {})) hdrs[k.toLowerCase()] = String(v).trim();
  const names = Object.keys(hdrs).sort();
  const q: Record<string, string> = {
    ...(a.query ?? {}),
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${a.accessKey}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(a.expires),
    "X-Amz-SignedHeaders": names.join(";"),
  };
  const qs = Object.keys(q).sort().map((k) => `${uri(k)}=${uri(q[k])}`).join("&");
  const canonical = [a.method, a.path, qs, names.map((n) => `${n}:${hdrs[n]}\n`).join(""), names.join(";"), "UNSIGNED-PAYLOAD"].join("\n");
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, await sha256(canonical)].join("\n");
  let k = await hmac(enc.encode("AWS4" + a.secret), day);
  for (const part of [a.region, "s3", "aws4_request"]) k = await hmac(k, part);
  const sig = hex(await hmac(k, toSign));
  return `https://${a.host}${a.path}?${qs}&X-Amz-Signature=${sig}`;
}

const keyPath = (key: string) => `/${uri(R2.bucket)}/${key.split("/").map(uri).join("/")}`;
const host = () => `${R2.account}.r2.cloudflarestorage.com`;
export const r2Url = (method: string, key: string, expires: number, headers?: Record<string, string>, extra?: { now?: Date; query?: Record<string, string> }) =>
  presign({ method, host: host(), path: keyPath(key), region: "auto", accessKey: R2.key, secret: R2.secret, expires, headers, now: extra?.now, query: extra?.query });

// 보기용 주소: 서명 시각을 1시간 단위로 맞춰, 같은 시간대에는 같은 주소가 나오게 한다(브라우저가 한 번 받은 파일을 다시 받지 않음).
// 유효 시간은 ttl + 1시간이라 언제 받아도 최소 ttl 동안 열린다. 7일을 넘기면(서명 한도) 맞추지 않고 그대로.
const HOUR = 3600;
export function r2ViewUrl(key: string, ttl: number) {
  if (ttl + HOUR > 604800) return r2Url("GET", key, ttl);
  const now = new Date(Math.floor(Date.now() / (HOUR * 1000)) * HOUR * 1000);
  return r2Url("GET", key, ttl + HOUR, undefined, { now, query: { "response-cache-control": "private, max-age=3600" } });
}

// 파일 정보(크기·종류). 없으면 null
export async function r2Head(key: string): Promise<{ size: number; type: string } | null> {
  const r = await fetch(await r2Url("HEAD", key, 60), { method: "HEAD" });
  if (!r.ok) return null;
  return { size: Number(r.headers.get("content-length") ?? -1), type: r.headers.get("content-type") ?? "" };
}
export async function r2Delete(key: string) {
  const r = await fetch(await r2Url("DELETE", key, 60), { method: "DELETE" });
  return r.ok || r.status === 404;
}
export async function r2Put(key: string, body: Blob, type: string) {
  const r = await fetch(await r2Url("PUT", key, 300, { "content-type": type }), { method: "PUT", body, headers: { "content-type": type } });
  return r.ok;
}
// 접두어(예: "사용자/책/") 아래 파일 이름 전부
export async function r2List(prefix: string): Promise<string[]> {
  const out: string[] = [];
  let token = "";
  for (let guard = 0; guard < 100; guard++) {
    const query: Record<string, string> = { "list-type": "2", prefix, "max-keys": "1000" };
    if (token) query["continuation-token"] = token;
    const url = await presign({ method: "GET", host: host(), path: `/${uri(R2.bucket)}`, region: "auto", accessKey: R2.key, secret: R2.secret, expires: 60, query });
    const r = await fetch(url);
    if (!r.ok) throw new Error("r2 list " + r.status);
    const xml = await r.text();
    for (const m of xml.matchAll(/<Key>([^<]*)<\/Key>/g)) out.push(m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
    const next = xml.match(/<NextContinuationToken>([^<]*)<\/NextContinuationToken>/);
    if (!/<IsTruncated>true<\/IsTruncated>/.test(xml) || !next) break;
    token = next[1];
  }
  return out;
}
export async function r2DeletePrefix(prefix: string) {
  const keys = (await r2List(prefix)).filter((k) => k.startsWith(prefix));
  for (let i = 0; i < keys.length; i += 8) {
    const res = await Promise.all(keys.slice(i, i + 8).map(r2Delete));
    if (res.some((ok) => !ok)) throw new Error("r2 delete");
  }
  return keys.length;
}
