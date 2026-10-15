import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import(R+'/playwright/index.mjs');
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/home/user/LiveBecomeHistory';
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':'text/html'});res.end(d);} }); }).listen(8766);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:1100,height:900}});
const now=new Date().toISOString();
const B=(i,t,au,pub,hid=false,del=null)=>({id:`00000000-0000-4000-8000-00000000000${i}`,owner_id:'u9',title:t,subtitle:'부제'+i,author_name:au,is_public:pub,admin_hidden:hid,deleted_at:del,published_at:new Date(Date.now()-i*1000).toISOString(),created_at:now,updated_at:now});
const seed={books:[B(1,'나의 인생 이야기','김정선',true),B(2,'비공개 일기','홍길동',false),B(3,'숨겨진 책','박숨김',true,true),B(4,'삭제한 책','이삭제',true,false,now),B(5,'바다의 기억','최바다',true)],
 chapters:[{id:'c1',book_id:B(1).id,position:0,title:'태어난 날',content:'<p>그날은 비가 왔다.</p><p onclick="x()">안전<script>window.__xss=1<\/script></p><img data-media="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa">'},{id:'c2',book_id:B(1).id,position:1,title:'학교',content:'<p>두 번째 장.</p>'},{id:'c3',book_id:B(2).id,position:0,title:'비밀',content:'<p>비밀 내용</p>'}],
 media:[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',book_id:B(1).id,storage_path:'u9/b1/a.png'}]};
await ctx.addInitScript(s=>{ window.__seed=s; },seed);
const pg=await ctx.newPage();
const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR '+e.message));
await pg.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(process.argv[2],'utf8')+`\n;(function(){const _c=window.supabase.createClient;window.supabase.createClient=function(){const c=_c();const st=c.storage.from;c.storage.from=()=>({async createSignedUrl(p){return {data:{signedUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='}}}});return c;}})();`}));
await pg.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
pg.on('dialog',d=>d.accept().catch(()=>{}));
const ok=(n,c)=>console.log((c?'PASS ':'FAIL ')+n);
await pg.goto('http://localhost:8766/shelf/');
await pg.waitForSelector('.book');
const titles=await pg.locator('.book h3').allInnerTexts();
ok('공개 책만 노출(2권)', titles.length===2&&titles.includes('나의 인생 이야기')&&titles.includes('바다의 기억')); console.log('  목록:',titles.join(' / '));
ok('비공개·숨김·삭제 책 안 보임', !titles.some(t=>['비공개 일기','숨겨진 책','삭제한 책'].includes(t)));
ok('최신 공개순 정렬', titles[0]==='나의 인생 이야기');
await pg.fill('#q','바다'); await pg.click('#sf button'); await pg.waitForTimeout(300);
ok('검색(제목)', (await pg.locator('.book').count())===1);
await pg.fill('#q','김정선'); await pg.click('#sf button'); await pg.waitForTimeout(300);
ok('검색(지은이)', (await pg.locator('.book h3').innerText())==='나의 인생 이야기');
await pg.fill('#q','없는책'); await pg.click('#sf button'); await pg.waitForTimeout(300);
ok('검색 결과 없음 안내', (await pg.locator('.empty').innerText()).includes('찾는 책이 아직 없어요'));
await pg.fill('#q',''); await pg.click('#sf button'); await pg.waitForSelector('.book');
await pg.click('.book >> nth=0'); await pg.waitForSelector('.cover');
ok('책 열람(표지)', (await pg.locator('.cover h1').innerText())==='나의 인생 이야기');
ok('목차 2장', (await pg.locator('.toc li').count())===2);
ok('본문 표시', (await pg.locator('#c0 .body').innerText()).includes('그날은 비가 왔다.'));
ok('스크립트/속성 제거', !(await pg.evaluate(()=>window.__xss)) && !(await pg.locator('#c0 [onclick]').count()));
ok('사진 불러옴', await pg.evaluate(()=>{const i=document.querySelector('#c0 img');return i&&i.src.startsWith('data:image')}));
ok('옛 형식 책: 저작권 안내(내려받기·인쇄 불가)', (await pg.locator('.copynote').first().innerText()).includes('저작권'));
ok('브라우저 제목', (await pg.title()).includes('나의 인생 이야기'));
// 비공개 책 직접 주소
await pg.goto('http://localhost:8766/shelf/#/book/00000000-0000-4000-8000-000000000002'); await pg.waitForSelector('.empty');
ok('비공개 책 주소 접근 차단 안내', (await pg.locator('.empty').innerText()).includes('비공개'));
await pg.goto('http://localhost:8766/shelf/#/book/00000000-0000-4000-8000-000000000001'); await pg.waitForSelector('.cover');
// 로그인 안 한 상태로 신고 → 안내
await pg.click('#rep'); await pg.waitForTimeout(300);
ok('비로그인 신고 시 로그인 안내', (await pg.locator('#toast').innerText()).includes('로그인'));
await pg.screenshot({path:'/tmp/shelf-book.png'});
// 로그인 상태로 신고
await pg.goto('http://localhost:8766/shelf/#/book/00000000-0000-4000-8000-000000000001');
await pg.evaluate(()=>localStorage.setItem('fakeSession',JSON.stringify({user:{id:'u1',email:'a@b.com'}})));
await pg.reload(); await pg.waitForSelector('.cover');
await pg.click('#rep'); await pg.waitForSelector('dialog[open]');
await pg.fill('#reason','부적절한 내용입니다'); await pg.click('#rs'); await pg.waitForTimeout(400);
ok('신고 접수', await pg.evaluate(()=>__db.reports.length===1&&__db.reports[0].reporter_id==='u1'));
await pg.click('#rep'); await pg.waitForSelector('dialog[open]'); await pg.fill('#reason','또 신고'); await pg.click('#rs'); await pg.waitForTimeout(400);
ok('중복 신고 안내', (await pg.locator('#rmsg').innerText()).includes('이미'));
// 목록 스크린샷
await pg.goto('http://localhost:8766/shelf/'); await pg.waitForSelector('.book'); await pg.screenshot({path:'/tmp/shelf-list.png'});
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
