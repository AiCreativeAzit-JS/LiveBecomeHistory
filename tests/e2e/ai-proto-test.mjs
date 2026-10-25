// AI 옆 창 시제품(studio/ai-proto.js, ?ai=proto): 글감 고르기 → 생각하기 → 초고 → 퇴고 → 담기 → 되돌리기를 끝까지 눌러 본다
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
const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); const reqs=[]; pg.on('request',r=>reqs.push(r.url()));
await pg.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(FAKE,'utf8')}));
await pg.route(/fonts\./,r=>r.abort());
const ok=(n,c)=>console.log((c?'PASS ':'FAIL ')+n);
const st=(js,a)=>pg.evaluate(js,a);
const U='http://localhost:8799';
let shotNo=0; const shot=async name=>{ if(!SHOTS) return; fs.mkdirSync(SHOTS,{recursive:true}); await pg.waitForTimeout(150); await pg.screenshot({path:path.join(SHOTS,`${String(++shotNo).padStart(2,'0')}-${name}.png`)}); };
const idle=()=>pg.waitForFunction(()=>{ const c=window.__aiProto&&__aiProto.cur; return !c||!c.busy; });
const act=async(a,extra='')=>{ await pg.click(`#aiPanel [data-act="${a}"]${extra}`); await idle(); };

// 평소 주소에는 시제품이 없다
await pg.goto(U+'/studio/'); await pg.waitForSelector('#canvas .pg');
ok('평소 체험 편집기: 「AI와 쓰기」 칸·AI 창 없음, 시제품 파일도 불러오지 않음', await pg.locator('#aiTile').count()===0 && await pg.locator('#aiPanel').count()===0 && !reqs.some(u=>u.includes('ai-proto.js')));

await pg.goto(U+'/studio/?ai=proto'); await pg.waitForSelector('#canvas .pg'); await pg.waitForSelector('#aiTile');
await st(()=>{ window.__aiFast=true; });
ok('콘텐츠 추가 다섯째 칸 「AI와 쓰기」', await st(()=>{ const t=[...document.querySelectorAll('.right .tiles .tile')]; return t.length===5 && t[4].id==='aiTile' && t[4].innerText.includes('AI와 쓰기'); }));
const before=await st(()=>JSON.stringify(state.pages)); const nBefore=await st(()=>state.pages.length);

// 첫 사용 동의
await pg.click('#aiTile');
ok('처음 누르면 동의 화면(쉬운 말 세 줄 + 동의하고 시작), AI 창은 아직 닫힘', await pg.locator('#aiConsent').isVisible() && await pg.locator('#aiConsent li').count()===3 && await pg.locator('#aiConsent [data-con=ok]').innerText()==='동의하고 시작' && !(await pg.locator('#aiPanel').isVisible()));
await shot('동의');
await pg.click('#aiConsent [data-con=later]');
ok('「다음에 할게요」 → AI 창 열리지 않음', !(await pg.locator('#aiPanel').isVisible()));
await pg.click('#aiTile'); await pg.click('#aiConsent [data-con=ok]');
ok('동의하고 시작 → AI 창 열림 · 동의 기록', await pg.locator('#aiPanel').isVisible() && await st(()=>localStorage.getItem('moa-ai-proto-consent'))==='1');

// 배치 B안
const lay=await st(()=>({ ai:document.getElementById('aiPanel').getBoundingClientRect().width, left:document.querySelector('.left').getBoundingClientRect().width,
  right:getComputedStyle(document.querySelector('.right')).display, canvas:document.getElementById('canvas').getBoundingClientRect(), center:document.getElementById('center').getBoundingClientRect() }));
ok('B안: 오른쪽 AI 창 약 340px · 도구 칸 숨김 · 쪽 목록 접힘', Math.abs(lay.ai-340)<2 && lay.right==='none' && lay.left<90); console.log('  AI 창',Math.round(lay.ai),'px · 쪽 목록',Math.round(lay.left),'px');
ok('지면이 가운데 칸 안에 다 보임(확대 비율 다시 맞춤)', lay.canvas.width<=lay.center.width);
const senior=async()=>st(()=>{ const p=document.getElementById('aiPanel'); const bs=[...p.querySelectorAll('button')].filter(b=>b.offsetParent);
  return { fs:parseFloat(getComputedStyle(p).fontSize), small:bs.filter(b=>b.getBoundingClientRect().height<44).map(b=>b.innerText.trim()||b.className) }; });
let sv=await senior(); ok('시니어 기본값: AI 창 글자 18px · 버튼 높이 44px 이상(글감 화면)', sv.fs===18 && sv.small.length===0); if(sv.small.length) console.log('  작은 버튼:',sv.small);

// 글감 고르기
ok('글감 첫 화면: 이번 주 글감 1장 크게, 한 번에 3장까지, 다른 글감 보기·내가 정하기', await pg.locator('#aiBody .tcard.big').count()===1 && await pg.locator('#aiBody .tcard').count()<=3 && (await pg.locator('#aiBody .tcard.big').innerText()).includes('내 생애 최고의 순간') && await pg.locator('#aiBody [data-act=pack]').count()===1 && await pg.locator('#aiBody [data-act=own]').count()===1);
ok('글감 카드 상태 「아직」', (await pg.locator('#aiBody .tcard.big .chip').innerText())==='아직');
await shot('글감고르기');
await act('pack'); ok('다른 글감 보기: 기본 꾸러미 3장', await pg.locator('#aiBody .tcard').count()===3);
const pack1=await pg.locator('#aiBody .tcard b').allInnerTexts(); await act('packmore');
ok('다른 글감 더 보기: 다른 3장', (await pg.locator('#aiBody .tcard b').allInnerTexts()).join()!==pack1.join()); await act('home');

// 생각하기
await act('topic','[data-id=w1]');
const g=await st(()=>__aiProto.cur.msgs[0].text);
ok('첫인사(프롬프트 v3 4장, 호칭 선생님): 고른 글감 이름 + 첫 질문', g.startsWith('안녕하세요, 선생님.') && g.includes("'내 생애 최고의 순간'을 찾아보겠습니다") && g.endsWith('가장 먼저 떠오르는 장면은 무엇인가요?'));
ok('질문 수 「1 / 5」', (await pg.locator('#aiSub').innerText()).includes('질문 1 / 5'));
ok('글감 상태 「쓰는 중」', await st(()=>{ return __aiProto.sessions.w1 && __aiProto.sessions.w1.step==='think'; }));
await act('topics'); ok('대화 중 「글감 목록」 → 글감 화면(이 글감은 「쓰는 중」)', (await pg.locator('#aiBody .tcard.big .chip').innerText())==='쓰는 중');
await act('topic','[data-id=w1]'); ok('카드를 다시 누르면 대화 그대로 이어서', await st(()=>__aiProto.cur.msgs.length)===1 && (await pg.locator('#aiSub').innerText()).includes('질문 1 / 5'));
ok('답이 없으면 「여기까지 정리해 주세요」 잠김', await pg.locator('#aiPanel [data-act=sum]').isDisabled());
await pg.click('#aiIn'); await pg.keyboard.type('가나'); await pg.keyboard.press('Enter'); await pg.keyboard.type('다라');
ok('엔터는 줄바꿈(보내지 않음)', await pg.inputValue('#aiIn')==='가나\n다라' && await st(()=>__aiProto.cur.msgs.length)===1);
await pg.fill('#aiIn','');
const replies=[];
for(let k=0;k<5;k++){ await act('sample'); if(k===0) await shot('생각하기_예시답');
  await act('send'); replies.push(await st(()=>__aiProto.cur.msgs.at(-1).text));
  if(k===1) await shot('생각하기_대화'); }
const qn=await pg.locator('#aiSub').innerText();
const ruleOK=replies.slice(0,4).every(t=>(t.match(/\?/g)||[]).length===1 && (t.match(/[^.!?]+[.!?]/g)||[]).length<=3);
ok('AI 답(1~4번째): 질문 하나 · 3문장 이내', ruleOK); if(!ruleOK) console.log(replies);
ok('다섯 번째 답을 받으면 바로 정리(질문 5 / 5, 장면 후보 ①②③)', qn.includes('질문 5 / 5') && await pg.locator('#aiBody .scene').count()===3 && replies[4].startsWith('선생님, 이 가운데'));
await shot('장면후보');
await act('scene','[data-i="0"]');
ok('장면 고르기 → 고르지 않은 두 장면은 「남겨 둔 장면」으로 저장', await st(()=>__aiProto.kept.length)===2);
ok('「…을 중심으로 초고를 쓰겠습니다」 + 「초고 쓰기」 버튼', (await st(()=>__aiProto.cur.msgs.at(-1).text)).includes('중심으로 초고를 쓰겠습니다') && await pg.locator('#aiPanel [data-act=draft]').count()===1);

// 초고
await act('draft');
ok('초고: 고정 안내 첫 줄', (await pg.locator('#aiBody .fixed').innerText())==='이 글은 선생님이 말씀하신 것만으로 썼습니다. 다른 기억이 나면 말씀해 주세요.');
ok('원고 카드: 책 글씨체 · 제목 · 글자 수 · 판 번호', /Noto Serif KR|Batang/.test(await pg.locator('#aiBody .ms').evaluate(n=>getComputedStyle(n).fontFamily)) && (await pg.locator('#aiBody .ms h4').innerText())==='됐습니다' && /초고 1판/.test(await pg.locator('#aiBody .ms-meta').innerText()) && /\d+자/.test(await pg.locator('#aiBody .ms-meta').innerText()));
ok('초고 단계 버튼: 퇴고로 넘어가기 · 질문 없이 바로 퇴고 · 빠른 고침 3개 · 내가 한 줄 더하기', await pg.locator('#aiPanel [data-act=revise]').count()===1 && await pg.locator('#aiPanel [data-act=revise-skip]').count()===1 && await pg.locator('#aiPanel [data-act=qfix]').count()===3 && await pg.locator('#aiPanel [data-act=mine-open]').count()===1);
await pg.click('#aiBody .s[data-sid=s3]');
ok('문장을 누르면 「다시 써 주세요 / 빼 주세요 / 제가 한 말이 아니에요」', (await pg.locator('#aiBody .smenu [data-act=mark]').allInnerTexts()).join('|')==='다시 써 주세요|빼 주세요|제가 한 말이 아니에요');
await shot('초고_문장메뉴');
await act('mark','[data-m=notmine]');
await pg.click('#aiBody .s[data-sid=s1]'); await act('mark','[data-m=redo]');
ok('표시는 모았다가 한 번에(표시한 곳 2군데)', (await pg.locator('#aiBody .mbar').innerText()).includes('2군데'));
await shot('초고_표시');
await act('apply');
const d2=await st(()=>({ver:__aiProto.cur.draft.ver, ids:__aiProto.cur.draft.sents.map(x=>x.id), s1:__aiProto.cur.draft.sents[0].t, nm:__aiProto.cur.notMine}));
ok('고쳐 받기: 지어낸 문장 빠짐 · 다시 쓴 문장 바뀜 · 2판 · 지어냄 지적 1건', d2.ver===2 && !d2.ids.includes('s3') && d2.s1==='공장 준공식 날, 칠십구년 겨울이었다.' && d2.nm===1);
await act('qfix','[data-k=plain]'); ok('빠른 고침 「더 담백하게」 → 3판', await st(()=>__aiProto.cur.draft.ver)===3);
await act('qfix','[data-k=long]'); ok('「이 장면을 길게」: 지어내지 않고 「내가 한 줄 더하기」를 권함', (await pg.locator('#aiBody .msg.ai').last().innerText()).includes('내가 한 줄 더하기'));
await act('mine-open'); await pg.fill('#aiMine','그날 일은 지금도 손에 남아 있다.'); await act('mine-add');
ok('내가 한 줄 더하기: 쓴 그대로 글 끝에', await st(()=>__aiProto.cur.draft.sents.at(-1).t)==='그날 일은 지금도 손에 남아 있다.' && await st(()=>__aiProto.cur.draft.ver)===4);
await shot('초고');
sv=await senior(); ok('초고 화면 버튼도 44px 이상', sv.small.length===0); if(sv.small.length) console.log('  작은 버튼:',sv.small);

// 퇴고
await act('revise');
ok('퇴고: 다섯 진단 — 고칠 곳만 색(1곳), 통과는 조용히 한 줄', await pg.locator('#aiBody .diag .fix').count()===1 && (await pg.locator('#aiBody .diag .pass').innerText()).startsWith('통과 4가지'));
ok('편집자 질문 하나 + 「기억 안 나요」·「답하기」', (await pg.locator('#aiBody .msg.ai').last().innerText()).includes('됐습니다') && await pg.locator('#aiPanel [data-act=forgot]').count()===1 && await pg.locator('#aiPanel [data-act=answer]').count()===1);
await shot('퇴고_편집자질문');
await act('sample-edit'); await act('answer');
const rv=await st(()=>({t:__aiProto.cur.rev.doc.sents.map(x=>x.t).join(' '), ans:__aiProto.cur.rev.doc.sents.filter(x=>x.ans).length}));
ok('퇴고본: 편집자 질문에 답한 말이 들어감 · 긴 문장을 끊음', rv.ans===2 && rv.t.includes('둘이 그냥 웃었다.') && rv.t.includes('나는 아무 말도 못 했다. 그의 손만 잡았던 것 같다.'));
ok('바뀐 곳 보기(처음부터 켜 둠): 초고와 비교해 지운 곳·더한 곳 표시', await pg.locator('#aiBody .diff ins').count()>0 && await pg.locator('#aiBody .diff del').count()>0);
ok('퇴고 단계 버튼: 모아에 담기 · 다시 고쳐 주세요', await pg.locator('#aiPanel [data-act=place]').count()===1 && await pg.locator('#aiPanel [data-act=refix]').count()===1);
await shot('퇴고본');
await pg.click('#aiBody .s[data-sid=rs2]'); await act('mark','[data-m=drop]'); await act('refix');
ok('퇴고본에서도 문장 표시 → 「다시 고쳐 주세요」로 한 번에(2판)', await st(()=>__aiProto.cur.rev.doc.ver)===2 && !(await st(()=>__aiProto.cur.rev.doc.sents.some(x=>x.id==='rs2'))));
ok('2차 기능(노래 만들기·가사)은 보이지 않음', !/노래|가사/.test(await pg.locator('#aiPanel').innerText()));

// 담기
await pg.locator('.th').nth(1).click(); await act('place');
const pl=await st(()=>({at:__aiProto.cur.place.shown, wide:document.getElementById('app').classList.contains('ai-wide'), here:document.querySelector('#thumbs .ins.ai-here')?.dataset.ins, label:document.querySelector('#thumbs .ins.ai-here')?.dataset.here, leftW:document.querySelector('.left').getBoundingClientRect().width}));
ok('담기: 기본 자리 = 지금 보던 쪽(2쪽) 뒤', pl.at===2 && (await pg.locator('#aiBody .popt.on').innerText()).includes('지금 보던 쪽 뒤'));
ok('쪽 목록이 펼쳐지고 그 자리에 「여기」 표시', pl.wide && pl.leftW>200 && pl.here==='2' && /^여기 · 새 글 약 \d+쪽$/.test(pl.label||''));
await shot('담기_자리고르기');
await pg.locator('.th').nth(0).click(); await idle();
ok('지금 보던 쪽을 바꾸면 자리 안내도 바뀜(1쪽 뒤)', (await pg.locator('#aiBody .popt.on').innerText()).includes('1쪽') && await st(()=>document.querySelector('#thumbs .ins.ai-here')?.dataset.ins)==='1');
await pg.locator('.th').nth(1).click(); await idle();
await act('pmode','[data-m=end]'); ok('책 맨 뒤 고르면 「여기」가 맨 끝으로', await st(()=>document.querySelector('#thumbs .ins.ai-here')?.dataset.ins)===String(nBefore));
await act('pmode','[data-m=pick]'); await pg.click('#thumbs .ins[data-ins="1"]', {force:true}); await idle();
ok('직접 고르기: 쪽 목록 사이를 누르면 그 자리(1쪽 뒤)', await st(()=>__aiProto.cur.place.shown)===1 && await st(()=>state.cur)===1);
await act('pickat','[data-at="2"]'); ok('직접 고르기: AI 창 안 목록으로도 고름(2쪽 뒤)', await st(()=>__aiProto.cur.place.shown)===2);
const est=await st(()=>__aiProto.cur.est.n);
await act('insert');
const ins=await st(()=>({n:state.pages.length, cur:state.cur, ids:__aiProto.cur.inserted.ids, p:state.pages[2], names:state.pages.map(p=>p.name), hist:history.length}));
const kept=await st(nb=>{ const ids=new Set(__aiProto.cur.inserted.ids); return JSON.stringify(state.pages.filter(p=>!ids.has(p.id))); });
ok('이 자리에 담기 → 3쪽부터 새 글 쪽으로 들어감(글감 이름 · 제목 상자 · 본문)', ins.n===nBefore+ins.ids.length && ins.p.name==='내 생애 최고의 순간' && ins.p.els[0].html==='됐습니다' && ins.p.els[1].html.includes('둘이 그냥 웃었다.') && ins.cur===2);
ok('있던 쪽은 하나도 바뀌지 않음(덮어쓰지 않음)', kept===before);
ok('예상 쪽 수와 실제로 들어간 쪽 수가 같음', est===ins.ids.length); console.log('  새 글',ins.ids.length,'쪽:',ins.names.slice(2,2+ins.ids.length).join(' / '));
ok('쪽 목록에 새 글 표시 · 다음 걸음(사진 넣기·다음 글감)·되돌리기', await pg.locator('#thumbs .th.ai-new').count()===ins.ids.length && await pg.locator('#aiPanel [data-act=photo]').count()===1 && await pg.locator('#aiPanel [data-act=next]').count()===1 && await pg.locator('#aiPanel [data-act=undo]').count()===1);
ok('지면(가운데)에 새 쪽이 보임', (await pg.locator('#canvas').innerText()).includes('됐습니다'));
await shot('담은뒤');
await act('undo');
ok('되돌리기 한 번 → 책이 담기 전과 똑같음 · AI 창은 자리 고르기로', await st(()=>JSON.stringify(state.pages))===before && await st(()=>__aiProto.cur.step)==='place');
await pg.click('.bottom'); await pg.keyboard.press('Control+y'); await idle();
ok('다시 하기(Ctrl+Y)로 되살리면 「담았어요」로(같은 글을 두 번 담지 않음)', await st(()=>__aiProto.cur.step)==='done' && await st(()=>state.pages.filter(p=>p.name==='내 생애 최고의 순간').length)===1);
await act('undo');
await act('pmode','[data-m=end]'); await act('insert');
ok('책 맨 뒤에 담기', await st(nb=>__aiProto.cur.inserted.at===nb && state.pages[nb].name==='내 생애 최고의 순간' && state.pages.length===nb+__aiProto.cur.inserted.ids.length, nBefore));
await pg.click('.bottom'); await pg.keyboard.press('Control+z');
ok('편집기에서 Ctrl+Z 한 번으로도 원래대로', await st(()=>JSON.stringify(state.pages))===before && await st(()=>__aiProto.cur.step)==='place');
await act('insert'); await act('next');
ok('다음 글감 → 첫 화면 · 글감 상태 「담음」 · 남겨 둔 장면 2장(모두 3장)', (await pg.locator('#aiBody .tcard.big .chip').innerText())==='담음' && await pg.locator('#aiBody .tcard').count()===3 && !(await st(()=>document.getElementById('app').classList.contains('ai-wide'))));
await shot('다음글감');

// 직접 쓴 답(정해진 틀) · 질문 없이 바로 퇴고
await act('own'); await pg.fill('#aiOwn','우리 집 첫 텔레비전'); await act('ownstart');
ok('내가 정하기 → 그 글감으로 첫인사', (await st(()=>__aiProto.cur.msgs[0].text)).includes("'우리 집 첫 텔레비전' 이야기"));
ok('예시 답 버튼은 이번 주 글감에서만', await pg.locator('#aiPanel [data-act=sample]').count()===0);
const LONG=Array.from({length:24},(_,i)=>`그 텔레비전 앞에서 ${i+1}번째로 생각나는 일은 동네 사람들이 저녁마다 모여 연속극을 보던 거예요. 어머니는 그때마다 보리차를 끓여 내오셨어요.`).join(' ');
await pg.fill('#aiIn','아버지가 월급날 흑백 텔레비전을 들고 오셨어요. 동네 아이들이 마루에 모여 앉았지요. '+LONG); await act('send');
const gm=await st(()=>__aiProto.cur.msgs.at(-1).text);
ok('직접 쓴 답: 말씀 일부를 되비추고 질문 하나', gm.startsWith('"아버지가 월급날 흑백 텔레비전을 들고 오셨어요"') && (gm.match(/\?/g)||[]).length===1);
await act('idk'); ok('잘 모르겠어요 → 다른 쪽에서 질문 하나(질문 3 / 5)', (await st(()=>__aiProto.cur.msgs.at(-1).text)).startsWith('그럼 조금 다른 쪽에서') && (await pg.locator('#aiSub').innerText()).includes('질문 3 / 5'));
await act('sum');
ok('여기까지 정리 → 장면 하나면 고르지 않고 바로 중심으로', await st(()=>__aiProto.cur.chosen)===0 && await pg.locator('#aiPanel [data-act=draft]').count()===1);
await act('draft'); await act('revise-skip');
ok('질문 없이 바로 퇴고: 편집자 질문 없이 진단 + 퇴고본', await st(()=>__aiProto.cur.rev.q)===null && await pg.locator('#aiBody .diag').count()===1 && await pg.locator('#aiBody .ms[data-doc=rev]').count()===1);
// 긴 글: 편집기 글 흐름 그대로 「(이어서)」 쪽으로 나뉘어 담기고, 되돌리기 한 번에 원래대로
const pre=await st(()=>JSON.stringify(state.pages));
await act('place'); const est2=await st(()=>__aiProto.cur.est.n); await act('insert');
const lg=await st(()=>{ const ps=__aiProto.cur.inserted.ids.map(id=>state.pages.find(p=>p.id===id)); return {n:ps.length, chain:ps.slice(1).every((p,i)=>p.flowFrom===ps[i].id), names:ps.map(p=>p.name)}; });
ok('긴 글은 「(이어서)」 쪽으로 이어져 여러 쪽으로 담김(예상 쪽 수와 같음)', lg.n>=2 && lg.chain && lg.names.slice(1).every(n=>n.endsWith('(이어서)')) && est2===lg.n); console.log('  긴 글',lg.n,'쪽:',lg.names.join(' / '));
await shot('긴글_여러쪽');
await act('undo'); ok('여러 쪽도 되돌리기 한 번에 원래대로', await st(()=>JSON.stringify(state.pages))===pre);
await act('back-rev');

// 좁은 화면
await pg.setViewportSize({width:900,height:760}); await pg.waitForTimeout(250);
const full=await st(()=>{ const r=document.getElementById('aiPanel').getBoundingClientRect(); return {w:r.width,h:r.height,pos:getComputedStyle(document.getElementById('aiPanel')).position}; });
ok('폭 1,000px 이하: AI 창은 전체 화면', full.pos==='fixed' && full.w===900 && full.h===760);
await shot('좁은화면');
await pg.setViewportSize({width:1366,height:768}); await pg.waitForTimeout(250);
await pg.click('#aiClose');
ok('닫기 → 도구 칸이 돌아오고 쪽 목록 펼침', await pg.locator('.right').isVisible() && !(await pg.locator('#aiPanel').isVisible()) && await st(()=>document.querySelector('.left').getBoundingClientRect().width)>200);
await pg.click('#aiTile'); ok('다시 열면 동의 없이 대화가 그대로', await pg.locator('#aiPanel').isVisible() && !(await pg.locator('#aiConsent').isVisible()) && await st(()=>__aiProto.cur&&__aiProto.cur.topic.title)==='우리 집 첫 텔레비전');

const outside=reqs.filter(u=>!u.startsWith(U)&&!/fonts\./.test(u)&&!u.startsWith('data:'));
ok('AI·서버로 나간 요청 없음(가짜 답)', outside.length===0); if(outside.length) console.log('  밖으로 나간 요청:',outside.slice(0,5));
ok('화면 오류 없음', errs.length===0); if(errs.length) console.log(errs);
await b.close(); srv.close();
