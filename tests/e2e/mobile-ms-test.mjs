// 폰 원고 화면(시험판, studio/ms.js · 주소 ?ms=1): 큰 글자 원고 쓰기 · 자동 쪽 나누기 · 사진 넣기/빼기 · 빈 쪽 지우기
// 손가락으로 위아래 밀기 · AI와 쓰기(체험 ?ai=proto 가짜 답) → 모아에 담기 → 원고 화면에 담긴 글 · 되돌리기
// 그리고 「컴퓨터 편집기 쪽 모양이 그대로인지」 — ms=1이 없으면 원고 화면이 아예 안 뜨고, 폰에서 고쳐도 컴퓨터에서 손으로 짠 사진·글상자 자리는 그대로
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium, devices } = await import((p=>/^[A-Za-z]:/.test(p)?'file:///'+p.replace(/\\/g,'/'):p)(R+'/playwright/index.mjs'));
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=process.env.MOA_ROOT||'/home/user/LiveBecomeHistory';
const types={'.html':'text/html','.js':'application/javascript'};
const srv=http.createServer((req,res)=>{ const p=decodeURIComponent(req.url.split('?')[0]); const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':types[path.extname(f)]||'text/plain'});res.end(d);} }); }).listen(+process.env.MS_PORT||8794);
const b=await chromium.launch({executablePath:process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const FAKE=fs.readFileSync(process.argv[2],'utf8'); const now=new Date().toISOString(); const U='http://localhost:'+(process.env.MS_PORT||8794);
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
const look=await st(pg,()=>({sw:document.documentElement.scrollWidth,w:innerWidth,app:getComputedStyle(document.getElementById('center')).display,
  body:getComputedStyle(document.querySelector('.ms-tx[data-k="e1"]')).fontSize, head:getComputedStyle(document.querySelector('.ms-tx[data-k="h1"]')).fontSize,
  cap:getComputedStyle(document.querySelector('.ms-tx[data-k="cap"]')).fontSize, tools:[...document.querySelectorAll('#msTools button:not([hidden])')].map(x=>Math.round(x.getBoundingClientRect().height)),
  grps:document.querySelectorAll('.ms-grp').length, title:document.getElementById('msTitle').value}));
ok('폰: 가로 넘침 없음(390)', look.sw===look.w, JSON.stringify(look));
ok('폰: 컴퓨터용 편집기는 숨김', look.app==='none');
ok('폰: 본문 18px · 제목 22px · 작은 설명도 18px', look.body==='18px'&&look.head==='22px'&&look.cap==='18px', JSON.stringify(look));
ok('폰: 아래 도구 단추 3개(사진 · 새 글 · 더 보기) · 44px 이상', look.tools.length===3 && look.tools.every(h=>h>=44), JSON.stringify(look.tools));
ok('폰: 「말로 쓰셔도 돼요」 안내 · 위 줄 「도움」', await pg.locator('#msTip').isVisible() && await pg.locator('#msHelp').isVisible());
await tap(pg,'#msHelp');
ok('도움: 아래에서 판이 올라옴(말로 쓰기 · 저장 · 오픈채팅)', await st(pg,()=>{ const d=document.querySelector('#msSheet:not([hidden]) [data-sheet=help]:not([hidden])'); return !!d && /마이크|말로 하기/.test(d.textContent) && /오픈채팅/.test(d.textContent); }));
await tap(pg,'#msSheet [data-sheetx]');
await tap(pg,'#msTipX');
ok('「알겠어요」 → 안내 닫힘 · 다시 열어도 안 보임', await st(pg,()=>document.getElementById('msTip').hidden && localStorage.getItem('moa-ms-tip')==='1'));
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
// 밀면 위아래로 움직인다(편집기의 화면 잠금 overflow:hidden 을 풀었는지 — 프로그램으로 옮기는 scrollIntoView는 잠겨 있어도 움직여서 이걸로는 못 잡는다)
// 시험 브라우저는 손가락(touch) 밀기 흉내가 빈 쪽에서도 안 움직여서, 같은 길(화면 잠금의 영향을 받는) 마우스 밀기로 본다 — 잠겨 있으면 0
{ const cdp=await ctx.newCDPSession(pg); await st(pg,()=>{ document.activeElement?.blur(); scrollTo(0,0); }); await pg.waitForTimeout(200);
  await cdp.send('Input.synthesizeScrollGesture',{x:190,y:560,yDistance:-700,speed:1600,gestureSourceType:'mouse'}); await pg.waitForTimeout(300);
  const down=await st(pg,()=>scrollY);
  await cdp.send('Input.synthesizeScrollGesture',{x:190,y:300,yDistance:500,speed:1600,gestureSourceType:'mouse'}); await pg.waitForTimeout(300);
  const up=await st(pg,()=>scrollY);
  ok('밀기: 아래로 내려가고 다시 위로 올라감', down>300 && up<down-200, down+' → '+up); }
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
await tap(pg,'#msTools [data-more]');
ok('더 보기: 영상 · 노래 · 컴퓨터 화면으로', await st(pg,()=>{ const d=document.querySelector('#msSheet:not([hidden]) [data-sheet=more]:not([hidden])'); return !!d && !!d.querySelector('[data-add=video]') && !!d.querySelector('[data-add=audio]') && !!d.querySelector('#msDesk'); }));
const [fc2]=await Promise.all([pg.waitForEvent('filechooser',{timeout:5000}), tap(pg,'#msSheet [data-add=video]')]);
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

// ── 5. AI와 쓰기(체험 ?ai=proto · 가짜 답): 원고 화면 → AI 창 전체 화면 → 대화 → 모아에 담기 → 원고 화면에 담긴 글 ──
{ const c=await mk(devices['iPhone 13'],{login:false}); const p=watch(await c.newPage()); const out=[]; p.on('request',r=>{ if(!/localhost|fonts.(googleapis|gstatic)/.test(r.url())) out.push(r.url()); });
  // 「말로 하기」 시험용 가짜 음성 인식(브라우저의 webkitSpeechRecognition 자리). 시험이 onresult 를 직접 불러 「말한 것」을 넣는다
  await c.addInitScript(()=>{ window.__sr=[]; window.SpeechRecognition=window.webkitSpeechRecognition=class{ constructor(){ window.__sr.push(this); } start(){ this.started=true; } abort(){ this.aborted=true; } }; });
  const say=(t,fin=true)=>st(p,([t,fin])=>{ const r=__sr[__sr.length-1], res=[{transcript:t}]; res.isFinal=fin; r.onresult({results:[res]}); },[t,fin]);
  await p.goto(`${U}/studio/?blank=1&ms=1&ai=proto`); await p.waitForSelector('.ms-grp'); await p.waitForSelector('#msAi:not([hidden])');
  await st(p,()=>{ window.__aiFast=true; });
  const tb=await st(p,()=>[...document.querySelectorAll('#msTools button:not([hidden])')].map(x=>({t:x.innerText.trim(),h:Math.round(x.getBoundingClientRect().height)})));
  ok('AI: 원고 화면 위 「AI와 이야기하며 쓰기」 · 아래 줄 첫 단추 「AI와 쓰기」', tb.length===4 && tb[0].t==='AI와 쓰기' && tb.every(x=>x.h>=44), JSON.stringify(tb));
  ok('AI: 첫 화면 큰 칸에 이번 주 글감', (await p.locator('#msAiSub').innerText()).includes('이번 주 글감 「내 생애 최고의 순간」'));
  const n0=await st(p,()=>state.pages.length);
  await tap(p,'#msAi'); await p.waitForSelector('#aiConsent:not([hidden])');
  ok('AI: 처음이면 동의 화면부터', await p.locator('#aiConsent').isVisible() && !(await p.locator('#aiPanel').isVisible()));
  await p.click('#aiConsent [data-con=ok]');
  const pl=await st(p,()=>{ const r=document.getElementById('aiPanel').getBoundingClientRect(); return {w:Math.round(r.width),h:Math.round(r.height),iw:innerWidth,ih:innerHeight,fs:getComputedStyle(document.getElementById('aiPanel')).fontSize,lock:getComputedStyle(document.body).overflow}; });
  ok('AI: 창이 폰 화면 전체 · 글자 18px · 뒤 원고는 안 밀림', pl.w===pl.iw && pl.h===pl.ih && pl.fs==='18px' && pl.lock==='hidden', JSON.stringify(pl));
  const idle=()=>p.waitForFunction(()=>{ const s=window.__aiProto&&__aiProto.cur; return !s||!s.busy; });
  const act=async(a,x='')=>{ await p.click(`#aiPanel [data-act="${a}"]${x}`); await idle(); };
  await act('topic','[data-id=w1]');
  // 말로 하기(AI 답 칸): 누르면 듣기 · 말하는 동안 글자가 바로 칸에 · 다시 누르면 끝
  ok('말로 하기: 답 칸 아래 「🎤 말로 하기」', await p.locator('#aiMic').isVisible() && (await p.locator('#aiMic').innerText()).includes('말로 하기'));
  await p.click('#aiMic');
  ok('말로 하기 누름 → 「■ 그만 말하기」 · 듣는 중', (await p.locator('#aiMic').innerText()).includes('그만 말하기') && await st(p,()=>__sr.length>0 && __sr[__sr.length-1].started && MoaVoice.active()));
  await say('바닷가 마을', false); const mid=await p.locator('#aiIn').inputValue();
  await say('바닷가 마을이었어요'); const fin=await st(p,()=>({v:document.getElementById('aiIn').value, inp:__aiProto.cur.input}));
  ok('말하는 동안 글자가 칸에 · 끝나면 그대로 남고 보낼 글로 잡힘', mid==='바닷가 마을' && fin.v==='바닷가 마을이었어요' && fin.inp==='바닷가 마을이었어요', JSON.stringify({mid,fin}));
  await p.click('#aiMic');
  ok('다시 누르면 듣기 끝 · 「🎤 말로 하기」로', !(await st(p,()=>MoaVoice.active())) && (await p.locator('#aiMic').innerText()).includes('말로 하기'));
  // 키보드가 올라온 것처럼(글칸에 커서 + 보이는 높이가 줄어듦): 위 칸은 접히고 보내기가 화면 안에
  await p.fill('#aiIn',''); await p.focus('#aiIn'); await p.setViewportSize({width:390,height:400}); await p.waitForTimeout(400);
  const kb=await st(p,()=>{ const s=document.querySelector('#aiFoot [data-act=send]').getBoundingClientRect(); return {kb:document.body.classList.contains('kb'), bottom:Math.round(s.bottom), h:innerHeight, vh:Math.round(visualViewport.height), top:getComputedStyle(document.querySelector('.aip-top')).display, idk:getComputedStyle(document.querySelector('#aiFoot [data-act=idk]')).display, mic:!!document.querySelector('#aiMic')&&getComputedStyle(document.querySelector('#aiMic')).display!=='none'}; });
  ok('키보드가 올라오면: 위 칸·다른 단추 접힘 · 보내기와 말로 하기는 화면 안', kb.kb && kb.top==='none' && kb.idk==='none' && kb.mic && kb.bottom<=Math.min(kb.h,kb.vh), JSON.stringify(kb));
  await p.setViewportSize({width:390,height:664}); await st(p,()=>document.activeElement.blur()); await p.waitForTimeout(400);
  ok('키보드가 내려가면 다시 펼침', await st(p,()=>!document.body.classList.contains('kb') && getComputedStyle(document.querySelector('.aip-top')).display!=='none'));
  for(let k=0;k<5;k++){ await act('sample'); await act('send'); }
  await act('scene','[data-i="0"]'); await act('draft'); await act('revise'); await act('sample'); await act('send'); await act('forgot');
  ok('AI: 폰에서도 생각하기 → 초고 → 퇴고본까지', await st(p,()=>__aiProto.cur.step==='revise'&&!!__aiProto.cur.rev));
  const top=await st(p,()=>({lab:document.querySelector('#aiSteps .lab')?.textContent, dot:Math.round(document.querySelector('#aiSteps li').getBoundingClientRect().height), cost:document.getElementById('aiCalls').hidden, help:!document.getElementById('aiHelp').hidden}));
  ok('AI(폰): 단계 탭 대신 진행 점 · 「퇴고 · 3/4」 · 비용 어림 줄 숨김 · 도움 단추', top.lab==='퇴고 · 3/4' && top.dot<=12 && top.cost && top.help, JSON.stringify(top));
  const title=await st(p,()=>__aiProto.cur.rev.title), revText=await st(p,()=>__aiProto.docText(__aiProto.cur.rev).replace(/\s+/g,''));
  await act('place'); await act('insert'); await p.waitForTimeout(300);
  const document_top=await st(p,()=>Math.round(document.querySelector('.ms-top').getBoundingClientRect().bottom));
  const after=await st(p,t=>{ const n=document.querySelector('.ms-placed'), g=n&&n.closest('.ms-grp'); const txt=g?[...g.querySelectorAll('.ms-tx')].map(x=>x.textContent).join(''):'';
    return {panel:!document.getElementById('aiPanel').hidden, note:n?n.textContent.replace(/\s+/g,' ').trim():'', top:g?Math.round(g.getBoundingClientRect().top):-1, txt:txt.replace(/\s+/g,''), lock:getComputedStyle(document.body).overflow, step:__aiProto.cur.step, url:location.search}; },title);
  ok('담기: AI 창이 닫히고 원고 화면으로', !after.panel && after.lock!=='hidden' && after.step==='done', JSON.stringify(after).slice(0,200));
  ok('담기: 담긴 쪽에 「✓ AI와 쓴 「제목」을 담았어요」 · 되돌리기 · AI와 더 고치기', after.note.includes(`AI와 쓴 「${title}」`) && after.note.includes('되돌리기') && after.note.includes('AI와 더 고치기'), after.note);
  ok('담기: 담긴 글이 큰 글자 원고로(글자 빠짐 없이)', after.txt.includes(revText.slice(0,40)) && after.txt.includes(revText.slice(-40)), after.txt.length+' / '+revText.length);
  ok('담기: 그 자리로 화면이 옮겨 감(위 줄에 가리지 않게)', after.top>=document_top && after.top<200, String(after.top));
  ok('담기: 주소에 ms=1 그대로', /ms=1/.test(after.url), after.url);
  // 담긴 글을 폰에서 바로 고치면 안내는 사라지고 책에 들어간다
  const k=await st(p,()=>document.querySelector('.ms-placed').closest('.ms-grp').querySelectorAll('.ms-tx')[1].dataset.k);
  await tap(p,`.ms-tx[data-k="${k}"]`); await typeEnd(p,k,' 손으로 덧붙임'); await tap(p,'#msDone'); await p.waitForTimeout(300);
  ok('담긴 글 고치기: 책에 들어감 · 안내 사라짐', await st(p,k=>{ const e=state.pages.flatMap(x=>x.els).find(x=>x.id===k); return plain(e.html).includes('손으로 덧붙임') && !document.querySelector('.ms-placed'); },k));
  // 「AI와 더 고치기」(아래 줄 AI 단추로도) → 창이 담은 뒤 화면으로 · 되돌리기
  await tap(p,'#msTools [data-ai]');
  ok('다시 AI 창: 담은 뒤 화면(퇴고 대화 이어 하기 · 되돌리기)', await p.locator('#aiPanel').isVisible() && await p.locator('#aiPanel [data-act=again]').count()===1);
  await p.click('#aiClose');
  // 다시 담기 → 원고 화면 「되돌리기」 → 담기 전으로
  const pagesPlaced=await st(p,()=>state.pages.length);
  await st(p,()=>{ undo(); }); await p.waitForTimeout(300);   // 손으로 고친 것부터 하나씩 되돌려 담기 전까지
  while(await st(p,()=>__aiProto.cur.step==='done')) { await st(p,()=>undo()); await p.waitForTimeout(150); }
  ok('되돌리기: AI 창은 「담을 자리 고르기」로 · 책은 담기 전', await st(p,n=>__aiProto.cur.step==='place'&&state.pages.length===n,n0), String(pagesPlaced));
  await tap(p,'#msAi'); await act('insert'); await p.waitForTimeout(300);
  ok('다시 담기 → 원고 화면 안내', await p.locator('.ms-placed').isVisible());
  await tap(p,'.ms-placed [data-undo]'); await p.waitForTimeout(400);
  ok('원고 화면 「되돌리기」: 담기 전 쪽 수 · 안내 사라짐 · AI는 「담을 자리 고르기」', await st(p,n=>state.pages.length===n && !document.querySelector('.ms-placed') && __aiProto.cur.step==='place',n0));
  ok('AI(가짜 답): 바깥으로 나간 요청 없음', out.length===0, out.join());
  await p.setViewportSize({width:320,height:640}); await p.waitForTimeout(200);
  ok('AI 단추가 붙어도 320px 가로 넘침 없음', await st(p,()=>document.documentElement.scrollWidth<=innerWidth && [...document.querySelectorAll('#msTools button:not([hidden])')].every(b=>b.scrollWidth<=b.clientWidth+1)));
  // 말로 하기(원고 글칸): 글칸을 누르면 아래 줄 위에 뜨고, 한 마디가 끝날 때마다 커서 자리에 들어가 책에 저장된다
  const mk2=await st(p,()=>{ const t=[...document.querySelectorAll('.ms-tx')].find(n=>!n.classList.contains('h')); return t.dataset.k; });
  ok('원고: 글칸을 누르기 전에는 「말로 하기」 없음', await st(p,()=>document.getElementById('msMic').hidden));
  await tap(p,`.ms-tx[data-k="${mk2}"]`);
  ok('원고: 글칸을 누르면 「🎤 말로 하기」가 뜸', await p.locator('#msMic').isVisible());
  await p.click('#msMic'); await say('그해 여름은 유난히 더웠다'); await p.click('#msMic'); await p.waitForTimeout(900);
  ok('원고: 말한 글이 글칸 끝에 들어가 책에 저장 · 듣기 끝', await st(p,k=>{ const e=state.pages.flatMap(x=>x.els).find(x=>x.id===k); return plain(e.html).includes('그해 여름은 유난히 더웠다') && !MoaVoice.active(); },mk2));
  await tap(p,'#msDone');
  ok('원고: 다 썼어요 → 「말로 하기」 숨김', await st(p,()=>document.getElementById('msMic').hidden));
  await c.close(); }

// ── 4. 체험(로그인 없음) 빈 책 · 로그인 필요한 내 책 ──
{ const c=await mk(devices['iPhone 13'],{login:false}); const p=watch(await c.newPage());
  await p.goto(`${U}/studio/?blank=1&ms=1`); await p.waitForSelector('.ms-grp'); await p.waitForTimeout(300);
  ok('체험(?ai=proto 없음): AI와 쓰기 단추 없음', await st(p,()=>document.getElementById('msAi').hidden && document.getElementById('msAiB').hidden && !document.getElementById('aiPanel')));
  ok('체험: 원고 화면이 뜸·「체험 중」 표시', await st(p,()=>document.querySelectorAll('.ms-grp').length>0 && /체험/.test(document.getElementById('msSave').textContent)), await st(p,()=>document.getElementById('msSave').textContent));
  await p.goto(`${U}/studio/?book=${BK}&ms=1`); await p.waitForTimeout(1500);
  ok('로그인 안 함: 「로그인이 필요해요」 안내가 보임', await st(p,()=>!!document.querySelector('.fatal') && getComputedStyle(document.getElementById('app')).visibility==='visible' && getComputedStyle(document.getElementById('app')).display!=='none'));
  await c.close(); }

ok('페이지 오류 없음', errs.length===0, errs.join(' | '));
await b.close(); srv.close();
