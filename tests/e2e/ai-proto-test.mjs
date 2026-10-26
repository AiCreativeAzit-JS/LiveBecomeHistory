// AI 옆 창 시제품 — 최소 기능판(studio/ai-proto.js, ?ai=proto): 글감 고르기 → 생각하기 → 초고 → 퇴고 → 담기 → 되돌리기를 끝까지 눌러 본다
// 글감 하나 = 대화 하나(초고·퇴고본은 대화 안 카드) · 생각하기는 다섯 관점 채움 + 질문 상한 8개 · 초고·퇴고는 말로 고치기 ·
// 담기는 「빈 쪽에 담기 / 새 쪽으로 넣고 빈 쪽 지우기」(빈 쪽이 없으면 「지금 보던 쪽 뒤 / 책 맨 뒤」) · 담은 뒤 퇴고 대화 이어 하기 → 바꿔 담기
// 가짜 답이라 AI·서버로 나가는 요청이 없어야 한다. AI_SHOTS=<폴더> 를 주면 단계별 화면을 PNG로 남긴다
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import((p=>/^[A-Za-z]:/.test(p)?'file:///'+p.replace(/\\/g,'/'):p)(R+'/playwright/index.mjs'));
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=process.env.MOA_ROOT||'/home/user/LiveBecomeHistory', FAKE=process.argv[2], SHOTS=process.env.AI_SHOTS||'';
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':f.endsWith('.js')?'text/javascript':'text/html'});res.end(d);} }); }).listen(8799);
const b=await chromium.launch({executablePath:process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:1366,height:768}}); const pg=await ctx.newPage();
const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('dialog',d=>d.accept().catch(()=>{})); const reqs=[]; pg.on('request',r=>reqs.push(r.url()));
await pg.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(FAKE,'utf8')}));
await pg.route(/fonts\./,r=>r.abort());
const ok=(n,c)=>console.log((c?'PASS ':'FAIL ')+n);
const st=(js,a)=>pg.evaluate(js,a);
const U='http://localhost:8799';
let shotNo=0; const shot=async name=>{ if(!SHOTS) return; fs.mkdirSync(SHOTS,{recursive:true}); await pg.waitForTimeout(150); await pg.screenshot({path:path.join(SHOTS,`${String(++shotNo).padStart(2,'0')}-${name}.png`)}); };
const idle=()=>pg.waitForFunction(()=>{ const c=window.__aiProto&&__aiProto.cur; return !c||!c.busy; });
const act=async(a,extra='')=>{ await pg.click(`#aiPanel [data-act="${a}"]${extra}`); await idle(); };
const say=async t=>{ await pg.fill('#aiIn',t); await act('send'); };                 // 입력칸에 쓰고 보내기
const sample=async()=>{ await act('sample'); await act('send'); };                   // 시제품 · 예시 넣기 → 보내기
const lastAI=()=>st(()=>{ const m=__aiProto.cur.msgs.filter(x=>x.who==='ai'); return m[m.length-1].text; });
const C=()=>st(()=>{ const s=__aiProto.cur; return {step:s.step, q:s.q, covered:s.covered.slice(), calls:s.calls, won:s.won, notMine:s.notMine, draft:s.draft&&{ver:s.draft.ver,t:__aiProto.docText(s.draft)}, rev:s.rev&&{ver:s.rev.ver,t:__aiProto.docText(s.rev)}, placed:s.placed.length, ins:s.inserted&&{...s.inserted}}; });
const pieces=()=>st(()=>[...document.querySelectorAll('#aiPieces span.on')].length);
const senior=async()=>st(()=>{ const p=document.getElementById('aiPanel'); const bs=[...p.querySelectorAll('button')].filter(b=>b.offsetParent);
  return { fs:parseFloat(getComputedStyle(p).fontSize), small:bs.filter(b=>b.getBoundingClientRect().height<44).map(b=>b.innerText.trim()||b.className) }; });

// 평소 주소에는 시제품이 없다
await pg.goto(U+'/studio/'); await pg.waitForSelector('#canvas .pg');
ok('평소 체험 편집기: 「AI와 쓰기」 칸·AI 창 없음, 시제품 파일도 불러오지 않음', await pg.locator('#aiTile').count()===0 && await pg.locator('#aiPanel').count()===0 && !reqs.some(u=>u.includes('ai-proto.js')));

await pg.goto(U+'/studio/?ai=proto'); await pg.waitForSelector('#canvas .pg'); await pg.waitForSelector('#aiTile');
ok('콘텐츠 추가 다섯째 칸 「AI와 쓰기」', await st(()=>{ const t=[...document.querySelectorAll('.right .tiles .tile')]; return t.length===5 && t[4].id==='aiTile'; }));
// 견본 책(다른 분의 책)이 펼쳐져 있으면 빈 책으로 열고 AI 창을 바로 띄운다. 시험용 가짜 서버에는 견본 책이 없어 펼쳐진 것처럼 표시
await st(()=>{ sampleTitle='견본 책'; });
await Promise.all([pg.waitForURL(/blank=1/), pg.click('#aiTile')]); await pg.waitForSelector('#canvas .pg');
await pg.waitForFunction(()=>document.getElementById('aiConsent')&&!document.getElementById('aiConsent').hidden);
await st(()=>{ window.__aiFast=true; });
ok('견본 책이 펼쳐져 있으면 「AI와 쓰기」 → 빈 책으로 열고 바로 AI 창(처음이면 동의 화면)', new URL(pg.url()).search==='?blank=1&ai=proto' && await st(()=>!sampleTitle));
const before=await st(()=>JSON.stringify(state.pages)); const nBefore=await st(()=>state.pages.length);

// 첫 사용 동의
ok('동의 화면: 쉬운 말 세 줄 + 「동의하고 시작」, AI 창은 아직 닫힘', await pg.locator('#aiConsent li').count()===3 && await pg.locator('#aiConsent [data-con=ok]').innerText()==='동의하고 시작' && !(await pg.locator('#aiPanel').isVisible()));
await shot('동의');
await pg.click('#aiConsent [data-con=later]'); ok('「다음에 할게요」 → AI 창 열리지 않음', !(await pg.locator('#aiPanel').isVisible()));
await pg.click('#aiTile'); await pg.click('#aiConsent [data-con=ok]');
ok('동의하고 시작 → AI 창 열림 · 동의 기록', await pg.locator('#aiPanel').isVisible() && await st(()=>localStorage.getItem('moa-ai-proto-consent'))==='1');
const lay=await st(()=>({ ai:document.getElementById('aiPanel').getBoundingClientRect().width, left:document.querySelector('.left').getBoundingClientRect().width,
  right:getComputedStyle(document.querySelector('.right')).display, canvas:document.getElementById('canvas').getBoundingClientRect().width, center:document.getElementById('center').getBoundingClientRect().width }));
ok('B안: 오른쪽 AI 창 약 340px · 도구 칸 숨김 · 쪽 목록 접힘 · 지면은 가운데 칸 안에', Math.abs(lay.ai-340)<2 && lay.right==='none' && lay.left<90 && lay.canvas<=lay.center);
let sv=await senior(); ok('시니어 기본값: AI 창 글자 18px · 버튼 44px 이상(글감 화면)', sv.fs===18 && sv.small.length===0); if(sv.small.length) console.log('  작은 버튼:',sv.small);

// 글감 고르기
ok('글감 첫 화면: 이번 주 글감 1장 크게 · 한 번에 3장까지 · 다른 글감 보기·내가 정하기', await pg.locator('#aiBody .tcard.big').count()===1 && await pg.locator('#aiBody .tcard').count()<=3 && await pg.locator('#aiBody [data-act=pack]').count()===1 && await pg.locator('#aiBody [data-act=own]').count()===1);
await shot('글감고르기');
await act('pack'); ok('다른 글감 보기: 기본 꾸러미 3장(「첫 출근」은 짧게 답하는 예시)', await pg.locator('#aiBody .tcard').count()===3 && (await pg.locator('#aiBody .tcard[data-id=p3]').innerText()).includes('짧게 답하는 예시'));
const pack1=await pg.locator('#aiBody .tcard b').allInnerTexts(); await act('packmore');
ok('다른 글감 더 보기: 다른 3장', (await pg.locator('#aiBody .tcard b').allInnerTexts()).join()!==pack1.join()); await act('home');

// 생각하기 — 길게 답하는 분: 다섯 관점이 채워지면 끝(다섯 번째 답에서)
await act('topic','[data-id=w1]');
const g=await st(()=>__aiProto.cur.msgs[0].text);
ok('첫인사(프롬프트 v3 4장, 호칭 선생님): 고른 글감 이름 + 첫 질문', g.startsWith('안녕하세요, 선생님.') && g.includes("'내 생애 최고의 순간'을 찾아볼게요") && g.endsWith('가장 먼저 떠오르는 장면은 무엇인가요?'));
ok('질문 수 대신 「이야기 조각」 다섯 관점(장면·사람·사건·마음·의미)', (await pg.locator('#aiPieces').innerText()).replace(/\s+/g,' ').includes('장면 사람 사건 마음 의미') && await pieces()===0);
await act('topics'); ok('대화 중 「글감 목록」 → 시작한 글감은 맨 위 「내 글」에 「쓰는 중」', await pg.locator('#aiBody .tcard.big').count()===0 && (await pg.locator('#aiBody .mrow').innerText()).includes('쓰는 중'));
await act('topic','[data-id=w1]'); ok('다시 누르면 대화 그대로', await st(()=>__aiProto.cur.msgs.length)===1);
ok('답이 없으면 「여기까지 정리해 주세요」 잠김', await pg.locator('#aiPanel [data-act=sum]').isDisabled());
await pg.click('#aiIn'); await pg.keyboard.type('가나'); await pg.keyboard.press('Enter'); await pg.keyboard.type('다라');
ok('엔터는 줄바꿈(보내지 않음)', await pg.inputValue('#aiIn')==='가나\n다라' && await st(()=>__aiProto.cur.msgs.length)===1);
await pg.fill('#aiIn','');
const replies=[], pc=[]; let ctrlOK=false;
for(let k=0;k<5;k++){ await act('sample'); if(k===0) await shot('생각하기_예시답');
  if(k===2){ const n0=await st(()=>__aiProto.cur.msgs.length); await pg.focus('#aiIn'); await pg.keyboard.press('Control+Enter'); await idle(); ctrlOK=await st(()=>__aiProto.cur.msgs.length)===n0+2; }
  else await act('send');
  replies.push(await lastAI()); pc.push((await C()).covered.length);
  if(k===2) await shot('생각하기_이야기조각'); }
ok('Ctrl+Enter로 보내기(엔터는 줄바꿈 그대로)', ctrlOK);
ok('답할수록 이야기 조각이 채워짐(2 → 3 → 4 → 4 → 5)', pc.join()==='2,3,4,4,5'); console.log('  이야기 조각:',pc.join(' → '));
const rule=replies.slice(0,4).every(t=>(t.match(/\?/g)||[]).length===1 && (t.match(/[^.!?]+[.!?]/g)||[]).length<=3);
ok('AI 답(1~4번째): 질문 하나 · 3문장 이내', rule); if(!rule) console.log(replies);
ok('다섯 관점이 다 채워지면 정리(질문 5개에서) · 장면 후보 ①②③ · 이야기 조각 줄은 사라짐', (await C()).q===5 && await pg.locator('#aiBody .scene').count()===3 && replies[4].startsWith('선생님, 이 가운데') && await pg.locator('#aiPieces span').count()===0);
await shot('장면후보');
await act('scene','[data-i="0"]');
ok('장면 고르기 → 고르지 않은 두 장면은 「남겨 둔 장면」 · 「초고 쓰기」', await st(()=>__aiProto.kept.length)===2 && await pg.locator('#aiPanel [data-act=draft]').count()===1);

// 초고 — 대화 안에 카드로 나오고, 말로 고친다
await act('draft');
ok('초고: 대화 안에 고정 안내 첫 줄 + 원고 카드(책 글씨체 · 제목 · 판 번호 · 글자 수)', (await pg.locator('#aiBody .msg .fixed').innerText())==='이 글은 선생님이 말씀하신 것만으로 썼습니다. 다른 기억이 나면 말씀해 주세요.' && /Noto Serif KR|Batang/.test(await pg.locator('#aiBody .ms').last().evaluate(n=>getComputedStyle(n).fontFamily)) && (await pg.locator('#aiBody .ms h4').last().innerText())==='됐습니다' && /초고 1판/.test(await pg.locator('#aiBody .ms-meta').last().innerText()));
ok('초고 단계: 고칠 것을 말로(입력칸 · 보내기) · 퇴고로 넘어가기 — 문장 메뉴·더 다듬기 묶음은 없음', await pg.locator('#aiIn').count()===1 && await pg.locator('#aiPanel [data-act=send]').count()===1 && await pg.locator('#aiPanel [data-act=revise]').count()===1 && await pg.locator('#aiPanel :is([data-act=sdrop],[data-act=qfix],[data-act=more],[data-act=mine-open],[data-act=prev],[data-act=revise-skip],[data-act=view])').count()===0);
ok('대표님 확인용 한 줄(시제품): 「이 글에서 AI에게 n번 물음 · 어림 약 m원」', /^시제품 확인용 · 이 글에서 AI에게 \d+번 물음 · 어림 약 [\d,]+원$/.test(await pg.locator('#aiCalls').innerText()) && await pg.locator('#aiPanel .ct').count()===0);
console.log('  초고까지:',await pg.locator('#aiCalls').innerText());
await shot('초고');
let c=await C(), c0=c.calls;
await sample();   // 「유난히 매서웠다」는 제가 한 말이 아니에요
c=await C();
ok('말로 고치기: 「제가 한 말이 아니에요」 → 초고 2판 · 그 문장 빠짐 · 지어냄 지적 기록 · AI 1번', c.draft.ver===2 && !c.draft.t.includes('유난히') && c.notMine===1 && c.calls===c0+1 && (await lastAI()).includes('말씀하지 않은 문장'));
ok('지난 판 카드는 접히고(지난 판) 새 판이 아래에', await pg.locator('#aiBody .ms.old').count()===1 && /초고 2판/.test(await pg.locator('#aiBody .ms-meta').last().innerText()));
await sample();   // 조금 더 담백하게
c=await C();
ok('「더 담백하게」 → 3판 · 고친 문장은 색으로 표시', c.draft.ver===3 && c.draft.t.includes('새벽에 나가니 눈이 와 있었다.') && await pg.locator('#aiBody .ms:not(.old) .chg').count()>=1);
await shot('초고_말로고치기');
await say('할머니 이야기도 넣어 주세요.');
ok('미리 써 두지 않은 요청: (시제품) 받아 적기만 · 판은 그대로', (await lastAI()).startsWith('(시제품)') && (await C()).draft.ver===3);
sv=await senior(); ok('초고 화면 버튼도 44px 이상', sv.small.length===0); if(sv.small.length) console.log('  작은 버튼:',sv.small);

// 퇴고 — 대화로 보충: 진단 → 꼭 필요한 질문(최대 3개) → 답을 다 들은 뒤 퇴고본 한 번 → 말로 고치기
await act('revise');
const rq1=await lastAI();
ok('퇴고: 다섯 진단을 짧게(고칠 곳만 · 나머지는 통과) + 첫 질문', rq1.includes('다섯 가지로 살펴봤어요') && rq1.includes('나머지 네 가지는 통과') && rq1.includes('됐습니다') && rq1.trim().endsWith('?'));
ok('퇴고 질문에는 「기억 안 나요」·「답하기」', await pg.locator('#aiPanel [data-act=forgot]').count()===1 && (await pg.locator('#aiPanel [data-act=send]').innerText())==='답하기');
await shot('퇴고_질문');
await sample();
ok('답하면 꼭 필요한 다음 질문 하나(아직 퇴고본은 쓰지 않음)', (await lastAI()).includes('마당을 다 쓸고 난 새벽') && (await C()).rev===null);
await act('forgot');
c=await C();
ok('질문이 끝나면 퇴고본 1판: 답한 말은 그 장면 뒤에 · 「기억 안 나요」는 비워 둠 · 긴 문장 끊음', c.rev.ver===1 && c.rev.t.includes('나는 아무 말도 못 했다. 그의 손만 잡았던 것 같다. 둘이 그냥 웃었다.') && !c.rev.t.includes('코끝'));
const rmsg=await lastAI();
ok('무엇을 왜 고쳤는지 한 줄씩 말함', rmsg.includes('이렇게 고쳤어요') && rmsg.includes('숨이 차는') && rmsg.includes('답하신 말') && rmsg.includes('원래대로 해 주세요'));
ok('퇴고본 카드에서 고친 문장은 색으로', await pg.locator('#aiBody .ms:not(.old) .chg').count()>=3 && /퇴고본 1판/.test(await pg.locator('#aiBody .ms-meta').last().innerText()));
await shot('퇴고본');
await sample();   // 「그러고 보니」는 원래대로
c=await C();
ok('말로 「원래대로」 → 퇴고본 2판에 말씀하신 표현이 살아남', c.rev.ver===2 && c.rev.t.includes('그러고 보니 그날 아버지 생각이 났다.') && (await lastAI()).includes('살렸습니다'));
ok('퇴고 단계 버튼: 보내기 · 모아에 담기', await pg.locator('#aiPanel [data-act=send]').count()===1 && await pg.locator('#aiPanel [data-act=place]').count()===1);
ok('2차 기능(노래 만들기·가사)은 보이지 않음', !/노래|가사/.test(await pg.locator('#aiPanel').innerText()));
const revBefore=c.rev.t;

// 담기 — 빈 쪽(견본 「첫 번째 이야기」)이 있으면 두 가지 중에 고른다
await act('place');
const p1=await st(()=>({mode:__aiProto.cur.place.mode, wide:document.getElementById('app').classList.contains('ai-wide'), tag:document.querySelector('#thumbs .th.ai-new')?.dataset.ai, tagI:document.querySelector('#thumbs .th.ai-new')?.dataset.i}));
ok('담기: 빈 쪽이 있으면 ① 빈 쪽에 담기(추천·기본) ② 새 쪽으로 넣고 빈 쪽 지우기', p1.mode==='fill' && await pg.locator('#aiBody .popt').count()===2 && (await pg.locator('#aiBody .popt.on').innerText()).includes('빈 쪽에 담기') && (await pg.locator('#aiBody .popt[data-m=swap]').innerText()).includes('첫 번째 이야기'));
ok('쪽 목록이 펼쳐지고 빈 쪽에 「여기에 담아요」', p1.wide && p1.tag==='여기에 담아요' && p1.tagI==='1');
await shot('담기_빈쪽');
await act('pmode','[data-m=swap]');
ok('「새 쪽으로 넣고 빈 쪽 지우기」를 고르면 넣을 자리에 「여기」 · 빈 쪽에 「지워요」', await st(()=>!!document.querySelector('#thumbs .ins.ai-here')) && await st(()=>document.querySelector('#thumbs .th.ai-del')?.dataset.ai)==='지워요');
await act('insert');
let pp=await st(()=>({n:state.pages.length, names:state.pages.map(p=>p.name), ins:__aiProto.cur.inserted}));
ok('새 쪽으로 넣고 빈 쪽 지우기 → 「첫 번째 이야기」 빠지고 새 글 쪽', pp.n===nBefore-1+pp.ins.ids.length && !pp.names.includes('첫 번째 이야기') && pp.names.includes('내 생애 최고의 순간') && (await pg.locator('#aiBody .aidone').innerText()).includes('빈 쪽은 지웠어요'));
await act('undo');
ok('되돌리기 한 번 → 책이 담기 전과 똑같음(빈 쪽도 돌아옴) · 자리 고르기로', await st(()=>JSON.stringify(state.pages))===before && (await C()).step==='place');
await act('pmode','[data-m=fill]'); const est=await st(()=>__aiProto.cur.est.n);
await act('insert');
pp=await st(()=>({n:state.pages.length, p:state.pages[1], names:state.pages.map(p=>p.name), ins:__aiProto.cur.inserted}));
const others=await st(ids=>JSON.stringify(state.pages.filter(p=>!ids.includes(p.id))), pp.ins.ids), beforeOthers=await st(b=>JSON.stringify(JSON.parse(b).filter((p,i)=>i!==1)), before);
ok('빈 쪽에 담기 → 2쪽 「첫 번째 이야기」 자리에 제목·본문이 들어가고 쪽 이름은 글감 이름', pp.p.name==='내 생애 최고의 순간' && pp.p.els[0].html==='됐습니다' && pp.p.els[1].html.includes('둘이 그냥 웃었다.') && pp.p.els[1].html.includes('그러고 보니 그날 아버지') && pp.ins.filled);
ok('다른 쪽은 하나도 바뀌지 않음 · 예상 쪽 수와 같음', others===beforeOthers && est===pp.ins.ids.length); console.log('  담은 글',pp.ins.ids.length,'쪽:',pp.names.slice(1,1+pp.ins.ids.length).join(' / '));
ok('담은 뒤: 다음 글감 · 퇴고 대화 이어 하기 · 되돌리기(「사진 넣기」 없음) · 쪽 목록에 「새 글」', (await pg.locator('#aiBody .aidone').innerText()).includes('빈 쪽에 담았어요') && await pg.locator('#aiPanel [data-act=next]').count()===1 && await pg.locator('#aiPanel [data-act=again]').count()===1 && await pg.locator('#aiPanel [data-act=undo]').count()===1 && await pg.locator('#aiPanel [data-act=photo]').count()===0 && await st(()=>document.querySelector('#thumbs .th.ai-new')?.dataset.ai)==='새 글');
await shot('담은뒤');
const afterFill=await st(()=>JSON.stringify(state.pages));
await act('undo');
ok('빈 쪽에 담은 것도 되돌리기 한 번 → 담기 전(빈 쪽으로) · 자리 고르기로', await st(()=>JSON.stringify(state.pages))===before && (await C()).step==='place');
await pg.click('.bottom'); await pg.keyboard.press('Control+y'); await idle();
ok('다시 하기(Ctrl+Y) → 「담았어요」로(같은 글을 두 번 담지 않음)', await st(()=>JSON.stringify(state.pages))===afterFill && (await C()).step==='done' && (await C()).placed===1);
await pg.keyboard.press('Control+z'); await idle();
ok('편집기에서 Ctrl+Z 한 번으로도 원래대로', await st(()=>JSON.stringify(state.pages))===before && (await C()).step==='place');
await act('back-rev'); ok('「퇴고 대화로 돌아가기」 → 퇴고에서 계속 말로 고칠 수 있음', (await C()).step==='revise' && await pg.locator('#aiIn').count()===1);
await act('place'); await act('insert');
ok('다시 담기(빈 쪽에)', await st(()=>JSON.stringify(state.pages))===afterFill);

// 담은 뒤 퇴고 대화 이어 하기 → 바꿔 담기(새 쪽 없이 그 쪽 글만)
c=await C(); c0=c.calls; const w0=c.won;
await act('again');
ok('퇴고 대화 이어 하기 → 지면에 담긴 지금 글이 대화에 카드로 · 보내기 · 그대로 두기 · 바꿔 담기', (await C()).step==='revise' && (await lastAI()).includes('지면에 담긴 지금 글') && await pg.locator('#aiPanel [data-act=replace]').count()===1 && await pg.locator('#aiPanel [data-act=keepas]').count()===1 && (await C()).calls===c0);
await sample();   // 끝 문장은 여운이 남게
c=await C();
ok('이어 한 퇴고: 말로 고치기 → 새 판 · AI 1번(담긴 글만 보내 약 100원 아래)', c.rev.t.includes('눈 오는 날이면, 지금도 그 사람들 얼굴이 생각난다.') && c.calls===c0+1 && c.won-w0>20 && c.won-w0<100);
console.log('  이어 한 퇴고 1번 어림 비용:',Math.round(c.won-w0),'원');
await shot('퇴고이어하기');
await act('replace');
const rp=await st(()=>({n:state.pages.length, txt:state.pages[1].els.map(e=>e.html).join(' '), rep:__aiProto.cur.inserted.rep}));
ok('바꿔 담기 → 새 쪽 없이 그 쪽 글만 바뀜 · 「바꿔 담았어요」 · 쪽 목록에 「바꾼 글」', rp.n===pp.n && rp.txt.includes('눈 오는 날이면, 지금도') && rp.rep===1 && (await pg.locator('#aiBody .aidone').innerText()).includes('바꿔 담았어요') && await st(()=>document.querySelector('#thumbs .th.ai-new')?.dataset.ai)==='바꾼 글');
await shot('바꿔담은뒤');
await act('undo');
ok('되돌리기 한 번 → 바꾸기 전 글로', await st(()=>JSON.stringify(state.pages))===afterFill && (await C()).ins.rep===0);
await act('next');
ok('다음 글감 → 맨 위 「내 글」에 「담음」(몇 쪽) · 새 글감은 남겨 둔 장면 2장', await pg.locator('#aiBody .tcard.big').count()===0 && /담음[\s\S]*2쪽에 담음/.test(await pg.locator('#aiBody .mrow').innerText()) && await pg.locator('#aiBody .tcard').count()===2);
await shot('내글_한편');

// 생각하기 — 짧게 답하는 분: 질문이 더 이어진다(일곱 번)
await st(()=>{ __aiProto.ui.pack=0; }); await act('pack'); await act('topic','[data-id=p3]');
const sp=[];
for(let k=0;k<7;k++){ await sample(); sp.push((await C()).covered.length); if(k===3) await shot('짧은답_이야기조각'); }
c=await C();
ok('짧게 답하면 질문이 더 이어짐(7번, 상한 8 안) · 다섯 관점이 다 차면 정리', c.q===7 && sp[sp.length-1]===5 && await pg.locator('#aiBody .scene').count()===3); console.log('  짧은 답 이야기 조각:',sp.join(' → '));
await act('scene','[data-i="0"]'); await act('draft'); await act('revise'); await sample();
c=await C();
ok('짧은 답 글도 퇴고 질문으로 보충(「나는 "네." 하고 고개만 숙였다.」)', c.rev&&c.rev.t.includes('나는 "네." 하고 고개만 숙였다.'));
await act('place');
ok('빈 쪽이 없으면 「지금 보던 쪽 뒤에 / 책 맨 뒤에」(기본: 지금 보던 쪽 뒤)', (await C()).step==='place' && await st(()=>__aiProto.cur.place.mode)==='after' && await pg.locator('#aiBody .popt').count()===2 && await st(()=>!!document.querySelector('#thumbs .ins.ai-here')));
await act('pmode','[data-m=end]'); const n0=await st(()=>state.pages.length); await act('insert');
ok('책 맨 뒤에 새 쪽으로', await st(n=>state.pages.length>n && state.pages[n].name==='첫 출근', n0));
await act('next');

// 질문 상한 8개: 아주 짧은 답만 이어지면 여덟 번째에서 정리
await st(()=>{ __aiProto.ui.pack=0; }); await act('pack'); await act('topic','[data-id=p1]');
for(let k=0;k<8;k++) await say('네.');
c=await C();
ok('질문 상한 8개: 조각이 덜 채워져도 여덟 번째 답에서 정리', c.q===8 && await pg.locator('#aiBody .scene').count()>=1);
await act('topics');

// 직접 쓴 답(정해진 틀) · 긴 글은 「(이어서)」 쪽으로
await act('own'); await pg.fill('#aiOwn','우리 집 첫 텔레비전'); await act('ownstart');
ok('내가 정하기 → 그 글감으로 첫인사 · 예시 버튼 없음', (await st(()=>__aiProto.cur.msgs[0].text)).includes("'우리 집 첫 텔레비전' 이야기") && await pg.locator('#aiPanel [data-act=sample]').count()===0);
const LONG=Array.from({length:24},(_,i)=>`그 텔레비전 앞에서 ${i+1}번째로 생각나는 일은 동네 사람들이 저녁마다 모여 연속극을 보던 거예요. 어머니는 그때마다 보리차를 끓여 내오셨어요.`).join(' ');
await say('아버지가 월급날 흑백 텔레비전을 들고 오셨어요. 동네 아이들이 마루에 모여 앉았지요. '+LONG);
const gm=await lastAI();
ok('직접 쓴 답: 말씀 일부를 되비추고 비어 있는 관점을 하나 물음', gm.startsWith('"아버지가 월급날 흑백 텔레비전을 들고 오셨어요"') && (gm.match(/\?/g)||[]).length===1 && (await C()).covered.length===2);
await act('idk'); ok('잘 모르겠어요 → 다른 쪽에서 질문 하나', (await lastAI()).startsWith('그럼 조금 다른 쪽에서'));
await act('sum');
ok('여기까지 정리 → 장면 하나면 고르지 않고 바로 중심으로', await st(()=>__aiProto.cur.chosen)===0 && await pg.locator('#aiPanel [data-act=draft]').count()===1);
await act('draft'); await act('revise'); await act('forgot');
const pre=await st(()=>JSON.stringify(state.pages));
await act('place'); const est2=await st(()=>__aiProto.cur.est.n); await act('insert');
const lg=await st(()=>{ const ps=__aiProto.cur.inserted.ids.map(id=>state.pages.find(p=>p.id===id)); return {n:ps.length, chain:ps.slice(1).every((p,i)=>p.flowFrom===ps[i].id), names:ps.map(p=>p.name)}; });
ok('긴 글은 「(이어서)」 쪽으로 이어져 여러 쪽으로 담김(예상 쪽 수와 같음)', lg.n>=2 && lg.chain && lg.names.slice(1).every(n=>n.endsWith('(이어서)')) && est2===lg.n); console.log('  긴 글',lg.n,'쪽:',lg.names.join(' / '));
await shot('긴글_여러쪽');
await act('undo'); ok('여러 쪽도 되돌리기 한 번에 원래대로', await st(()=>JSON.stringify(state.pages))===pre);
await act('back-rev');

// 좁은 화면 · 닫기 · 다시 열기
await pg.setViewportSize({width:900,height:760}); await pg.waitForTimeout(250);
const full=await st(()=>{ const r=document.getElementById('aiPanel').getBoundingClientRect(); return {w:r.width,h:r.height,pos:getComputedStyle(document.getElementById('aiPanel')).position}; });
ok('폭 1,000px 이하: AI 창은 전체 화면', full.pos==='fixed' && full.w===900 && full.h===760);
await shot('좁은화면');
await pg.setViewportSize({width:1366,height:768}); await pg.waitForTimeout(250);
await pg.click('#aiClose');
ok('닫기 → 도구 칸이 돌아오고 쪽 목록 펼침', await pg.locator('.right').isVisible() && !(await pg.locator('#aiPanel').isVisible()) && await st(()=>document.querySelector('.left').getBoundingClientRect().width)>200);
await pg.click('#aiTile'); ok('다시 열면 동의 없이 대화가 그대로', await pg.locator('#aiPanel').isVisible() && !(await pg.locator('#aiConsent').isVisible()) && await st(()=>__aiProto.cur&&__aiProto.cur.topic.title)==='우리 집 첫 텔레비전');
await act('topics');
ok('「내 글」 네 편(담음 2편)', (await pg.locator('#aiBody h5', {hasText:'내 글'}).innerText()).includes('4편 (담음 2편)') && await pg.locator('#aiBody .mrow').count()===4);
await shot('내글목록');

// 안내 띠 링크 · 체험 원고가 남아 있을 때
await Promise.all([pg.waitForURL(u=>!/blank=1/.test(String(u))), pg.click('#demoBar a')]); await pg.waitForSelector('#aiTile');
ok('안내 띠 「견본 책 보기」 링크도 시제품 주소 유지', new URL(pg.url()).searchParams.get('ai')==='proto');
if(await pg.locator('#draftDlg').isVisible()) await pg.click('#draftDlg [data-draft=resume]');
await st(()=>DemoDraft.put({savedAt:Date.now(),title:'시험 원고',cur:0,pages:state.pages})); await st(()=>{ sampleTitle='견본 책'; });
await Promise.all([pg.waitForURL(/aiopen=1/), pg.click('#aiTile')]); await pg.waitForSelector('#draftDlg:not([hidden])'); await pg.waitForTimeout(500);
ok('체험 원고가 남아 있으면 그 질문이 먼저(AI 창은 아직)', !(await pg.locator('#aiPanel').isVisible()));
await pg.click('#draftDlg [data-draft=fresh]'); await pg.waitForSelector('#aiPanel:not([hidden])');
ok('고르고 나면 AI 창이 열림', new URL(pg.url()).search==='?blank=1&ai=proto');

const outside=reqs.filter(u=>!u.startsWith(U)&&!/fonts\./.test(u)&&!u.startsWith('data:'));
ok('AI·서버로 나간 요청 없음(가짜 답)', outside.length===0); if(outside.length) console.log('  밖으로 나간 요청:',outside.slice(0,5));
ok('화면 오류 없음', errs.length===0); if(errs.length) console.log(errs);
await b.close(); srv.close();
