// 「n쪽 고르기」(✓ 버튼)는 누른 쪽만: 수정요청서 2차(2026-10-16) F05 · 점검표 T19·T20
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import(R+'/playwright/index.mjs');
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/home/user/LiveBecomeHistory';
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':'text/html'});res.end(d);} }); }).listen(8775);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const pg=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('dialog',d=>d.accept().catch(()=>{}));
await pg.route(/fonts\.|supabase-js|jsdelivr|unpkg/,r=>r.abort());
const ok=(n,c,info='')=>console.log((c?'PASS ':'FAIL ')+n+(info&&!c?'  ← '+info:''));
const st=(js,a)=>pg.evaluate(js,a);
await pg.goto('http://localhost:8775/studio/?blank=1'); await pg.waitForSelector('#canvas .pg');
ok('준비: 5쪽짜리 새 체험 책', await st(()=>state.pages.length===5));
const ids=await st(()=>state.pages.map(p=>p.id));
// 고른 쪽 번호(1부터) · 화면의 ✓ 눌림 표시 · 패널 글
const picked=()=>st(()=>state.pages.map((p,i)=>state.picked.has(p.id)?i+1:0).filter(Boolean).join(','));
const pressed=()=>pg.locator('.th [data-pick]').evaluateAll(bs=>bs.map((x,i)=>x.getAttribute('aria-pressed')==='true'?i+1:0).filter(Boolean).join(','));
const panel=async()=>(await pg.locator('#secPage h3 small').innerText()).trim();
const pick=n=>pg.locator('.th').nth(n-1).locator('[data-pick]').click();
const same=async(name,want,pan)=>{ const p=await picked(), a=await pressed(); ok(name, p===want && a===want && (!pan || await panel()===pan), `고름=${p} 표시=${a} 패널=${await panel()}`); };

await pg.locator('.th').nth(2).click(); await pg.waitForTimeout(80);
ok('3쪽을 엶(여러 쪽 선택 없음)', await st(()=>state.cur===2 && state.picked.size===0));
// T19 현재 쪽 ✓ 1회·2회
await pick(3); await same('T19 「3쪽 고르기」 1회 → 3쪽만 고름', '3', '1쪽 선택');
await pick(3); await same('T19 「3쪽 고르기」 2회 → 해제', '', 'PAGE');
// T20 다른 쪽 ✓ (요청서 재현: 2쪽만 눌렀는데 3쪽까지 골라지던 것)
for(const round of ['처음','「선택 해제」 뒤 다시']){
  await pick(2); await same(`T20 (${round}) 「2쪽 고르기」만 → 2쪽만 고름`, '2', '1쪽 선택');
  ok(`T20 (${round}) 보고 있던 3쪽은 그대로`, await st(()=>state.cur===2));
  await pg.click('#unpick'); await pg.waitForTimeout(50);
}
await pick(2); await pick(2); await same('T20 「2쪽 고르기」 2회 → 해제', '', 'PAGE');
// 일괄 대상 = 표시: 2쪽만 골랐을 때 배경은 2쪽에만(보고 있는 3쪽이 아님)
await pick(2); const bg0=await st(()=>state.pages.map(p=>p.bg));
await pg.click('#bgSw [data-c="#F1F0FA"]'); await pg.waitForTimeout(50);
ok('T20 1쪽만 고르고 배경 → 고른 2쪽에만 적용', await st(bg0=>state.pages.every((p,i)=>i===1 ? p.bg==='#F1F0FA' : p.bg===bg0[i]),bg0));
await pg.keyboard.press('Control+z'); await pg.waitForTimeout(50); await pg.click('#unpick');
// 키보드(Enter·Space)로 ✓ 눌러도 같고, 포커스는 그 버튼에 남음
const focusPick=n=>pg.locator('.th').nth(n-1).locator('[data-pick]').focus();
const focusIs=n=>st(n=>document.activeElement?.getAttribute('aria-label')===`${n}쪽 고르기`,n);
await focusPick(2); await pg.keyboard.press('Enter'); await pg.waitForTimeout(50);
await same('T20 키보드 Enter로 「2쪽 고르기」 → 2쪽만', '2'); ok('T20 Enter 뒤 포커스는 2쪽 ✓ 버튼에 남음', await focusIs(2));
await pg.keyboard.press('Space'); await pg.waitForTimeout(50);
await same('T20 이어서 Space → 해제', ''); ok('T20 Space 뒤에도 포커스 유지', await focusIs(2));
await focusPick(4); await pg.keyboard.press('Space'); await focusPick(2); await pg.keyboard.press('Enter'); await pg.waitForTimeout(50);
await same('T20 키보드로 4쪽·2쪽 고름 → 둘만', '2,4', '2쪽 선택');
// 일괄 삭제 대상 = 표시된 2·4쪽(확인창은 자동 수락)
await pg.click('#delPicked'); await pg.waitForTimeout(80);
ok('T20 「2쪽 삭제」 → 정확히 2·4쪽만 지워짐', await st(w=>state.pages.map(p=>p.id).join()===w,[ids[0],ids[2],ids[4]].join()));
await pg.keyboard.press('Control+z'); await pg.waitForTimeout(80);
ok('Ctrl+Z로 5쪽 복구', await st(w=>state.pages.map(p=>p.id).join()===w,ids.join()));
// Ctrl+클릭은 따로: 처음엔 보고 있던 쪽도 함께(파일 탐색기처럼), 그다음부턴 누른 쪽만
await pg.locator('.th').nth(2).click(); await pg.waitForTimeout(50);
await pg.locator('.th').nth(3).click({modifiers:['Control']}); await same('Ctrl+클릭 4쪽(3쪽 보던 중) → 3·4쪽', '3,4', '2쪽 선택');
await pg.locator('.th').nth(3).click({modifiers:['Control']}); await same('다시 Ctrl+클릭 4쪽 → 4쪽만 빠짐', '3');
await pg.click('#unpick');
await pg.locator('.th').nth(2).click({modifiers:['Control']}); await same('Ctrl+클릭 보던 3쪽 → 3쪽만(바로 풀리지 않음)', '3');
await pg.locator('.th').nth(2).click({modifiers:['Control']}); await same('다시 Ctrl+클릭 3쪽 → 해제', '');
// 그냥 클릭은 선택을 비우고 그 쪽으로
await pick(1); await pick(5); await pg.locator('.th').nth(3).click(); await pg.waitForTimeout(50);
ok('그냥 클릭 → 선택 비우고 4쪽으로', await st(()=>state.picked.size===0 && state.cur===3));
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
