import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/home/user/LiveBecomeHistory', FAKE=process.argv[2];
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':f.endsWith('.js')?'text/javascript':'text/html'});res.end(d);} }); }).listen(8796);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:1366,height:850},acceptDownloads:true}); const pg=await ctx.newPage();
const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); const reqs=[]; pg.on('request',r=>reqs.push(r.url()));
await pg.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(FAKE,'utf8')}));
await pg.route(/fonts\./,r=>r.abort());
const ok=(n,c)=>console.log((c?'PASS ':'FAIL ')+n);
const U='http://localhost:8796';
// 랜딩 → 체험 편집기
await pg.goto(U+'/'); await pg.click('.service-card .service-button >> nth=0'); await pg.waitForSelector('#canvas .pg');
ok('랜딩 카드 → 로그인 없이 편집기가 바로 열림', new URL(pg.url()).pathname==='/studio/');
ok('견본 책이 채워져 있음', await pg.evaluate(()=>state.pages.length)>=3);
ok('체험 표시', (await pg.locator('#demoChip').innerText()).includes('체험'));
const dlg=async()=>!(await pg.locator('#joinDlg').getAttribute('hidden')===''); 
await pg.click('#btnPublish'); ok('서가에 공개 → 베타 안내 창', await pg.locator('#joinDlg').isVisible() && (await pg.locator('#joinWhy').innerText()).includes('서가'));
ok('안내 창: 베타 신청(구글폼 새 창) · 로그인 · 계속 체험', await pg.locator('#joinDlg a[href*="docs.google.com/forms"][target=_blank]').count()===1 && await pg.locator('#joinDlg a[href="../editor/"]').count()===1);
await pg.click('#joinClose'); ok('계속 체험하기 → 닫힘', !(await pg.locator('#joinDlg').isVisible()));
await pg.click('#btnShare'); ok('비밀 링크 → 베타 안내', await pg.locator('#joinDlg').isVisible()); await pg.click('#joinClose');
await pg.click('#back'); ok('내 책 → 베타 안내', await pg.locator('#joinDlg').isVisible()); await pg.click('#joinClose');
// 사진 넣기: 서버로 안 감
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==','base64');
const n0=reqs.length; const imgs0=await pg.evaluate(()=>state.pages.flatMap(p=>p.els).filter(e=>e.type==='image').length);
await pg.click('[data-add=image]'); await pg.setInputFiles('#file',{name:'a.png',mimeType:'image/png',buffer:png}); await pg.waitForTimeout(1200);
ok('체험: 사진이 책에 들어감', await pg.evaluate(()=>state.pages.flatMap(p=>p.els).filter(e=>e.type==='image').length)>imgs0);
ok('체험: 서버 호출 없음(media 함수·저장소)', await pg.evaluate(()=>!(window.__mediaCalls||[]).length && !window.__directStorage) && !reqs.slice(n0).some(u=>/supabase|functions|r2\./.test(u)));
// 견본 틀의 사진 자리 누르기 → 사진이 그 자리에
{ const pi=await pg.evaluate(()=>state.pages.findIndex(p=>p.els.some(e=>e.type==='slot'&&(e.kind||'image')==='image')));
  const slots0=await pg.evaluate(i=>state.pages[i].els.filter(e=>e.type==='slot').length,pi);
  await pg.evaluate(i=>goPage(i),pi); await pg.waitForTimeout(300);
  const [fc]=await Promise.all([pg.waitForEvent('filechooser',{timeout:5000}), pg.click('#canvas .slot')]); await fc.setFiles({name:'b.png',mimeType:'image/png',buffer:png}); await pg.waitForTimeout(1000);
  ok('체험: 「눌러서 사진 넣기」 자리에 사진이 들어감', pi>=0 && await pg.evaluate(([i,n])=>state.pages[i].els.filter(e=>e.type==='slot').length===n-1 && state.pages[i].els.some(e=>e.type==='image'), [pi,slots0])); }
// 내려받기
await pg.click('#btnExport'); const [dl]=await Promise.all([pg.waitForEvent('download'), pg.click('[data-ex=screen]')]);
ok('체험: 화면용 HTML 내려받기(사진 포함)', await (async()=>{ const t=fs.readFileSync(await dl.path(),'utf8'); return /<html/i.test(t) && t.includes('data:image/png;base64'); })());
ok('편집기 아래쪽에 화면 판 번호(lib/version.js와 같음)', await pg.evaluate(()=>!!window.MOA_VERSION && document.getElementById('ver').textContent==='판 '+window.MOA_VERSION));
// 떠날 때 묻기: 이 기기에 아직 못 남긴 수정이 있을 때만(1.5초마다 남기므로, 고치자마자 떠나는 경우)
let asked=false; pg.on('dialog',d=>{ if(d.type()==='beforeunload') asked=true; d.dismiss().catch(()=>{}); });
await pg.evaluate(()=>{ snap(); state.title='내려받은 뒤 고친 제목'; document.getElementById('home').click(); }); await pg.waitForTimeout(800);
ok('고치자마자(이 기기에 남기기 전) 떠나려 하면 한 번 묻기', asked && new URL(pg.url()).pathname==='/studio/');
await pg.waitForTimeout(2000); asked=false;
ok('잠시 뒤에는 이 기기에 남아 있음(제목까지)', await pg.evaluate(async()=>((await DemoDraft.get())||{}).title==='내려받은 뒤 고친 제목'));
// 로그인 화면 → 체험
await pg.evaluate(()=>{ window.onbeforeunload=null; }); const p2=await ctx.newPage(); await p2.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(FAKE,'utf8')}));
await p2.goto(U+'/editor/'); await p2.waitForSelector('#f'); ok('로그인 화면에 체험 링크', await p2.locator('.trybox a[href="../studio/"]').count()===1);
console.log(errs.length?errs.join('\n'):'JS 오류 없음'); await b.close(); srv.close();
