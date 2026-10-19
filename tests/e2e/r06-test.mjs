// 편집 중 창 크기 변경·확대/축소: 수정요청서 1차(2026-10-16) R06 · 점검표 T16
// 기준: 글자 유실 없음 · 편집이 이어지거나(커서·고른 범위 그대로) 바로 다시 들어갈 수 있음 · 한글 조립 중엔 다시 그리지 않음
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import(R+'/playwright/index.mjs');
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/home/user/LiveBecomeHistory';
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':'text/html'});res.end(d);} }); }).listen(8786);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const pg=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('dialog',d=>d.accept().catch(()=>{}));
await pg.route(/fonts\.|supabase-js|jsdelivr|unpkg/,r=>r.abort());
const ok=(n,c,info='')=>console.log((c?'PASS ':'FAIL ')+n+(info&&!c?'  ← '+info:''));
const st=(f,a)=>pg.evaluate(f,a);
await pg.goto('http://localhost:8786/studio/?blank=1'); await pg.waitForSelector('#canvas .pg');
await pg.locator('.th').nth(1).click(); await pg.waitForTimeout(80);
const id=await st(()=>flowEl(1).id); { const bb=await pg.locator(`#canvas .el[data-id="${id}"]`).boundingBox(); await pg.mouse.click(bb.x+bb.width/2,bb.y+40); }
await pg.keyboard.type('가나다라마바사'); await pg.keyboard.press('ArrowLeft'); await pg.keyboard.press('ArrowLeft'); // 커서: 「마」와 「바」 사이
// 지금 편집 상태: 편집 중 · 실제로 입력 가능(포커스·contenteditable) · 커서 위치 · 고른 글자
const now=()=>st(id=>{ const tx=activeTx(), s=getSelection(); const at=(n,o)=>{ const q=document.createRange(); q.setStart(tx,0); q.setEnd(n,o); return q.toString().length; };
  return {editing:state.editing, live:!!tx&&tx.isContentEditable&&document.activeElement===tx, off:tx&&s.rangeCount&&tx.contains(s.anchorNode)?at(s.anchorNode,s.anchorOffset):null, picked:s.toString(), text:plain(state.pages[1].els.find(e=>e.id===id).html), zoom:state.zoom}; },id);
const typed=async(t,want,label)=>{ await pg.keyboard.type(t); await pg.waitForTimeout(60); const n=await now(); ok(label, n.text===want, n.text); };

let s0=await now(); ok('준비: 편집 중 · 커서는 5번째 글자 뒤', s0.live && s0.off===5, JSON.stringify(s0));
// ── 창 폭 바꾸기 ──
await pg.setViewportSize({width:1000,height:800}); await pg.waitForTimeout(450);
let s1=await now();
ok('T16 창 폭을 줄이면 → 글 그대로 · 편집 이어짐 · 커서 제자리', s1.zoom!==s0.zoom && s1.editing && s1.live && s1.off===5 && s1.text==='가나다라마바사', JSON.stringify(s1));
await typed('X','가나다라마X바사','T16 크기 바꾼 뒤 바로 치면 그 자리에 들어감');
// ── 최대화·복원 ──
await pg.setViewportSize({width:1920,height:1080}); await pg.waitForTimeout(450); await pg.setViewportSize({width:1440,height:1000}); await pg.waitForTimeout(450);
let s2=await now(); ok('T16 최대화 → 복원 뒤에도 편집 이어짐 · 커서 제자리', s2.live && s2.off===6, JSON.stringify(s2));
// ── 확대·축소 단추 ──
await pg.click('#zIn'); await pg.waitForTimeout(150); let s3=await now();
ok('T16 확대 단추 → 편집 이어짐 · 커서 제자리', s3.zoom>s2.zoom && s3.live && s3.off===6, JSON.stringify(s3));
await typed('Y','가나다라마XY바사','T16 확대 뒤 바로 치면 그 자리에');
await pg.click('#zOut'); await pg.waitForTimeout(150); await typed('Z','가나다라마XYZ바사','T16 축소 뒤 바로 치면 그 자리에');
// ── 고른 범위 그대로 ──
await pg.keyboard.down('Shift'); await pg.keyboard.press('ArrowLeft'); await pg.keyboard.press('ArrowLeft'); await pg.keyboard.up('Shift');
await pg.setViewportSize({width:1100,height:900}); await pg.waitForTimeout(450);
ok('T16 글자를 고른 채로 창 크기를 바꿔도 고른 범위 그대로', (await now()).picked==='YZ', (await now()).picked);
// ── 한글 조립 중 ──
await pg.keyboard.press('ArrowRight');
const mark=await st(id=>{ elNode(id).__mark=1; const tx=activeTx(); tx.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:''})); return state.zoom; },id);
await pg.setViewportSize({width:1300,height:950}); await pg.waitForTimeout(450);
ok('T16 한글 조립 중에는 창 크기가 바뀌어도 다시 그리지 않음(조립 글자 보호)', await st(id=>elNode(id).__mark===1,id));
await st(()=>{ activeTx().dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'한'})); }); await pg.waitForTimeout(200);
let s4=await now(); ok('T16 조립이 끝나면 새 크기로 다시 그리고 편집 이어짐', s4.zoom!==mark && s4.live && await st(id=>!elNode(id).__mark,id), JSON.stringify(s4));
// ── 편집 중이 아닐 때 ──
await pg.keyboard.press('Escape'); await pg.waitForTimeout(80);
await pg.setViewportSize({width:1200,height:900}); await pg.waitForTimeout(450);
ok('T16 편집을 끝낸 상태면 크기를 바꿔도 편집으로 들어가지 않고 선택만 유지', await st(id=>!state.editing && state.sel===id && elNode(id).classList.contains('sel'),id));
{ const bb=await pg.locator(`#canvas .el[data-id="${id}"]`).boundingBox(); await pg.mouse.click(bb.x+bb.width/2,bb.y+40); await pg.keyboard.press('Control+End'); await pg.keyboard.type('끝'); }
ok('T16 그 뒤 다시 눌러 바로 편집(글자 유실 없음)', (await now()).text==='가나다라마XYZ바사끝', (await now()).text);
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
