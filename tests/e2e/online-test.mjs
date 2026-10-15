import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import(R+'/playwright/index.mjs');
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/home/user/LiveBecomeHistory';
const types={'.html':'text/html','.js':'application/javascript'};
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':types[path.extname(f)]||'text/plain'});res.end(d);} }); }).listen(8780);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const FAKE=fs.readFileSync(process.argv[2],'utf8');
const now=new Date().toISOString();
const OLD='a12c83aa-33e6-49ed-91be-bc883000bb9e', OTHER='b0000000-0000-4000-8000-000000000009';
const M={img:'6584bdba-a887-4a12-af11-399f84d88ef5',vid:'c7fc822d-e3fd-4b8a-9717-0278145fa41c',aud:'4b176f40-9077-4275-8e5a-4bf9a3c7122c'};
const longText='<div>'+'어린 시절 바닷가 마을에서 자란 나는 파도 소리를 들으며 잠들곤 했다. '.repeat(30)+'</div>';
const seed={profiles:[{id:'u1',display_name:'김정선'}],
 books:[{id:OLD,owner_id:'u1',title:'한결C와 슬아',subtitle:'인물대백과사 첫 자서전',author_name:'김정선',format:'chapters',is_public:true,admin_hidden:false,deleted_at:null,published_at:now,created_at:now,updated_at:now},
        {id:OTHER,owner_id:'u9',title:'남의 책',author_name:'남',format:'pages',is_public:false,admin_hidden:false,deleted_at:null,created_at:now,updated_at:now}],
 chapters:[{id:'c0',book_id:OLD,position:0,title:'첫 번째 이야기',content:'인물대백과사에 오르는 첫 자서전<div>한결C와 슬아의 이야기</div>'+longText},
  {id:'c1',book_id:OLD,position:1,title:'새 이야기 2',content:`<p><img data-media="${M.img}"></p>`},
  {id:'c2',book_id:OLD,position:2,title:'새 이야기 3',content:`<p><video data-media="${M.vid}"></video></p>`},
  {id:'c3',book_id:OLD,position:3,title:'새 이야기 4',content:`너라는 등대<div><p><audio data-media="${M.aud}"></audio></p></div><div>한결C 작사/작곡</div>`}],
 media:[{id:M.img,book_id:OLD,owner_id:'u1',kind:'image',storage_path:'u1/old/i.jpeg',size_bytes:882011},{id:M.vid,book_id:OLD,owner_id:'u1',kind:'video',storage_path:'u1/old/v.mp4',size_bytes:1055560},{id:M.aud,book_id:OLD,owner_id:'u1',kind:'audio',storage_path:'u1/old/a.mp3',size_bytes:4042308}],
 pages:[]};
const ctx=await b.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
await ctx.addInitScript(s=>{ window.__seed=s; if(!localStorage.getItem('fakeSession')&&!localStorage.getItem('noLogin')) localStorage.setItem('fakeSession',JSON.stringify({user:{id:'u1',email:'writer@example.com'}})); },seed);
await ctx.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:FAKE}));
await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('dialog',d=>d.accept().catch(()=>{}));
const ok=(n,c)=>console.log((c?'PASS ':'FAIL ')+n); const st=(f,a)=>pg.evaluate(f,a);
const U='http://localhost:8780';
// 책 보기는 보이는 쪽만 그리므로, 모든 쪽을 확인할 때는 펼침면을 차례로 넘기며 모은다
const walk=(pg,sel,fnSrc)=>pg.evaluate(([sel,fnSrc])=>{ const c=document.querySelector(sel), v=c._bv, f=new Function('p','return ('+fnSrc+')(p)'), out=[]; const back=v.current;
  for(let i=0;i<v.count;i+=(v.spread?2:1)){ v.go(i,false); c.querySelectorAll('.bv-page').forEach(p=>out.push(f(p))); } v.go(back,false); return out; },[sel,fnSrc]);


// 1) 옛 책 → 새 편집기로 옮기기
await pg.goto(`${U}/studio/?book=${OLD}`); await pg.waitForSelector('#canvas .pg'); await pg.waitForTimeout(2500);
const conv=await st(()=>({n:state.pages.length, names:state.pages.map(p=>p.name), fmt:__db.books.find(b=>b.title==='한결C와 슬아').format, saved:__db.pages.length, ch:__db.chapters.length}));
console.log('  옮긴 페이지:',conv.names.join(' | '));
ok('옛 책을 페이지로 옮김(표지+글+사진·영상·음악 페이지)', conv.names[0]==='표지' && conv.names.includes('이미지 페이지') && conv.names.includes('영상 페이지') && conv.names.includes('음악 페이지'));
ok('긴 글은 자동으로 다음 페이지로 나뉨', conv.names.some(n=>n.includes('(이어서)')));
ok('책 형식이 pages로 바뀜', conv.fmt==='pages');
ok('옮긴 페이지가 DB에 저장됨', conv.saved===conv.n);
ok('원본(장) 글은 지우지 않고 보관', conv.ch===4);
ok('DB에는 미디어 주소(src)를 저장하지 않고 번호만', await st(()=>__db.pages.every(p=>p.els.every(e=>!('src' in e))) && __db.pages.some(p=>p.els.some(e=>e.media_id))));
ok('저장 표시: 모든 변경사항 저장됨', (await pg.locator('#save').innerText()).includes('저장됨'));
ok('글자 손실 없음(옮기기 전후 글자 수 동일)', await st(()=>{ const all=state.pages.flatMap(p=>p.els.filter(e=>e.type==='text').map(e=>plain(e.html))).join('').replace(/\s/g,''); return all.includes('한결C와슬아의이야기') && all.includes('너라는등대') && (all.match(/파도소리를/g)||[]).length===30; }));
await pg.screenshot({path:'/tmp/online-1.png'});

// 2) 글 쓰기 → 자동 저장
await pg.locator('.th').nth(1).click(); await pg.click('[data-add=text]').catch(()=>{}); await pg.waitForTimeout(100);
await pg.keyboard.type('자동 저장 시험 문장');
await pg.waitForTimeout(2200);
ok('쓴 글이 1.5초 안팎으로 자동 저장', await st(()=>__db.pages.some(p=>p.els.some(e=>e.type==='text'&&(e.html||'').includes('자동 저장 시험')))));
await pg.keyboard.press('Escape');
// 제목 변경
await pg.fill('#title','한결C와 슬아 (개정판)'); await pg.waitForTimeout(2000);
ok('책 제목 변경 저장', await st(()=>__db.books.find(b=>b.id==='a12c83aa-33e6-49ed-91be-bc883000bb9e').title)==='한결C와 슬아 (개정판)');
// 사진 올리기
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==','base64');
const media0=await st(()=>__db.media.length);
await pg.click('[data-add=image]'); await pg.setInputFiles('#file',{name:'새사진.png',mimeType:'image/png',buffer:png}); await pg.waitForTimeout(2500);
ok('올리기는 media 함수(upload→commit)로', await pg.evaluate(()=>{ const a=(window.__mediaCalls||[]).map(c=>c.action); return a.includes('upload')&&a.includes('commit')&&a.includes('sign'); }));
ok('브라우저가 저장소 주소를 직접 만들지 않음', await pg.evaluate(()=>!window.__directStorage));
ok('사진이 저장소+media 표에 올라감', (await st(()=>__db.media.length))===media0+1 && await st(()=>Object.keys(__files).length>=1));
ok('새 사진 페이지가 media 번호로 저장', await st(()=>{ const m=__db.media[__db.media.length-1]; return __db.pages.some(p=>p.els.some(e=>e.media_id===m.id)); }));
// 페이지 삭제 → DB에서도 삭제
const nBefore=await st(()=>__db.pages.length);
await pg.locator('.th.on').hover(); await pg.locator('.th.on [data-act=del]').click(); await pg.waitForTimeout(2200);
ok('페이지 삭제가 DB에도 반영', (await st(()=>__db.pages.length))===nBefore-1);
// 새로고침해도 그대로
const snapBefore=await st(()=>state.pages.map(p=>p.id).join(','));
await pg.reload(); await pg.waitForSelector('#canvas .pg'); await pg.waitForTimeout(800);
ok('새로고침해도 페이지 그대로', (await st(()=>state.pages.map(p=>p.id).join(',')))===snapBefore);
ok('새로고침 뒤 쓴 글·제목 유지', await st(()=>state.pages.some(p=>p.els.some(e=>(e.html||'').includes('자동 저장 시험')))) && (await pg.inputValue('#title'))==='한결C와 슬아 (개정판)');
ok('새로고침 뒤 사진 다시 보임(새 주소 발급)', await st(()=>[...document.querySelectorAll('.th img')].length>0));
ok('옮기기를 두 번 하지 않음', (await st(()=>__db.pages.length))===nBefore-1);
// ── 초안 → 발행 ──
ok('옮긴 뒤(발행본 없음): 「다시 발행」 + 「고친 내용 있음」', (await pg.locator('#btnPublish').innerText()).includes('다시 발행') && (await pg.locator('#pubState').innerText()).includes('고친 내용'));
const OLDID='a12c83aa-33e6-49ed-91be-bc883000bb9e';
const shelfText=async()=>{ const p2=await ctx.newPage(); await p2.goto(`${U}/shelf/#/book/${OLDID}`); await p2.waitForSelector('.reader'); await p2.waitForTimeout(500); const t=await p2.locator('.reader').innerText(); const old=await p2.locator('.ch').count()>0?1:0; const n=await p2.evaluate(()=>{ const c=document.getElementById('flip'); return c&&c._bv?c._bv.count:document.querySelectorAll('.bk-pg').length; }); const t2=await p2.evaluate(()=>{ const c=document.getElementById('flip'); if(!c||!c._bv) return ''; let s=''; for(let i=0;i<c._bv.count;i+=(c._bv.spread?2:1)){ c._bv.go(i,false); s+=c.innerText; } return s; }); await p2.close(); return {t:t+t2,old,n}; };
let sv=await shelfText();
ok('발행 전 서가: 옛 발행 내용(장) 그대로, 초안은 안 보임', sv.old===1 && sv.n===0 && !sv.t.includes('자동 저장 시험'));
await pg.click('#btnPublish'); await pg.waitForTimeout(600);
ok('「다시 발행」 → 발행본 저장', await st(()=>{ const s=__db.book_snapshots&&__db.book_snapshots.find(x=>x.book_id==='a12c83aa-33e6-49ed-91be-bc883000bb9e'); return !!s && s.pages.length===state.pages.length; }));
ok('발행 뒤 상태: 「발행됨 ✓」', (await pg.locator('#btnPublish').innerText()).includes('발행됨') && (await pg.locator('#pubState').innerText()).includes('발행됨'));
sv=await shelfText(); ok('발행 뒤 서가: 새 페이지 모양 + 초안 글 반영', sv.n>3 && sv.t.includes('자동 저장 시험'));
// 발행 뒤 고치기 → 서가는 그대로
await pg.locator('.th').nth(1).click(); await pg.waitForTimeout(100);
const tb2=pg.locator('#canvas .el.t').first(); const bb2=await tb2.boundingBox(); await pg.mouse.click(bb2.x+bb2.width-4,bb2.y+bb2.height-4); await pg.keyboard.press('End'); await pg.keyboard.type(' 발행후수정'); await pg.keyboard.press('Escape'); await pg.waitForTimeout(2200);
ok('발행 뒤 고치면 「고친 내용 있음 · 서가에는 이전 발행본」', (await pg.locator('#pubState').innerText()).includes('이전 발행본') && (await pg.locator('#btnPublish').innerText()).includes('다시 발행'));
sv=await shelfText(); ok('서가 독자는 고치기 전 발행본을 봄', !sv.t.includes('발행후수정'));
await pg.click('#btnPublish'); await pg.waitForTimeout(600);
sv=await shelfText(); ok('다시 발행하면 서가에 반영', sv.t.includes('발행후수정'));
// 내리기 / 다시 발행
await pg.click('#btnUnpub'); await pg.waitForTimeout(400);
ok('서가에서 내리기', await st(()=>__db.books.find(b=>b.title.startsWith('한결C')).is_public===false) && (await pg.locator('#btnPublish').innerText()).includes('발행하기') && await pg.locator('#btnUnpub').isHidden());
await pg.click('#btnPublish'); await pg.waitForTimeout(600);
ok('다시 발행하기', await st(()=>__db.books.find(b=>b.title.startsWith('한결C')).is_public===true));
// ── 내려받기: 화면용 / 인쇄용(QR) ──
await pg.click('#btnExport'); await pg.waitForSelector('#exDlg:not([hidden])');
ok('내려받기 누르면 화면용 / 인쇄용 선택', await pg.locator('#exDlg [data-ex]').count()===2);
await pg.screenshot({path:'/tmp/export-dlg.png'});
const [dlp]=await Promise.all([pg.waitForEvent('download'),pg.click('#exDlg [data-ex=print]')]); await dlp.saveAs('/tmp/online-print.html'); const hp=fs.readFileSync('/tmp/online-print.html','utf8');
const nAV=await st(()=>state.pages.flatMap(p=>p.els).filter(e=>e.type==='video'||e.type==='audio').length);
ok('인쇄용: 영상·노래 자리마다 QR 코드 자동', (hp.match(/class="qr"/g)||[]).length===nAV && nAV>=2 && !/<video|<audio/.test(hp)); console.log('  QR 개수:',nAV);
ok('인쇄용: 사진은 그대로·신국판 인쇄 설정·스크립트 없음', /<img[^>]*src="data:/.test(hp) && hp.includes('size:152mm 225mm') && !/<script/i.test(hp));
ok('QR이 가리키는 주소 = 서가의 그 영상·노래', await st(()=>mediaLink({media_id:'abc'}).endsWith('/shelf/#/book/a12c83aa-33e6-49ed-91be-bc883000bb9e/m/abc')));
fs.writeFileSync('/tmp/print-preview.html',hp);
await pg.click('#btnExport'); await pg.waitForSelector('#exDlg:not([hidden])');
const [dl]=await Promise.all([pg.waitForEvent('download'),pg.click('#exDlg [data-ex=screen]')]); await dl.saveAs('/tmp/online-export.html'); const h=fs.readFileSync('/tmp/online-export.html','utf8');
{ const ex=await ctx.newPage(); await ex.goto('file:///tmp/online-export.html'); await ex.waitForSelector('.bv-page'); await ex.waitForTimeout(300);
  const all=await walk(ex,'#book',"p=>({img:[...p.querySelectorAll('img')].map(i=>i.src.slice(0,5)), vid:[...p.querySelectorAll('video')].map(v=>v.src.slice(0,5)), aud:[...p.querySelectorAll('.ap')].map(a=>a._audio&&a._audio.src.slice(0,5))})");
  const flat=k=>all.flatMap(x=>x[k]);
  const r={n:all.length, img:flat('img').length>0&&flat('img').every(x=>x==='data:'), vid:flat('vid').length>0&&flat('vid').every(x=>x==='data:'), aud:flat('aud').length>0&&flat('aud').every(x=>x==='data:'), spread:await ex.evaluate(()=>document.getElementById('book')._bv.spread)};
  ok('내려받기: 사진·영상·노래를 파일 안에(data:) · 두 쪽 펼침 책', r.img&&r.vid&&r.aud&&r.n>3&&r.spread && !/supabase\.co/.test(h)); console.log('  ',JSON.stringify(r)); await ex.close(); }
// 3) 서가: 페이지 모양 그대로
await pg.goto(`${U}/shelf/#/book/${OLD}`); await pg.waitForSelector('.bk-pg'); await pg.waitForTimeout(400);
{ await pg.evaluate(()=>localStorage.setItem('mediaDown','1')); await pg.reload(); await pg.waitForSelector('.bk-pg'); await pg.waitForTimeout(600);
  ok('창구가 멈춰도 서가 사진은 예전 방식으로 서명됨', await pg.evaluate(async()=>{ const m=__db.media.find(x=>x.storage_path); const sb=supabase.createClient(); const u=await MediaClient.sign(sb,[m],3600); return !!window.__directStorage && !!u[m.id]; }));
  await pg.evaluate(()=>localStorage.removeItem('mediaDown')); await pg.reload(); await pg.waitForSelector('.bk-pg'); await pg.waitForTimeout(400); }
ok('서가: media 함수로 서명 · 직접 접근 없음', await pg.evaluate(()=>(window.__mediaCalls||[]).some(c=>c.action==='sign')&&!window.__directStorage));
const shelfAll=await walk(pg,'#flip',"p=>({pg:p.querySelectorAll('.bk-pg').length, img:p.querySelectorAll('.bk-pg img').length, vid:p.querySelectorAll('.bk-pg video[controls]').length, ap:p.querySelectorAll('.bk-pg .ap .ap-bar').length, aud:p.querySelectorAll('audio[controls]').length})");
const sum=k=>shelfAll.reduce((a,x)=>a+x[k],0);
const nShelf=sum('pg'); const nPages=await st(()=>__db.pages.filter(p=>p.book_id==='a12c83aa-33e6-49ed-91be-bc883000bb9e').length);
ok('서가: 모든 페이지를 페이지 모양으로', nShelf===nPages && nShelf>3); console.log('  서가 페이지:',nShelf);
ok('서가: 사진·영상 표시 + 노래는 내려받기 없는 재생기', sum('img')>=1 && sum('vid')===1 && sum('ap')===1 && sum('aud')===0);
// 영상·사진이 있는 쪽으로 넘겨 두고 보호 장치 확인
await pg.evaluate(()=>{ const c=document.getElementById('flip'), v=c._bv; for(let i=0;i<v.count;i+=(v.spread?2:1)){ v.go(i,false); if(c.querySelector('.bk-pg video')) return; } }); await pg.waitForTimeout(200);
// ── 저작권 보호 ──
ok('서가: 인쇄·PDF 버튼 없음(누구에게도)', await pg.locator('#printBtn').count()===0 && (await pg.locator('#app').innerText()).includes('저작권 보호'));
ok('영상: 내려받기·PIP 메뉴 숨김', await pg.evaluate(()=>{ const v=document.querySelector('.bk-pg video'); return /nodownload/.test(v.getAttribute('controlslist')) && v.disablePictureInPicture; }));
const blocked=await pg.evaluate(()=>{ const r=document.querySelector('.reader'); const res={};
  for(const t of ['contextmenu','copy','dragstart']){ const e=new Event(t,{bubbles:true,cancelable:true}); document.querySelector('.bk-pg .tx, .bk-pg img, .bk-pg video').dispatchEvent(e); res[t]=e.defaultPrevented; }
  res.select=getComputedStyle(r).userSelect; const im=document.querySelector('.bk-pg img')||(()=>{ const c=document.getElementById('flip'),v=c._bv; for(let i=0;i<v.count;i+=(v.spread?2:1)){ v.go(i,false); const x=c.querySelector('.bk-pg img'); if(x) return x; } })(); res.imgPE=getComputedStyle(im).pointerEvents; return res; });
ok('우클릭·복사·끌기 막힘, 글 선택 불가, 사진 길게 눌러 저장 불가', blocked.contextmenu && blocked.copy && blocked.dragstart && blocked.select==='none' && blocked.imgPE==='none'); console.log('  ',JSON.stringify(blocked));
await pg.emulateMedia({media:'print'});
const pr=await pg.evaluate(()=>({app:getComputedStyle(document.getElementById('app')).display, msg:getComputedStyle(document.body,'::before').content}));
ok('인쇄(Ctrl+P)하면 책 대신 「인쇄할 수 없어요」', pr.app==='none' && pr.msg.includes('인쇄할 수 없어요'));
await pg.emulateMedia({media:'screen'});
ok('Ctrl+P·Ctrl+S 단축키 막힘', await pg.evaluate(()=>{ const e=new KeyboardEvent('keydown',{key:'p',ctrlKey:true,bubbles:true,cancelable:true}); document.dispatchEvent(e); const e2=new KeyboardEvent('keydown',{key:'s',ctrlKey:true,bubbles:true,cancelable:true}); document.dispatchEvent(e2); return e.defaultPrevented&&e2.defaultPrevented; }));
// ── 가로 넘김 ──
await pg.evaluate(()=>document.getElementById('flip')._bv.go(0,false));
ok('서가: 두 쪽 펼침(1–2쪽) + 쪽 번호', (await pg.locator('.bv-no').innerText()).startsWith('1–2 /') && await pg.locator('#flip .bv-page').count()===2 && await pg.locator('#flip .bv-num').allInnerTexts().then(t=>t.join()==='1,2'));
await pg.click('.bv-next'); await pg.waitForTimeout(250); ok('서가: 넘기는 중 책장 효과(넘어가는 장)', await pg.locator('#flip .bv-leaf').count()===1);
await pg.waitForTimeout(1000); ok('서가: 다음 펼침(3–4쪽)', (await pg.locator('.bv-no').innerText()).startsWith('3–4 /') && await pg.locator('#flip .bv-leaf').count()===0);
await pg.mouse.move(720,400); await pg.mouse.wheel(0,150); await pg.waitForTimeout(1100); ok('서가: 스크롤(휠)로 넘기기 → 5–6쪽', (await pg.locator('.bv-no').innerText()).startsWith('5–6 /'));
await pg.keyboard.press('ArrowLeft'); await pg.waitForTimeout(1100); ok('서가: ← 키로 앞 펼침', (await pg.locator('.bv-no').innerText()).startsWith('3–4 /'));
// 노래: 쪽을 넘겨도 멈추지 않고 계속(사용자가 멈출 때까지)
{ const r=await pg.evaluate(async()=>{ const c=document.getElementById('flip'), v=c._bv; let i=0; for(;i<v.count;i+=(v.spread?2:1)){ v.go(i,false); if(c.querySelector('.ap')) break; }
    const ap=c.querySelector('.ap'), a=ap._audio; let pauses=0; a.pause=()=>{ pauses++; };
    Object.defineProperty(a,'paused',{configurable:true,get:()=>false}); a.dispatchEvent(new Event('play'));
    const barWhileVisible=!c.querySelector('.bv-now').hidden;
    v.go(i>=2?i-2:i+2,false); await new Promise(r=>setTimeout(r,50));
    const barAway=!c.querySelector('.bv-now').hidden;
    v.go(i,false); const same=c.querySelector('.ap')._audio===a;
    c.querySelector('.bv-stop')&&(c.querySelector('.bv-now').hidden=false);
    delete a.paused; delete a.pause; return {pauses,barWhileVisible,barAway,same}; });
  ok('노래: 쪽을 넘겨도 멈추지 않음', r.pauses===0);
  ok('노래 쪽이 안 보이면 아래에 「재생 중 · 멈춤」 막대, 보이면 숨김', r.barAway && !r.barWhileVisible);
  ok('노래 쪽으로 돌아오면 같은 노래(두 곡이 겹치지 않음)', r.same); console.log('  ',JSON.stringify(r)); }
// 쪽 바로가기(QR용)
await pg.goto(`${U}/shelf/#/book/${OLD}/p/5`); await pg.waitForSelector('.bk-pg'); await pg.waitForTimeout(1300);
console.log('  c4 top:', await pg.evaluate(()=>[document.getElementById('c4')?.getBoundingClientRect().top, scrollY, location.hash])); ok('쪽 바로가기 #/book/<id>/p/5 → 5쪽이 있는 펼침(5–6쪽)', (await pg.locator('.bv-no').innerText()).startsWith('5–6 /') && await pg.locator('#c4').count()===1);
const vidId=await pg.evaluate(()=>0); const mid=await (async()=>{ const p3=await ctx.newPage(); await p3.goto(`${U}/editor/`); const v=await p3.evaluate(()=>{ const sn=__db.book_snapshots.find(x=>x.book_id==='a12c83aa-33e6-49ed-91be-bc883000bb9e'); let idx=-1,id=null; sn.pages.forEach((p,i)=>p.els.forEach(e=>{ if(e.type==='audio'){ idx=i; id=e.media_id; } })); return {idx,id}; }); await p3.close(); return v; })();
await pg.goto(`${U}/shelf/#/book/${OLD}/m/${mid.id}`); await pg.waitForSelector('.bk-pg'); await pg.waitForTimeout(1300);
ok('QR 주소(#/m/노래번호) → 노래가 있는 쪽으로 이동', await pg.evaluate(i=>!!document.getElementById('c'+i) && !!document.querySelector('#c'+i+' .ap'), mid.idx));
// 4) 보안: 누가 DB에 위험한 페이지 데이터를 넣어도 서가에서 무력화
await st(()=>{ __db.book_snapshots.find(x=>x.book_id==='a12c83aa-33e6-49ed-91be-bc883000bb9e').pages.push({id:'99999999-0000-4000-8000-000000000001',book_id:'a12c83aa-33e6-49ed-91be-bc883000bb9e',position:999,name:'x',bg:'red;background:url(//evil)',els:[{type:'text',html:'<img src=x onerror="window.__xss=1">안전<script>window.__xss=2</script>',color:'red;background:url(//evil)',x:'1e9',y:-5,w:'abc',h:10,fs:'999px'},{type:'image',media_id:'nope',src:'javascript:alert(1)'},{type:'iframe',html:'x'}]}); __persist(); });
await pg.reload(); await pg.waitForSelector('.bk-pg'); await pg.waitForTimeout(400);
await pg.evaluate(()=>{ const v=document.getElementById('flip')._bv; v.go(v.count-1,false); }); await pg.waitForTimeout(200);
const last=pg.locator('.bk-pg').last();
ok('서가 보안: 스크립트·onerror 실행 안 됨', !(await st(()=>window.__xss)) && (await last.innerHTML()).includes('안전') && !/onerror|<script|<img/.test(await last.innerHTML()));
ok('서가 보안: 이상한 색·배경·좌표 값 무시', await last.evaluate(n=>{ const tx=n.querySelector('.tx'); return n.style.background.startsWith('rgb(255, 255, 255)') && tx.style.color==='rgb(27, 43, 37)' && !/url/.test(n.getAttribute('style')+tx.getAttribute('style')); }));
ok('서가 보안: 저장된 주소(src)는 쓰지 않음 · 모르는 종류 무시', !(await last.innerHTML()).includes('javascript:') && !(await last.innerHTML()).includes('iframe'));
// 5) 서재에서 새 형식 책 열기
await pg.goto(`${U}/editor/`); await pg.waitForSelector('.book');
await pg.locator('.book',{hasText:'한결C'}).click(); await pg.waitForURL(/studio\/\?book=/);
ok('서재: 새 형식 책은 스튜디오로 열림', pg.url().includes(OLD));
// 6) 남의 책 / 로그아웃
await pg.goto(`${U}/studio/?book=${OTHER}`); await pg.waitForSelector('.fatal');
ok('남의 책은 열 수 없음', (await pg.locator('.fatal h2').innerText()).includes('열 수 없어요'));
await st(()=>{ localStorage.removeItem('fakeSession'); localStorage.setItem('noLogin','1'); }); await pg.goto(`${U}/studio/?book=${OLD}`); await pg.waitForSelector('.fatal');
ok('로그인 안 하면 로그인 안내', (await pg.locator('.fatal h2').innerText()).includes('로그인'));
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
