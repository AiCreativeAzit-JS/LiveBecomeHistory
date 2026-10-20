// 끊김·로그인 풀림에도 글이 남는다: 레드팀 1단계(2026-10-20) RT-102(끊긴 채 떠나면 유실 → 기기 사본·복구 제안)·RT-103(로그인 만료를 「인터넷」으로 오안내·재로그인 길 없음) → D14·D15
// 가짜 Supabase의 __failWrite(끊김)·__authExpired(로그인 풀림)·__denyWrite(권한 없음)·__fireAuth 로 시험한다
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import((p=>/^[A-Za-z]:/.test(p)?'file:///'+p.replace(/\\/g,'/'):p)(R+'/playwright/index.mjs'));
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=process.env.MOA_ROOT||'/home/user/LiveBecomeHistory';
const types={'.html':'text/html','.js':'application/javascript'};
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':types[path.extname(f)]||'text/plain'});res.end(d);} }); }).listen(8794);
const b=await chromium.launch({executablePath:process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const FAKE=fs.readFileSync(process.argv[2],'utf8'); const now=new Date().toISOString(); const U='http://localhost:8794';
const ok=(n,c,info='')=>console.log((c?'PASS ':'FAIL ')+n+(info&&!c?'  ← '+info:''));
const BK='8e000000-0000-4000-8000-000000000001';
const TX=(id,html)=>({id,type:'text',x:16,y:18,w:120,h:189,html,fs:12,align:'left',color:'#1B2B25',font:'serif'});
const seed={profiles:[{id:'u1',display_name:'김정선'}],
 books:[{id:BK,owner_id:'u1',title:'복구 시험',author_name:'김정선',format:'pages',is_public:false,admin_hidden:false,deleted_at:null,created_at:now,updated_at:now,rev:0}],
 pages:[{id:'8e100000-0000-4000-8000-000000000001',book_id:BK,position:0,name:'이야기',bg:'#FFFFFF',flow_from:null,els:[TX('e1','시작')]}]};
const ctx=await b.newContext({viewport:{width:1440,height:1000}});
await ctx.addInitScript(s=>{ window.__seed=s; localStorage.setItem('fakeSession',JSON.stringify({user:{id:'u1',email:'a@b.c'}})); },seed);
await ctx.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:FAKE}));
await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
const errs=[]; let pg;
const st=(f,a)=>pg.evaluate(f,a);
const open=async(q='')=>{ if(pg) await pg.close(); pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('dialog',d=>d.accept().catch(()=>{}));
  await pg.goto(`${U}/studio/?book=${BK}${q}`); await pg.waitForSelector('#canvas .pg'); await pg.waitForTimeout(500); };
const reload=async()=>{ await pg.goto(`${U}/studio/?book=${BK}`); await pg.waitForSelector('#canvas .pg'); await pg.waitForTimeout(500); };
const typeIn=async(text)=>{ await st(()=>goPage(0)); await pg.waitForTimeout(80); const bb=await pg.locator('#canvas .el[data-id="e1"]').boundingBox(); await pg.mouse.click(bb.x+bb.width/2,bb.y+20); await pg.keyboard.press('Control+End'); await pg.keyboard.type(text); await pg.keyboard.press('Escape'); };
const saveState=()=>st(()=>document.getElementById('save').dataset.state);
const saveText=()=>pg.locator('#save').innerText();
const waitState=async(want,ms=8000)=>{ for(let t=0;t<ms;t+=50){ if((await saveState())===want) return true; await pg.waitForTimeout(50); } return false; };
const waitSaved=async(ms=6000)=>{ for(let t=0;t<ms;t+=50){ if(await st(()=>document.getElementById('save').dataset.state==='ok' && serialize()===lastSaved)) return true; await pg.waitForTimeout(50); } return false; };
const local=()=>st(async()=>{ const d=await DemoDraft.get('book:'+BOOK); return d?{rev:d.rev,text:d.pages.map(p=>p.els.map(e=>plain(e.html||'')).join('|')).join('/')}:null; });
const dbText=()=>st(()=>{ const d=JSON.parse(localStorage.getItem('fakeDB')||'null'); const p=d&&d.pages.find(p=>p.book_id===BOOK); return p?plain(p.els[0].html):'(없음)'; });
const text0=()=>st(()=>plain(state.pages[0].els[0].html));
{ const p=await ctx.newPage(); await p.goto(U+'/lib/demo-draft.js'); await p.evaluate(()=>new Promise(r=>{ const q=indexedDB.deleteDatabase('moa-demo'); q.onsuccess=q.onerror=q.onblocked=()=>r(); })); await p.close(); } // 처음 한 번만 새 기기처럼(새로고침 뒤에는 사본이 남아 있어야 한다)
await open();

/* ── 평소: 1.5초 안에 저장되면 기기 사본을 남기지 않는다 ── */
await typeIn(' 평소'); ok('준비: 평소 저장 ✓', await waitSaved()); await pg.waitForTimeout(4000);
ok('D14 저장이 잘 될 때는 기기에 사본을 남기지 않음', (await local())===null, JSON.stringify(await local()));

/* ── RT-102: 끊긴 채 쓰고 새로고침 → 복구 제안 ── */
await st(()=>{ window.__failWrite=true; }); await typeIn(' 끊김복구'); ok('준비: 끊김 → 저장 실패 표시', await waitState('err'));
await pg.waitForTimeout(4800);
const l1=await local(); ok('RT-102 저장 실패 상태가 이어지면 기기(IndexedDB)에 사본이 남음', !!l1 && /끊김복구/.test(l1.text), JSON.stringify(l1));
await reload();   // 새로고침(떠나기 확인은 자동 수락) — 새 화면에서는 인터넷이 돌아온 셈(__failWrite 없음)
ok('RT-102 다시 열면 「저장되지 못한 수정이 있어요」 복구 제안', await pg.locator('#rcDlg').isVisible() && await pg.locator('#rcStale').isHidden());
ok('RT-102 복구 전에는 서버 내용(끊김복구 없음)', !/끊김복구/.test(await dbText()));
await pg.click('#rcDlg [data-rc="restore"]');
ok('RT-102 「되살리기」 → 그 문장이 화면에 돌아오고 바로 저장됨 ✓', await waitSaved() && /끊김복구/.test(await text0()) && /끊김복구/.test(await dbText()), `${await text0()} / DB: ${await dbText()}`);
await pg.waitForTimeout(2000);
ok('D14 저장되면 기기 사본은 지워짐', (await local())===null, JSON.stringify(await local()));

/* ── 복구 거절: 「서버에 저장된 내용 그대로」 ── */
await st(()=>{ window.__failWrite=true; }); await typeIn(' 버릴글'); await waitState('err'); await pg.waitForTimeout(4800);
ok('준비: 사본 있음', /버릴글/.test(((await local())||{}).text||''));
await reload(); ok('준비: 복구 제안', await pg.locator('#rcDlg').isVisible());
await pg.click('#rcDlg [data-rc="drop"]'); await pg.waitForTimeout(500);
ok('D14 「서버 내용 그대로」 → 사본 지워지고 서버 내용만', (await local())===null && !/버릴글/.test(await text0()) && (await saveState())==='ok');
/* ── 사본을 남긴 뒤 다른 곳에서 저장됐으면: 경고 + 되살리면 어느 쪽을 남길지 묻는다 ── */
await st(()=>{ window.__failWrite=true; }); await typeIn(' 늦은사본'); await waitState('err'); await pg.waitForTimeout(4800);
await st(()=>{ const d=JSON.parse(localStorage.getItem('fakeDB')); d.books[0].rev=(d.books[0].rev||0)+1; d.pages[0].els[0].html='다른 기기에서 고친 글'; localStorage.setItem('fakeDB',JSON.stringify(d)); }); // 다른 기기가 먼저 저장한 셈
await reload();
ok('D14 사본 뒤에 다른 곳에서 저장됐으면 그 사실을 알림', await pg.locator('#rcDlg').isVisible() && await pg.locator('#rcStale').isVisible());
await pg.click('#rcDlg [data-rc="restore"]');
ok('D14 그래도 되살리면 저장 때 「다른 곳에서 바뀌었어요」로 묻는다(덮어쓰지 않음)', await (async()=>{ for(let t=0;t<8000;t+=100){ if(await pg.locator('#cfDlg').isVisible()) return true; await pg.waitForTimeout(100); } return false; })() && /다른 기기에서 고친 글/.test(await dbText()), await dbText());
await pg.click('#cfDlg [data-cf="reload"]'); await pg.waitForTimeout(600);
ok('준비: 최신 내용으로 정리', /다른 기기에서 고친 글/.test(await text0()) && (await saveState())==='ok');

/* ── RT-103: 로그인이 풀리면 바른 안내 + 재로그인 창 + 이어서 저장 ── */
await st(()=>{ window.__authExpired=true; }); await typeIn(' 만료문장');
ok('RT-103 저장 실패를 「로그인이 풀렸어요」로 안내(인터넷 탓이 아님)', await waitState('auth') && /로그인이 풀렸어요/.test(await saveText()) && !/인터넷/.test(await saveText()), await saveText());
ok('RT-103 편집 화면 위에 재로그인 창(이메일 채워짐 · 글은 그대로)', await pg.locator('#reDlg').isVisible() && (await pg.inputValue('#reEm'))==='a@b.c' && /만료문장/.test(await text0()));
ok('RT-103 다시 로그인하기 전까지 화면은 떠나지 않고 계속 쓸 수 있음', await st(()=>document.querySelector('#canvas .pg')!==null && !document.getElementById('center').querySelector('.fatal')));
await pg.fill('#rePw','password123'); await pg.click('#reGo');
ok('RT-103 다시 로그인하면 그 글이 저장됨 ✓ · 창 닫힘', await waitSaved() && /만료문장/.test(await dbText()) && await pg.locator('#reDlg').isHidden(), `${await saveState()} / ${await dbText()}`);
/* 틀린 비밀번호 · 다른 계정 */
await st(()=>{ window.__authExpired=true; }); await typeIn(' 만료2'); await waitState('auth');
await pg.fill('#rePw','wrong'); await pg.click('#reGo'); await pg.waitForTimeout(300);
ok('RT-103 비밀번호가 틀리면 창에 안내하고 글은 그대로', /비밀번호/.test(await pg.locator('#reOut').innerText()) && /만료2/.test(await text0()));
await st(()=>{ document.getElementById('reEm').value='admin@b.c'; }); await pg.fill('#rePw','password123'); await pg.click('#reGo'); await pg.waitForTimeout(600);
ok('RT-103 다른 계정으로 로그인하면 「이 책의 작가 계정으로」 안내', /작가 계정/.test(await pg.locator('#reOut').innerText()));
await st(()=>{ document.getElementById('reEm').value='a@b.c'; }); await pg.fill('#rePw','password123'); await pg.click('#reGo');
ok('RT-103 작가 계정으로 다시 로그인 → 저장 ✓', await waitSaved() && /만료2/.test(await dbText()), await dbText());
/* 로그아웃 알림(다른 기기에서 로그아웃·토큰 갱신 실패) → 쓰기 전에 바로 안내 */
await st(()=>{ window.__authExpired=true; window.__fireAuth('SIGNED_OUT',null); }); await pg.waitForTimeout(200);
ok('RT-103 로그인 상태 변화(SIGNED_OUT)를 받으면 바로 재로그인 창', await pg.locator('#reDlg').isVisible() && (await saveState())==='auth');
await pg.fill('#rePw','password123'); await pg.click('#reGo'); await pg.waitForTimeout(400);
ok('RT-103 재로그인 뒤 ✓', await waitSaved() && await pg.locator('#reDlg').isHidden());
/* 권한 없음(계정 승인 대기 등)은 로그인과 구분해 안내 */
await st(()=>{ window.__denyWrite=true; }); await typeIn(' 권한');
ok('D15 권한 없음(42501, 로그인은 살아 있음)은 「저장할 권한이 없어요」로 구분', await waitState('perm') && /권한/.test(await saveText()) && await pg.locator('#reDlg').isHidden(), await saveText());
await st(()=>{ window.__denyWrite=false; nextSaveAt=0; });
ok('준비: 권한이 돌아오면 저장 ✓', await waitSaved(8000));
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
