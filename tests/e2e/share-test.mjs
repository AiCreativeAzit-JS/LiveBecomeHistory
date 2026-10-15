import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import(R+'/playwright/index.mjs');
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/home/user/LiveBecomeHistory';
const types={'.html':'text/html','.js':'application/javascript'};
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':types[path.extname(f)]||'text/plain'});res.end(d);} }); }).listen(8781);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const FAKE=fs.readFileSync(process.argv[2],'utf8'); const now=new Date().toISOString();
const BK='80000000-0000-4000-8000-000000000001', IMG='81000000-0000-4000-8000-000000000001', AUD='82000000-0000-4000-8000-000000000001';
const seed={profiles:[{id:'u1',display_name:'김정선'}],
 books:[{id:BK,owner_id:'u1',title:'가족 앨범',author_name:'김정선',format:'pages',is_public:false,admin_hidden:false,deleted_at:null,created_at:now,updated_at:now}],
 media:[{id:IMG,book_id:BK,owner_id:'u1',kind:'image',storage_path:'u1/bk/i.png',size_bytes:100},{id:AUD,book_id:BK,owner_id:'u1',kind:'audio',storage_path:'u1/bk/a.mp3',size_bytes:100}],
 pages:[{id:'91000000-0000-4000-8000-000000000001',book_id:BK,position:0,name:'표지',bg:'#FFFFFF',flow_from:null,els:[{id:'e1',type:'text',x:16,y:30,w:120,h:30,html:'우리 가족 이야기',fs:20,align:'left',color:'#1B2B25',font:'serif'},{id:'e2',type:'image',x:16,y:70,w:120,h:80,name:'',media_id:IMG}]},
        {id:'91000000-0000-4000-8000-000000000002',book_id:BK,position:1,name:'노래',bg:'#FFFFFF',flow_from:null,els:[{id:'e3',type:'audio',x:16,y:40,w:120,h:34,name:'자장가',media_id:AUD}]}]};
const ctx=await b.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
await ctx.addInitScript(s=>{ window.__seed=s; if(!localStorage.getItem('fakeSession')&&!localStorage.getItem('noLogin')) localStorage.setItem('fakeSession',JSON.stringify({user:{id:'u1',email:'a@b.c'}})); },seed);
await ctx.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:FAKE}));
await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('dialog',d=>d.accept().catch(()=>{}));
const ok=(n,c)=>console.log((c?'PASS ':'FAIL ')+n); const st=(f,a)=>pg.evaluate(f,a); const U='http://localhost:8781';
const guest=async(hash)=>{ const g=await ctx.newPage(); await g.evaluate?.(()=>0).catch(()=>{}); await g.goto(`${U}/shelf/${hash}`); await g.waitForTimeout(700); const t=await g.locator('#app').innerText(); const n=await g.locator('.bk-pg').count(); const imgs=await g.locator('.bk-pg img').count(); const au=await g.locator('.bk-pg .ap').count(); const pbtn=await g.locator('#printBtn').count(); await g.close(); return {t,n,imgs,au,pbtn}; };

await pg.goto(`${U}/studio/?book=${BK}`); await pg.waitForSelector('#canvas .pg'); await pg.waitForTimeout(800);
ok('비공개 책: 「초안 · 나만 보기」 + 「🔗 비밀 링크」 버튼', (await pg.locator('#pubState').innerText()).includes('나만 보기') && await pg.locator('#btnShare').isVisible());
await pg.click('#btnShare'); await pg.waitForSelector('#shDlg:not([hidden])');
await pg.click('#shMake'); await pg.waitForSelector('#shUrl');
const token=await st(()=>shareToken); const url=await pg.inputValue('#shUrl');
ok('비밀 링크 만들기 → 32자 이상 추측 불가 열쇠', /^[A-Za-z0-9_-]{32,64}$/.test(token) && url.endsWith('#/s/'+token)); console.log('  링크:',url);
ok('공유본(발행본) 저장 · 서가에는 여전히 비공개', await st(()=>__db.book_snapshots.length===1 && __db.books[0].is_public===false));
await pg.screenshot({path:'/tmp/share-dlg.png'});
await pg.click('#shClose');
ok('상태: 「🔒 비밀 링크로 공유 중」', (await pg.locator('#pubState').innerText()).includes('비밀 링크로 공유 중'));
let g=await guest('#/s/'+token);
ok('링크를 받은 사람: 책(페이지·사진·노래)이 열림', g.n===2 && g.imgs===1 && g.au===1 && g.t.includes('링크를 받은 분만'));
ok('비밀 링크 화면에도 인쇄·PDF 버튼 없음 + 저작권 안내', g.pbtn===0 && g.t.includes('저작권 보호'));
g=await guest('#/');
ok('서가 목록에는 안 보임', !g.t.includes('가족 앨범'));
g=await guest('#/book/'+BK);
ok('책 주소로 직접 가도 안 보임', g.t.includes('비공개이거나'));
g=await guest('#/s/WRONGtokenWRONGtokenWRONGtoken0000');
ok('틀린 링크는 안내만', g.t.includes('링크가 끊겼거나') && g.n===0);
// 고치면 → 링크는 이전 내용, 새로 고침하면 반영
await pg.locator('#canvas .el.t').first().click(); await pg.keyboard.press('End'); await pg.keyboard.type(' 추가글'); await pg.keyboard.press('Escape'); await pg.waitForTimeout(2200);
ok('고친 뒤 상태: 「고친 내용은 아직 안 보여요」', (await pg.locator('#pubState').innerText()).includes('아직 안 보여요'));
g=await guest('#/s/'+token); ok('링크는 고치기 전 내용', !g.t.includes('추가글'));
await pg.click('#btnShare'); await pg.click('#shRefresh'); await pg.waitForTimeout(400);
g=await guest('#/s/'+token); ok('「지금 내용으로 새로 고침」 → 링크에 반영', g.t.includes('추가글'));
// QR: 비공개 책은 비밀 링크로
ok('인쇄용 QR 주소 = 비밀 링크(#/s/열쇠/m/노래)', (await st(()=>mediaLink({media_id:'82000000-0000-4000-8000-000000000001'}))).endsWith(`#/s/${token}/m/${AUD}`));
g=await guest(`#/s/${token}/m/${AUD}`); ok('QR 주소로 열어도 책이 열림', g.n===2);
// 새 링크로 바꾸기 → 예전 링크 막힘
await pg.click('#shRotate'); await pg.waitForTimeout(300); const token2=await st(()=>shareToken);
g=await guest('#/s/'+token); const g2=await guest('#/s/'+token2);
ok('새 링크로 바꾸면 예전 링크는 막히고 새 링크만 열림', token2!==token && g.n===0 && g2.n===2);
// 끊기
await pg.click('#shCut'); await pg.waitForTimeout(300);
g=await guest('#/s/'+token2); ok('링크 끊기 → 더 이상 안 열림', g.n===0 && (await st(()=>__db.book_shares.length))===0);
ok('끊은 뒤 상태: 「초안 · 나만 보기」', (await pg.locator('#pubState').innerText()).includes('나만 보기'));
await pg.click('#shClose');
// 서가 발행과 함께 쓰기: 링크가 있어도 서가에 발행 가능
await pg.click('#btnPublish'); await pg.waitForTimeout(500);
ok('서가에 발행하기(비밀 링크와 별개)', await st(()=>__db.books[0].is_public===true));
// 실제 부품 파일이 저장소에서 제대로 불러와지는지(가짜 없이)
const real=await b.newPage(); await real.goto(`${U}/lib/supabase-js.umd.js`).catch(()=>{}); await real.setContent('<script src="http://localhost:8781/lib/supabase-js.umd.js"></script><script src="http://localhost:8781/lib/qrcode.js"></script>'); await real.waitForTimeout(500);
ok('저장소에 넣은 부품(supabase-js·qrcode)이 인터넷 없이 불러와짐', await real.evaluate(()=>typeof window.supabase?.createClient==='function' && typeof qrcode==='function'));
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
