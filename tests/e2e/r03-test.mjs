// 저장 중 후속 수정과 저장 표시: 수정요청서 1차(2026-10-16) R03 · 점검표 T11·T12
// 가짜 Supabase의 __slowWrite(느린 저장)·__failWrite(끊긴 인터넷)로 로그인 책의 저장을 시험한다
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import((p=>/^[A-Za-z]:/.test(p)?'file:///'+p.replace(/\\/g,'/'):p)(R+'/playwright/index.mjs'));
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=process.env.MOA_ROOT||'/home/user/LiveBecomeHistory';
const types={'.html':'text/html','.js':'application/javascript'};
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':types[path.extname(f)]||'text/plain'});res.end(d);} }); }).listen(8783);
const b=await chromium.launch({executablePath:process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const FAKE=fs.readFileSync(process.argv[2],'utf8'); const now=new Date().toISOString(); const U='http://localhost:8783';
const ok=(n,c,info='')=>console.log((c?'PASS ':'FAIL ')+n+(info&&!c?'  ← '+info:''));
const BK='89000000-0000-4000-8000-000000000001';
const seed={profiles:[{id:'u1',display_name:'김정선'}],
 books:[{id:BK,owner_id:'u1',title:'저장 시험',author_name:'김정선',format:'pages',is_public:false,admin_hidden:false,deleted_at:null,created_at:now,updated_at:now}],
 pages:[{id:'8a000000-0000-4000-8000-000000000001',book_id:BK,position:0,name:'이야기',bg:'#FFFFFF',flow_from:null,els:[{id:'e1',type:'text',x:16,y:18,w:120,h:189,html:'시작',fs:12,align:'left',color:'#1B2B25',font:'serif'}]}]};
const ctx=await b.newContext({viewport:{width:1440,height:1000}});
await ctx.addInitScript(s=>{ window.__seed=s; localStorage.setItem('fakeSession',JSON.stringify({user:{id:'u1',email:'a@b.c'}})); },seed);
await ctx.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:FAKE}));
await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
const errs=[]; let pg;
const st=(f,a)=>pg.evaluate(f,a);
const open=async()=>{ pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('dialog',d=>d.accept().catch(()=>{}));
  await pg.goto(`${U}/studio/?book=${BK}`); await pg.waitForSelector('#canvas .pg'); await pg.waitForTimeout(600);
  // 저장 표시가 바뀔 때마다: 표시 · 그 순간 화면 원고가 마지막 저장본과 다른지
  await st(()=>{ window.__marks=[]; new MutationObserver(()=>{ const s=document.getElementById('save').dataset.state; window.__marks.push({s, dirty:serialize()!==lastSaved}); }).observe(document.getElementById('save'),{attributes:true,attributeFilter:['data-state']}); }); };
const body=async()=>{ const bb=await pg.locator('#canvas .el[data-id="e1"]').boundingBox(); await pg.mouse.click(bb.x+bb.width/2,bb.y+20); await pg.keyboard.press('Control+End'); };
const dbText=()=>st(()=>{ const p=__db.pages.find(p=>p.book_id==='89000000-0000-4000-8000-000000000001'); return p?plain(p.els[0].html):''; });
const waitState=async(want,ms=5000)=>{ for(let t=0;t<ms;t+=50){ if((await st(()=>document.getElementById('save').dataset.state))===want) return true; await pg.waitForTimeout(50); } return false; };
const lies=()=>st(()=>window.__marks.filter(m=>m.s==='ok'&&m.dirty).length); // 「모든 변경사항 저장됨」인데 실은 저장 안 된 수정이 있던 횟수

await open(); await body();
/* ── T11 느린 저장 중 추가 수정 ── */
await st(()=>{ window.__slowWrite=1200; });
await pg.keyboard.type(' 첫째'); ok('준비: 느린 저장이 시작됨(「저장 중…」)', await waitState('saving',4000));
await pg.keyboard.type(' 둘째');                                    // 저장이 끝나기 전에 더 고침
await pg.waitForTimeout(3500); await waitState('ok',6000);
ok('T11 저장 중에 고친 내용까지 서버에 저장됨', /첫째 둘째/.test(await dbText()), await dbText());
ok('T11 저장 중에 더 고쳤으면 그 저장이 끝나도 「모든 변경사항 저장됨」을 띄우지 않음', (await lies())===0, JSON.stringify(await st(()=>window.__marks)));
ok('T11 마지막엔 「✓ 모든 변경사항 저장됨」 = 서버 원고와 같음', await st(()=>document.getElementById('save').dataset.state==='ok' && serialize()===lastSaved));
// 저장 중에 saveNow()를 기다리면 그 사이 고친 것까지 저장된 뒤에 끝남(내 서재로 가기·공유·발행이 쓰는 길)
await pg.keyboard.type(' 셋째'); await waitState('saving',4000); await pg.keyboard.type(' 넷째');
{ const r=await st(async()=>{ await saveNow(); return {dirty:serialize()!==lastSaved, db:plain(__db.pages[0].els[0].html)}; });
  ok('T11 저장 중에 다시 저장을 부르면 끝까지 기다렸다가 최신 원고까지 저장', !r.dirty && /셋째 넷째/.test(r.db), JSON.stringify(r)); }
// 저장 중에 「임시저장」 단추
await pg.keyboard.type(' 다섯째'); await waitState('saving',4000); await pg.keyboard.type(' 여섯째');
await pg.click('#btnSave'); await pg.waitForTimeout(100);
for(let t=0;t<40 && !/임시저장했어요|저장하지 못했어요/.test(await pg.locator('#toast').innerText());t++) await pg.waitForTimeout(150);
ok('T11 저장 중에 「임시저장」을 눌러도 잘못된 실패 안내 없이 「임시저장했어요」', /임시저장했어요/.test(await pg.locator('#toast').innerText()) && /여섯째/.test(await dbText()), await pg.locator('#toast').innerText());
// 저장 중에 고치고 바로 「내 책」(내 서재로 이동)
await body(); await pg.keyboard.type(' 일곱째'); await waitState('saving',4000); await pg.keyboard.type(' 여덟째');
await Promise.all([pg.waitForURL(/\/editor\//,{timeout:15000}).catch(()=>{}), pg.click('#back')]);
await pg.waitForTimeout(500);
ok('T11 저장 중에 고치고 바로 「내 책」으로 나가도 마지막 수정까지 저장됨', /일곱째 여덟째/.test(await st(()=>{ const d=JSON.parse(localStorage.getItem('fakeDB')||'{}'); const p=(d.pages||[]).find(p=>p.book_id==='89000000-0000-4000-8000-000000000001'); return p?p.els[0].html:''; })));
await pg.close();

/* ── T12 저장 실패 후 재연결 ── */
await open(); await body(); await st(()=>{ window.__slowWrite=0; window.__failWrite=true; });
await pg.keyboard.type(' 끊김');
ok('T12 인터넷이 끊기면 「⚠ 저장 실패」 표시', await waitState('err',5000) && /저장 실패/.test(await pg.locator('#save').innerText()));
ok('T12 실패 중에는 떠나기 전 확인(저장 안 된 수정 있음)', await st(()=>serialize()!==lastSaved));
await pg.keyboard.type(' 계속');                                            // 끊긴 동안에도 계속 고침
await pg.waitForTimeout(300);
await st(()=>{ window.__failWrite=false; window.dispatchEvent(new Event('online')); });
const t0=Date.now(); const back=await waitState('ok',4000);
ok('T12 다시 연결되면 저절로 저장되고 「✓ 저장됨」', back && /끊김 계속/.test(await dbText()) && await st(()=>serialize()===lastSaved), `${Date.now()-t0}ms`);
ok('T12 연결이 돌아오면 곧바로 저장(1초 안)', Date.now()-t0<1000, `${Date.now()-t0}ms`);
ok('T12 「모든 변경사항 저장됨」이 거짓인 순간 없음', (await lies())===0);
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
