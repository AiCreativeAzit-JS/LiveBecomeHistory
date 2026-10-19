// 미디어 기록(media)의 파일 임시 주소 만들기: R2 파일과 예전 Supabase 저장소 파일을 함께 다룬다.
// 경로는 반드시 그 기록 주인의 폴더({owner_id}/...) 안이어야 한다(남의 파일을 가리키는 위조 기록 차단).
import { R2_PREFIX, r2ViewUrl } from "./r2.ts";

export const BUCKET = "book-media";
// 사진의 인쇄용 원본(두 벌 보관): 화면용 키 "uid/book/uuid.jpg" ↔ 인쇄용 "uid/book/uuid@print.jpg"(같은 폴더)
export const printKey = (key: string) => key.replace(/(\.[a-z0-9]{1,8})$/i, "@print$1");
export type MediaRow = { id: string; owner_id: string; storage_path: string | null };

export function pathOk(m: MediaRow) {
  const p = m.storage_path ?? "";
  const key = p.startsWith(R2_PREFIX) ? p.slice(R2_PREFIX.length) : p;
  return !!m.owner_id && key.startsWith(m.owner_id + "/") && !key.includes("..");
}

// admin: 서비스 키 클라이언트(Supabase 저장소 서명용). 결과: { 미디어 id: 임시 주소 }
export async function signRows(admin: any, rows: MediaRow[], ttl: number) {
  const urls: Record<string, string> = {};
  const ok = rows.filter((m) => m.storage_path && pathOk(m));
  const r2 = ok.filter((m) => m.storage_path!.startsWith(R2_PREFIX));
  const old = ok.filter((m) => !m.storage_path!.startsWith(R2_PREFIX));
  await Promise.all(r2.map(async (m) => { urls[m.id] = await r2ViewUrl(m.storage_path!.slice(R2_PREFIX.length), ttl); }));
  if (old.length) {
    const { data } = await admin.storage.from(BUCKET).createSignedUrls(old.map((m) => m.storage_path), ttl);
    (data ?? []).forEach((s: any, i: number) => { if (s?.signedUrl) urls[old[i].id] = s.signedUrl; });
  }
  return urls;
}
