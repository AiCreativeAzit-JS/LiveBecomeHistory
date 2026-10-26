// 비공개 지침서(private/vNN.mjs)를 DB 표 ai_prompts 에 넣는 SQL 로 만든다. 결과 파일도 private/ 에 둔다(.gitignore).
//   node tests/ai-lab/prompt-sql.mjs v45 v4.5-moa1 "메모"   →  private/v45.sql
// 만든 SQL 을 Supabase(SQL 편집기 또는 대표가 시키는 MCP)에서 실행하면 된다. 켜진 줄은 하나뿐이라 먼저 이전 줄을 끈다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const [vn, version, note = ""] = process.argv.slice(2);
if (!vn || !version) { console.error("사용법: node prompt-sql.mjs <vNN> <버전 이름> [메모]"); process.exit(1); }
const V = await import(path.join(here, "private", `${vn}.mjs`));
const asks = Object.fromEntries(Object.entries(V.MODES).map(([k, m]) => [k, { ask: m.ask, effort: m.effort }]));
for (const t of [V.SYSTEM_PROMPT, JSON.stringify(asks)]) if (/\$ai_[pa]\$/.test(t)) throw new Error("지침서 안에 $ai_p$ 같은 글자가 들어 있어요");
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const sql = `update public.ai_prompts set active = false where active;\ninsert into public.ai_prompts (version, system_prompt, asks, active, note) values (\n  ${q(version)},\n  $ai_p$${V.SYSTEM_PROMPT}$ai_p$,\n  $ai_a$${JSON.stringify(asks)}$ai_a$::jsonb,\n  true,\n  ${q(note)}\n);\n`;
const out = path.join(here, "private", `${vn}.sql`); fs.writeFileSync(out, sql);
console.log(`→ ${out} (${sql.length}자)`);
