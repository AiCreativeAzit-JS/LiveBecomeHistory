// 동시 편집·한 묶음 저장: 레드팀 1단계(2026-10-20) RT-101(두 곳에서 열면 나중 저장이 책 전체를 덮어씀)·RT-104(삭제만 실패하면 유령 쪽·재시도 폭주) → D13·D16
// 가짜 Supabase의 save_pages(판 번호 rev 검사)·__failWrite·__multiTab(같은 브라우저 두 탭이 한 서버를 보게)으로 시험한다
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import((p=>/^[A-Za-z]:/.test(p)?'file:///'+p.replace(/\\/g,'/'):p)(R+'/playwright/index.mjs'));
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=process.env.MOA_ROOT||'/home/user/LiveBecomeHistory';
const types={'.html':'text/html','.js':'application/javascript'};
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':types[path.extname(f)]||'text/plain'});res.end(d);} }); }).listen(8793);
const b=await chromium.launch({executablePath:process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const FAKE=fs.readFileSync(process.argv[2],'utf8'); const now=new Date().toISOString(); const U='http://localhost:8793';
const ok=(n,c,info='')=>console.log((c?'PASS ':'FAIL ')+n+(info&&!c?'  ← '+info:''));
const BK='8d000000-0000-4000-8000-000000000001';
const TX=(id,html)=>({id,type:'text',x:16,y:18,w:120,h:189,html,fs:12,align:'left',color:'#1B2B25',font:'serif'});
const seed={profiles:[{id:'u1',display_name:'김정선'}],
 books:[{id:BK,owner_id:'u1',title:'동시 편집 시험',author_name:'김정선',format:'pages',is_public:false,admin_hidden:false,deleted_at:null,created_at:now,updated_at:now,rev:0}],
 pages:[{id:'8d100000-0000-4000-8000-000000000001',book_id:BK,position:0,name:'이야기',bg:'#FFFFFF',flow_from:null,els:[TX('e1','시작')]},
        {id:'8d100000-0000-4000-8000-000000000002',book_id:BK,position:1,name:'둘째',bg:'#FFFFFF',flow_from:null,els:[TX('e2','둘째 쪽')]}]};
const ctx=await b.newContext({viewport:{width:1440,height:1000}});
await ctx.addInitScript(s=>{ window.__seed=s; window.__multiTab=true; localStorage.setItem('fakeSession',JSON.stringify({user:{id:'u1',email:'a@b.c'}})); },seed);
await ctx.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:FAKE}));
await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
const errs=[];
{ const p=await ctx.newPage(); await p.goto(U+'/lib/demo-draft.js'); await p.evaluate(()=>new Promise(r=>{ const q=indexedDB.deleteDatabase('moa-demo'); q.onsuccess=q.onerror=q.onblocked=()=>r(); })); await p.close(); } // 처음 한 번만 새 기기처럼(탭이 열린 뒤에 지우면 보관함이 멈춘다)
const open=async()=>{ const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('dialog',d=>d.accept().catch(()=>{}));
  await pg.goto(`${U}/studio/?book=${BK}`); await pg.waitForSelector('#canvas .pg'); await pg.waitForTimeout(600); return pg; };
const st=(pg,f,a)=>pg.evaluate(f,a);
// i쪽의 글상자 끝에 글을 덧붙인다
const typeIn=async(pg,i,elId,text)=>{ await st(pg,i=>goPage(i),i); await pg.waitForTimeout(80); const bb=await pg.locator(`#canvas .el[data-id="${elId}"]`).boundingBox(); await pg.mouse.click(bb.x+bb.width/2,bb.y+20); await pg.keyboard.press('Control+End'); await pg.keyboard.type(text); await pg.keyboard.press('Escape'); };
const saveState=pg=>st(pg,()=>document.getElementById('save').dataset.state);
const waitState=async(pg,want,ms=6000)=>{ for(let t=0;t<ms;t+=50){ if((await saveState(pg))===want) return true; await pg.waitForTimeout(50); } return false; };
// 고친 것이 모두 서버에 저장되고 ✓ 표시인지(책을 열면 바로 ✓ 이므로 상태만 보면 이르다)
const waitSaved=async(pg,ms=6000)=>{ for(let t=0;t<ms;t+=50){ if(await st(pg,()=>document.getElementById('save').dataset.state==='ok' && serialize()===lastSaved)) return true; await pg.waitForTimeout(50); } return false; };
const waitVisible=async(pg,sel,ms=8000)=>{ for(let t=0;t<ms;t+=100){ if(await pg.locator(sel).isVisible()) return true; await pg.waitForTimeout(100); } return false; };
// 「서버」(두 탭이 함께 쓰는 localStorage 의 가짜 DB)에 저장된 책: 판 번호·쪽 수·글
const db=pg=>st(pg,()=>{ const d=JSON.parse(localStorage.getItem('fakeDB')||'null'); if(!d) return {rev:null,title:'',n:0,text:'(아직 저장 없음)'}; const b=d.books[0]; const ps=d.pages.filter(p=>p.book_id===b.id).sort((a,b)=>a.position-b.position);
  return {rev:b.rev,title:b.title,n:ps.length,text:ps.map(p=>p.els.filter(e=>e.type==='text').map(e=>plain(e.html)).join('|')).join(' / ')}; });
const text0=pg=>st(pg,()=>plain(state.pages[0].els[0].html));

/* ── 준비: 같은 책을 탭 A·B 에 연다 ── */
const A=await open(); const B=await open(); await A.waitForTimeout(500);
ok('D13 같은 책을 두 탭에 열면 두 탭 모두 「다른 탭에도 열려 있어요」 띠', await A.locator('#multiBar').isVisible() && await B.locator('#multiBar').isVisible() && /다른 탭/.test(await B.locator('#multiBar').innerText()), await B.locator('#multiBar').innerText().catch(()=>'(없음)'));
ok('준비: 책을 열면 「불러오는 중」이 아니라 ✓ 저장됨(RT-106)', (await saveState(A))==='ok', await saveState(A));

/* ── RT-101 재현 순서: B는 저장되지 못한 수정을 가진 채(끊김) · A가 글을 쓰고 새 쪽을 더해 저장 · B가 저장 시도 ── */
await st(B,()=>{ window.__failWrite=true; });
await typeIn(B,0,'e1',' B2'); ok('준비: B는 끊긴 상태로 수정(저장 실패)', await waitState(B,'err',8000));
await typeIn(A,0,'e1',' A2'); ok('준비: A의 글 저장', await waitSaved(A));
await st(A,()=>insertPageAt(1,'text')); await A.keyboard.press('Escape');
ok('준비: A가 새 쪽을 더해 저장(3쪽)', await waitSaved(A) && (await db(A)).n===3, JSON.stringify(await db(A)));
const afterA=await db(A); await B.waitForTimeout(400);
ok('D13 다른 탭이 저장하면 수정 중인 탭에 알림', /다른 탭에서 이 책을 저장/.test(await B.locator('#multiBar').innerText()), await B.locator('#multiBar').innerText());
await st(B,()=>{ window.__failWrite=false; nextSaveAt=0; });
ok('RT-101 옛 내용의 탭 B가 저장하려 하면 멈추고 묻는다(「다른 곳에서 바뀌었어요」)', await waitVisible(B,'#cfDlg'));
const d1=await db(B);
ok('RT-101 A의 글·새 쪽이 서버에 그대로 남고 B2는 저장되지 않음', d1.n===3 && /A2/.test(d1.text) && !/B2/.test(d1.text) && d1.rev===afterA.rev, JSON.stringify(d1));
ok('RT-101 B의 저장 표시가 「저장됨」이 아님(실제와 일치)', (await saveState(B))==='conflict', await saveState(B));
/* 선택 1: 최신 내용 불러오기 */
await B.click('#cfDlg [data-cf="reload"]'); await B.waitForTimeout(800);
ok('D13 「최신 내용 불러오기」 → B에 A의 글과 새 쪽이 보이고 ✓', (await st(B,()=>state.pages.length))===3 && /A2/.test(await text0(B)) && !/B2/.test(await text0(B)) && await waitSaved(B), `${await st(B,()=>state.pages.length)}쪽 · ${await text0(B)} · ${await saveState(B)}`);
ok('D41 불러온 뒤 띠는 기본 문구로(「다른 탭에서 저장했어요」가 남지 않음)', await B.locator('#multiBar').isVisible() && !/다른 탭에서 이 책을 저장/.test(await B.locator('#multiBar').innerText()) && /다른 탭\(창\)에도/.test(await B.locator('#multiBar').innerText()), await B.locator('#multiBar').innerText());
/* 선택 2: 내 내용으로 덮어쓰기 */
await st(B,()=>{ window.__failWrite=true; }); await typeIn(B,0,'e1',' B3'); await waitState(B,'err',8000);
await typeIn(A,0,'e1',' A3'); await waitSaved(A);
await st(B,()=>{ window.__failWrite=false; nextSaveAt=0; });
ok('준비: B 다시 충돌', await waitVisible(B,'#cfDlg'));
await B.click('#cfDlg [data-cf="replace"]');
ok('D13 「내 내용으로 덮어쓰기」 → B의 내용이 서버에(A3는 빠짐) · ✓', await waitSaved(B) && /B3/.test((await db(B)).text) && !/A3/.test((await db(B)).text), JSON.stringify(await db(B)));
for(let i=0;i<30 && !/B3/.test(await text0(A));i++) await A.waitForTimeout(200); // 다른 탭의 저장을 불러오기까지 최대 6초(고정 1초는 느린 PC에서 흔들림)
ok('D13 고친 것이 없는 탭 A는 다른 탭의 저장을 조용히 불러옴', /B3/.test(await text0(A)) && (await saveState(A))==='ok', (await text0(A))+' · '+JSON.stringify(await st(A,()=>({editing:state.editing,saveRun:!!saveRun,conflict:!!conflict,rev:bookRow.rev,dirty:serialize()!==lastSaved,save:document.getElementById('save').dataset.state,bar:document.getElementById('multiBar').hidden?'':document.getElementById('multiBar').textContent.slice(0,30)})))+' · B rev '+(await db(B)).rev);

/* ── 바뀐 쪽·지운 쪽만 보내기 ── */
await st(A,()=>{ window.__saveArgs=[]; }); await typeIn(A,0,'e1',' A4'); await waitSaved(A);
ok('D13 바뀐 쪽만 보냄(1쪽만 · 지운 쪽 없음 · 덮어쓰기 아님)', await st(A,()=>{ const a=window.__saveArgs[window.__saveArgs.length-1]; return !!a && a.p_pages.length===1 && a.p_deleted.length===0 && !a.p_replace; }), JSON.stringify(await st(A,()=>window.__saveArgs.map(a=>[a.p_pages.length,a.p_deleted.length,a.p_replace]))));
await st(A,()=>delPageAt(2,false)); await waitSaved(A);
ok('D13 지운 쪽만 지우라고 보냄', await st(A,()=>{ const a=window.__saveArgs[window.__saveArgs.length-1]; return !!a && a.p_deleted.length===1; }) && (await db(A)).n===2, JSON.stringify(await db(A)));

/* ── RT-104: 끊긴 동안 재시도 간격이 늘어나고, 실패한 저장은 서버에 아무것도 남기지 않는다 ── */
await st(A,()=>{ window.__saveCalls=[]; window.__failWrite=true; });
const before=await db(A);
await st(A,()=>delPageAt(1,false)); ok('준비: 끊긴 채 쪽 삭제 → 저장 실패 표시', await waitState(A,'err',8000));
await A.waitForTimeout(24000);
const calls=await st(A,()=>window.__saveCalls.length);
ok('RT-104 실패 중 24초 동안 저장 시도 6회 이하(1.5초마다가 아니라 3·6·12초…로 늘어남)', calls>=2 && calls<=6, `${calls}회`);
ok('RT-104 실패한 저장은 서버에 아무것도 남기지 않음(지운 쪽이 유령처럼 남지 않음)', JSON.stringify(await db(A))===JSON.stringify(before), JSON.stringify(await db(A)));
await st(A,()=>{ window.__failWrite=false; window.dispatchEvent(new Event('online')); });
ok('RT-104 연결이 돌아오면 곧바로 저장(쪽 삭제 반영)', await waitSaved(A,3000) && (await db(A)).n===1, JSON.stringify(await db(A)));
/* ── D41: 다른 탭을 닫으면 「다른 탭」 띠가 사라진다 ── */
ok('준비: A에 「다른 탭에도 열려 있어요」 띠', await A.locator('#multiBar').isVisible() && /다른 탭\(창\)에도/.test(await A.locator('#multiBar').innerText()), await A.locator('#multiBar').innerText());
await B.goto(U+'/lib/demo-draft.js'); // B 를 다른 주소로 보내 편집기 탭을 닫음(pagehide → bye). about:blank 는 가짜 Supabase 초기화가 막혀 오류가 찍힘
let barGone=false; for(let i=0;i<30&&!barGone;i++){ barGone=!(await A.locator('#multiBar').isVisible()); if(!barGone) await A.waitForTimeout(100); }
ok('D41 다른 탭을 닫으면 띠가 사라짐', barGone, await A.locator('#multiBar').innerText());
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
