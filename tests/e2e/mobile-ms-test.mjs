// 폰 원고 화면(시험판, studio/ms.js · 주소 ?ms=1): 큰 글자 원고 쓰기 · 자동 쪽 나누기 · 사진 넣기/빼기 · 빈 쪽 지우기
// 그리고 「컴퓨터 편집기 쪽 모양이 그대로인지」 — ms=1이 없으면 원고 화면이 아예 안 뜨고, 폰에서 고쳐도 컴퓨터에서 손으로 짠 사진·글상자 자리는 그대로
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium, devices } = await import((p=>/^[A-Za-z]:/.test(p)?'file:///'+p.replace(/\\/g,'/'):p)(R+'/playwright/index.mjs'));
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=process.env.MOA_ROOT||'/home/user/LiveBecomeHistory';
const types={'.html':'text/html','.js':'application/javascript'};
const srv=http.createServer((req,res)=>{ const p=decodeURIComponent(req.url.split('?')[0]); const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':types[path.extname(f)]||'text/plain'});res.end(d);} }); }).listen(8794);
const b=await chromium.launch({executablePath:process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const FAKE=fs.readFileSync(process.argv[2],'utf8'); const now=new Date().toISOString(); const U='http://localhost:8794';
const ok=(n,c,info='')=>console.log((c?'PASS ':'FAIL ')+n+(info&&!c?'  ← '+info:''));
const LONG=fs.readFileSync(path.join(ROOT,'docs/qa/모아_재현용_16문단.txt'),'utf8').replace(/\r\n?/g,'\n');
const BK='8e000000-0000-4000-8000-000000000001', P=n=>'8e100000-0000-4000-8000-00000000000'+n;
const TX=(id,html,o={})=>({id,type:'text',x:16,y:18,w:120,h:189,html,fs:12,align:'left',color:'#1B2B25',font:'serif',...o});
const PHOTO={id:'ph1',type:'image',x:80,y:30,w:56,h:42,name:'',media_id:'9e000000-0000-4000-8000-000000000001'};   // 컴퓨터에서 오른쪽 위에 작게 놓은 사진
const seed={profiles:[{id:'u1',display_name:'김정선'}],
 books:[{id:BK,owner_id:'u1',title:'원고 화면 시험',author_name:'김정선',format:'pages',is_public:false,admin_hidden:false,deleted_at:null,created_at:now,updated_at:now,rev:0}],
 media:[{id:PHOTO.media_id,book_id:BK,owner_id:'u1',kind:'image',storage_path:'u1/'+BK+'/a.png',size_bytes:100}],
 pages:[{id:P(1),book_id:BK,position:0,name:'표지',bg:'#FFFFFF',flow_from:null,els:[TX('t0','나의 이야기',{y:40,h:20,fs:28})]},
        {id:P(2),book_id:BK,position:1,name:'첫 이야기',bg:'#FFFFFF',flow_from:null,els:[TX('h1','어린 시절',{y:18,h:12,fs:18,b:true}),TX('e1','바닷가 마을에서 태어났다.',{y:34,h:173})]},
        {id:P(3),book_id:BK,position:2,name:'손으로 짠 쪽',bg:'#FFFFFF',flow_from:null,els:[TX('side','사진 옆에 쓴 짧은 글',{x:16,y:30,w:60,h:20}),PHOTO,TX('cap','사진 아래 설명',{x:80,y:74,w:56,h:8,fs:11,align:'center'})]}]};
const errs=[];
const mk=async(dev,opts={})=>{ const ctx=await b.newContext({...dev});
  await ctx.addInitScript(([s,login])=>{ window.__seed=s; if(login) localStorage.setItem('fakeSession',JSON.stringify({user:{id:'u1',email:'a@b.c'}})); },[seed,opts.login!==false]);
  await ctx.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:FAKE}));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort()); return ctx; };
const watch=pg=>{ pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('dialog',d=>d.accept().catch(()=>{})); return pg; };
const st=(pg,f,a)=>pg.evaluate(f,a);
const tap=async(pg,sel)=>{ await pg.$eval(sel,n=>n.scrollIntoView({block:'center'})); await pg.waitForTimeout(120); await pg.click(sel); };
const typeEnd=(pg,k,t)=>st(pg,([k,t])=>{ const n=document.querySelector(`.ms-tx[data-k="${k}"]`); n.focus(); const r=document.createRange(); r.selectNodeContents(n); r.collapse(false); getSelection().removeAllRanges(); getSelection().addRange(r); document.execCommand('insertText',false,t); },[k,t]);
const flowText=pg=>st(pg,()=>{ const g=state.pages.findIndex(p=>p.name==='첫 이야기'); let s=''; for(let i=g;i<state.pages.length;i++){ if(i>g&&!flowsInto(i-1)) break; const f=flowEl(i); if(f) s+=plain(f.html); } return s.replace(/\s+/g,''); });
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==','base64');

// ── 1. 컴퓨터 화면: ms=1이 없으면 원고 화면을 불러오지도 않는다 ──
{ const ctx=await mk({viewport:{width:1440,height:900}}); const pg=watch(await ctx.newPage()); const asked=[]; pg.on('request',r=>{ if(/\/studio\/ms\.js/.test(r.url())) asked.push(r.url()); });
  await pg.goto(`${U}/studio/?book=${BK}`); await pg.waitForSelector('#canvas .pg'); await pg.waitForTimeout(500);
  ok('컴퓨터: 원고 화면 없음·ms.js 안 받음', !(await pg.$('#ms')) && asked.length===0, asked.join());
  ok('컴퓨터: 편집기 그대로 보임', await st(pg,()=>getComputedStyle(document.getElementById('app')).visibility==='visible' && !document.body.classList.contains('ms')));
  await ctx.close(); }

// ── 2. 폰 원고 화면 ──
const ctx=await mk(devices['iPhone 13']);
const pg=watch(await ctx.newPage());
await pg.goto(`${U}/studio/?book=${BK}&ms=1`); await pg.waitForSelector('.ms-grp'); await pg.waitForTimeout(400);
const look=await st(pg,()=>({sw:document.documentElement.scrollWidth,w:innerWidth,app:getComputedStyle(document.getElementById('app')).display,
  body:getComputedStyle(document.querySelector('.ms-tx[data-k="e1"]')).fontSize, head:getComputedStyle(document.querySelector('.ms-tx[data-k="h1"]')).fontSize,
  cap:getComputedStyle(document.querySelector('.ms-tx[data-k="cap"]')).fontSize, tools:[...document.querySelectorAll('#msTools button:not([hidden])')].map(x=>Math.round(x.getBoundingClientRect().height)),
  grps:document.querySelectorAll('.ms-grp').length, title:document.getElementById('msTitle').value}));
ok('폰: 가로 넘침 없음(390)', look.sw===look.w, JSON.stringify(look));
ok('폰: 컴퓨터용 편집기는 숨김', look.app==='none');
ok('폰: 본문 18px · 제목 22px · 작은 설명도 18px', look.body==='18px'&&look.head==='22px'&&look.cap==='18px', JSON.stringify(look));
ok('폰: 아래 도구 단추 4개 · 44px 이상', look.tools.length===4 && look.tools.every(h=>h>=44), JSON.stringify(look.tools));
ok('폰: 쪽 묶음 3개 · 책 제목', look.grps===3 && look.title==='원고 화면 시험', JSON.stringify(look));
ok('폰: 손으로 짠 쪽은 위→아래 순서(옆 글·사진·설명)', await st(pg,()=>[...document.querySelectorAll('.ms-grp')[2].querySelectorAll('.ms-tx,.ms-media,.ms-slot')].map(n=>n.dataset.k||n.className).join('|'))==='side|ms-media|cap');
const keepPhoto=JSON.stringify(PHOTO), photoNow=()=>st(pg,()=>{ const e=state.pages.find(p=>p.name==='손으로 짠 쪽').els.find(x=>x.id==='ph1'); return JSON.stringify({id:e.id,type:e.type,x:e.x,y:e.y,w:e.w,h:e.h,name:e.name,media_id:e.media_id}); });
const sideNow=()=>st(pg,()=>{ const e=state.pages.find(p=>p.name==='손으로 짠 쪽').els.find(x=>x.id==='side'); return [e.x,e.y,e.w].join(); });

// 긴 글 → 쪽이 저절로 나뉘고, 원고 화면에서는 한 칸으로 이어 보인다
const before=await flowText(pg);
await tap(pg,'.ms-tx[data-k="e1"]'); await typeEnd(pg,'e1','\n'+LONG); await pg.waitForTimeout(1100);
let s1=await st(pg,()=>({pages:state.pages.length,names:state.pages.map(p=>p.name),flow:state.pages.filter(p=>p.flowFrom).length}));
ok('긴 글: 다음 쪽으로 저절로 나뉨(쓰는 중에도)', s1.flow>=2, JSON.stringify(s1));
await tap(pg,'#msDone'); await pg.waitForTimeout(300);
const after=await flowText(pg), want=(before+LONG).replace(/\s+/g,'');
ok('긴 글: 글자가 빠지거나 겹치지 않음', after===want, after.length+' vs '+want.length);
const g2=await st(pg,()=>{ const n=document.querySelector('.ms-tx[data-k="e1"]'); return {label:n.closest('.ms-grp').querySelector('.ms-pno').textContent, len:n.textContent.replace(/\s+/g,'').length, other:document.querySelectorAll('.ms-grp').length}; });
ok('긴 글: 원고 화면엔 한 칸(2~n쪽)으로', /^2~\d+쪽$/.test(g2.label) && g2.other===3, JSON.stringify(g2));
ok('긴 글: 한 칸의 글 = 책 쪽들의 글', g2.len===want.length, g2.len+' vs '+want.length);
ok('긴 글: 손으로 짠 쪽 사진 자리·크기 그대로', await photoNow()===keepPhoto, await photoNow());
// 앞부분을 지우면 뒤 쪽 글을 끌어 온다(쪽 수 줄어듦)
const pagesBig=await st(pg,()=>state.pages.length);
await st(pg,()=>{ const n=document.querySelector('.ms-tx[data-k="e1"]'); n.focus(); const r=document.createRange(); r.setStart(n,0); r.setEnd(n,Math.min(n.childNodes.length,14)); getSelection().removeAllRanges(); getSelection().addRange(r); document.execCommand('delete'); });
await tap(pg,'#msDone'); await pg.waitForTimeout(300);
const pagesSmall=await st(pg,()=>state.pages.length);
ok('앞부분 지우기: 뒤 쪽 글을 끌어 와 쪽 수 줄어듦', pagesSmall<pagesBig, pagesBig+'→'+pagesSmall);
ok('앞부분 지우기: 빈 「(이어서)」 쪽 남지 않음', await st(pg,()=>state.pages.every(p=>!p.flowFrom||p.els.some(e=>e.type==='text'&&plain(e.html)))));
// 손으로 짠 쪽의 짧은 글을 고쳐도 사진·글상자 자리 그대로
await tap(pg,'.ms-tx[data-k="side"]'); await typeEnd(pg,'side',' 조금 더'); await tap(pg,'#msDone'); await pg.waitForTimeout(300);
ok('손으로 짠 쪽 글 고치기: 사진 자리·크기 그대로', await photoNow()===keepPhoto, await photoNow());
ok('손으로 짠 쪽 글 고치기: 글상자 자리·폭 그대로', await sideNow()==='16,30,60');
// 자리가 모자라면(아래에 사진) 숨기지 않고 알린다
await tap(pg,'.ms-tx[data-k="cap"]'); await typeEnd(pg,'cap',' 아주 긴 설명을 덧붙입니다. '.repeat(40)); await tap(pg,'#msDone'); await pg.waitForTimeout(400);
const capH=await st(pg,()=>state.pages.find(p=>p.name==='손으로 짠 쪽').els.find(x=>x.id==='cap').h);
const capCont=await st(pg,()=>{ const i=state.pages.findIndex(p=>p.name==='손으로 짠 쪽'); return flowsInto(i)&&plain(state.pages[i+1].els[0].html).length>0; });
ok('설명이 넘치면 쪽 아래 여백까지 자라고 나머지는 다음 쪽으로(컴퓨터와 같은 규칙)', capH<=207-74+0.01 && capCont, 'h='+capH+' cont='+capCont);
ok('넘친 설명도 원고 화면엔 한 칸', await st(pg,()=>document.querySelectorAll('.ms-tx[data-k="cap"]').length===1 && document.querySelector('.ms-tx[data-k="cap"]').closest('.ms-grp').querySelector('.ms-pno').textContent.includes('~')));
ok('설명이 자라도 사진은 그대로', await photoNow()===keepPhoto);

// 새 글: 방금 쓰던 이야기 다음에 새 쪽
await tap(pg,'.ms-tx[data-k="h1"]'); await tap(pg,'#msTools [data-add=text]'); await pg.keyboard.type('새로 쓴 이야기'); await pg.waitForTimeout(900); await tap(pg,'#msDone');
const s2=await st(pg,()=>{ const i=state.pages.findIndex(p=>p.name==='새 글'), g=state.pages.findIndex(p=>p.name==='첫 이야기'); let end=g; while(flowsInto(end)) end++; return {i,end,text:i>=0?plain(state.pages[i].els[0].html):''}; });
ok('새 글: 쓰던 이야기(이어진 쪽 포함) 바로 다음', s2.i===s2.end+1 && s2.text==='새로 쓴 이야기', JSON.stringify(s2));

// 사진: 이야기 다음에 「제목·사진·설명」 쪽 → 고른 사진이 그 자리에
await tap(pg,'.ms-tx[data-k="h1"]'); await typeEnd(pg,'h1','!');   // 글을 쓰는 중에 바로 「사진」을 눌러도 눌린다
const n0=await st(pg,()=>state.pages.length);
const [fc]=await Promise.all([pg.waitForEvent('filechooser',{timeout:5000}), tap(pg,'#msTools [data-add=image]')]); await fc.setFiles({name:'a.png',mimeType:'image/png',buffer:png}); await pg.waitForTimeout(1800);
const s3=await st(pg,()=>{ const i=state.pages.findIndex(p=>p.name==='사진 페이지'); let j=state.pages.findIndex(p=>p.name==='첫 이야기'); while(flowsInto(j)) j++; const p=state.pages[i]; return {i,j,n:state.pages.length,img:!!p&&p.els.some(e=>e.type==='image'&&e.media_id),slot:!!p&&p.els.some(e=>e.type==='slot'),shown:!!document.querySelector(`.ms-grp[data-g="${p&&p.id}"] .ms-media img`),ph:[...document.querySelectorAll(`.ms-grp[data-g="${p&&p.id}"] .ms-tx`)].map(n=>n.dataset.ph.split('\n')[0])}; });
ok('사진: 쓰던 이야기(이어진 쪽 포함) 바로 다음에 사진 쪽 1개', s3.n===n0+1 && s3.i===s3.j+1, JSON.stringify(s3));
ok('사진: 올라가서 자리에 들어감·원고 화면에 보임', s3.img && !s3.slot && s3.shown, JSON.stringify(s3));
ok('사진: 제목·설명 칸이 바로 붙음', s3.ph.length===2 && /제목/.test(s3.ph[0]) && /설명/.test(s3.ph[1]), JSON.stringify(s3.ph));
// 사진 빼기 → 자리로 돌아감, 빈 쪽은 지우기 단추
await st(pg,i=>document.querySelector(`.ms-grp[data-g="${state.pages[i].id}"] [data-del]`).click(),s3.i); await pg.waitForTimeout(300);
const s4=await st(pg,i=>{ const p=state.pages[i]; return {slot:p.els.some(e=>e.type==='slot'),img:p.els.some(e=>e.type==='image'),rm:!!document.querySelector(`.ms-grp[data-g="${p.id}"] [data-rm]`)}; },s3.i);
ok('사진 빼기: 사진 자리로 돌아감·빈 쪽 지우기 단추', s4.slot && !s4.img && s4.rm, JSON.stringify(s4));
await st(pg,i=>document.querySelector(`.ms-grp[data-g="${state.pages[i].id}"] [data-rm]`).click(),s3.i); await pg.waitForTimeout(300);
ok('빈 쪽 지우기', await st(pg,()=>!state.pages.some(p=>p.name==='사진 페이지')));
// 파일 고르기를 그냥 닫으면 방금 만든 빈 쪽을 치운다
const n1=await st(pg,()=>state.pages.length);
const [fc2]=await Promise.all([pg.waitForEvent('filechooser',{timeout:5000}), tap(pg,'#msTools [data-add=video]')]);
ok('영상: 고르기 전 빈 영상 쪽', await st(pg,()=>state.pages.some(p=>p.name==='영상 페이지')));
await st(pg,()=>document.getElementById('file').dispatchEvent(new Event('cancel'))); await pg.waitForTimeout(300);
ok('고르기 취소: 빈 영상 쪽 치움', await st(pg,n=>state.pages.length===n && !state.pages.some(p=>p.name==='영상 페이지'),n1));

// 저장 → 컴퓨터 편집기로 열어도 같은 책(쪽 수·글·사진 자리)
await pg.waitForTimeout(2600);
const saved=await st(pg,()=>({ok:serialize()===lastSaved, n:state.pages.length, js:JSON.stringify(JSON.parse(serialize()).pages.map(p=>({n:p.name,f:!!p.flow_from,els:p.els.map(e=>[e.type,e.x,e.y,e.w,Math.round(e.h*100),e.html||e.media_id||''])})))}));
ok('저장: 고친 내용이 모두 저장됨', saved.ok, JSON.stringify(saved).slice(0,200));
ok('저장 표시: 짧게 「✓ 저장됨」', await st(pg,()=>document.getElementById('msSave').textContent)==='✓ 저장됨');
{ const dk=watch(await ctx.newPage()); await dk.setViewportSize({width:1440,height:900});
  await dk.goto(`${U}/studio/?book=${BK}`); await dk.waitForSelector('#canvas .pg'); await dk.waitForTimeout(600);
  const d=await st(dk,()=>({n:state.pages.length, js:JSON.stringify(JSON.parse(serialize()).pages.map(p=>({n:p.name,f:!!p.flow_from,els:p.els.map(e=>[e.type,e.x,e.y,e.w,Math.round(e.h*100),e.html||e.media_id||''])})))}));
  ok('컴퓨터로 열기: 폰에서 쓴 그대로(쪽·글·자리)', d.n===saved.n && d.js===saved.js, d.n+' vs '+saved.n);
  ok('컴퓨터로 열기: 사진 자리·크기 그대로', await st(dk,()=>{ const e=state.pages.find(p=>p.name==='손으로 짠 쪽').els.find(x=>x.id==='ph1'); return [e.x,e.y,e.w,e.h].join(); })==='80,30,56,42');
  await dk.close(); }

// 좁은 폰(320)도 넘침 없음
await pg.setViewportSize({width:320,height:640}); await pg.waitForTimeout(300);
ok('320px: 가로 넘침 없음', await st(pg,()=>document.documentElement.scrollWidth<=innerWidth), String(await st(pg,()=>document.documentElement.scrollWidth)));
await ctx.close();

// ── 3. 새 책을 폰 원고 화면에서 만들면 주소에 ms=1이 남는다(새로 고쳐도 같은 화면) ──
{ const c=await mk(devices['Pixel 7']); const p=watch(await c.newPage());
  await p.goto(`${U}/studio/?new=1&ms=1`); await p.waitForSelector('.ms-grp'); await p.waitForTimeout(300);
  const k=await st(p,()=>document.querySelector('.ms-tx').dataset.k); await tap(p,`.ms-tx[data-k="${k}"]`); await p.keyboard.type('첫 줄'); await tap(p,'#msDone'); await p.waitForTimeout(3200);
  ok('새 책: 저장 뒤 주소에 book·ms=1', await st(p,()=>/[?&]book=[0-9a-f-]{36}/.test(location.search)&&/[?&]ms=1/.test(location.search)), await st(p,()=>location.search));
  await c.close(); }

// ── 4. 체험(로그인 없음) 빈 책 · 로그인 필요한 내 책 ──
{ const c=await mk(devices['iPhone 13'],{login:false}); const p=watch(await c.newPage());
  await p.goto(`${U}/studio/?blank=1&ms=1`); await p.waitForSelector('.ms-grp'); await p.waitForTimeout(300);
  ok('체험: 원고 화면이 뜸·「체험 중」 표시', await st(p,()=>document.querySelectorAll('.ms-grp').length>0 && /체험/.test(document.getElementById('msSave').textContent)), await st(p,()=>document.getElementById('msSave').textContent));
  await p.goto(`${U}/studio/?book=${BK}&ms=1`); await p.waitForTimeout(1500);
  ok('로그인 안 함: 「로그인이 필요해요」 안내가 보임', await st(p,()=>!!document.querySelector('.fatal') && getComputedStyle(document.getElementById('app')).visibility==='visible' && getComputedStyle(document.getElementById('app')).display!=='none'));
  await c.close(); }

ok('페이지 오류 없음', errs.length===0, errs.join(' | '));
await b.close(); srv.close();
