// 가입 승인제(레드팀 RT-001, D1): 승인 전 회원은 내 서재에 「승인 대기」 안내 + 「새 책 만들기」 잠금, 승인되면 풀림
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import((p=>/^[A-Za-z]:/.test(p)?'file:///'+p.replace(/\\/g,'/'):p)(R+'/playwright/index.mjs'));
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=process.env.MOA_ROOT||'/home/user/LiveBecomeHistory';
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':'text/html'});res.end(d);} }); }).listen(8786);
const b=await chromium.launch({executablePath:process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const now=new Date().toISOString();
const seed={ profiles:[{id:'u1',display_name:'김정선',created_at:now,approved:false}],
  books:[{id:'00000000-0000-4000-8000-000000000001',owner_id:'u1',title:'승인 전에 쓴 책',subtitle:'',author_name:'김정선',is_public:false,admin_hidden:false,deleted_at:null,published_at:null,created_at:now,updated_at:now,format:'b6'}] };
const ctx=await b.newContext({viewport:{width:1200,height:900}}); await ctx.addInitScript(s=>{ window.__seed=s; },seed);
const pg=await ctx.newPage();
const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('console',m=>{ if(m.type()==='error'&&!/fonts|net::ERR/.test(m.text())) errs.push('CONSOLE '+m.text()); });
await pg.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(process.argv[2],'utf8')}));
await pg.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
pg.on('dialog',d=>d.accept().catch(()=>{}));
const ok=(n,c)=>console.log((c?'PASS ':'FAIL ')+n);
const U='http://localhost:8786';
await pg.goto(U+'/editor/'); await pg.waitForSelector('#f'); await pg.fill('#em','a@b.com'); await pg.fill('#pw','password123'); await pg.click('#go'); await pg.waitForSelector('#nb');
await pg.waitForSelector('#pendingMsg');
ok('승인 전: 내 서재에 「승인 대기」 안내', (await pg.locator('#pendingMsg').innerText()).includes('계정 승인을 기다리고'));
ok('승인 전: 「새 책 만들기」 잠김(안내 제목 포함)', await pg.locator('#nb').isDisabled() && (await pg.getAttribute('#nb','title')).includes('승인'));
ok('승인 전에도 이미 있는 책은 보임', (await pg.locator('#list').innerText()).includes('승인 전에 쓴 책'));
// 탭을 오가도 안내는 그대로
await pg.click('.libtabs [data-tab=trash]'); await pg.waitForSelector('#pendingMsg'); await pg.click('.libtabs [data-tab=books]'); await pg.waitForSelector('#pendingMsg');
ok('휴지통 ↔ 내 책 오가도 안내·잠금 유지', await pg.locator('#nb').isDisabled());
// 운영자가 승인한 뒤(DB approved=true) 다시 열면 풀린다
await pg.evaluate(()=>{ __db.profiles.find(p=>p.id==='u1').approved=true; __persist(); });
await pg.reload(); await pg.waitForSelector('#nb'); await pg.waitForSelector('#list:not(:has-text("불러오는 중"))');
ok('승인 뒤: 안내 사라지고 「새 책 만들기」 풀림', await pg.locator('#pendingMsg').count()===0 && !(await pg.locator('#nb').isDisabled()));
// approved 값을 못 읽어도(예전 DB) 잠그지 않는다
await pg.evaluate(()=>{ delete __db.profiles.find(p=>p.id==='u1').approved; __persist(); });
await pg.reload(); await pg.waitForSelector('#nb'); await pg.waitForSelector('#list:not(:has-text("불러오는 중"))');
ok('approved 값이 없으면(예전 DB) 잠그지 않음', await pg.locator('#pendingMsg').count()===0 && !(await pg.locator('#nb').isDisabled()));
console.log(errs.length?errs.join('\n'):'JS 오류 없음'); await b.close(); srv.close();
