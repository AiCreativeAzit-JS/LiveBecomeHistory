// 비밀 링크 함수: 열쇠 맞히기 시도 제한(같은 주소에서 1분에 못 찾은 요청 30번 → 429)과 no-store. node --experimental-strip-types shared-book-limit.mjs <shared-book/index.ts 경로>
const env = { SUPABASE_URL: "u", SUPABASE_SERVICE_ROLE_KEY: "S" }; let h; globalThis.Deno = { env: { get: (k) => env[k] }, serve: (x) => { h = x; } };
await import((p => /^[A-Za-z]:/.test(p) ? "file:///" + p.replace(/\\/g, "/") : p)(process.argv[2]));
const go = (ip) => h(new Request("https://f", { method: "POST", headers: { "x-forwarded-for": ip }, body: JSON.stringify({ token: "short" }) }));
let bad = 0; const ok = (n, c) => { if (!c) bad++; console.log((c ? "PASS " : "FAIL ") + n); };
let r; for (let i = 0; i < 30; i++) r = await go("1.1.1.1");
ok("못 찾은 요청 30번까지는 404", r.status === 404 && r.headers.get("Cache-Control") === "no-store");
r = await go("1.1.1.1"); ok("31번째부터 429(rate_limit)", r.status === 429 && (await r.json()).error === "rate_limit");
r = await go("2.2.2.2"); ok("다른 주소는 영향 없음", r.status === 404);
console.log(bad ? `${bad} FAIL` : "ALL PASS"); process.exit(bad ? 1 : 0);
