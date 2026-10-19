// 편집 사용성: 수정요청서 2차(2026-10-16) F06 설명 글 겹침 · F11 썸네일 키보드 포커스(+ 팝업 닫을 때 포커스 복원) — 점검표 T21·T22·T27
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import(R+'/playwright/index.mjs');
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/home/user/LiveBecomeHistory';
const types={'.html':'text/html','.js':'application/javascript'};
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':types[path.extname(f)]||'text/plain'});res.end(d);} }); }).listen(8777);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const pg=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('dialog',d=>d.accept().catch(()=>{}));
await pg.route(/fonts\.|supabase-js|jsdelivr|unpkg/,r=>r.abort());
const ok=(n,c,info='')=>console.log((c?'PASS ':'FAIL ')+n+(info&&!c?'  ← '+info:''));
const st=(f,a)=>pg.evaluate(f,a);
await pg.goto('http://localhost:8777/studio/?blank=1'); await pg.waitForSelector('#canvas .pg');
// 한 쪽 안에서 겹치는 상자 쌍(0.5mm² 넘게)과 아래 여백 밖으로 나간 상자
const layout=i=>st(i=>{ const els=state.pages[i].els.filter(e=>e.type!=='slot'), bad=[];
  for(let a=0;a<els.length;a++) for(let c=a+1;c<els.length;c++){ const A=els[a],B=els[c];
    const ox=Math.min(A.x+A.w,B.x+B.w)-Math.max(A.x,B.x), oy=Math.min(A.y+A.h,B.y+B.h)-Math.max(A.y,B.y); if(ox>0&&oy>0&&ox*oy>0.5) bad.push(A.type+'×'+B.type); }
  return {overlap:bad, out:els.filter(e=>e.y+e.h>LIM.y1+0.05).length, n:els.length, texts:els.filter(e=>e.type==='text').length}; },i);
const toastNow=()=>pg.locator('#toast').innerText();
const selImg=i=>st(i=>{ goPage(i); select(state.pages[i].els.find(e=>e.type==='image'||e.type==='video'||e.type==='audio').id); },i);
const capBtn=()=>pg.locator('#addCap').innerText();
const typeEsc=async t=>{ await pg.keyboard.type(t); await pg.waitForTimeout(80); await pg.keyboard.press('Escape'); await pg.waitForTimeout(80); };

/* ── F06 · T21 같은 사진에 「설명 글 넣기」 반복 ── */
const portrait=await st(()=>new Promise(res=>{ const c=document.createElement('canvas'); c.width=600; c.height=900; const g=c.getContext('2d'); g.fillStyle='#7FA99B'; g.fillRect(0,0,600,900);
  c.toBlob(bl=>{ const r=new FileReader(); r.onload=()=>res(r.result.split(',')[1]); r.readAsDataURL(bl); },'image/png'); }));
await st(()=>{ pendingKind='image'; pendingSlot=state.pages[2].els.find(e=>e.type==='slot').id; });
await pg.setInputFiles('#file',{name:'portrait-test.png',mimeType:'image/png',buffer:Buffer.from(portrait,'base64')}); await pg.waitForTimeout(700);
ok('준비: 3쪽 사진 자리에 세로 사진', await st(()=>state.pages[2].els.some(e=>e.type==='image')));
const L0=await layout(2);
await selImg(2); ok('T21 틀에 설명 자리가 있으면 단추가 「설명 글 고치기」', (await capBtn()).includes('고치기'), await capBtn());
await pg.click('#addCap'); await pg.waitForTimeout(100);
ok('T21 1회: 새 상자 없이 틀의 설명 자리를 편집', (await layout(2)).n===L0.n && await st(()=>state.editing && !!selEl().ph));
await typeEsc('첫 번째 설명글 - 원본');
await selImg(2); await pg.click('#addCap'); await pg.waitForTimeout(100);
ok('T21 2회: 같은 설명을 다시 엶(겹치는 새 상자 없음)', (await layout(2)).n===L0.n && await st(()=>state.editing && plain(selEl().html)==='첫 번째 설명글 - 원본'));
await pg.keyboard.press('Escape');
ok('T21 겹친 상자·여백 밖 상자 없음', (await layout(2)).overlap.length===0 && (await layout(2)).out===0, JSON.stringify(await layout(2)));
// 틀의 설명 자리를 지운 뒤: 새 상자는 사진 아래 빈자리에, 다시 누르면 그 상자를 엶
await st(()=>{ const p=state.pages[2]; p.els=p.els.filter(e=>!(e.type==='text'&&e.y>100)); renderAll(); });
const L1=await layout(2);
await selImg(2); ok('T21 설명이 없으면 단추가 「설명 글 넣기」', (await capBtn()).includes('넣기'));
await pg.click('#addCap'); await pg.waitForTimeout(100); await typeEsc('새 설명');
const L2=await layout(2);
ok('T21 새 설명 상자 1개가 사진 아래에(겹침 없음)', L2.n===L1.n+1 && L2.overlap.length===0 && L2.out===0 && await st(()=>{ const p=state.pages[2], im=p.els.find(e=>e.type==='image'), c=p.els.find(e=>e.type==='text'&&plain(e.html)==='새 설명'); return c && c.y>=im.y+im.h; }), JSON.stringify(L2));
await selImg(2); await pg.click('#addCap'); await pg.waitForTimeout(100);
ok('T21 다시 누르면 그 설명을 엶(3번째 상자 없음)', (await layout(2)).n===L2.n && await st(()=>plain(selEl().html)==='새 설명')); await pg.keyboard.press('Escape');
// 책(미리보기·서가·내려받기)으로 그린 3쪽에도 설명은 한 번만
ok('T21 책으로 그린 3쪽: 「새 설명」 한 번만', await st(()=>(pageHTML(state.pages[2],'view').match(/새 설명/g)||[]).length)===1);

/* ── F06 · T22 쪽 아래 공간 부족 · 아래가 막힌 경우 ── */
const mkPage=els=>st(els=>{ snap(); const p={id:uid(),name:'시험',bg:'#FFFFFF',els:els.map(e=>({id:uid(),...e}))}; state.pages.push(p); state.cur=state.pages.length-1; renderAll(); return state.pages.length-1; },els);
const bottomImg=await st(()=>({type:'image',x:MX,y:LIM.y1-90,w:CW,h:88,src:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',name:''}));
{ const i=await mkPage([bottomImg]); const before=await st(i=>JSON.stringify(state.pages[i].els),i);
  await selImg(i); await pg.click('#addCap'); await pg.waitForTimeout(100); await typeEsc('바닥 설명');
  const L=await layout(i);
  ok('T22 쪽 맨 아래 사진: 사진을 조금 줄여 아래에 설명(겹침·잘림 없음)', L.n===2 && L.overlap.length===0 && L.out===0, JSON.stringify(L));
  ok('T22 줄인 사실을 안내', /조금 줄였어요/.test(await toastNow()), await toastNow());
  ok('T22 비율 그대로 줄임', await st(i=>{ const e=state.pages[i].els.find(e=>e.type==='image'); return Math.abs(e.w/e.h - 120/88)<0.01; },i));
  await pg.keyboard.press('Control+z'); await pg.waitForTimeout(100); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(100);
  ok('T22 되돌리기로 사진 크기 복구·설명 없어짐', await st(([i,b])=>JSON.stringify(state.pages[i].els)===b,[i,before])); }
{ const i=await mkPage([await st(()=>({type:'audio',x:MX,y:LIM.y1-34,w:CW,h:34,src:'',name:''}))]); const before=await st(i=>JSON.stringify(state.pages[i].els)+history.length,i);
  await selImg(i); await pg.click('#addCap'); await pg.waitForTimeout(100);
  ok('T22 쪽 맨 아래 노래(줄일 수 없음): 상자를 만들지 않고 방법 안내', await st(([i,b])=>JSON.stringify(state.pages[i].els)+history.length===b,[i,before]) && /빈자리가 없어요/.test(await toastNow()), await toastNow()); }
{ const body=await st(()=>({type:'text',x:MX,y:120,w:CW,h:LIM.y1-120,html:'아래 본문 글. '.repeat(30),fs:12,align:'left',color:'#1B2B25',font:'serif'}));
  const i=await mkPage([{...bottomImg,y:await st(()=>MT),h:100},body]);
  await selImg(i); await pg.click('#addCap'); await pg.waitForTimeout(100); await typeEsc('사이 설명');
  const L=await layout(i);
  ok('T22 바로 아래 본문이 있으면: 사이 빈자리에 설명(본문과 겹치지 않음)', L.n===3 && L.overlap.length===0 && L.out===0, JSON.stringify(L)); }

/* ── F11 · T27 썸네일 Enter·Space 뒤 연속 방향키 ── */
await st(()=>{ goPage(0); });
const th=n=>pg.locator('.th').nth(n);
const focusTh=()=>st(()=>{ const t=document.activeElement.closest&&document.activeElement.closest('.th'); return document.activeElement.classList.contains('th') ? +t.dataset.i : (document.activeElement.tagName); });
await th(1).focus(); await pg.keyboard.press('Enter'); await pg.waitForTimeout(80);
ok('T27 2쪽 썸네일 Enter → 2쪽 열리고 포커스는 2쪽 썸네일에', (await st(()=>state.cur))===1 && (await focusTh())===1, String(await focusTh()));
await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(60); await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(60);
ok('T27 이어서 ↓↓ → 4쪽(포커스도 4쪽)', (await st(()=>state.cur))===3 && (await focusTh())===3, `${await st(()=>state.cur)} / ${await focusTh()}`);
await pg.keyboard.press('ArrowUp'); await pg.waitForTimeout(60); await pg.keyboard.press('Space'); await pg.waitForTimeout(80);
ok('T27 ↑ 뒤 Space → 3쪽 그대로, 포커스 유지', (await st(()=>state.cur))===2 && (await focusTh())===2);
await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(60);
ok('T27 Space 뒤 ↓ → 4쪽', (await st(()=>state.cur))===3 && (await focusTh())===3);
ok('T27 포커스 테두리가 보임(:focus-visible)', await st(()=>document.activeElement.matches(':focus-visible') && getComputedStyle(document.activeElement).outlineStyle!=='none'));
ok('T27 지금 쪽 표시(aria-current)', await st(()=>document.querySelector('.th[aria-current="page"]')?.dataset.i==='3'));
{ const n=await st(()=>state.pages.length); await pg.keyboard.press('Delete'); await pg.waitForTimeout(120);
  ok('Delete로 쪽을 지운 뒤에도 포커스가 썸네일에 남음', (await st(()=>state.pages.length))===n-1 && typeof (await focusTh())==='number', String(await focusTh()));
  await pg.keyboard.press('Control+z'); await pg.waitForTimeout(100); }
// 마우스로 썸네일을 눌러 연 뒤에도 방향키가 이어짐
await th(0).click(); await pg.waitForTimeout(60); await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(60);
ok('마우스로 1쪽 연 뒤 ↓ → 2쪽', (await st(()=>state.cur))===1 && (await focusTh())===1);

/* ── 팝업을 닫으면 열기 전 단추로 포커스 복원(F07 남은 부분) ── */
for(const [name,btn,dlg] of [['내려받기','#btnExport','#exDlg'],['새 쪽 종류','#addPage','#ptDlg'],['미리보기','#btnPreview','#pv']]){
  await pg.focus(btn); await pg.keyboard.press('Enter'); await pg.waitForSelector(`${dlg}:not([hidden])`); await pg.waitForTimeout(80);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(120);
  ok(`${name}: Esc로 닫으면 포커스가 「${name}」 단추로 돌아옴`, await st(sel=>document.activeElement===document.querySelector(sel),btn), await st(()=>document.activeElement.id||document.activeElement.tagName));
}
await pg.focus('#btnExport'); await pg.keyboard.press('Enter'); await pg.waitForSelector('#exDlg:not([hidden])'); await pg.click('#exClose'); await pg.waitForTimeout(120);
ok('내려받기: 닫기(✕) 단추로 닫아도 포커스 복원', await st(()=>document.activeElement.id==='btnExport'));
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
