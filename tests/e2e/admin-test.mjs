import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import((p=>/^[A-Za-z]:/.test(p)?'file:///'+p.replace(/\\/g,'/'):p)(R+'/playwright/index.mjs'));
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=process.env.MOA_ROOT||'/home/user/LiveBecomeHistory';
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':'text/html'});res.end(d);} }); }).listen(8767);
const b=await chromium.launch({executablePath:process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const now=new Date().toISOString();
const id=i=>`00000000-0000-4000-8000-00000000000${i}`;
const B=(i,t,au,pub,hid=false,del=null,own='u1')=>({id:id(i),owner_id:own,title:t,subtitle:'',author_name:au,is_public:pub,admin_hidden:hid,deleted_at:del,published_at:pub?now:null,created_at:new Date(Date.now()-i*1000).toISOString(),updated_at:now});
const seed={
 profiles:[{id:'u1',display_name:'김정선',created_at:now},{id:'u2',display_name:'홍길동',created_at:now},{id:'adm',display_name:'관리자',created_at:now}],
 books:[B(1,'나의 인생 이야기','김정선',true),B(2,'비공개 일기','김정선',false),B(3,'문제 있는 글','홍길동',true,false,null,'u2'),B(4,'이미 숨긴 책','홍길동',true,true,null,'u2'),B(5,'지운 책','홍길동',false,false,now,'u2')],
 reports:[{id:'r1',book_id:id(3),reporter_id:'aaaaaaaa-1111',reason:'욕설이 있어요',status:'open',created_at:now},{id:'r2',book_id:id(3),reporter_id:'bbbbbbbb-2222',reason:'광고글이에요',status:'open',created_at:now},{id:'r3',book_id:id(1),reporter_id:'cccccccc-3333',reason:'문제 없어 보이는 신고',status:'open',created_at:now},{id:'r4',book_id:id(4),reporter_id:'dddddddd-4444',reason:'예전 신고',status:'resolved',created_at:now}],
 book_admin_notes:[{book_id:id(4),note:'욕설로 숨김'}],
 media:[{id:'m1',book_id:id(1),owner_id:'u1',kind:'video',storage_path:'u1/x/v.mp4',caption:'비밀 설명',size_bytes:40*1024*1024,created_at:now},{id:'m2',book_id:id(1),owner_id:'u1',kind:'image',storage_path:'u1/x/i.jpg',caption:'',size_bytes:5*1024*1024,created_at:now},{id:'m3',book_id:id(3),owner_id:'u2',kind:'audio',storage_path:'u2/x/a.mp3',caption:'',size_bytes:8*1024*1024,created_at:now}]};
const mk=async()=>{ const ctx=await b.newContext({viewport:{width:1100,height:1000}}); await ctx.addInitScript(s=>{ window.__seed=s; window.__admins=['adm']; },seed); const pg=await ctx.newPage();
  await pg.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(process.argv[2],'utf8')}));
  await pg.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort()); pg.on('dialog',d=>d.type()==='prompt'?d.accept('테스트 사유'):d.accept()); return pg; };
const ok=(n,c)=>console.log((c?'PASS ':'FAIL ')+n);
const errs=[];
// 1) 비로그인 → 로그인 화면
let pg=await mk(); pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8767/admin/'); await pg.waitForSelector('#f');
ok('비로그인: 로그인 화면', (await pg.locator('h1').innerText())==='관리자 로그인');
ok('로그인 화면에 비밀번호 보이기', await pg.locator('#showpw').count()===1);
// 2) 일반 회원 → 거부
await pg.fill('#em','user@test.com'); await pg.fill('#pw','password123'); await pg.click('#go');
await pg.waitForSelector('h1:has-text("관리자만")'); ok('일반 회원: 접근 거부', true);
ok('일반 회원에게 통계·신고 없음', await pg.locator('.stat').count()===0&&await pg.locator('.item').count()===0);
await pg.close();
// 3) 관리자
pg=await mk(); pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8767/admin/'); await pg.waitForSelector('#f');
await pg.fill('#em','admin@test.com'); await pg.fill('#pw','password123'); await pg.click('#go');
await pg.waitForSelector('.stat');
const stats=await pg.locator('.stat b').allInnerTexts();
ok('통계: 회원3·전체책4·공개2·숨김1·신고3', stats.join(',')==='3,4,2,1,3'); console.log('  통계:',stats.join(','));
// 대시보드(기본 탭)
await pg.waitForSelector('.dash');
const dt=await pg.locator('.dash').innerText();
ok('대시보드가 기본 화면', await pg.locator('.tab.on').innerText()==='한눈에 보기');
ok('대시보드: 할 일에 신고 3건', dt.includes('처리할 신고 3건'));
ok('대시보드: 30일 추이 차트 2개(오늘 막대 강조)', await pg.locator('svg.chart').count()===2 && await pg.locator('svg.chart rect.today').count()===2);
ok('대시보드: 새 회원 3명·새 책 4권', /3\s*명/.test(dt) && /4\s*권/.test(dt));
ok('대시보드: 저장 공간 53MB / 10.00GB, 파일 3개', dt.includes('53MB / 10.00GB') && dt.includes('3개'));
ok('대시보드: 종류별 용량(영상 40MB·사진 5.0MB·노래 8.0MB)', dt.includes('영상 40MB')&&dt.includes('사진 5.0MB')&&dt.includes('노래 8.0MB'));
ok('대시보드: DB 12MB / 500MB', dt.includes('12MB / 500MB'));
ok('대시보드: 용량 큰 책 1위 = 나의 인생 이야기', (await pg.locator('.panel:has-text("용량을 많이") li').first().innerText()).includes('나의 인생 이야기'));
ok('대시보드: 미디어 설명(비밀 설명)은 안 보임', !(await pg.locator('body').innerText()).includes('비밀 설명'));
await pg.screenshot({path:'/tmp/admin-dash.png',fullPage:true});
await pg.click('.todo [data-go=reports]'); await pg.waitForSelector('#rf');
ok('할 일 → 신고 탭 이동, 대기 신고 3건', await pg.locator('.item').count()===3);
await pg.screenshot({path:'/tmp/admin.png'});
// 문제없음 처리
await pg.locator('.item',{hasText:'문제 없어 보이는 신고'}).locator('[data-act=dismissed]').click(); await pg.waitForTimeout(300);
ok('문제없음 처리 → 대기 목록에서 사라짐', await pg.locator('.item').count()===2 && await pg.evaluate(()=>__db.reports.find(r=>r.id==='r3').status)==='dismissed');
// 책 숨기고 처리 완료
await pg.locator('.item',{hasText:'욕설이 있어요'}).locator('[data-act=hide]').click(); await pg.waitForTimeout(400);
const st=await pg.evaluate(()=>({hid:__db.books.find(b=>b.id.endsWith('3')).admin_hidden, note:__db.book_admin_notes.find(n=>n.book_id.endsWith('3'))?.note, r1:__db.reports.find(r=>r.id==='r1').status, r2:__db.reports.find(r=>r.id==='r2').status}));
ok('책 숨김 + 관리자 메모 저장', st.hid===true&&st.note==='테스트 사유');
ok('같은 책의 다른 신고도 함께 처리', st.r1==='resolved'&&st.r2==='resolved');
const pt=await pg.locator('#pane').innerText();
ok('처리할 신고 0 → 안내 문구', pt.includes('처리할 신고가 없어요')&&pt.includes('신고하기'));
ok('빈 화면에도 메뉴(버튼) 3종 미리 안내', pt.includes('책 숨기고 처리 완료')&&pt.includes('처리 완료')&&pt.includes('문제없음'));
await pg.screenshot({path:'/tmp/admin-empty.png'});
const stats2=await pg.locator('.stat b').allInnerTexts(); ok('통계 갱신(공개1·숨김2·신고0)', stats2[2]==='1'&&stats2[3]==='2'&&stats2[4]==='0'); console.log('  통계:',stats2.join(','));
// 책 탭
await pg.click('[data-t=books]'); await pg.waitForSelector('#bf');
ok('책 탭: 삭제 제외 4권', (await pg.locator('.item').count())===4);
await pg.selectOption('#bf','hidden'); ok('숨김 필터 2권', (await pg.locator('.item').count())===2);
ok('관리자 메모 표시', (await pg.locator('#pane').innerText()).includes('욕설로 숨김'));
await pg.selectOption('#bf','deleted'); ok('삭제된 책 1권', (await pg.locator('.item').count())===1);
await pg.selectOption('#bf','hidden');
await pg.locator('.item',{hasText:'이미 숨긴 책'}).locator('[data-act=unhide]').click(); await pg.waitForTimeout(300);
ok('숨김 해제', await pg.evaluate(()=>__db.books.find(b=>b.id.endsWith('4')).admin_hidden)===false);
ok('비공개 책에는 "열어 보기"·숨기기 버튼 없음', await (async()=>{ await pg.selectOption('#bf','private'); const t=await pg.locator('#pane').innerText(); const a=await pg.locator('#pane .btn, #pane [data-act]').count(); return t.includes('비공개 일기')&&a===0; })());
// 회원 탭
await pg.click('[data-t=members]'); ok('회원 3명 표시', (await pg.locator('.item').count())===3);
const mt=await pg.locator('#pane').innerText(); ok('회원별 책 수 표시(김정선2·홍길동2·관리자0)', /김정선[\s\S]*?책 2권/.test(mt)&&/홍길동[\s\S]*?책 2권/.test(mt)&&/관리자[\s\S]*?책 0권/.test(mt));
await pg.screenshot({path:'/tmp/admin2.png'});
// R2로 옮기기 버튼
{ const has=await pg.locator('#migR2').count(); if(!has){ await pg.click('.tab[data-t=dash]'); await pg.waitForTimeout(400); }
  const n0=await pg.evaluate(()=>__db.media.filter(m=>m.storage_path&&!m.storage_path.startsWith('r2:')).length);
  ok('대시보드: 예전 저장소 파일 수와 「R2로 옮기기」 버튼', n0>0 && await pg.locator('#migR2').count()===1 && (await pg.locator('.dash').innerText()).includes(n0+'개'));
  await pg.click('#migR2'); await pg.waitForTimeout(800);
  ok('R2로 옮기기: 모두 옮겨지고 버튼 사라짐', await pg.evaluate(()=>__db.media.every(m=>!m.storage_path||m.storage_path.startsWith('r2:'))) && await pg.locator('#migR2').count()===0); }
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
