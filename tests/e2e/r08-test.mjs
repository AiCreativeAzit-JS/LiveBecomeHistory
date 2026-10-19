// 내려받기 실패를 성공으로 안내하지 않기: 수정요청서 2차(2026-10-16) R08 · 점검표 T30 (T31은 r04-test)
// 화면용 전자책에 넣는 책장 넘기기 장치(lib/book-viewer.js)를 못 받아 오면(404·통신 실패·빈 응답) 빈 책을 만들지 않는다
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import(R+'/playwright/index.mjs');
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/home/user/LiveBecomeHistory';
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':'text/html'});res.end(d);} }); }).listen(8787);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const pg=await (await b.newContext({viewport:{width:1440,height:1000},acceptDownloads:true})).newPage();
const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('dialog',d=>d.accept().catch(()=>{}));
await pg.route(/fonts\.|supabase-js|jsdelivr|unpkg/,r=>r.abort());
const ok=(n,c,info='')=>console.log((c?'PASS ':'FAIL ')+n+(info&&!c?'  ← '+info:''));
await pg.goto('http://localhost:8787/studio/?blank=1'); await pg.waitForSelector('#canvas .pg');
const tryScreen=async()=>{ await pg.click('#btnExport'); await pg.waitForSelector('#exDlg:not([hidden])'); const dl=pg.waitForEvent('download',{timeout:2500}).then(()=>true,()=>false); await pg.click('#exDlg [data-ex=screen]'); const got=await dl; return {got, toast:await pg.locator('#toast').innerText()}; };
for(const [label,how] of [['404',r=>r.fulfill({status:404,contentType:'text/html',body:'<h1>Not Found</h1>'})],['통신 실패',r=>r.abort('failed')],['빈 응답',r=>r.fulfill({status:200,contentType:'application/javascript',body:''})]]){
  await pg.route('**/lib/book-viewer.js',how);
  const r=await tryScreen();
  ok(`T30 장치 파일 ${label} → 내려받지 않고 「만들지 못했어요」 안내(성공이라 하지 않음)`, !r.got && /만들지 못했어요/.test(r.toast) && !/내려받았어요/.test(r.toast), JSON.stringify(r));
  await pg.unroute('**/lib/book-viewer.js');
}
{ const r=await tryScreen(); ok('T30 다시 정상이면 그대로 내려받음', r.got && /내려받았어요/.test(r.toast), JSON.stringify(r)); }
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
