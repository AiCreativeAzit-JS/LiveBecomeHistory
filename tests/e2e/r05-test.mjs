// 체험 원고 보존 범위와 계정 전환: 수정요청서 1차(2026-10-16) R05 · 점검표 T15
// 체험 원고는 저장되지 않는다(서버·브라우저 모두) → 안내가 그 범위와 맞는지, 이어지지 않는 전환(로그인) 전에 간직할 길이 먼저 나오는지
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import(R+'/playwright/index.mjs');
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/home/user/LiveBecomeHistory';
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':'text/html'});res.end(d);} }); }).listen(8785);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
const pg=await ctx.newPage(); const errs=[], dialogs=[]; pg.on('pageerror',e=>errs.push('PAGEERR '+e.message));
pg.on('dialog',d=>{ dialogs.push(d.type()); d.accept().catch(()=>{}); });
await pg.route(/fonts\.|supabase-js|jsdelivr|unpkg/,r=>r.abort());
const ok=(n,c,info='')=>console.log((c?'PASS ':'FAIL ')+n+(info&&!c?'  ← '+info:''));
const st=(f,a)=>pg.evaluate(f,a);
await pg.goto('http://localhost:8785/studio/?blank=1'); await pg.waitForSelector('#canvas .pg');
const typeBody=async t=>{ await pg.locator('.th').nth(1).click(); await pg.waitForTimeout(80); const id=await st(()=>flowEl(1).id); const bb=await pg.locator(`#canvas .el[data-id="${id}"]`).boundingBox(); await pg.mouse.click(bb.x+bb.width/2,bb.y+40); await pg.keyboard.type(t); await pg.keyboard.press('Escape'); await pg.waitForTimeout(100); };
const keepShown=async()=>{ await pg.click('#demoChip'); await pg.waitForSelector('#joinDlg:not([hidden])'); const v=await pg.locator('#joinKeep').isVisible(); return v; };

ok('T15 체험 중 상태가 「저장 안 됨」으로 보임', /저장 안 됨|체험 중/.test(await pg.locator('#save').innerText()+await pg.locator('#demoChip').innerText()));
ok('T15 안 고쳤으면 가입 안내에 경고 없음', !(await keepShown())); await pg.keyboard.press('Escape');
ok('T15 가입 안내가 보존 범위를 밝힘(서버에 안 올라감 · 내려받기로 간직)', /서버에 올라가지 않아요/.test(await pg.locator('#joinDlg').innerText()) && /내려받기/.test(await pg.locator('#joinDlg').innerText()));
await typeBody('체험 원고 보존 검사');
ok('T15 고친 뒤 「내 책」·「로그인」 쪽으로 가려 하면 → 이어지지 않는다는 경고 + 「먼저 내 컴퓨터에 내려받기」', await keepShown() && /이어지지 않아요/.test(await pg.locator('#joinKeep').innerText()));
{ const [d]=await Promise.all([pg.waitForEvent('download'),pg.click('#joinSave')]); const fp='/tmp/r05-demo.html'; await d.saveAs(fp);
  ok('T15 「먼저 내 컴퓨터에 내려받기」 → 고친 원고가 담긴 화면용 전자책', fs.readFileSync(fp,'utf8').includes('체험 원고 보존 검사') && await pg.locator('#joinDlg').isHidden()); }
ok('T15 내려받은 뒤 그대로면 다시 경고하지 않음', !(await keepShown())); await pg.keyboard.press('Escape');
// 떠날 때 확인: 내려받은 뒤 그대로면 묻지 않고, 더 고치면 묻는다
dialogs.length=0; await pg.reload(); await pg.waitForSelector('#canvas .pg');
ok('T15 내려받은 뒤 그대로 새로고침하면 묻지 않음 · 체험 원고는 이어지지 않음(안내대로)', !dialogs.includes('beforeunload') && !(await st(()=>serialize().includes('체험 원고 보존 검사'))), JSON.stringify(dialogs));
await typeBody('두 번째 원고'); dialogs.length=0; await pg.reload(); await pg.waitForSelector('#canvas .pg');
ok('T15 고친 뒤 새로고침·창 닫기 전에는 브라우저가 한 번 물음', dialogs.includes('beforeunload'), JSON.stringify(dialogs));
ok('T15 브라우저 저장소에도 체험 원고를 남기지 않음(가입 안내 「서버에 올라가지 않아요」·보존 안 함과 일치)', await st(()=>{ const all=Object.keys(localStorage).map(k=>localStorage.getItem(k)).join('')+Object.keys(sessionStorage).map(k=>sessionStorage.getItem(k)).join(''); return !all.includes('두 번째 원고') && !all.includes('체험 원고 보존 검사'); }));
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
