// 체험 원고 보관과 계정 전환: 수정요청서 1차(2026-10-16) R05 · 점검표 T15 + 정선C 결정(2026-10-19)
// 체험 원고는 서버로 보내지 않고 「이 기기의 브라우저(IndexedDB)」에만 임시로 → 다시 열면 이어 쓰기/지우기 → 로그인 뒤 내 서재로 옮기기
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import(R+'/playwright/index.mjs');
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/home/user/LiveBecomeHistory';
const types={'.html':'text/html','.js':'application/javascript'};
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':types[path.extname(f)]||'text/plain'});res.end(d);} }); }).listen(8785);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const FAKE=fs.readFileSync(process.argv[2],'utf8'); const U='http://localhost:8785';
const ctx=await b.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
await ctx.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:FAKE}));
await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
const pg=await ctx.newPage(); const errs=[], dialogs=[], requests=[]; pg.on('pageerror',e=>errs.push('PAGEERR '+e.message));
pg.on('dialog',d=>{ dialogs.push(d.type()); d.accept().catch(()=>{}); });
const ok=(n,c,info='')=>console.log((c?'PASS ':'FAIL ')+n+(info&&!c?'  ← '+info:''));
const st=(f,a)=>pg.evaluate(f,a);
const draft=()=>st(async()=>{ const d=await DemoDraft.get(); return d?{title:d.title, text:JSON.stringify(d.pages).includes('체험 원고 보관 검사'), media:d.pages.flatMap(p=>p.els).filter(e=>/^data:/.test(e.src||'')).length}:null; });
const openDemo=async()=>{ await pg.goto(`${U}/studio/?blank=1`); await pg.waitForSelector('#canvas .pg'); await pg.waitForTimeout(400); };
const typeBody=async t=>{ await pg.locator('.th').nth(1).click(); await pg.waitForTimeout(80); const id=await st(()=>flowEl(1).id); const bb=await pg.locator(`#canvas .el[data-id="${id}"]`).boundingBox(); await pg.mouse.click(bb.x+bb.width/2,bb.y+40); await pg.keyboard.type(t); await pg.keyboard.press('Escape'); await pg.waitForTimeout(100); };
const addPhoto=async()=>{ const png=await st(()=>new Promise(res=>{ const c=document.createElement('canvas'); c.width=60; c.height=40; const g=c.getContext('2d'); g.fillStyle='#2E7D32'; g.fillRect(0,0,60,40); c.toBlob(bl=>{ const r=new FileReader(); r.onload=()=>res(r.result.split(',')[1]); r.readAsDataURL(bl); },'image/png'); }));
  await st(()=>{ goPage(2); pendingKind='image'; pendingSlot=state.pages[2].els.find(e=>e.type==='slot').id; }); await pg.setInputFiles('#file',{name:'p.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')}); await pg.waitForTimeout(600); };
pg.on('request',r=>{ if(/supabase\.co|functions\/v1|rest\/v1/.test(r.url())) requests.push(r.url()); });

/* ── 처음 체험: 안 고쳤으면 아무것도 남기지 않음 ── */
await openDemo(); await st(()=>DemoDraft.clear()); await openDemo();
ok('T15 처음 연 그대로면 이 기기에 남기지 않음', !(await draft()) && await pg.locator('#draftDlg').isHidden());
ok('T15 가입 안내가 보존 범위를 밝힘(서버에 안 올라감 · 이 기기에만 임시 · 옮기기 · 내려받기)', await (async()=>{ await pg.click('#demoChip'); const t=await pg.locator('#joinDlg').innerText(); await pg.keyboard.press('Escape'); return /서버에 올라가지 않고/.test(t) && /이 기기/.test(t) && /내 서재로 옮기기/.test(t) && /내려받기/.test(t); })());
/* ── 고치면 1.5초 안에 이 기기에 임시 보관 ── */
await typeBody('체험 원고 보관 검사'); await addPhoto(); await pg.waitForTimeout(2000);
const d1=await draft();
ok('T15 고친 글·직접 넣은 사진이 이 기기(IndexedDB)에 임시 보관됨', d1 && d1.text && d1.media===1, JSON.stringify(d1));
ok('T15 상태 표시 「✓ 이 기기에 임시 저장됨」', /이 기기에 임시 저장됨/.test(await pg.locator('#save').innerText()));
ok('T15 서버로는 아무것도 보내지 않음(체험 중 Supabase 요청 0)', requests.length===0, requests.slice(0,3).join(' '));
ok('T15 가입 안내에 「이 기기에만 · 내 서재로 옮기기 · 먼저 내려받기」', await (async()=>{ await pg.click('#demoChip'); const v=await pg.locator('#joinKeep').isVisible(), t=await pg.locator('#joinKeep').innerText(); await pg.keyboard.press('Escape'); return v && /이 기기에만/.test(t) && /옮기기/.test(t); })());
/* ── 새로고침 → 이어 쓰기 ── */
dialogs.length=0; await openDemo();
ok('T15 이미 이 기기에 남긴 뒤라 새로고침 때 떠나기 확인을 띄우지 않음', !dialogs.includes('beforeunload'), JSON.stringify(dialogs));
ok('T15 다시 열면 「지난번 체험하던 책이 있어요」(이어 쓰기 / 지우고 새로 시작)', await pg.locator('#draftDlg').isVisible() && /이어 쓰기/.test(await pg.locator('#draftDlg').innerText()));
await pg.click('#draftDlg [data-draft=resume]'); await pg.waitForTimeout(300);
ok('T15 「이어 쓰기」 → 글·사진 그대로 다시 펼쳐짐', await st(()=>plain(flowEl(1).html).includes('체험 원고 보관 검사') && state.pages[2].els.some(e=>e.type==='image'&&/^data:/.test(e.src))));
/* ── 지우고 새로 시작 ── */
await openDemo(); await pg.click('#draftDlg [data-draft=fresh]'); await pg.waitForTimeout(300);
ok('T15 「지우고 새로 시작」 → 이 기기에서 지우고 빈 책으로', !(await draft()) && await st(()=>!plain(flowEl(1).html).includes('체험 원고 보관 검사')));
/* ── 로그인 뒤 내 서재로 옮기기 ── */
await typeBody('체험 원고 보관 검사'); await addPhoto(); await pg.waitForTimeout(2000);
// 견본 책의 작가 사진이 섞여 있었다고 가정(미디어 번호가 있는 것) → 옮기지 않아야
await st(async()=>{ const d=await DemoDraft.get(); d.pages[0].els.push({id:'sample1',type:'image',x:16,y:20,w:50,h:40,src:'https://example.invalid/sample.jpg',media_id:'55555555-5555-4555-8555-555555555555'}); await DemoDraft.put(d); });
await st(()=>localStorage.setItem('fakeSession',JSON.stringify({user:{id:'u1',email:'writer@example.com'}})));
await pg.goto(`${U}/editor/`); await pg.waitForSelector('#demoImport',{state:'attached'}); await pg.waitForTimeout(600);
ok('T15 로그인한 내 서재에 「체험하며 만든 책이 남아 있어요 · 내 서재로 옮기기」', /체험하며 만든 책/.test(await pg.locator('#demoImport').innerText()) && await pg.locator('#diGo').isVisible());
await Promise.all([pg.waitForURL(/import=demo/), pg.click('#diGo')]);
await pg.waitForSelector('#canvas .pg'); for(let t=0;t<60 && !(await st(()=>/옮겼어요|옮기지 못했/.test(document.getElementById('toast').innerText)));t++) await pg.waitForTimeout(150);
const moved=await st(()=>{ const bk=__db.books.find(b=>b.owner_id==='u1'); const ps=__db.pages.filter(p=>bk&&p.book_id===bk.id); const els=ps.flatMap(p=>p.els);
  return {book:!!bk, text:els.some(e=>e.type==='text'&&plain(e.html||'').includes('체험 원고 보관 검사')), img:els.filter(e=>e.type==='image').length, sample:els.some(e=>e.media_id==='55555555-5555-4555-8555-555555555555'), media:__db.media.length, url:location.search}; });
ok('T15 「내 서재로 옮기기」 → 새 책으로 저장(글 그대로 · 직접 넣은 사진 올려짐)', moved.book && moved.text && moved.img===1 && moved.media===1 && /book=/.test(moved.url), JSON.stringify(moved));
ok('T15 견본 책의 작가 사진·영상·노래는 옮기지 않음(저작권 보호)', !moved.sample);
ok('T15 옮긴 뒤 이 기기의 체험 책은 지움 · 「옮겼어요」 안내', !(await draft()) && /내 서재로 옮겼어요/.test(await pg.locator('#toast').innerText()));
await pg.goto(`${U}/editor/`); await pg.waitForSelector('#demoImport',{state:'attached'}); await pg.waitForTimeout(500);
ok('T15 옮긴 뒤 내 서재에는 안내가 다시 뜨지 않음', !(await pg.locator('#demoImport').innerText()).trim());
// 내 서재의 「지우기」
await st(()=>DemoDraft.put({savedAt:Date.now(),title:'지울 책',cur:0,pages:[{id:'x',name:'a',bg:'#FFFFFF',els:[]}]})); await pg.reload(); await pg.waitForSelector('#diDel');
await pg.click('#diDel'); await pg.waitForTimeout(300);
ok('T15 내 서재의 「지우기」 → 이 기기의 체험 책 지움', !(await draft()) && !(await pg.locator('#demoImport').innerText()).trim());
ok('처리방침에 「이 기기의 브라우저 저장 공간(IndexedDB)에만 임시로」 · 지우는 방법', /IndexedDB\)에만 임시로/.test(fs.readFileSync(ROOT+'/privacy/index.html','utf8')));
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
