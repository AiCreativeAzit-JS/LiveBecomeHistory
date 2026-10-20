// 제목만 바꾼 책의 다시 발행 감지: 수정요청서 2차(2026-10-16) R10 · 점검표 T33
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import((p=>/^[A-Za-z]:/.test(p)?'file:///'+p.replace(/\\/g,'/'):p)(R+'/playwright/index.mjs'));
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=process.env.MOA_ROOT||'/home/user/LiveBecomeHistory';
const types={'.html':'text/html','.js':'application/javascript'};
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':types[path.extname(f)]||'text/plain'});res.end(d);} }); }).listen(8788);
const b=await chromium.launch({executablePath:process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const FAKE=fs.readFileSync(process.argv[2],'utf8'); const now=new Date().toISOString(); const U='http://localhost:8788';
const ok=(n,c,info='')=>console.log((c?'PASS ':'FAIL ')+n+(info&&!c?'  ← '+info:''));
const PUB='8e000000-0000-4000-8000-000000000001', PRIV='8e000000-0000-4000-8000-000000000002';
const page=(bk,id)=>({id,book_id:bk,position:0,name:'이야기',bg:'#FFFFFF',flow_from:null,els:[{id:'e1',type:'text',x:16,y:18,w:120,h:189,html:'본문',fs:12,align:'left',color:'#1B2B25',font:'serif'}]});
const seed={profiles:[{id:'u1',display_name:'김정선'}],
 books:[{id:PUB,owner_id:'u1',title:'원래 제목',author_name:'김정선',format:'pages',is_public:true,published_at:now,admin_hidden:false,deleted_at:null,created_at:now,updated_at:now},
        {id:PRIV,owner_id:'u1',title:'비밀 책',author_name:'김정선',format:'pages',is_public:false,admin_hidden:false,deleted_at:null,created_at:now,updated_at:now}],
 pages:[page(PUB,'8f000000-0000-4000-8000-000000000001'),page(PRIV,'8f000000-0000-4000-8000-000000000002')], book_shares:[{book_id:PRIV,token:'T'.repeat(32)}]};
const ctx=await b.newContext({viewport:{width:1440,height:1000}});
await ctx.addInitScript(s=>{ window.__seed=s; localStorage.setItem('fakeSession',JSON.stringify({user:{id:'u1',email:'a@b.c'}})); },seed);
await ctx.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:FAKE}));
await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('dialog',d=>d.accept().catch(()=>{}));
const st=(f,a)=>pg.evaluate(f,a);
const open=async bk=>{ await pg.goto(`${U}/studio/?book=${bk}`); await pg.waitForSelector('#canvas .pg'); await pg.waitForTimeout(700); };
const snap=bk=>st(bk=>(__db.book_snapshots.find(s=>s.book_id===bk)||{}).title,bk);
const setTitle=async t=>{ await pg.fill('#title',t); await pg.waitForTimeout(2200); };   // 자동 저장(1.5초 주기)까지
// 준비: 발행본을 지금 원고로 만들어 두고 다시 연다(발행본 제목을 DB에서 읽는 길까지)
await open(PUB); await st(()=>writeSnapshot()); await open(PUB);
ok('준비: 공개 책 · 발행본과 같음 → 「발행됨」', /발행됨/.test(await pg.locator('#pubState').innerText()), await pg.locator('#pubState').innerText());
await setTitle('새 제목');
ok('T33 제목만 바꾸면 → 「고친 내용 있음」 · 단추 「다시 발행」', /이전 발행본|고친 내용/.test(await pg.locator('#pubState').innerText()) && /다시 발행/.test(await pg.locator('#btnPublish').innerText()), await pg.locator('#pubState').innerText());
await pg.click('#btnPublish'); await pg.waitForTimeout(800);
ok('T33 「다시 발행」 → 발행본 제목 = 새 제목 · 「발행됨」', (await snap(PUB))==='새 제목' && /발행됨/.test(await pg.locator('#pubState').innerText()), await snap(PUB));
await setTitle('원래 제목'); await setTitle('새 제목');
ok('T33 바꿨다가 발행본과 같은 제목으로 돌아오면 다시 「발행됨」', /발행됨/.test(await pg.locator('#pubState').innerText()));
// 비밀 링크
await open(PRIV); await st(()=>writeSnapshot()); await open(PRIV);
ok('준비: 비밀 링크 책 · 링크 내용과 같음', /비밀 링크로 공유 중/.test(await pg.locator('#pubState').innerText()) && !/고친 내용/.test(await pg.locator('#pubState').innerText()), await pg.locator('#pubState').innerText());
await setTitle('비밀 책 새 이름');
ok('T33 비밀 링크 책도 제목만 바꾸면 → 「고친 내용은 아직 안 보여요」', /고친 내용은 아직 안 보여요/.test(await pg.locator('#pubState').innerText()), await pg.locator('#pubState').innerText());
await pg.click('#btnShare'); await pg.waitForSelector('#shDlg:not([hidden])');
ok('T33 비밀 링크 창에 「지금 내용으로 새로 고침」', await pg.locator('#shRefresh').isVisible());
await pg.click('#shRefresh'); await pg.waitForTimeout(600);
ok('T33 새로 고침 → 링크 발행본 제목 = 새 이름', (await snap(PRIV))==='비밀 책 새 이름', await snap(PRIV));
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
