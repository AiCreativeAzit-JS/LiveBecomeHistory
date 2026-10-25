// AI와 쓰기 — 진짜 AI 모드(로그인 편집기 · 관리자가 켠 회원). 서버 함수 ai-write 는 가짜 답으로 바꿔 끼운다(실제 AI 호출·비용 없음)
// 켜지 않은 회원에게는 안 보임 · 동의 기록(ai_consents) · 함수로 보내는 내용 · 실패하면 쓰신 말이 입력칸에 그대로 · 대화 저장(ai_threads)·다시 열면 이어짐
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import((p=>/^[A-Za-z]:/.test(p)?'file:///'+p.replace(/\\/g,'/'):p)(R+'/playwright/index.mjs'));
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=process.env.MOA_ROOT||'/home/user/LiveBecomeHistory', FAKE=fs.readFileSync(process.argv[2],'utf8');
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':f.endsWith('.js')?'text/javascript':'text/html'});res.end(d);} }); }).listen(8798);
const b=await chromium.launch({executablePath:process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ok=(n,c)=>console.log((c?'PASS ':'FAIL ')+n);
const U='http://localhost:8798';
const seed={profiles:[{id:'u1',display_name:'김정선',approved:true,ai_enabled:false}],books:[],pages:[]};
const ctx=await b.newContext({viewport:{width:1366,height:768}});
await ctx.addInitScript(s=>{ window.__seed=s; if(!localStorage.getItem('fakeSession')) localStorage.setItem('fakeSession',JSON.stringify({user:{id:'u1',email:'writer@example.com'}})); },seed);
await ctx.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:FAKE}));
await ctx.route(/fonts\./,r=>r.abort());
// 가짜 ai-write: 받은 내용을 적어 두고 mode 마다 정해 둔 답. fail 에 코드를 넣으면 그 오류로 답한다
const sent=[]; let fail=null, thinkN=0;
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'authorization, apikey, content-type','access-control-allow-methods':'POST, OPTIONS'};
await ctx.route('**/functions/v1/ai-write',r=>{ const q=r.request(); if(q.method()==='OPTIONS') return r.fulfill({status:204,headers:CORS});
  const j=JSON.parse(q.postData()||'{}'); sent.push({...j,auth:q.headers()['authorization']});
  if(fail) return r.fulfill({status:fail==='daily_limit'?429:500,headers:CORS,contentType:'application/json',body:JSON.stringify({ok:false,error:fail})});
  const out={ think:()=>(++thinkN<2?{reply:'선생님, 그날 누가 곁에 있었나요?',covered:['장면','사건'],ready:false}:{reply:'',covered:['장면','사람','사건','마음','의미'],ready:true}),
    summarize:()=>({scenes:['눈 오는 새벽 첫 출근길','아버지가 싸 준 도시락']}),
    draft:()=>({title:'첫 출근',body:'눈이 왔다. 나는 일찍 나섰다.\n\n아버지가 도시락을 싸 주셨다.'}),
    fix:()=>({changed:true,reply:'',title:'첫 출근',body:'눈이 소복이 왔다. 나는 일찍 나섰다.\n\n아버지가 도시락을 싸 주셨다.',why:['① 눈 온 모습을 말씀대로 살렸어요.']}),
    revise_q:()=>({fixes:['① 장면: 됐습니다'],question:''}),
    revise:()=>({title:'첫 출근',body:'눈이 소복이 왔다. 나는 일찍 나섰다.\n\n아버지가 싸 주신 도시락이 따뜻했다.',why:['도시락의 온기를 더했어요.']}) }[j.mode];
  return r.fulfill({headers:CORS,contentType:'application/json',body:JSON.stringify({ok:true,out:out(),today:600,limit:3000})}); });
const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('dialog',d=>d.accept().catch(()=>{}));
const st=(js,a)=>pg.evaluate(js,a);
const idle=()=>pg.waitForFunction(()=>{ const c=window.__aiProto&&__aiProto.cur; return !c||!c.busy; });
const act=async(a,extra='')=>{ await pg.click(`#aiPanel [data-act="${a}"]${extra}`); await idle(); };
const say=async t=>{ await pg.fill('#aiIn',t); await act('send'); };
const lastAI=()=>st(()=>{ const m=__aiProto.cur.msgs.filter(x=>x.who==='ai'); return m[m.length-1].text; });

try{
  await pg.goto(U+'/studio/?new=1'); await pg.waitForSelector('#canvas .pg'); await pg.waitForTimeout(800);
  ok('AI를 켜지 않은 회원: 「AI와 쓰기」 칸 없음 · 파일도 불러오지 않음', await pg.locator('#aiTile').count()===0 && await st(()=>!document.querySelector('script[src="ai-proto.js"]')));
  await st(()=>{ __db.profiles[0].ai_enabled=true; __persist(); });
  await pg.goto(U+'/studio/?new=1'); await pg.waitForSelector('#aiTile');
  ok('관리자가 켠 회원: 「AI와 쓰기」 칸(「시험」 표시) · 시제품 표시 없음', (await pg.locator('#aiTile .pro').innerText())==='시험' && await pg.locator('#aiCalls').isHidden());
  await pg.click('#aiTile'); await pg.waitForSelector('#aiConsent:not([hidden])');
  const con=await pg.locator('#aiConsent').innerText();
  ok('동의 화면: Anthropic(미국)으로 보냄 · 학습에 안 씀 · 운영자 열람 · 1년 보관 · 지우는 방법(처리방침과 같은 말)', con.includes('Anthropic(미국 회사)') && con.includes('가르치는 데에는 쓰지 않아요') && con.includes('운영자가 대화를 볼 수 있어요') && con.includes('1년') && con.includes('탈퇴하면 함께 지워져요') && !con.includes('시제품'));
  await pg.click('#aiConsent [data-con=ok]'); await pg.waitForTimeout(300);
  ok('동의하면 ai_consents 에 기록(동의 버전)', await st(()=>__db.ai_consents.length===1&&__db.ai_consents[0].user_id==='u1'&&__db.ai_consents[0].version==='2026-10-27'));
  ok('시험판에는 「예시 넣기」가 없음', await pg.locator('#aiPanel [data-act=sample]').count()===0);

  await act('topic','[data-id=w1]');
  await say('눈 오는 날 처음 출근했어요.');
  const s1=sent[sent.length-1];
  ok('생각하기 → ai-write(think) · 글감 제목 · 지금까지 대화 · 로그인 표', s1.mode==='think' && s1.topic && s1.history.some(h=>h.who==='me'&&h.text==='눈 오는 날 처음 출근했어요.') && /^Bearer /.test(s1.auth||''));
  ok('AI 답이 대화에 나옴 · 이야기 조각 채움', (await lastAI())==='선생님, 그날 누가 곁에 있었나요?' && await pg.locator('#aiPieces span.on').count()===2);
  ok('「오늘 남은 양」 표시(하루 3,000원 중 600원 → 80%)', (await pg.locator('#aiLeft').innerText()).includes('80%'));

  fail='daily_limit'; await say('아버지가 도시락을 싸 주셨어요.');
  ok('하루 한도: 쉬운 말 안내 · 쓰신 말은 입력칸에 그대로', (await lastAI()).includes('오늘 쓸 수 있는 양을 다 썼어요') && await pg.inputValue('#aiIn')==='아버지가 도시락을 싸 주셨어요.');
  fail='boom'; await act('send');
  ok('연결 오류: 「한 번 더 눌러 주세요」 · 입력칸 그대로', (await lastAI()).includes('한 번 더 눌러') && await pg.inputValue('#aiIn')==='아버지가 도시락을 싸 주셨어요.');
  fail=null; await act('send');
  ok('다시 보내면 정리 → 장면 후보 2개', sent.some(x=>x.mode==='summarize') && await pg.locator('#aiBody .scene').count()===2);
  await act('scene','[data-i="0"]'); await act('draft');
  const sd=sent[sent.length-1];
  ok('초고 → ai-write(draft) · 고른 장면을 함께 보냄', sd.mode==='draft' && sd.note.includes('눈 오는 새벽 첫 출근길'));
  ok('초고 카드: 제목·문장', (await pg.locator('#aiBody .ms h4').last().innerText())==='첫 출근' && (await pg.locator('#aiBody .ms').last().innerText()).includes('아버지가 도시락을'));
  await say('눈이 소복이 왔다고 해 주세요.');
  ok('말로 고치기 → ai-write(fix) · 지금 초고를 함께 보냄 · 2판', sent[sent.length-1].mode==='fix' && sent[sent.length-1].doc.includes('눈이 왔다') && await st(()=>__aiProto.cur.draft.ver)===2);
  await act('revise');
  ok('퇴고: 물을 것이 없으면 바로 퇴고본(revise_q → revise)', sent.slice(-2).map(x=>x.mode).join()==='revise_q,revise' && await st(()=>__aiProto.cur.rev&&__aiProto.cur.rev.ver)===1 && (await lastAI()).includes('도시락의 온기'));
  await act('place'); await act('insert');
  ok('담기: 책에 들어감', await st(()=>state.pages.some(p=>JSON.stringify(p).includes('도시락이 따뜻했다'))));

  await pg.waitForTimeout(2200);
  const th=await st(()=>__db.ai_threads.map(r=>({k:r.topic_key,b:r.book_id,step:r.state.step,n:(r.state.msgs||[]).length})));
  ok('대화가 ai_threads 에 저장(책 · 글감별 한 줄 + 남겨 둔 장면 줄)', th.length===2 && th.every(r=>r.b) && th.some(r=>r.k==='w1'&&r.n>5) && th.some(r=>r.k==='_kept'));
  const book=await st(()=>BOOK); const nSent=sent.length;
  await pg.goto(U+'/studio/?book='+book); await pg.waitForSelector('#aiTile'); await pg.waitForTimeout(500);
  await pg.click('#aiTile'); await pg.waitForSelector('#aiPanel:not([hidden])');
  ok('다시 열면 동의를 또 묻지 않음', await pg.locator('#aiConsent').isHidden());
  ok('다시 열면 「내 글」에 쓰던 글감이 남아 있음', (await pg.locator('#aiBody').innerText()).includes('내 글'));
  await act('topic','[data-id=w1]');
  ok('글감을 누르면 대화가 이어짐(AI를 새로 부르지 않음)', (await pg.locator('#aiBody').innerText()).includes('그날 누가 곁에 있었나요') && sent.length===nSent);
}catch(e){ console.log('FAIL 시험 중단: '+e.message.split('\n')[0]); }
ok('화면 오류 없음', errs.length===0); if(errs.length) console.log('  ',errs.slice(0,3));
await b.close(); srv.close();
