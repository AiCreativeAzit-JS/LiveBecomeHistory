// 정선C 결정(2026-10-19): ① 사진 설명(대체 텍스트) 쓰기 ② 미리보기를 지금 쪽부터
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import(R+'/playwright/index.mjs');
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/home/user/LiveBecomeHistory';
const types={'.html':'text/html','.js':'application/javascript'};
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':types[path.extname(f)]||'text/plain'});res.end(d);} }); }).listen(8794);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const pg=await (await b.newContext({viewport:{width:1440,height:1000},acceptDownloads:true})).newPage();
const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('dialog',d=>d.accept().catch(()=>{}));
await pg.route(/fonts\.|supabase-js|jsdelivr|unpkg/,r=>r.abort());
const ok=(n,c,info='')=>console.log((c?'PASS ':'FAIL ')+n+(info&&!c?'  ← '+info:''));
const st=(f,a)=>pg.evaluate(f,a);
await pg.goto('http://localhost:8794/studio/?blank=1'); await pg.waitForSelector('#canvas .pg');
// 3쪽 사진 자리에 사진
const png=await st(()=>new Promise(res=>{ const c=document.createElement('canvas'); c.width=80; c.height=60; const g=c.getContext('2d'); g.fillStyle='#C0392B'; g.fillRect(0,0,80,60); c.toBlob(bl=>{ const r=new FileReader(); r.onload=()=>res(r.result.split(',')[1]); r.readAsDataURL(bl); },'image/png'); }));
await st(()=>{ goPage(2); pendingKind='image'; pendingSlot=state.pages[2].els.find(e=>e.type==='slot').id; });
await pg.setInputFiles('#file',{name:'p.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')}); await pg.waitForTimeout(700);
const id=await st(()=>state.pages[2].els.find(e=>e.type==='image').id);
await st(id=>select(id),id);
/* ① 사진 설명 */
ok('사진을 고르면 오른쪽 칸에 「사진 설명 · 화면 읽기용」 입력란', await pg.locator('#altIn').isVisible() && /화면 읽기용/.test(await pg.locator('#secSel').innerText()));
await pg.fill('#altIn','할머니 댁 빨간 대문 앞 가족사진'); await pg.waitForTimeout(100);
ok('쓴 설명이 편집 화면 사진의 대체 텍스트로', await st(id=>elNode(id).querySelector('img').alt==='할머니 댁 빨간 대문 앞 가족사진',id));
ok('저장되는 원고(로그인 책의 저장 형식)에도 담김', await st(id=>{ const e=state.pages[2].els.find(e=>e.id===id); return cleanEl({...e,media_id:'m1'}).alt==='할머니 댁 빨간 대문 앞 가족사진' && !('alt' in cleanEl({...e,alt:'',media_id:'m1'})); },id));
ok('설명 칸에서 Delete·Backspace를 눌러도 사진 상자는 지워지지 않음', await (async()=>{ await pg.focus('#altIn'); await pg.keyboard.press('End'); await pg.keyboard.press('Backspace'); await pg.keyboard.press('Delete'); return st(id=>page().els.some(e=>e.id===id) && page().els.find(e=>e.id===id).alt==='할머니 댁 빨간 대문 앞 가족사',id); })());
await pg.fill('#altIn','할머니 댁 빨간 대문 앞 가족사진');
ok('Ctrl+Z(앱 되돌리기)로 설명 쓰기 전으로', await (async()=>{ await pg.locator('.th').nth(2).click(); await pg.keyboard.press('Escape'); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(100); const r=await st(id=>{ const e=state.pages[2].els.find(e=>e.id===id); return e && !e.alt; },id); await pg.keyboard.press('Control+y'); await pg.waitForTimeout(100); return r; })());
ok('책 화면에는 설명 글이 보이지 않음(대체 텍스트로만)', await st(()=>!document.querySelector('#canvas .pg').innerText.includes('할머니 댁 빨간 대문')));
// 내려받기·서가에서도
{ await pg.click('#btnExport'); const [d]=await Promise.all([pg.waitForEvent('download'),pg.click('#exDlg [data-ex=screen]')]); const h=fs.readFileSync(await d.path(),'utf8');
  ok('화면용 전자책의 사진에도 대체 텍스트', /alt=\\?"할머니 댁 빨간 대문 앞 가족사진\\?"/.test(h)); }
{ await pg.click('#btnExport'); const [d]=await Promise.all([pg.waitForEvent('download'),pg.click('#exDlg [data-ex=print]')]); const h=fs.readFileSync(await d.path(),'utf8');
  ok('인쇄용 전자책의 사진에도 대체 텍스트', /alt="할머니 댁 빨간 대문 앞 가족사진"/.test(h)); }
ok('서가·비밀 링크(공통 책 그리기)도 대체 텍스트', await pg.evaluate(async()=>{ await new Promise(r=>{ const s=document.createElement('script'); s.src='../lib/book-render.js'; s.onload=r; document.head.appendChild(s); });
  const h=BookRender.pageHTML({els:[{type:'image',media_id:'m1',x:16,y:20,w:100,h:70,alt:'서가 \"설명\" <b>'}]},{m1:'data:image/png;base64,AAAA'}); return h.includes('alt="서가 &quot;설명&quot; &lt;b&gt;"'); }));
/* ② 미리보기를 지금 쪽부터 */
await st(()=>goPage(4)); await pg.click('#btnPreview'); await pg.waitForSelector('#pv:not([hidden])'); await pg.waitForTimeout(300);
const cur=await st(()=>{ const v=$('pvBody')._bv; return {cur:v.current, spread:v.spread}; });
ok('미리보기가 지금 보던 5쪽(이 들어 있는 펼침면)부터 열림', cur.cur===4 || (cur.spread && Math.abs(cur.cur-4)<=1), JSON.stringify(cur));
await pg.click('#pvFirst'); await pg.waitForTimeout(800);
ok('「처음부터」 → 1쪽으로', await st(()=>$('pvBody')._bv.current===0));
await pg.keyboard.press('Escape');
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
