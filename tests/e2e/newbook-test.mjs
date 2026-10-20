import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import((p=>/^[A-Za-z]:/.test(p)?'file:///'+p.replace(/\\/g,'/'):p)(R+'/playwright/index.mjs'));
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=process.env.MOA_ROOT||'/home/user/LiveBecomeHistory';
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':'text/html'});res.end(d);} }); }).listen(8768);
const b=await chromium.launch({executablePath:process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const pg=await b.newPage({viewport:{width:1200,height:900}});
const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('console',m=>{ if(m.type()==='error'&&!/fonts|net::ERR/.test(m.text())) errs.push('CONSOLE '+m.text()); });
await pg.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(process.argv[2],'utf8')}));
await pg.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
pg.on('dialog',d=>d.accept().catch(()=>{}));
const ok=(n,c)=>console.log((c?'PASS ':'FAIL ')+n);
const U='http://localhost:8768';
await pg.goto(U+'/editor/'); await pg.waitForSelector('#f');
await pg.fill('#em','a@b.com'); await pg.fill('#pw','password123'); await pg.click('#go'); await pg.waitForSelector('#nb');
await pg.click('#nb'); await pg.waitForURL(/\?new=1/); await pg.waitForSelector('#canvas .pg'); await pg.waitForTimeout(1800);
ok('들어가기만: 책 0권', await pg.evaluate(()=>__db.books.length===0));
// 두 번째 쪽 본문 글상자에 글쓰기 → 저절로 책이 만들어져 저장
await pg.locator('.th').nth(1).click(); await pg.waitForTimeout(150);
const box=await pg.locator('#canvas .el.t').nth(1).boundingBox();
await pg.mouse.click(box.x+40, box.y+20); await pg.waitForTimeout(150); await pg.keyboard.type('할머니 댁 마당의 감나무');
await pg.waitForTimeout(2600);
const st=await pg.evaluate(()=>({n:__db.books.length, pages:__db.pages.length, has:JSON.stringify(__db.pages).includes('감나무'), url:location.search}));
ok('글을 쓰면 저절로 책 1권 생성·저장', st.n===1 && st.pages===5 && st.has); console.log('  ',JSON.stringify(st));
ok('주소가 ?book= 로 바뀜', /^\?book=[0-9a-f-]{36}$/.test(st.url));
ok('저장 상태 표시', (await pg.locator('#save').innerText()).includes('저장됨'));
// 새로고침해도 같은 책, 같은 글
await pg.reload(); await pg.waitForSelector('#canvas .pg'); await pg.waitForTimeout(800);
ok('새로고침 → 같은 책 그대로(중복 생성 없음)', await pg.evaluate(()=>__db.books.length===1 && JSON.stringify(state.pages).includes('감나무')));
// 두 번째 새 책: 사진만 올려도 생성
await pg.goto(U+'/studio/?new=1'); await pg.waitForSelector('#canvas .pg'); await pg.waitForTimeout(500);
await pg.locator('.th').nth(2).click(); await pg.waitForTimeout(150);
const sl=await pg.locator('#canvas .el.s').boundingBox(); await pg.mouse.click(sl.x+sl.width/2, sl.y+sl.height/2); await pg.waitForTimeout(150);
await pg.setInputFiles('#file',{name:'a.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==','base64')});
await pg.waitForTimeout(2600);
ok('사진만 올려도 책 생성, 사진은 그 책에 연결', await pg.evaluate(()=>{ const b=__db.books.find(x=>location.search.includes(x.id)); return __db.books.length===2 && !!b && __db.media.length===1 && __db.media[0].book_id===b.id && __db.pages.filter(p=>p.book_id===b.id).length===5; }));
// 회원 탈퇴: 서재 아래 → 「탈퇴」라고 적어야 버튼이 켜짐 → 본인 데이터만 모두 삭제
await pg.evaluate(()=>{ __db.books.push({id:'0e0e0000-0000-4000-8000-000000000001',owner_id:'someone-else',title:'남의 책',subtitle:'',author_name:'남',format:'pages',is_public:true,admin_hidden:false,deleted_at:null,published_at:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}); __persist(); });
await pg.goto(U+'/editor/'); await pg.waitForSelector('#quit');
ok('내 서재 아래: 개인정보 처리방침·이용약관·회원 탈퇴', (await pg.locator('.acct').innerText()).includes('개인정보 처리방침') && (await pg.locator('.acct').innerText()).includes('회원 탈퇴'));
await pg.click('#quit'); await pg.waitForSelector('.quitdlg[open]');
ok('탈퇴 창: 지워지는 것 안내 + 내려받기 권유', (await pg.locator('.quitdlg').innerText()).includes('되돌릴 수 없어요') && (await pg.locator('.quitdlg').innerText()).includes('내려받기'));
ok('「탈퇴」라고 적기 전엔 버튼 꺼짐', await pg.isDisabled('#qyes'));
await pg.fill('#qin','탈퇴 '); await pg.fill('#qin','탈퇴'); ok('「탈퇴」라고 적으면 버튼 켜짐', !(await pg.isDisabled('#qyes')));
await pg.click('#qyes'); await pg.waitForSelector('h1:has-text("탈퇴가 끝났어요")');
const after=await pg.evaluate(()=>({mine:__db.books.filter(b=>b.owner_id==='u1').length, pages:__db.pages.length, media:__db.media.filter(m=>m.owner_id==='u1').length, prof:__db.profiles.filter(p=>p.id==='u1').length, other:__db.books.filter(b=>b.owner_id==='someone-else').length}));
ok('탈퇴 → 내 책·페이지·파일·프로필 모두 삭제, 남의 책은 그대로', after.mine===0 && after.pages===0 && after.media===0 && after.prof===0 && after.other===1); console.log('  ',JSON.stringify(after));
ok('탈퇴 후 로그아웃 + 작별 안내', await pg.evaluate(async()=>{ const {data}=await sb.auth.getSession(); return !data.session; }) && (await pg.locator('#app').innerText()).includes('모두 지웠어요'));
// 로그인 안 하고 ?new=1 → 로그인 안내
const p2=await b.newPage(); await p2.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(process.argv[2],'utf8')}));
await p2.addInitScript(()=>localStorage.clear()); await p2.goto(U+'/studio/?new=1'); await p2.waitForSelector('.fatal');
ok('비로그인 ?new=1 → 로그인 안내', (await p2.locator('.fatal').innerText()).includes('로그인'));
console.log(errs.length? errs.join('\n') : 'JS 오류 없음');
await b.close(); srv.close();
