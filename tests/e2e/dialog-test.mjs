// 팝업이 떠 있을 때 뒤 화면 원고 보존: 수정요청서 2차(2026-10-16) F07 · 점검표 T17·T18
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import((p=>/^[A-Za-z]:/.test(p)?'file:///'+p.replace(/\\/g,'/'):p)(R+'/playwright/index.mjs'));
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=process.env.MOA_ROOT||'/home/user/LiveBecomeHistory';
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':'text/html'});res.end(d);} }); }).listen(8774);
const b=await chromium.launch({executablePath:process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const pg=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('dialog',d=>d.accept().catch(()=>{}));
await pg.route(/fonts\.|supabase-js|jsdelivr|unpkg/,r=>r.abort());
const ok=(n,c,info='')=>console.log((c?'PASS ':'FAIL ')+n+(info&&!c?'  ← '+info:''));
const st=(js,a)=>pg.evaluate(js,a);
await pg.goto('http://localhost:8774/studio/?blank=1'); await pg.waitForSelector('#canvas .pg');
// 2쪽 본문에 고유 문장을 쓰고 Esc로 편집만 끝냄(상자는 선택된 채)
await pg.locator('.th').nth(1).click(); await pg.waitForTimeout(80);
const body=await st(()=>state.pages[1].els[1].id); const bb=await pg.locator(`#canvas .el[data-id="${body}"]`).boundingBox();
await pg.mouse.click(bb.x+bb.width/2,bb.y+40); await pg.keyboard.type('팝업 뒤 원고 보존 검사'); await pg.waitForTimeout(100);
await pg.keyboard.press('Escape'); await pg.waitForTimeout(80);
ok('준비: 편집은 끝나고 글상자는 선택된 채', await st(id=>!state.editing && state.sel===id, body));
const snapNow=()=>st(()=>serialize()+'|'+state.sel+'|'+history.length+'|'+future.length);
const keys=['Delete','Backspace','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Control+z','Control+y'];
const dialogs=[
  ['내려받기','#btnExport','#exDlg'],
  ['새 쪽 종류','#addPage','#ptDlg'],
  ['미리보기','#btnPreview','#pv'],
];
for(const [name,btn,dlg] of dialogs){
  await st(id=>{ select(id); },body);
  const before=await snapNow();
  await pg.click(btn); await pg.waitForSelector(`${dlg}:not([hidden])`);
  for(const k of keys) await pg.keyboard.press(k);
  await pg.waitForTimeout(150);
  ok(`T17·T18 ${name} 팝업에서 Delete·Backspace·방향키·Ctrl+Z·Ctrl+Y → 뒤 원고·위치·선택·기록 그대로`, (await snapNow())===before);
  ok(`T18 ${name} 팝업은 열린 채`, await pg.locator(`${dlg}:not([hidden])`).count()===1);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(100);
  ok(`${name}: Esc로 닫힘`, await pg.locator(`${dlg}[hidden]`).count()===1);
}
// 가입 안내 팝업(체험에서 「내 책」 누르면 뜸)도 같은 규칙 + Esc로 닫힘
await st(id=>{ select(id); },body); { const before=await snapNow();
  await pg.click('#back'); await pg.waitForSelector('#joinDlg:not([hidden])');
  for(const k of keys) await pg.keyboard.press(k); await pg.waitForTimeout(150);
  ok('T18 가입 안내 팝업에서도 뒤 원고 그대로', (await snapNow())===before);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(100); ok('가입 안내: Esc로 닫힘', await pg.locator('#joinDlg[hidden]').count()===1); }
// 팝업을 닫은 뒤에는 평소처럼(선택한 상자 Delete → 지워지고 Ctrl+Z로 복구)
await st(id=>{ select(id); document.activeElement.blur(); },body);
await pg.keyboard.press('Delete'); await pg.waitForTimeout(100);
ok('팝업 닫은 뒤 Delete는 평소대로 상자 삭제', await st(id=>!state.pages[1].els.some(e=>e.id===id),body));
await pg.keyboard.press('Control+z'); await pg.waitForTimeout(100);
ok('Ctrl+Z로 복구(문장 그대로)', await st(()=>state.pages[1].els.some(e=>plain(e.html)==='팝업 뒤 원고 보존 검사')));
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
