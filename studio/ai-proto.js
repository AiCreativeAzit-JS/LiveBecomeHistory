/* 모아 편집기 · AI 옆 창 시제품 — 최소 기능판 (2026-10-26, PRD 초안 v0.1 5-1장 B안)
   켜는 법: 체험 편집기 주소에 ?ai=proto (studio/index.html 맨 아래에서 체험 모드일 때만 불러온다. 로그인한 내 책 편집에는 나오지 않음)
   - AI 답은 모두 미리 써 둔 가짜 답이다. 서버·AI 회사로 아무것도 보내지 않는다.
   - 글감 하나 = 대화 하나. 생각하기 → 초고 → 퇴고가 한 줄로 이어지는 대화이고, 초고·퇴고본은 대화 안에 카드로 나온다(지난 과정은 위로 올려 본다).
     · 생각하기: 다섯 관점(장면·사람·사건·마음·의미)이 채워지면 끝내고, 질문은 최대 8개(대표 「생각하기 프롬프트 v1」의 규칙).
       되비추기 1~2문장 + 질문 하나, 지어내지 않기는 「AI 회고 파트너 프롬프트 v3」를 따른다. 호칭은 PRD 제안값 「선생님」.
     · 초고: 고칠 것을 말로 한다(예: "아버지 이야기는 빼 주세요"). 첫 줄 고정 문장은 프롬프트 v3 19장.
     · 퇴고: 다섯 진단을 짧게 말하고 꼭 필요한 것만 묻는다(최대 3개). 답을 다 들은 뒤 퇴고본을 한 번 쓰고 무엇을 왜 고쳤는지 한 줄씩 말한다.
       (프롬프트 v3는 편집자 질문 하나 · 해설 쓰지 않기 → 손질이 필요한 곳, 대표 결정 항목)
   - 담기: 책에 빈 쪽(예: 견본 「첫 번째 이야기」)이 있으면 「빈 쪽에 담기 / 새 쪽으로 넣고 빈 쪽 지우기」, 없으면 「지금 보던 쪽 뒤 / 책 맨 뒤」.
     편집기의 되돌리기 기록(snap)·글 흐름(settle)을 그대로 써서 되돌리기 한 번이면 담기 전으로. 담은 뒤 「퇴고 대화 이어 하기」 → 「바꿔 담기」(그 쪽 글만)
   - 노래 만들기 같은 2차 기능은 보이지 않게 둔다. 대화·글감 상태는 이 화면에만 있고 새로 고치면 사라진다.
   - 2026-10-26 대표 의견으로 한 번 넓혔다가(문장 메뉴·바뀐 곳 고르기·더 다듬기 묶음·지난 단계 보기 등) 「엉킨다, 최소 기능으로」에 따라 걷어 냈다.
   편집기의 state·snap·settle·renderAll 등은 studio/index.html 의 전역 이름을 그대로 쓴다. */
(()=>{ 'use strict';
const CALL='선생님';                         // 호칭(프롬프트 v3는 「고문님」 고정 → 과정별 설정은 1차 기능)
const QMAX=8, RQMAX=3;                       // 생각하기 질문 상한(시작 인사의 첫 질문 포함) · 퇴고에서 AI가 먼저 묻는 질문 상한
const PIECES=['장면','사람','사건','마음','의미'];   // 생각하기에서 채울 다섯 관점(프롬프트 v1)
const REAL=!!window.MOA_AI_REAL;              // 로그인 편집기의 시험 참여자: 진짜 AI(아래 「진짜 AI」). 아니면 가짜 답 시제품
const fast=()=>!!window.__aiFast;            // 자동 시험에서는 기다리지 않는다
const wait=ms=>new Promise(r=>setTimeout(r,fast()?0:ms));
const reduce=()=>fast()||matchMedia('(prefers-reduced-motion: reduce)').matches;
const josa=(w,a,b)=>{ const t=String(w).replace(/["'」』”’)\s]+$/,''); const c=t.charCodeAt(t.length-1); return (c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28>0)?a:b; };
const split=t=>(String(t).replace(/\s+/g,' ').trim().match(/[^.!?…]+[.!?…]*["'」”’]*\s*/g)||[]).map(x=>x.trim()).filter(Boolean);
const copy=o=>JSON.parse(JSON.stringify(o));

/* ═══════════════ 가짜 자료(하드코딩) ═══════════════ */
const WEEK={id:'w1',label:'1주차 · 이번 주 글감',title:'내 생애 최고의 순간',first:'가장 먼저 떠오르는 장면은 무엇인가요?'};
// 글감마다 AI에게 함께 보내는 「취재 초점」과 「마무리 결」(지침서 v4.3 6장). 글감 이름으로 찾고, 없으면(내가 정한 글감 등) 기본값
const FOCUS=[
  [/최고의 순간/,'가장 빛나는 한 장면 하나를 찾는다. 의미 질문은 「왜 그 순간이 최고였나요」.','여운과 자부심'],
  [/첫 출근|첫 일/,'그날의 장면과 사람 중심. 짧게 답하시면 짧게 쓴다.','담백한 회상'],
  [/떠나보|그리운|돌아가신|세상을 떠/,'사건보다 마음과 관계. 서두르지 않고, 의미는 묻지 않아도 된다. 「왜 최고인가」 같은 질문은 쓰지 않는다.','조용한 여운, 위로를 강요하지 않기'],
  [/부모님|손주|가족/,'사람 중심. 그분의 모습과 오간 말, 함께한 장면을 먼저 묻는다.','따뜻한 여운']];
const focusOf=title=>{ const f=FOCUS.find(x=>x[0].test(title||'')); return f?{focus:f[1],tone:f[2]}:{focus:'그날의 장면과 사람 중심으로, 선생님이 편한 만큼만 묻는다.',tone:'담백한 여운'}; };
// 기본 글감 꾸러미: 대표님이 쓰실 자리(PRD 5-1). 지금 문구는 시제품용 예시
const PACK=[
  {id:'p1',label:'기본 글감 · 어린 시절',title:'어린 시절 살던 집',first:'그 집을 떠올리면 가장 먼저 보이는 자리는 어디인가요?'},
  {id:'p2',label:'기본 글감 · 학창 시절',title:'학교 가는 길',first:'그 길에서 가장 먼저 떠오르는 장면은 무엇인가요?'},
  {id:'p3',label:'기본 글감 · 첫 일 (시제품: 짧게 답하는 예시)',title:'첫 출근',first:'첫 출근 날, 가장 먼저 떠오르는 장면은 무엇인가요?'},
  {id:'p4',label:'기본 글감 · 가족',title:'부모님',first:'부모님을 떠올리면 가장 먼저 보이는 모습은 무엇인가요?'},
  {id:'p5',label:'기본 글감 · 인생의 전환점',title:'인생이 바뀐 날',first:'그날 가장 먼저 떠오르는 장면은 무엇인가요?'},
  {id:'p6',label:'기본 글감 · 지금의 나',title:'요즘 나의 하루',first:'요즘 하루 가운데 가장 좋아하는 때는 언제인가요?'},
  {id:'p7',label:'기본 글감 · 남기고 싶은 말',title:'손주에게 남기고 싶은 말',first:'손주를 떠올리면 가장 먼저 하고 싶은 말은 무엇인가요?'}];
// 「예시 넣기」로 넣는 어르신 답·요청과, 거기에 맞춰 미리 써 둔 AI 답(되비추기 + 질문 하나) · 채워지는 관점 · 장면 · 초고 문장
//  w1 = 길게 답하는 분(다섯 번 만에 다섯 관점이 채워짐), p3 = 짧게 답하는 분(일곱 번 묻게 됨)
//  초고 문장: plain(더 담백하게) · rev(퇴고) · revWhy(퇴고에서 고친 까닭) · made(말씀에 없던 문장 — 「제가 한 말이 아니에요」 시험용으로 일부러 넣음)
const SCRIPT={
 w1:{ans:[
  {a:'아무래도 공장 준공식 날이 아닐까 싶어요. 칠십구년 겨울이었어요.',covers:['장면','사건'],
   r:'칠십구년 겨울, 공장 준공식 날이 가장 먼저 떠오르셨네요. 지금은 그 장면을 조금 따라가 보겠습니다. 그날 아침, 가장 먼저 눈에 들어온 것은 무엇이었나요?',
   scene:'칠십구년 겨울, 공장 준공식 날',title:'준공식 날',rank:3,
   sents:[{id:'s1',t:'칠십구년 겨울, 공장 준공식 날이었다.'}]},
  {a:'새벽에 나갔는데 눈이 와 있었어요. 현장 사람들이 빗자루를 들고 마당을 쓸고 있더라고요. 박 기사가 제일 앞에 있었고요.',covers:['장면','사람'],
   r:'새벽 마당에 눈이 와 있었고, 빗자루를 든 사람들 맨 앞에 박 기사가 있었네요. 그날 박 기사가 한 말 가운데 지금도 귀에 남은 말이 있나요?',
   scene:'눈 온 새벽, 빗자루를 든 사람들 맨 앞에 서 있던 박 기사',title:'눈 쓸던 새벽',rank:1,
   sents:[{id:'s2',t:'새벽에 나가 보니 눈이 와 있었다.',plain:'새벽에 나가니 눈이 와 있었다.'},
          {id:'s3',t:'그날 새벽 공기는 유난히 매서웠다.',made:true},
          {id:'s4',t:'현장 사람들이 빗자루를 들고 마당을 쓸고 있었다.'},
          {id:'s5',t:'박 기사가 제일 앞에 있었다.',rev:'맨 앞에 박 기사가 있었다.',revWhy:'박 기사 문장을 앞 문장의 사람들과 이어지게 다듬었어요'}]},
  {a:'기계를 처음 돌릴 때 박 기사가 "됐습니다!" 하고 소리쳤어요. 저는 아무 말도 못 하고 그 사람 손만 잡았던 것 같아요.',covers:['사람','사건','마음'],
   r:'박 기사가 "됐습니다!" 하고 소리친 순간, 선생님은 말 대신 그 사람 손을 잡으셨네요. 지금 돌아보면, 그날이 선생님에게 어떤 날로 남아 있나요?',
   scene:'기계가 처음 돌던 순간, 박 기사의 "됐습니다!"와 말없이 잡은 손',title:'됐습니다',rank:0,
   sents:[{id:'s6',t:'기계를 처음 돌릴 때 박 기사가 "됐습니다!" 하고 소리쳤다.'},
          {id:'s7',t:'나는 아무 말도 못 하고 그의 손만 잡았던 것 같다.',rev:'나는 아무 말도 못 했다. 그의 손만 잡았던 것 같다.',revWhy:'소리 내어 읽으면 숨이 차는 긴 문장을 둘로 끊었어요'}]},
  {a:'그러고 보니 아버지 생각이 나네요. 아버지가 늘 "기계는 사람이 돌리는 거다" 하셨거든요. 그날 그 말이 생각났어요.',covers:['사람'],
   r:'"그러고 보니" 하시며 "기계는 사람이 돌리는 거다"라는 아버지 말씀이 떠오르셨네요. 그 말이 그날 떠오른 데에는 어떤 까닭이 있었을까요?',
   scene:'"기계는 사람이 돌리는 거다" 하시던 아버지의 말',title:'기계는 사람이 돌리는 거다',rank:2,
   sents:[{id:'s8',t:'그러고 보니 그날 아버지 생각이 났다.',rev:'그날 아버지 생각이 났다.',revWhy:'「그러고 보니」를 덜어 장면으로 바로 들어가게 했어요'},
          {id:'s9',t:'아버지는 늘 "기계는 사람이 돌리는 거다" 하셨다.'}]},
  {a:'기계가 아니라 그 새벽에 마당 쓸던 사람들 덕분에 공장이 선 거니까요. 지금도 눈 오는 날이면 그 사람들 얼굴이 생각나요.',covers:['의미','마음'],
   scene:'눈 오는 날이면 생각나는 그 사람들 얼굴',title:'눈 오는 날',rank:4,
   sents:[{id:'s10',t:'공장은 기계가 아니라, 그 새벽에 마당을 쓸던 사람들 덕분에 섰다.'},
          {id:'s11',t:'지금도 눈 오는 날이면 그 사람들 얼굴이 생각난다.'}]}],
  diag:'④ 읽는 재미가 있는가 — 박 기사의 "됐습니다!" 뒤 장면이 한 줄로 끝나 있어요.',
  revQ:[{q:'박 기사가 "됐습니다!" 하고 소리쳤을 때, 선생님이 손을 잡으며 하신 말이나 행동이 더 기억나시나요?',a:'손을 잡고 둘이 그냥 웃었어요. 박 기사 손이 기름투성이였는데 그것도 몰랐어요.',ins:['둘이 그냥 웃었다.','박 기사 손이 기름투성이였는데, 그것도 몰랐다.'],after:'s7'},
        {q:'마당을 다 쓸고 난 새벽, 사람들 얼굴이나 몸에 남아 있던 것이 기억나시나요?',a:'다들 코끝이 빨갛게 얼어 있었어요. 입김이 하얗게 났고요.',ins:['다들 코끝이 빨갛게 얼어 있었다.','입김이 하얗게 났다.'],after:'s5'}],
  draftReq:['\'그날 새벽 공기는 유난히 매서웠다\'는 제가 한 말이 아니에요.','조금 더 담백하게 써 주세요.'],
  revReq:['\'그러고 보니\'는 원래대로 해 주세요.'],
  againReq:['끝 문장은 여운이 남게 다듬어 주세요.']},
 p3:{ans:[
  {a:'공장이요.',covers:[],r:'"공장"이 가장 먼저 떠오르셨네요. 그날 공장 앞에 섰을 때 무엇이 보였나요?',sents:[{id:'h1',t:'첫 출근 날, 공장이었다.'}],pg:0},
  {a:'굴뚝이요. 연기가 났어요.',covers:['장면'],r:'연기 나는 굴뚝이 보였네요. 그날 곁에 있던 사람은 누구였나요?',scene:'연기 나던 굴뚝',title:'굴뚝',rank:1,sents:[{id:'h2',t:'굴뚝에서 연기가 났다.'}],pg:0},
  {a:'반장님이요.',covers:[],r:'반장님이 계셨네요. 반장님이 처음 건넨 말이 기억나시나요?',sents:[{id:'h3',t:'곁에는 반장님이 있었다.'}],pg:1},
  {a:'"늦지 마라." 그 말만요.',covers:['사람'],r:'"늦지 마라", 그 한마디가 남아 있네요. 그날 처음 맡은 일은 무엇이었나요?',scene:'반장님의 "늦지 마라."',title:'늦지 마라',rank:0,sents:[{id:'h4',t:'반장님은 "늦지 마라." 그 말만 했다.'}],pg:1},
  {a:'나사 조이는 일이요.',covers:['사건'],r:'첫 일이 나사 조이는 일이었네요. 그 일을 하는 동안 손이나 몸에 남은 느낌이 있나요?',sents:[{id:'h5',t:'첫 일은 나사를 조이는 일이었다.'}],pg:2},
  {a:'손이 떨렸어요.',covers:['마음'],r:'손이 떨렸던 것이 남아 있네요. 그날이 지금의 선생님에게 남긴 것이 있다면 무엇일까요?',scene:'나사를 조이며 떨리던 손',title:'떨리던 손',rank:2,sents:[{id:'h6',t:'손이 떨렸다.'}],pg:2},
  {a:'성실하게 살자, 그거요.',covers:['의미'],sents:[{id:'h7',t:'"성실하게 살자." 그날 남은 것은 그것이었다.'}],pg:3}],
  diag:'① 경험이 구체적인가 — 짧은 장면이 이어져 있어, 오간 말 한 줄이 더 있으면 그날이 잘 보여요.',
  revQ:[{q:'반장님이 "늦지 마라" 하셨을 때, 선생님은 뭐라고 답하셨나요?',a:'"네." 하고 고개만 숙였어요.',ins:['나는 "네." 하고 고개만 숙였다.'],after:'h4'}],
  draftReq:[],revReq:[],againReq:[]}};
// 직접 쓴 답에는 정해진 틀로 답한다: 아직 비어 있는 관점을 장면부터 차례로 묻는다(프롬프트 v1 규칙 2)
const PQ={장면:['그날 그곳을 떠올리면 무엇이 보이고 무엇이 들리나요?','그곳에서 가장 먼저 눈에 들어온 것 하나는 무엇인가요?'],
  사람:['그때 곁에 있던 사람은 누구였나요?','그 사람이 한 말 가운데 지금도 귀에 남은 말이 있나요?'],
  사건:['그 일은 어떻게 시작되었나요?','그 일은 어떻게 마무리되었나요?'],
  마음:['그 순간 몸에 남은 느낌이 있다면 무엇인가요?','그때 손이나 발이 어땠는지 기억나시나요?'],
  의미:['그 순간이 지금의 선생님에게 남긴 것이 있다면 무엇일까요?','왜 그 순간이 가장 먼저 떠오르셨을까요?']};
const FIRST_LINE=`이 글은 ${CALL}이 말씀하신 것만으로 썼습니다. 다른 기억이 나면 말씀해 주세요.`;   // 프롬프트 v3 19장(호칭만 바꿈)

/* ═══════════════ 상태(이 화면에만) ═══════════════ */
const sessions={};   // 글감 id → 대화 하나 = 글 한 편
const kept=[];       // 남겨 둔 장면 {id,title,from}
const ui={open:false, view:'topics', pack:0, own:''};
let cur=null, budget=12, seq=0, sid=0, aiCalls=0, wonAll=0;
// 대표님 확인용(시제품 전용): AI에게 물은 횟수와 어림 비용. PRD 8장 비용 모델과 같은 가정
// (Opus 5.5 공식 요금 2026-10-24 · 한글 1자 1.5토큰 · 지침서 1시간 캐시 · 1달러 1,500원). 담은 뒤 이어 하는 퇴고는 담긴 글만 보내는 셈
const PR={in:4,w:8,rd:0.2,out:20}, FX=1500, SYS=Math.round(9483*1.5)+150, TK=c=>Math.round(c*1.5);
function call(s,kind='talk',n=120){ s.calls++; aiCalls++;
  const d=s.rev||s.draft, dT=TK(d?docText(d).length:900)+100;
  const out={talk:580,write:dT+1500,fix:Math.round(dT*0.3)+1120,again:Math.round(dT*0.3)+1120}[kind];
  const hist=kind==='again'?dT+200+TK(n):s.hist+(kind==='talk'?TK(n):100);
  const usd=((s.calls===1?SYS*PR.w:SYS*PR.rd)+hist*PR.in+out*PR.out)/1e6; s.won+=usd*FX; wonAll+=usd*FX;
  if(kind!=='again') s.hist=hist+(kind==='talk'?180:kind==='write'?dT:Math.round(dT*0.3)); }
const won=x=>Math.round(x).toLocaleString();
const STEPS=[['think','생각하기'],['draft','초고'],['revise','퇴고'],['place','담기']], STEP_N={think:0,draft:1,revise:2,place:3,done:4};
const reach=(s,k)=>{ s.step=k; s.updated=Date.now(); };
const topicOf=id=>id===WEEK.id?WEEK:PACK.find(p=>p.id===id)||kept.find(k=>k.id===id)||(sessions[id]&&sessions[id].topic);
const scriptOf=s=>SCRIPT[s.topic.id]||null;
const status=id=>{ const s=sessions[id]; return !s?'아직':s.placed.length?'담음':'쓰는 중'; };
const consented=()=>{ if(REAL) return !!ui.agreed; try{ return localStorage.getItem('moa-ai-proto-consent')==='1'; }catch(e){ return !!ui.agreed; } };

/* 원고 = {kind:'draft'|'rev', title, ver, sents:[{id,p(문단),t,…}]} · 이번 판에서 고친 문장은 chg:true(카드에서 색으로) */
const paras=doc=>{ const g=[]; doc.sents.forEach(x=>{ (g[x.p]=g[x.p]||[]).push(x); }); return g.filter(Boolean); };
const docText=doc=>paras(doc).map(p=>p.map(x=>x.t).join(' ')).join('\n\n');
const docHTML=doc=>paras(doc).map(p=>esc(p.map(x=>x.t).join(' '))).join('<br><br>');
const fresh=doc=>({...copy(doc),sents:copy(doc.sents).map(x=>({...x,chg:false}))});   // 다음 판의 바탕(지난 판의 색 표시는 지움)

/* ═══════════════ 화면 틀 ═══════════════ */
const css=`
.tile.aitile{grid-column:1/-1;flex-direction:row;justify-content:center;gap:10px;border-color:var(--brand);background:var(--brand-soft);padding:14px 10px}
.tile.aitile b{font-size:15px;color:var(--brand-2)} .tile.aitile span{font-size:12.5px}
.tile.aitile .pro{font-size:11px;font-weight:700;color:#8A5A00;background:#FFF3DC;border-radius:999px;padding:1px 7px}
@media(min-width:1001px){
  .app.ai-on{grid-template-columns:76px minmax(0,1fr) 340px}
  .app.ai-on.ai-wide{grid-template-columns:232px minmax(0,1fr) 340px}
  .app.ai-on:not(.ai-wide) .left{padding:10px 6px 18px}
  .app.ai-on:not(.ai-wide) .th{padding:6px 2px}
  .app.ai-on:not(.ai-wide) .th .mini{width:46px}
  .app.ai-on:not(.ai-wide) :is(.th .nm,.th .no,.th .pick,.th .acts,.lh>span,.lh .pickall,.addpage span){display:none}
  .app.ai-on:not(.ai-wide) .lh{justify-content:center}
}
.app.ai-on>.right{display:none}
.aip{grid-column:3;grid-row:2;min-height:0;min-width:0;display:flex;flex-direction:column;background:var(--panel);border-left:1px solid var(--line);font-size:18px;line-height:1.6;color:var(--ink);word-break:keep-all;overflow-wrap:anywhere}
.aip[hidden]{display:none}
.aip button{min-height:44px}
.aip-head{display:flex;align-items:center;gap:8px;padding:8px 10px 8px 16px;border-bottom:1px solid var(--line)}
.aip-head b{font-family:var(--serif);font-size:19px;color:var(--brand-2);white-space:nowrap} .aip-head b:focus{outline:none}
.aip-pro{font-size:12.5px;font-weight:700;color:#8A5A00;background:#FFF3DC;border-radius:999px;padding:2px 9px;white-space:nowrap}
.aip-x{margin-left:auto;min-width:44px;padding:0 12px;border-radius:10px;font-size:16px;font-weight:600;border:1px solid var(--line)!important;background:#fff}
.aip-top{border-bottom:1px solid var(--line)}
.aip-steps{display:flex;gap:4px;list-style:none;margin:0;padding:8px 10px 6px;font-size:15px}
.aip-steps li{flex:1;text-align:center;padding:5px 0;border-radius:9px;color:var(--faint);font-weight:700;white-space:nowrap}
.aip-steps li.on{background:var(--brand);color:#fff} .aip-steps li.done{color:var(--brand)}
.aip-sub{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:0 10px 6px 16px;font-size:15px;color:var(--muted)}
.aip-sub b{color:var(--ink);font-weight:700;min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.aip-tl{white-space:nowrap;padding:0 10px;border-radius:10px;border:1px solid var(--line)!important;background:#fff;font-size:15px;font-weight:600;color:var(--brand-2)}
.aip-pieces{display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding:0 12px 8px 16px;font-size:14px;color:var(--muted)}
.aip-pieces:empty{display:none} .aip-pieces span{border-radius:999px;padding:1px 9px;background:var(--bg);color:var(--faint);font-weight:700}
.aip-pieces span.on{background:var(--brand-soft);color:var(--brand-2)}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.aip-body{flex:1;min-height:0;overflow-y:auto;padding:14px 14px 18px;position:relative}
.aip-foot{border-top:1px solid var(--line);padding:10px 12px;display:flex;flex-direction:column;gap:8px}
.aip-foot:empty{display:none}
.aip-status{display:flex;flex-wrap:wrap;justify-content:space-between;gap:0 8px;padding:5px 16px 7px;font-size:14px;color:var(--muted);border-top:1px solid var(--line)}
.aip-status .w{flex-basis:100%;color:#8A5A00;font-size:13.5px}
.ab{display:block;width:100%;padding:8px 14px;border-radius:12px;border:1.5px solid var(--line);background:#fff;font-size:17px;font-weight:600;text-align:center;line-height:1.35}
.ab:hover{border-color:var(--brand);background:var(--brand-soft)}
.ab.pri{background:var(--brand);border-color:var(--brand);color:#fff} .ab.pri:hover{background:var(--brand-2)}
.ab:disabled{opacity:.45;cursor:not-allowed}
.ab.sample{border-style:dashed;border-color:#D9B66A;color:#7A5B0C;background:#FFFBF2;font-size:15.5px}
.arow{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.vh{font-family:var(--serif);font-size:20px;color:var(--brand-2);margin:2px 0 12px}
.vh5{font-size:15px;color:var(--muted);margin:16px 0 8px;font-weight:700}
.note{font-size:15px;color:var(--muted);margin:8px 0}
.tcard{display:block;width:100%;text-align:left;border:1.5px solid var(--line);border-radius:14px;padding:12px 14px;background:#fff;margin-bottom:10px;position:relative}
.tcard:hover{border-color:var(--brand)} .tcard.big{border:2px solid var(--brand);background:var(--brand-soft);padding:16px}
.tcard .tl{display:block;font-size:14px;font-weight:700;color:var(--brand)} .tcard b{display:block;font-family:var(--serif);font-size:19px;margin:2px 0 4px;line-height:1.45}
.tcard.big b{font-size:23px} .tcard .tq{display:block;font-size:16px;color:var(--muted)}
.tcard .go{display:block;margin-top:8px;font-weight:700;color:var(--brand-2);font-size:16.5px}
.chip{display:inline-block;font-size:13px;font-weight:700;border-radius:999px;padding:1px 9px;background:var(--bg);color:var(--muted);margin-left:6px;vertical-align:2px}
.chip.ing{background:#FFF3DC;color:#8A5A00} .chip.done{background:var(--brand-soft);color:var(--brand-2)}
.kwrap{position:relative}
.kdel{position:absolute;right:10px;bottom:10px;padding:0 12px;white-space:nowrap;border-radius:10px;border:1px solid var(--line);background:#fff;color:var(--muted);font-size:15px}
.mrow{display:flex;flex-wrap:wrap;align-items:center;gap:2px 8px;width:100%;text-align:left;border:1px solid var(--line);border-radius:12px;padding:8px 12px;background:#fff;margin-bottom:6px}
.mrow:hover{border-color:var(--brand)} .mrow b{font-family:var(--serif);font-size:17px} .mrow .chip{margin-left:0} .mrow span.w{flex-basis:100%;font-size:14.5px;color:var(--muted)}
.msg{margin:0 0 12px;padding:11px 14px;border-radius:14px}
.msg .tx{white-space:pre-wrap}
.msg.ai{background:var(--bg)} .msg.me{background:var(--brand-soft);margin-left:26px}
.msg .who{display:block;font-size:13.5px;font-weight:700;color:var(--muted);margin-bottom:1px}
.msg.wait{color:var(--muted)} .msg.wait i{display:inline-block;animation:aiDot 1.2s infinite;font-style:normal} .msg.wait i:nth-child(2){animation-delay:.2s} .msg.wait i:nth-child(3){animation-delay:.4s}
@keyframes aiDot{0%,60%,100%{opacity:.25}30%{opacity:1}}
.msg .fixed{font-size:16.5px;color:var(--brand-2);background:var(--brand-soft);border-radius:10px;padding:8px 12px;margin:2px 0 10px}
.scene{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;border:1.5px solid var(--line);border-radius:12px;padding:10px 12px;background:#fff;margin:0 0 8px;font-size:17px}
.scene:hover:not(:disabled){border-color:var(--brand);background:var(--brand-soft)} .scene .n{font-weight:800;color:var(--brand)}
.scene.on{border:2px solid var(--brand);background:var(--brand-soft)} .scene:disabled{cursor:default;opacity:.6} .scene.on:disabled{opacity:1}
.aip textarea,.aip input[type=text]{width:100%;font:inherit;font-size:18px;line-height:1.55;padding:10px 12px;border:1.5px solid var(--line);border-radius:12px;background:#fff;color:var(--ink);resize:vertical}
.aip textarea{min-height:92px} .aip textarea:focus,.aip input[type=text]:focus{outline:none;border-color:var(--brand)}
.ms{background:#FFFDF8;border:1px solid #EADFC8;border-radius:12px;padding:12px 14px 14px;margin:0 0 10px;font-family:var(--serif);font-size:17.5px;line-height:1.9;box-shadow:0 1px 3px rgba(60,40,10,.06)}
.ms-meta{font-family:var(--sans);font-size:13.5px;color:var(--muted);display:flex;justify-content:space-between;margin-bottom:4px}
.ms h4{font-size:20px;margin:0 0 8px;color:#0B4536;text-align:center}
.ms p{margin:0 0 .8em} .ms p:last-child{margin:0}
.ms .chg{background:#DDF0E5;border-radius:4px}
.ms.old{max-height:150px;overflow:hidden;position:relative;opacity:.7}
.ms.old::after{content:"";position:absolute;left:0;right:0;bottom:0;height:56px;background:linear-gradient(rgba(255,253,248,0),#FFFDF8)}
.popt{display:block;width:100%;text-align:left;border:1.5px solid var(--line);border-radius:12px;padding:10px 14px;background:#fff;margin-bottom:8px}
.popt b{display:block;font-size:17.5px} .popt span{display:block;font-size:15px;color:var(--muted)}
.popt.on{border:2px solid var(--brand);background:var(--brand-soft)} .popt.on b::before{content:"● ";color:var(--brand)}
.pinfo{border-radius:12px;background:var(--bg);padding:10px 12px;font-size:16px;margin:6px 0 0}
.aibox{border:1.5px solid #CFE3D8;border-radius:14px;background:#F7FBF9;padding:12px;margin:4px 0 8px}
.aidone{border-radius:14px;background:var(--brand-soft);padding:14px;margin:4px 0 8px}
.aidone b{display:block;font-size:20px;color:var(--brand-2);font-family:var(--serif)}
.ins.ai-here{height:32px;margin:2px 0 8px}
.ins.ai-here::before{opacity:1;height:4px;top:14px;background:var(--gold)}
.ins.ai-here::after{content:attr(data-here);opacity:1;width:auto;white-space:nowrap;padding:0 10px;height:24px;top:4px;border-radius:999px;background:var(--gold);font:700 12.5px/24px var(--sans)}
.th.ai-new{border-color:var(--gold);background:#FFF8EA}
.th.ai-new::after{content:attr(data-ai);position:absolute;right:6px;bottom:6px;font:700 11px/1 var(--sans);color:#fff;background:var(--gold);border-radius:6px;padding:3px 5px}
.th.ai-del .mini{opacity:.45}
#aiConsent .mbox{max-width:480px;font-size:18px;line-height:1.65}
#aiConsent ol{margin:0 0 14px;padding-left:1.3em} #aiConsent li{margin-bottom:8px}
#aiConsent .pnote{font-size:15px;color:#7A5B0C;background:#FFF3DC;border-radius:10px;padding:8px 12px;margin:0 0 14px}
#aiConsent .arow .ab{min-height:48px}
@media(max-width:1000px){ .aip{position:fixed;inset:0;z-index:80;border:none} }   /* 좁은 화면: AI 창은 전체 화면 */
`;
document.head.insertAdjacentHTML('beforeend',`<style id="aiProtoCss">${css}</style>`);
const app=$('app');
document.querySelector('.right .tiles').insertAdjacentHTML('beforeend',
  `<button class="tile aitile" id="aiTile" type="button"><svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg><span style="text-align:left"><b>AI와 쓰기</b> <span class="pro">시제품</span><br><span>이야기를 나누며 한 편 써요</span></span></button>`);
app.insertAdjacentHTML('beforeend',`<aside class="aip" id="aiPanel" aria-label="AI와 쓰기" hidden>
  <div class="aip-head"><b>AI와 쓰기</b><span class="aip-pro" title="AI 답은 미리 써 둔 가짜 답이에요. 아무 데도 보내지 않아요">시제품 · 가짜 답</span><button class="aip-x" id="aiClose" type="button" title="AI 창 닫기(대화는 그대로 있어요)">닫기 ✕</button></div>
  <div class="aip-top"><ol class="aip-steps" id="aiSteps"></ol><div class="aip-sub" id="aiSub"></div><div class="aip-pieces" id="aiPieces"></div></div>
  <div class="aip-body" id="aiBody"></div><div id="aiLive" class="sr" aria-live="polite"></div>
  <div class="aip-foot" id="aiFoot"></div>
  <div class="aip-status"><span id="aiLeft"></span><span id="aiSaved">✓ 저장됨</span><span id="aiCalls" class="w" title="대표님 확인용(시제품 전용): PRD 8장 비용 모델 · Opus 기준 어림. 수강생 화면에는 넣지 않아요"></span></div>
</aside>`);
document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="aiConsent" hidden role="dialog" aria-modal="true" aria-labelledby="aiConT"><div class="mbox">
  <h3 id="aiConT">AI와 쓰기 전에 알려 드려요</h3>
  <ol><li>여기에 쓰신 이야기는 글 정리를 돕도록 <b>모아가 쓰는 AI 회사</b>로 보내져요.</li>
    <li>보낸 이야기는 <b>${CALL} 책을 쓰는 데에만</b> 쓰고, AI를 가르치는 데에는 쓰지 않아요.</li>
    <li>대화는 <b>${CALL}과 모아 운영자만</b> 볼 수 있고, 언제든 지울 수 있어요.</li></ol>
  <p class="pnote">지금은 시제품이라 실제로는 아무 데도 보내지 않아요. AI 답도 미리 써 둔 것이에요.</p>
  <div class="arow"><button class="ab" type="button" data-con="later">다음에 할게요</button><button class="ab pri" type="button" data-con="ok">동의하고 시작</button></div>
</div></div>`);
const panel=$('aiPanel'), body=$('aiBody'), foot=$('aiFoot');

/* ═══════════════ 열기 · 닫기 ═══════════════ */
function relayout(){ state.zoom=fitZoom(); redrawCanvas(); }   // 가운데 지면 폭이 바뀌었으니 확대 비율을 다시 맞춘다
function openPanel(){
  if(!consented()){ $('aiConsent').hidden=false; $('aiConsent').querySelector('[data-con=ok]').focus(); return; }
  endEdit(); ui.open=true; panel.hidden=false; app.classList.add('ai-on'); layoutFor(); relayout(); render(true);
  panel.querySelector('.aip-head b').setAttribute('tabindex','-1'); panel.querySelector('.aip-head b').focus({preventScroll:true}); }
function closePanel(){ ui.open=false; panel.hidden=true; app.classList.remove('ai-on','ai-wide'); marks(); relayout(); $('aiTile').focus({preventScroll:true}); }
function layoutFor(){ app.classList.toggle('ai-wide',!!cur&&(cur.step==='place'||cur.step==='done')); }   // 담기 때는 쪽 목록을 펼친다
// 체험 화면에 서가 견본 책(다른 분의 책)이 펼쳐져 있으면, 내 글은 빈 책에서 쓰도록 빈 책으로 다시 연다(대표 의견 2026-10-26)
function onTile(){ if(sampleTitle && QS.get('blank')!=='1'){ location.href='?blank=1&ai=proto&aiopen=1'; return; } openPanel(); }
$('aiTile').onclick=onTile; $('aiClose').onclick=closePanel;
// 「빈 책으로 시작하기 / 견본 책 보기」 안내 띠의 링크도 시제품 주소(?ai=proto)를 유지한다
$('demoBar').addEventListener('click',ev=>{ const a=ev.target.closest('a'); if(!a) return; const u=new URL(a.href); u.searchParams.set('ai','proto'); a.href=u.href; },true);
if(QS.get('aiopen')==='1') (async()=>{ const until=async f=>{ while(!f()) await new Promise(r=>setTimeout(r,150)); };
  await new Promise(r=>setTimeout(r,0));   // 이 파일을 다 읽은 뒤에 연다(아래 그리기 함수·상수가 준비되도록)
  await until(()=>document.querySelector('#canvas .pg'));
  if(window.DemoDraft&&await DemoDraft.get()){ await until(()=>!$('draftDlg').hidden); await until(()=>$('draftDlg').hidden); }   // 「지난번 체험하던 책이 있어요」를 먼저 고르게
  window.history.replaceState(null,'',location.pathname+'?blank=1&ai=proto'); openPanel(); toast('견본 책 대신 빈 책에서 시작해요'); })();   // history 는 편집기의 되돌리기 기록 이름이라 window.history
$('aiConsent').addEventListener('click',ev=>{ const b=ev.target.closest('[data-con]'); if(ev.target.id!=='aiConsent'&&!b) return;
  $('aiConsent').hidden=true;
  if(b&&b.dataset.con==='ok'){ ui.agreed=true; if(REAL) sb.from('ai_consents').insert({user_id:user.id,version:'2026-10-27'}).then(r=>{ if(r.error) console.error(r.error); }); try{ localStorage.setItem('moa-ai-proto-consent','1'); }catch(e){} openPanel(); } else $('aiTile').focus(); });
$('aiConsent').addEventListener('keydown',ev=>{ if(ev.key==='Escape'){ $('aiConsent').hidden=true; $('aiTile').focus(); } });

/* ═══════════════ 그리기 ═══════════════ */
function render(top){
  if(!ui.open) return;
  const s=cur, at=s?STEP_N[s.step]:-1;
  $('aiSteps').innerHTML=STEPS.map(([k,n],i)=>`<li class="${i<at?'done':i===at?'on':''}"${i===at?' aria-current="step"':''}>${i<at?'✓ ':''}${n}</li>`).join('');
  $('aiSub').innerHTML = s ? `<b title="글감: ${esc(s.topic.title)}">${esc(s.topic.title)}</b><button type="button" class="aip-tl" data-act="topics" title="다른 글감 고르기(이 대화는 그대로 남아요)">글감 목록</button>` : `<b>글감 고르기</b>`;
  $('aiPieces').innerHTML = s&&s.step==='think'&&!s.scenes ? `이야기 조각 ${PIECES.map(p=>`<span class="${s.covered.includes(p)?'on':''}">${s.covered.includes(p)?'✓ ':''}${p}</span>`).join('')}` : '';
  $('aiLeft').textContent=`글 약 ${budget}편 더`;
  $('aiCalls').textContent=s?`시제품 확인용 · 이 글에서 AI에게 ${s.calls}번 물음 · 어림 약 ${won(s.won)}원`:`시제품 확인용 · 모두 AI에게 ${aiCalls}번 물음 · 어림 약 ${won(wonAll)}원`;
  body.innerHTML = !s ? topicsView() : thread(s)+stageView(s);
  foot.innerHTML = !s ? '' : footView(s);
  foot.querySelectorAll('button').forEach(b=>{ if(s&&s.busy) b.disabled=true; });
  body.scrollTop = !s ? 0 : body.scrollHeight;   // 대화는 늘 맨 아래(가장 최근)가 보이게
  layoutFor(); marks();
}
const chip=id=>{ const t=status(id); return `<span class="chip ${t==='쓰는 중'?'ing':t==='담음'?'done':''}">${t}</span>`; };
const tcard=(t,big)=>`<button type="button" class="tcard${big?' big':''}" data-act="topic" data-id="${t.id}"><span class="tl">${esc(t.label)}${chip(t.id)}</span><b>${esc(t.title)}</b><span class="tq">${esc(t.first)}</span><span class="go">${status(t.id)==='아직'?'이 글감으로 쓰기 ›':'이어서 보기 ›'}</span></button>`;
function topicsView(){
  if(ui.view==='pack'){ const n=PACK.length, list=[0,1,2].map(k=>PACK[(ui.pack*3+k)%n]);
    return `<h4 class="vh">다른 글감 보기</h4><p class="note">기본 글감 꾸러미에서 세 장씩 보여 드려요.</p>${list.map(t=>tcard(t)).join('')}
      <button class="ab" type="button" data-act="packmore">다른 글감 더 보기</button><button class="ab" type="button" data-act="home" style="margin-top:8px">처음 화면으로</button>`; }
  if(ui.view==='own') return `<h4 class="vh">내가 정하기</h4><label class="note" for="aiOwn">쓰고 싶은 글감을 적어 주세요</label>
      <input type="text" id="aiOwn" maxlength="40" placeholder="예: 우리 집 첫 텔레비전" value="${esc(ui.own)}">
      <button class="ab pri" type="button" data-act="ownstart" style="margin-top:10px">이 글감으로 쓰기</button><button class="ab" type="button" data-act="home" style="margin-top:8px">처음 화면으로</button>`;
  // 새 글감은 한 번에 세 장까지(이번 주 글감이 먼저). 시작한 글감은 「내 글」 목록으로 옮겨 가고, 쌓인 글이 위에 보인다(대표 의견 2026-10-26)
  const wk=status(WEEK.id)==='아직', fr=kept.filter(k=>!sessions[k.id]), ks=fr.slice(0,wk?2:3);
  return `${wk?`<h4 class="vh">무엇을 써 볼까요?</h4>${tcard(WEEK,true)}`:''}${mineList()}
    <h5 class="vh5">남겨 둔 장면</h5>${ks.length?ks.map(k=>`<div class="kwrap">${tcard(k)}<button type="button" class="kdel" data-act="keepdel" data-id="${k.id}" title="이 장면 지우기" aria-label="남겨 둔 장면 지우기: ${esc(k.title)}">지우기</button></div>`).join('')+(fr.length>ks.length?`<p class="note">남겨 둔 장면이 ${fr.length-ks.length}개 더 있어요.</p>`:''):`<p class="note">생각하기에서 고르지 않은 장면이 여기에 모여요. 다음 글감으로 쓸 수 있어요.</p>`}
    <div class="arow" style="margin-top:12px"><button class="ab" type="button" data-act="pack">다른 글감 보기</button><button class="ab" type="button" data-act="own">내가 정하기</button></div>`;
}
// 내 글: 글감 하나 = 글 한 편. 쓰는 중·담은 글이 쌓이고, 눌러서 이어 간다(PRD 5-1 「책마다 글감 목록이 쌓이고」)
function where(s){ if(s.placed.length){ const r=rangeOf(s); return r?`${r}에 담음`+(s.inserted&&s.inserted.rep?` · ${s.inserted.rep}번 바꿔 담음`:''):'담은 쪽을 지웠어요'; }
  return {think:s.chosen!=null?'초고 쓰기 전':`생각하기 · 이야기 조각 ${s.covered.length} / 5`,draft:s.draft?`초고 ${s.draft.ver}판`:'초고 쓰는 중',revise:s.rev?`퇴고본 ${s.rev.ver}판`:'퇴고 중',place:'담을 자리 고르는 중',done:''}[s.step]; }
function mineList(){ const list=Object.values(sessions).sort((a,b)=>b.updated-a.updated); if(!list.length) return '';
  const d=list.filter(s=>s.placed.length).length;
  return `<h5 class="vh5" style="margin-top:4px">내 글 · ${list.length}편${d?` (담음 ${d}편)`:''}</h5>`+list.map(s=>`<button type="button" class="mrow" data-act="topic" data-id="${s.topic.id}"><b>${esc(s.topic.title)}</b>${chip(s.topic.id)}<span class="w">${esc(where(s))} · 눌러서 이어 가기</span></button>`).join(''); }
// 원고 카드(초고·퇴고본). 가장 최근 카드만 다 보이고, 지난 판은 접어 둔다(위로 올려 보면 과정이 남아 있다)
function card(doc,old){ const n=docText(doc).length;
  return `<div class="ms${old?' old':''}" data-doc="${doc.kind}"><div class="ms-meta"><span>${doc.kind==='draft'?'초고':'퇴고본'} ${doc.ver}판${old?' · 지난 판':''}</span><span>${n.toLocaleString()}자</span></div><h4>${esc(doc.title)}</h4>`
    +paras(doc).map(p=>`<p>${p.map(x=>`<span class="s${x.chg&&!old?' chg':''}">${esc(x.t)}</span>`).join(' ')}</p>`).join('')+`</div>`; }
// 말에 달리는 단추: 순서 제안(「이렇게 바꿔요 / 그대로 두기」)과 서버가 찾은 빠진 것 되돌리기
function actBtns(m,k){ const a=m.act;
  return a.type==='propose'?`<div class="arow actrow"><button class="ab pri" type="button" data-act="prop-yes" data-k="${k}">이렇게 바꿔요</button><button class="ab" type="button" data-act="prop-no" data-k="${k}">그대로 두기</button></div>`
    :`<div class="arow actrow"><button class="ab pri" type="button" data-act="restore" data-k="${k}">방금 고친 것 되돌리기</button><button class="ab" type="button" data-act="restore-no" data-k="${k}">그대로 두기</button></div>`; }
function thread(s){ const last=s.msgs.map(m=>!!m.card).lastIndexOf(true);
  return s.msgs.map((m,k)=>`<div class="msg ${m.who}${m.wait?' wait':''}" data-k="${k}"><span class="who">${m.who==='ai'?'AI':'나'}</span>${m.wait?'생각하고 있어요 <i>●</i><i>●</i><i>●</i>':
      `${m.pre?`<p class="fixed">${esc(m.pre)}</p>`:''}${m.card?card(m.card,k!==last):''}<span class="tx">${esc(m.text)}</span>`}</div>`
    +(m.act&&!m.act.done&&!s.busy&&cur===s?actBtns(m,k):'')
    +(m.scenes&&s.scenes?s.scenes.map((c,i)=>`<button type="button" class="scene${s.chosen===i?' on':''}" data-act="scene" data-i="${i}"${s.chosen!=null||s.busy?' disabled':''}><span class="n">${'①②③'[i]}</span><span>${esc(c.text)}</span></button>`).join(''):'')).join('')
    +(sampleText(s)&&!s.busy?`<button class="ab sample" type="button" data-act="sample" title="시제품 전용: 미리 써 둔 예시를 입력칸에 넣어요">${s.step==='think'?`시제품 · 예시 답 넣기 (${s.sampleAt+1}/${scriptOf(s).ans.length})`:s.asking?'시제품 · 예시 답 넣기':'시제품 · 예시 요청 넣기'}</button>`:''); }
// 시제품 전용 「예시 넣기」에 넣을 말(단계마다 다름)
function sampleText(s){ const S=scriptOf(s); if(!S) return '';
  if(s.step==='think') return !s.scenes&&S.ans[s.sampleAt]?S.ans[s.sampleAt].a:'';
  if(s.step==='draft') return s.draft&&S.draftReq[s.reqAt.draft]||'';
  if(s.step==='revise'){ if(s.asking){ const q=s.revQs[s.revAt]; return q&&q.a||''; } return s.rev&&(s.placed.length?S.againReq[s.reqAt.again]:S.revReq[s.reqAt.rev])||''; }
  return ''; }
const HINT={think:'여기에 답을 적어 주세요. 엔터는 줄바꿈, Ctrl+Enter는 보내기예요.',ask:'기억나는 것을 적어 주세요. 엔터는 줄바꿈, Ctrl+Enter는 보내기예요.',
  fix:'고치고 싶은 것을 말씀해 주세요. 예: 아버지 이야기는 빼 주세요 · 이 문장은 제가 한 말이 아니에요'};
const box=(ph,v)=>`<textarea id="aiIn" data-k="input" aria-label="${esc(ph)}" placeholder="${esc(ph)}">${esc(v)}</textarea>`;
function footView(s){
  if(s.step==='think'){
    if(s.chosen!=null) return `<button class="ab pri" type="button" data-act="draft">초고 쓰기</button>`;
    if(s.scenes) return '';   // 장면 카드를 눌러 고른다
    return `${box(HINT.think,s.input)}<button class="ab pri" type="button" data-act="send">보내기</button>
      <div class="arow"><button class="ab" type="button" data-act="idk">잘 모르겠어요</button><button class="ab" type="button" data-act="sum"${s.answers.length?'':' disabled title="답을 하나 이상 하시면 정리할 수 있어요"'}>여기까지 정리해 주세요</button></div>`; }
  if(s.step==='draft') return `${box(HINT.fix,s.input)}<div class="arow"><button class="ab" type="button" data-act="send">보내기</button><button class="ab pri" type="button" data-act="revise">퇴고로 넘어가기</button></div>`;
  if(s.step==='revise'){ if(!s.rev&&!s.asking) return '';
    if(s.asking) return `${box(HINT.ask,s.input)}<div class="arow"><button class="ab" type="button" data-act="forgot">기억 안 나요</button><button class="ab pri" type="button" data-act="send">답하기</button></div>`;
    if(placedOK(s)) return `${box(HINT.fix,s.input)}<button class="ab" type="button" data-act="send">보내기</button>
      <div class="arow"><button class="ab" type="button" data-act="keepas">그대로 두기</button><button class="ab pri" type="button" data-act="replace">바꿔 담기</button></div>`;
    return `${box(HINT.fix,s.input)}<div class="arow"><button class="ab" type="button" data-act="send">보내기</button><button class="ab pri" type="button" data-act="place">모아에 담기</button></div>`; }
  if(s.step==='place') return `<button class="ab pri" type="button" data-act="insert">${s.place.mode==='fill'?'빈 쪽에 담기':'담기'}</button><button class="ab" type="button" data-act="back-rev">퇴고 대화로 돌아가기</button>`;
  return `<button class="ab pri" type="button" data-act="next">다음 글감 고르기</button><div class="arow"><button class="ab" type="button" data-act="again">퇴고 대화 이어 하기</button><button class="ab" type="button" data-act="undo">되돌리기</button></div>`;
}
// 대화 끝에 붙는 단계 화면: 담을 자리 고르기 · 담은 뒤
function stageView(s){
  if(s.step==='done'){ const p=s.inserted, t=s.rev.title;
    return `<div class="aidone"><b>✓ 담았어요</b>${rangeOf(s)}에 「${esc(t)}」${josa(t,'을','를')} ${p.rep?'바꿔 담았어요.':p.filled?'빈 쪽에 담았어요.':'새 쪽으로 넣었어요.'}${p.swapped?' 빈 쪽은 지웠어요.':''} 다른 쪽은 그대로예요.</div>
      <p class="note">이제 이 글은 ${CALL} 원고예요. 지면에서 직접 고치실 수 있어요. AI와 더 고치고 싶으면 「퇴고 대화 이어 하기」를 눌러 주세요. 되돌리기 한 번이면 담기 전으로 돌아가요.</p>`; }
  if(s.step!=='place') return '';
  const e=firstEmpty(), opt=(m,b,sub)=>`<button type="button" class="popt${s.place.mode===m?' on':''}" data-act="pmode" data-m="${m}" aria-pressed="${s.place.mode===m}"><b>${b}</b><span>${sub}</span></button>`;
  const pg=i=>`${i}쪽 「${esc(state.pages[i-1].name)}」`;
  return `<div class="aibox"><h4 class="vh" style="margin:0 0 10px">어디에 담을까요?</h4>
    ${e>=0?opt('fill','빈 쪽에 담기 (추천)',`${pg(e+1)}에 그대로 담아요`)+opt('swap','새 쪽으로 넣고 빈 쪽은 지우기',`지금 보던 쪽 뒤에 새 쪽으로 넣고, ${pg(e+1)}${josa(state.pages[e].name,'은','는')} 지워요`)
      :opt('after','지금 보던 쪽 뒤에',`${pg(chainEnd(state.cur)+1)} 뒤에 새 쪽으로`)+opt('end','책 맨 뒤에',`${pg(state.pages.length)} 뒤에 새 쪽으로`)}
    <div class="pinfo">「${esc(s.rev.title)}」 · 약 ${estimate(s)}쪽 · 되돌리기 한 번이면 담기 전으로 돌아가요.</div></div>`;
}

/* ═══════════════ 쪽 목록 표시(「여기」 · 새 글) ═══════════════ */
function marks(){
  $('thumbs').querySelectorAll('.ai-here').forEach(n=>{ n.classList.remove('ai-here'); n.removeAttribute('data-here'); });
  $('thumbs').querySelectorAll('.ai-new,.ai-del').forEach(n=>n.classList.remove('ai-new','ai-del'));
  if(!ui.open||!cur) return;
  const tag=(id,label)=>{ const t=$('thumbs').querySelector(`.th[data-id="${id}"]`); if(t){ t.classList.add('ai-new'); t.dataset.ai=label; } return t; };
  const here=at=>{ const i=$('thumbs').querySelector(`.ins[data-ins="${at}"]`); if(i){ i.classList.add('ai-here'); i.dataset.here=`여기 · 새 글 약 ${estimate(cur)}쪽`; i.scrollIntoView({block:'nearest'}); } };
  if(cur.step==='place'){ const e=firstEmpty(), m=cur.place.mode;
    if(m==='fill'&&e>=0) tag(state.pages[e].id,'여기에 담아요')?.scrollIntoView({block:'nearest'});
    else if(m==='swap'&&e>=0){ here(chainEnd(state.cur)+1); tag(state.pages[e].id,'지워요')?.classList.add('ai-del'); }
    else here(m==='end'?state.pages.length:chainEnd(state.cur)+1); }
  if(cur.step==='done'&&cur.inserted) cur.inserted.ids.forEach(id=>tag(id,cur.inserted.rep?'바꾼 글':'새 글'));
}
// 쪽 목록을 다시 그릴 때마다(쪽 이동·되돌리기 등) 표시를 다시 붙이고, 담은 글이 되돌리기로 빠졌으면 담기 전 화면으로
function syncPlaced(s){
  const last=s.placed[s.placed.length-1];
  if(last&&s.step==='done'&&!placedAlive(last)){ s.undone=s.placed.pop(); s.inserted=s.placed[s.placed.length-1]||null; reach(s,'place'); s.place.mode=firstEmpty()>=0?'fill':'after'; budget++; return 'undo'; }
  if(s.undone&&s.step==='place'&&placedAlive(s.undone)){ s.placed.push(s.undone); s.inserted=s.undone; s.undone=null; reach(s,'done'); budget--; return 'redo'; }   // 다시 하기(Ctrl+Y) — 같은 글을 두 번 담지 않게
  return null; }
new MutationObserver(()=>{
  let ch=null; Object.values(sessions).forEach(s=>{ const r=syncPlaced(s); if(r&&(s===cur||!ch)) ch=r; });
  if(ch==='undo') toast('되돌렸어요 · 책은 담기 전 그대로예요');
  if(ch||(ui.open&&(!cur||cur.step==='place'))) render(); else marks(); }).observe($('thumbs'),{childList:true});

/* ═══════════════ 담기 · 바꿔 담기(편집기 장치 그대로) ═══════════════ */
const chainEnd=i=>{ while(flowsInto(i)) i++; return i; };   // 이어진 원고는 끝 쪽까지 한 덩어리로 본다(사이에 끼우지 않음)
const chainIds=i0=>{ const ids=[state.pages[i0].id]; for(let i=i0;flowsInto(i);i++) ids.push(state.pages[i+1].id); return ids; };
const emptyPage=p=>p.els.length>0&&p.els.every(e=>e.type==='text'&&!plain(e.html));   // 글상자만 있고 모두 비어 있는 쪽(견본 「첫 번째 이야기」 · 빈 새 쪽)
const firstEmpty=()=>state.pages.findIndex(emptyPage);
// 담은 글이 지면에 살아 있는가(빈 쪽에 담은 것은 그 본문이 다시 비면 되돌린 것)
const placedAlive=p=>{ const i=state.pages.findIndex(x=>x.id===p.ids[0]); if(i<0) return false; if(!p.filled) return true; const e=state.pages[i].els.find(x=>x.id===p.bodyId); return !!e&&!!plain(e.html); };
const placedOK=s=>{ const p=s.placed[s.placed.length-1]; return !!p&&placedAlive(p); };
function rangeOf(s){ const p=s.placed[s.placed.length-1]; if(!p) return ''; const ix=p.ids.map(id=>state.pages.findIndex(x=>x.id===id)).filter(i=>i>=0); if(!ix.length) return '';
  const a=Math.min(...ix)+1, b=Math.max(...ix)+1; return a===b?`${a}쪽`:`${a}~${b}쪽`; }
function writingPage(doc,name){
  return {id:uid(),name,bg:'#FFFFFF',els:[T(MX,24,CW,12,esc(doc.title),{fs:18,b:true,align:'center',color:'#0B4536'}), T(MX,44,CW,PH-MB-44,docHTML(doc))]};   // 견본 「첫 번째 이야기」와 같은 틀 · 본문은 아래 여백까지
}
// 몇 쪽이 될지: 편집기 글 흐름(settle)을 빈 책에 한 번 돌려 본다(실제 책은 건드리지 않음)
function estimate(s){ const key=docText(s.rev)+'|'+state.zoom; if(s.est&&s.est.key===key) return s.est.n;
  const keepP=state.pages; let n=1; try{ state.pages=[writingPage(s.rev,s.topic.title)]; settle(0); n=state.pages.length; } finally{ state.pages=keepP; }
  s.est={key,n}; return n; }
// 담기: ① 빈 쪽에 담기(그 쪽의 제목·본문 상자에) ② 새 쪽으로 넣고 빈 쪽 지우기 ③ 빈 쪽이 없으면 지금 보던 쪽 뒤 / 책 맨 뒤. snap 한 번 = 되돌리기 한 번
function doPlace(s){
  endEdit(); const m=s.place.mode, doc=s.rev, name=s.topic.title; let at;
  snap();
  if(m==='fill'){ at=firstEmpty(); const pg=state.pages[at], ts=pg.els.filter(e=>e.type==='text'), bodyEl=flowEl(at)||ts[ts.length-1], titleEl=ts.find(e=>e!==bodyEl&&e.y<bodyEl.y);
    if(titleEl) titleEl.html=esc(doc.title); bodyEl.html=(titleEl?'':`${esc(doc.title)}<br><br>`)+docHTML(doc); pg.name=name; settle(at);   // 넘친 글은 편집기와 똑같이 「(이어서)」 쪽으로
    s.inserted={ids:chainIds(at),filled:true,titleId:titleEl&&titleEl.id,bodyId:bodyEl.id,rep:0}; }
  else { const e=m==='swap'?firstEmpty():-1, emptyId=e>=0?state.pages[e].id:null, pg=writingPage(doc,name);
    state.pages.splice(m==='end'?state.pages.length:chainEnd(state.cur)+1,0,pg); settle(state.pages.indexOf(pg));
    if(emptyId){ state.pages.splice(state.pages.findIndex(p=>p.id===emptyId),1); healFlow(); }
    at=state.pages.indexOf(pg); s.inserted={ids:chainIds(at),swapped:!!emptyId,titleId:pg.els[0].id,bodyId:pg.els[1].id,rep:0}; }
  s.placed.push(s.inserted); s.undone=null; state.cur=at; state.sel=null; reach(s,'done'); budget=Math.max(0,budget-1);
  renderAll(); render(true); toast(`${rangeOf(s)}에 담았어요 · 되돌리기 한 번이면 원래대로예요`);
}
// 바꿔 담기: 담았던 쪽의 제목·본문 글만 새 글로(새 쪽을 만들지 않음). 이어진 쪽은 비운 뒤 글 흐름이 다시 채우고, 사진 같은 다른 것은 그대로
function replaceWriting(s){
  endEdit(); const p=s.placed[s.placed.length-1], i0=state.pages.findIndex(x=>x.id===p.ids[0]), pg=state.pages[i0], bodyEl=pg&&(pg.els.find(e=>e.id===p.bodyId)||flowEl(i0));
  if(!bodyEl){ toast('담았던 쪽을 찾지 못했어요'); return; }
  snap(); p.before={ids:p.ids.slice(),rep:p.rep,at:history.length};   // history: 편집기의 되돌리기 기록(바로 앞 snap) — 「되돌리기」 버튼으로 바꾸기 전으로
  const titleEl=pg.els.find(e=>e.id===p.titleId); if(titleEl) titleEl.html=esc(s.rev.title);
  bodyEl.html=(titleEl?'':`${esc(s.rev.title)}<br><br>`)+docHTML(s.rev); bodyEl.cont=false;
  for(let i=i0;flowsInto(i);i++){ const t=flowEl(i+1); if(t){ t.html=''; t.cont=false; } }
  settle(i0); Object.assign(p,{ids:chainIds(i0),rep:p.rep+1}); s.inserted=p; state.cur=i0; state.sel=null; reach(s,'done');
  renderAll(); render(true); toast(`${rangeOf(s)} 글을 바꿔 담았어요 · 되돌리기 한 번이면 원래대로예요`);
}
// 지면에 담긴 지금 글(담은 뒤 직접 고친 것 포함)을 원고로 읽는다 → 「퇴고 대화 이어 하기」의 바탕
const toText=html=>{ const d=document.createElement('div'); d.innerHTML=sanitizeText(html).replace(/<br\s*\/?>/gi,'\n').replace(/<\/(div|p)>/gi,'\n'); return d.textContent; };
function pageDoc(s){ const p=s.placed[s.placed.length-1], i0=p?state.pages.findIndex(x=>x.id===p.ids[0]):-1; if(i0<0) return null;
  const pg=state.pages[i0], bodyEl=pg.els.find(e=>e.id===p.bodyId)||flowEl(i0), titleEl=pg.els.find(e=>e.id===p.titleId); if(!bodyEl) return null;
  let all=toText(bodyEl.html); for(let i=i0;flowsInto(i);i++){ const t=flowEl(i+1); if(t) all+=(t.cont?'':'\n')+toText(t.html); }
  const sents=[]; all.split(/\n+/).map(x=>x.trim()).filter(Boolean).forEach((q,pi)=>split(q).forEach(t=>{ const o=s.rev.sents.find(x=>x.t===t); sents.push({...(o||{}),id:'q'+(++sid),t,orig:o?o.orig:t,p:pi,chg:false}); }));
  return {kind:'rev',title:(titleEl&&plain(titleEl.html))||s.rev.title,sents,ver:s.rev.ver}; }

/* ═══════════════ 가짜 AI ═══════════════ */
// AI 말: 「생각하고 있어요」 뒤에 글자가 흘러나온다. 바로 앞에 think()가 띄운 「생각하고 있어요」가 있으면 그것을 이어 쓴다
async function aiSay(s,text,extra){
  s.busy=true; const prev=s.msgs[s.msgs.length-1];
  if(!(prev&&prev.wait)){ s.msgs.push({who:'ai',wait:true}); render(); await wait(650+Math.random()*450); }
  const m=s.msgs[s.msgs.length-1]; delete m.wait; Object.assign(m,{text:''},extra||{});
  if(reduce()) m.text=text;
  else { render(); for(let i=0;i<text.length;i+=2){ m.text=text.slice(0,i+2); const n=cur===s&&body.querySelector(`.msg[data-k="${s.msgs.length-1}"] .tx`); if(n){ n.textContent=m.text; body.scrollTop=body.scrollHeight; } await wait(14); } }
  m.text=text; s.busy=false; if(cur===s){ render(); $('aiLive').textContent=text; } }
async function think(s,ms,fn){ s.busy=true; s.msgs.push({who:'ai',wait:true}); render(); await wait(ms); return fn(); }   // 다음 aiSay 가 이 「생각하고 있어요」 자리에 답을 쓴다
function greet(t){ const tt=`'${t.title}'${josa(t.title,'을','를')}`;
  return t.id===WEEK.id ? `안녕하세요, ${CALL}. 오늘은 ${CALL}의 삶에서 ${tt} 찾아볼게요. 처음부터 정답을 정할 필요는 없어요. 이야기를 하다 보면 생각하지 못했던 장면이 떠오를 수도 있어요. ${t.first}`   // 프롬프트 v3 4장
    : `안녕하세요, ${CALL}. 오늘은 '${t.title}' 이야기를 나눠 볼게요. 처음부터 정답을 정할 필요는 없어요. ${t.first}`; }
function mirror(t){ const f=(split(t)[0]||t).replace(/[.!?…]+$/,''); const sn=f.length>28?f.slice(0,28).trim()+'…':f; return `"${sn}" — 이 장면이 선명하게 남아 있네요.`; }
const missing=s=>PIECES.filter(p=>!s.covered.includes(p));
function askPiece(s,easy){ const p=missing(s)[0]||'의미'; s.target=p; const k=(s.asked[p]=(s.asked[p]||0)+1)-1; return PQ[p][(k+(easy?1:0))%2]; }   // 비어 있는 관점을 장면부터 차례로
function cover(s,list){ list.forEach(p=>{ if(!s.covered.includes(p)) s.covered.push(p); }); }
function startTopic(t){
  if(!sessions[t.id]){ sessions[t.id]={topic:t,step:'think',msgs:[],q:0,answers:[],covered:[],asked:{},target:'장면',sampleAt:0,input:'',busy:false,scenes:null,chosen:null,
    draft:null,rev:null,asking:false,revQs:[],revAt:0,revAns:[],reqAt:{draft:0,rev:0,again:0},notMine:0,place:{mode:'after'},inserted:null,placed:[],undone:null,
    calls:0,won:0,hist:0,updated:Date.now()};
    cur=sessions[t.id]; cur.q=1; call(cur); render(true); aiSay(cur,greet(t)); return; }
  cur=sessions[t.id]; cur.updated=Date.now(); render(true); }
async function send(kind){ const s=cur; if(s.busy) return;
  const text=kind==='idk'?'잘 모르겠어요.':kind==='forgot'?'기억 안 나요.':s.input.trim(); if(!text){ toast('적은 뒤 보내 주세요'); $('aiIn')?.focus(); return; }
  s.input=''; s.updated=Date.now();
  if(s.step==='draft') return fixByTalk(s,'draft',text);
  if(s.step==='revise') return s.asking?revAnswer(s,text,kind==='forgot'):fixByTalk(s,'rev',text);
  call(s,'talk',text.length); s.msgs.push({who:'me',text});
  const S=scriptOf(s), si=kind==='idk'||!S?-1:S.ans.findIndex(x=>x.a===text);
  if(kind!=='idk'){ s.answers.push({text,si}); if(si>=0){ cover(s,S.ans[si].covers); s.sampleAt=Math.max(s.sampleAt,si+1); }
    else cover(s,text.length<12?[]:text.length>=80?[s.target,...missing(s).filter(p=>p!==s.target).slice(0,1)]:[s.target]); }   // 직접 쓴 답: 아주 짧으면 그 관점은 아직 비어 있는 것으로
  // 다섯 관점이 채워지면, 또는 질문 상한(8개)에 닿으면 정리로(프롬프트 v1 규칙 6)
  if(!missing(s).length||s.q>=QMAX) return summarize(s);
  let reply; if(kind==='idk') reply=`그럼 조금 다른 쪽에서 여쭤 볼게요. ${askPiece(s,true)}`;
  else if(si>=0&&S.ans[si].r){ reply=S.ans[si].r; s.target=missing(s)[0]; } else reply=`${mirror(text)} ${askPiece(s)}`;
  s.q++; await aiSay(s,reply); $('aiIn')?.focus(); }
function sceneCands(s){ const S=scriptOf(s);
  return s.answers.map((a,k)=>a.si>=0?(S.ans[a.si].scene?{text:S.ans[a.si].scene,si:a.si,rank:S.ans[a.si].rank,k}:null):{text:(split(a.text)[0]||a.text).replace(/[.!?…]+$/,'').slice(0,60),si:-1,rank:10-Math.min(a.text.length/100,5),k})
    .filter(Boolean).sort((a,b)=>a.rank-b.rank).slice(0,3); }
async function summarize(s){
  const c=sceneCands(s); if(!c.length){ await aiSay(s,`${CALL}, 아직 글로 옮길 장면을 듣지 못했어요. 떠오르는 것이 있으면 한 줄이라도 적어 주세요.`); return; }
  s.scenes=c; await aiSay(s,`${CALL}, 지금까지 이야기에서 제가 들은 가장 선명한 장면은 다음과 같아요.`,{scenes:true});
  if(c.length===1){ await aiSay(s,`${CALL}이 이야기하신 ${s.topic.id===WEEK.id?'최고의 순간':'장면'}은 ${c[0].text}입니다.`); return choose(s,0,true); }   // 후보가 하나면 고르게 하지 않는다(프롬프트 v3 12장)
  await aiSay(s,s.topic.id===WEEK.id?`${CALL}, 이 가운데 이번 회고글의 중심이 될 '${WEEK.title}'${josa(WEEK.title,'을','를')} 하나 골라 주세요.`:`${CALL}, 이 가운데 이번 글의 중심이 될 장면을 하나 골라 주세요.`); }
async function choose(s,i,auto){ if(s.chosen!=null) return; if(!auto) call(s); s.chosen=i; const c=s.scenes[i];
  const left=s.scenes.filter((x,k)=>k!==i&&!kept.some(y=>y.title===x.text));   // 고르지 않은 장면은 묻지 않고 「남겨 둔 장면」으로(PRD 제안)
  left.forEach(x=>kept.push({id:'k'+(++seq),label:'남겨 둔 장면',title:x.text,first:'이 장면에서 가장 먼저 떠오르는 것은 무엇인가요?',from:s.topic.title}));
  if(left.length) toast(`고르지 않은 장면 ${left.length}개는 「남겨 둔 장면」에 두었어요`);
  const ct=c.text.replace(/[.。\s]+$/,''); await aiSay(s,`「${ct}」${josa(ct,'을','를')} 중심으로 초고를 쓸게요. 준비되시면 「초고 쓰기」를 눌러 주세요.`); }
function buildDraft(s){ const S=scriptOf(s), sents=[];
  s.answers.forEach((a,k)=>{ const A=a.si>=0?S.ans[a.si]:null, p=A&&A.pg!=null?A.pg:k;
    (A?A.sents.map(x=>({...x,src:x.id})):split(a.text).map(t=>({id:'g'+(++sid),t}))).forEach(x=>sents.push({...x,orig:x.t,p,chg:false})); });
  const c=s.scenes[s.chosen]; return {kind:'draft',title:c.si>=0&&S.ans[c.si].title?S.ans[c.si].title:s.topic.title,sents,ver:1}; }
async function writeDraft(s){ if(s.busy) return; reach(s,'draft'); call(s,'write');
  await think(s,1100,()=>{ s.draft=buildDraft(s); });
  await aiSay(s,'초고가 나왔어요. 고치고 싶은 곳이 있으면 말씀해 주세요. 다 되면 「퇴고로 넘어가기」를 눌러 주세요.',{pre:FIRST_LINE,card:copy(s.draft)}); }
// 말로 고치기(초고·퇴고 공통): 시제품은 몇 가지 말만 알아듣는다. 실제 AI는 어떤 말이든 원고에 반영한다(프롬프트 v3 20장 · 28장 뒤 수정 요청)
function fixRules(doc,text){ const d=fresh(doc), why=[]; let nm=0;
  const drop=f=>{ const n=d.sents.length; d.sents=d.sents.filter(x=>!f(x)); return n-d.sents.length; };
  if(/유난히|매서웠/.test(text)||(/한 말이 아니/.test(text)&&d.sents.some(x=>x.made))){ if(drop(x=>x.made||/유난히/.test(x.t))){ nm++; why.push('말씀하지 않은 문장(「새벽 공기는 유난히 매서웠다」)을 뺐습니다.'); } }
  if(/아버지/.test(text)&&/빼/.test(text)){ if(drop(x=>/아버지/.test(x.t))) why.push('아버지 이야기를 뺐습니다.'); }
  if(/담백/.test(text)){ let n=0; d.sents=d.sents.filter(x=>!x.made).map(x=>x.plain&&x.t===x.orig?(n++,{...x,t:x.plain,chg:true}):x); if(n) why.push('꾸밈을 덜어 문장을 담백하게 다듬었습니다.'); }
  if(/짧/.test(text)){ const ps=[...new Set(d.sents.map(x=>x.p))]; if(ps.length>1&&drop(x=>x.p===Math.max(...ps)&&!x.ans)) why.push('끝 문단을 덜어 짧게 했습니다.'); }
  if(/원래/.test(text)&&/그러고 보니/.test(text)){ d.sents=d.sents.map(x=>x.src==='s8'&&x.t!==x.orig?(why.push('말씀하신 대로 「그러고 보니」를 살렸습니다.'),{...x,t:x.orig,chg:true}):x); }
  if(/여운/.test(text)){ d.sents=d.sents.map(x=>x.t==='지금도 눈 오는 날이면 그 사람들 얼굴이 생각난다.'?(why.push('「지금도」를 뒤로 옮겨 끝 문장에 여운이 남게 했습니다.'),{...x,t:'눈 오는 날이면, 지금도 그 사람들 얼굴이 생각난다.',chg:true}):x); }
  return {d,why,nm}; }
async function fixByTalk(s,which,text){ s.msgs.push({who:'me',text});
  const doc=which==='draft'?s.draft:s.rev, again=which==='rev'&&s.placed.length>0;
  call(s,again?'again':'fix',text.length);   // 담은 뒤 이어 하는 퇴고는 담긴 글만 보내는 셈
  const r=await think(s,1000,()=>fixRules(doc,text));
  if(!r.why.length){ await aiSay(s,'(시제품) 말씀을 받았어요. 실제 AI는 이 말씀대로 원고를 고쳐 다시 보여 드립니다. 지금은 미리 써 둔 고침만 할 수 있어요.'); return; }
  r.d.ver=doc.ver+1; s.notMine+=r.nm; if(which==='draft') s.draft=r.d; else s.rev=r.d;
  if(which==='draft') s.reqAt.draft++; else if(again) s.reqAt.again++; else s.reqAt.rev++;
  await aiSay(s,`${r.why.join('\n')}\n${which==='draft'?'더 고칠 곳이 있으면 말씀해 주세요. 다 되면 「퇴고로 넘어가기」를 눌러 주세요.':again?'마음에 들면 「바꿔 담기」를 눌러 주세요.':'다 되면 「모아에 담기」를 눌러 주세요.'}`,{card:copy(r.d)}); }
// 퇴고: 다섯 진단을 짧게 말하고 꼭 필요한 것만 묻는다(최대 3개). 답을 다 들은 뒤 퇴고본을 한 번 쓴다(질문마다 다시 쓰지 않아 AI 비용이 덜 든다)
async function toRevise(s){ if(s.busy) return; reach(s,'revise'); s.rev=null; const S=scriptOf(s), scripted=!!S&&s.draft.sents.some(x=>x.src&&S.revQ.some(q=>q.after===x.src));
  s.revQs=(scripted?S.revQ.filter(q=>s.draft.sents.some(x=>x.src===q.after)):[{q:'그 장면에서 누가 어떤 말을 했는지, 기억나는 말 한마디가 있나요?'}]).slice(0,RQMAX); s.revAt=0; s.revAns=[]; s.asking=true;
  call(s,'fix');
  await aiSay(s,`퇴고를 시작해요. 다섯 가지로 살펴봤어요.\n${scripted?S.diag:'① 경험이 구체적인가 — 그날 오간 말 한 줄이 있으면 장면이 더 잘 보여요.'}\n나머지 네 가지는 통과했어요.\n\n${s.revQs[0].q}`); }
async function revAnswer(s,text,forgot){ s.msgs.push({who:'me',text}); if(!forgot) s.revAns.push({i:s.revAt,text}); s.revAt++;
  if(s.revAt<s.revQs.length){ call(s,'talk',text.length); await aiSay(s,`${forgot?'그 자리는 비워 둘게요. ':''}${s.revQs[s.revAt].q}`); return; }
  s.asking=false; call(s,'write');
  const r=await think(s,1300,()=>makeRevision(s));
  s.rev=r.d;
  await aiSay(s,`퇴고본을 썼어요. 이렇게 고쳤어요.\n${r.why.map((w,i)=>`${'①②③④⑤⑥⑦⑧'[i]} ${w}`).join('\n')||'고칠 곳이 거의 없어 그대로 두었어요.'}\n마음에 안 드는 곳은 "○○은 원래대로 해 주세요"처럼 말씀해 주세요. 다 되면 「모아에 담기」를 눌러 주세요.`,{card:copy(s.rev)}); }
// 퇴고본 = 초고 + 퇴고에서 다듬은 문장(rev) + 답하신 말(질문 자리 뒤에). 무엇을 왜 고쳤는지 한 줄씩(대표 의견 H — 프롬프트 v3 28장 손질 필요)
function makeRevision(s){ const d=fresh(s.draft), why=[];
  d.kind='rev'; d.ver=1;
  d.sents=d.sents.map(x=>x.rev&&x.t===x.orig?(why.push(x.revWhy),{...x,t:x.rev,chg:true}):x);
  s.revAns.forEach(a=>{ const q=s.revQs[a.i], add=(q.a&&a.text===q.a?q.ins:split(a.text));
    let at=q.after?d.sents.findIndex(x=>x.src===q.after):-1; if(at<0) at=d.sents.filter(x=>x.p===d.sents[0].p).length-1;
    d.sents.splice(at+1,0,...add.map(t=>({id:'a'+(++sid),t,orig:t,p:d.sents[at].p,ans:true,chg:true})));
    why.push(`답하신 말(「${a.text.length>18?a.text.slice(0,18)+'…':a.text}」)을 그 장면 뒤에 넣었어요`); });
  return {d,why}; }
// 담은 뒤 「퇴고 대화 이어 하기」: 지면에 담긴 지금 글(직접 고친 것 포함)을 바탕으로 다시 말로 고친다 → 「바꿔 담기」
function againTalk(s){ const base=pageDoc(s); if(!base){ toast('담은 쪽을 찾지 못했어요'); return; }
  s.rev=base; reach(s,'revise'); s.asking=false;
  s.msgs.push({who:'ai',text:'지면에 담긴 지금 글(직접 고치신 것 포함)로 퇴고를 이어 갑니다. 고치고 싶은 것을 말씀해 주세요. 다 되면 「바꿔 담기」를 눌러 주세요.',card:copy(base)});
  render(); $('aiIn')?.focus(); }

/* ═══════════════ 누르기 ═══════════════ */
panel.addEventListener('input',ev=>{ const k=ev.target.dataset.k; if(k&&cur) cur[k]=ev.target.value; if(ev.target.id==='aiOwn') ui.own=ev.target.value; });
panel.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act]'); if(!b||b.disabled) return; const s=cur, a=b.dataset.act;
  ({
    topic:()=>startTopic(topicOf(b.dataset.id)), pack:()=>{ ui.view='pack'; render(true); }, packmore:()=>{ ui.pack++; render(true); },
    own:()=>{ ui.view='own'; render(true); $('aiOwn').focus(); }, home:()=>{ ui.view='topics'; render(true); },
    ownstart:()=>{ const t=ui.own.trim(); if(!t){ toast('쓰고 싶은 글감을 적어 주세요'); $('aiOwn').focus(); return; }
      ui.own=''; ui.view='topics'; startTopic({id:'o'+(++seq),label:'내가 정한 글감',title:t,first:'이 이야기에서 가장 먼저 떠오르는 장면은 무엇인가요?'}); },
    keepdel:()=>{ const i=kept.findIndex(k=>k.id===b.dataset.id); if(i>=0) kept.splice(i,1); toast('남겨 둔 장면을 지웠어요'); render(); },
    send:()=>send('me'), idk:()=>send('idk'), forgot:()=>send('forgot'), sum:()=>{ if(!s.busy){ call(s); summarize(s); } },
    sample:()=>{ s.input=sampleText(s); render(); const t=$('aiIn'); if(t){ t.focus(); t.setSelectionRange(t.value.length,t.value.length); } },
    scene:()=>choose(s,+b.dataset.i), draft:()=>writeDraft(s), revise:()=>toRevise(s),
    place:()=>{ reach(s,'place'); s.place.mode=firstEmpty()>=0?'fill':'after'; render(true); },
    pmode:()=>{ s.place.mode=b.dataset.m; render(); }, insert:()=>doPlace(s), 'back-rev':()=>{ reach(s,'revise'); render(); },
    replace:()=>replaceWriting(s), keepas:()=>{ reach(s,'done'); render(); toast('담은 글은 그대로 두었어요'); }, again:()=>againTalk(s),
    undo:()=>{ const p=s.inserted, last=p&&p.before&&p.before.at===history.length; undo(); if(last&&placedOK(s)){ Object.assign(p,{ids:p.before.ids,rep:p.before.rep}); delete p.before; render(); toast('되돌렸어요 · 바꿔 담기 전 글로 돌아갔어요'); } },   // 새로 담은 것을 되돌리면 쪽 목록 감시(syncPlaced)가 알린다
    'prop-yes':()=>{ const m=s.msgs[+b.dataset.k]; if(!m||!m.act||m.act.done||s.busy) return; const x=m.act; x.done=true; render();
      fixByTalk(s,x.which,'네, 그렇게 바꿔 주세요.',{note:'[어르신이 방금 제안을 승인하셨습니다] '+x.text}); },
    'prop-no':()=>{ const m=s.msgs[+b.dataset.k]; if(!m||!m.act||m.act.done) return; m.act.done=true; s.msgs.push({who:'ai',text:'알겠어요, 지금 그대로 둘게요.'}); render(); },
    restore:()=>{ const m=s.msgs[+b.dataset.k]; if(!m||!m.act||m.act.done||s.busy) return; const x=m.act; x.done=true; const now=x.which==='draft'?s.draft:s.rev, back=copy(x.prev); back.ver=now.ver+1;
      if(x.which==='draft') s.draft=back; else s.rev=back; s.msgs.push({who:'ai',text:'방금 고치기 전 글로 되돌렸어요. 다시 고치고 싶은 곳을 말씀해 주세요.',card:copy(back)}); render(); },
    'restore-no':()=>{ const m=s.msgs[+b.dataset.k]; if(m&&m.act) m.act.done=true; render(); },
    next:()=>{ cur=null; ui.view='topics'; render(true); }, topics:()=>{ cur=null; ui.view='topics'; render(true); }
  })[a]?.();
});
// AI 창 안에서 누른 키는 편집기 단축키(상자 지우기·방향키로 옮기기)로 가지 않게 한다. Ctrl+Z·Y(앱 되돌리기)는 그대로
panel.addEventListener('keydown',ev=>{
  if(ev.key==='Enter'&&!ev.isComposing&&ev.keyCode!==229&&((ev.ctrlKey||ev.metaKey)||ev.target.id==='aiOwn')){   // 엔터는 줄바꿈, Ctrl+Enter는 보내기(한글 조합 중에는 보내지 않음)
    const act={aiIn:'send',aiOwn:'ownstart'}[ev.target.id]; if(act){ ev.preventDefault(); panel.querySelector(`[data-act="${act}"]`)?.click(); } }
  if((ev.ctrlKey||ev.metaKey)&&!ev.altKey&&/^Key[ZY]$/.test(ev.code)&&!/^(INPUT|TEXTAREA)$/.test(ev.target.tagName)) return;
  ev.stopPropagation(); });
/* ═══════════════ 진짜 AI(로그인 편집기 · 관리자가 켠 시험 참여자) ═══════════════
   가짜 답 자리를 서버 함수 ai-write 호출로 바꾼다(화면 흐름은 같음). 동의는 ai_consents, 대화는 ai_threads 에 남긴다(1.5초 묶어 저장) */
if(REAL){
  PACK.forEach(p=>{ p.label=p.label.replace(' (시제품: 짧게 답하는 예시)',''); });
  document.querySelector('.aip-pro').textContent='시험 중'; document.querySelector('.aip-pro').title='모아 AI와 쓰기 시험판이에요';
  document.querySelector('#aiTile .pro').textContent='시험'; $('aiCalls').hidden=true;
  { const li=document.querySelectorAll('#aiConsent li');   // 처리방침 2·3·5번과 같은 말로
    li[0].innerHTML='여기에 쓰신 이야기는 글 정리를 돕도록 <b>Anthropic(미국 회사)의 AI</b>로 보내져요. 이메일과 이름은 보내지 않아요.';
    li[2].innerHTML=`대화는 <b>${CALL}과 모아 운영자만</b> 볼 수 있어요. 지우고 싶으시면 운영자에게 말씀해 주세요. 책을 지우거나 탈퇴하면 함께 지워져요.`; }
  document.querySelector('#aiConsent .pnote').textContent='시험 기간에는 더 나은 서비스를 위해 모아 운영자가 대화를 볼 수 있어요. 대화는 시험이 끝나고 1년 동안 보관한 뒤 지워요.';
  let today=0, saveT=null;
  sampleText=()=>'';
  const docOf=d=>`${d.title}\n\n${docText(d)}`;
  async function ai(mode,s,extra={}){ const {data:ss}=await sb.auth.getSession(), tok=ss.session&&ss.session.access_token;
    const hist=s.msgs.filter(m=>!m.wait&&!m.sys&&m.text).map(m=>({who:m.who,text:m.text}));
    const r=await fetch(SUPABASE_URL+'/functions/v1/ai-write',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok,apikey:SUPABASE_KEY},
      body:JSON.stringify({mode,book_id:BOOK||null,topic:s.topic.title,...focusOf(s.topic.title),history:hist,...extra})});
    const j=await r.json().catch(()=>({})); if(!r.ok||!j.ok) throw Object.assign(new Error(j.error||'ai_failed'),{code:j.error||'ai_failed'});
    today=j.today||today; return j.out; }
  // 실패해도 쓰신 말은 입력칸에 그대로(PRD 「AI 장애 대비」)
  async function guard(s,text,fn,onFail){ try{ await fn(); }catch(e){ const w=s.msgs[s.msgs.length-1]; if(w&&w.wait) s.msgs.pop(); s.busy=false;
      const me=s.msgs[s.msgs.length-1]; if(text&&me&&me.who==='me'&&me.text===text){ s.msgs.pop(); const a=s.answers[s.answers.length-1]; if(a&&a.text===text) s.answers.pop(); s.input=text; }
      if(onFail) onFail();
      s.msgs.push({who:'ai',sys:true,text:{daily_limit:'오늘 쓸 수 있는 양을 다 썼어요. 내일 이어서 쓸 수 있어요. 쓰신 글은 그대로 있어요.',not_enabled:'AI와 쓰기가 아직 켜져 있지 않아요. 운영자에게 알려 주세요.',no_consent:'먼저 동의가 필요해요. 창을 닫았다가 다시 열어 주세요.'}[e.code]||'연결이 잠시 끊겼어요. 쓰신 말은 그대로 있어요. 같은 단추를 한 번 더 눌러 주세요.'});
      render(); } }
  const toDoc=(kind,title,bodyText,prev,ver)=>{ const old=new Set(prev?prev.sents.map(x=>x.t):[]), sents=[];
    String(bodyText||'').split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean).forEach((p,pi)=>split(p).forEach(t=>sents.push({id:'x'+(++sid),t,orig:t,p:pi,chg:!!prev&&!old.has(t)})));
    return {kind,title:String(title||'').trim()||(prev&&prev.title)||'제목',sents,ver}; };
  send=async function(kind){ const s=cur; if(s.busy) return;
    const text=kind==='idk'?'잘 모르겠어요.':kind==='forgot'?'기억 안 나요.':s.input.trim(); if(!text){ toast('적은 뒤 보내 주세요'); return; }
    s.input=''; s.updated=Date.now();
    if(s.step==='draft') return fixByTalk(s,'draft',text);
    if(s.step==='revise') return s.asking?revAnswer(s,text,kind==='forgot'):fixByTalk(s,'rev',text);
    s.msgs.push({who:'me',text}); if(kind!=='idk') s.answers.push({text,si:-1});
    await guard(s,text,async()=>{ const o=await think(s,0,()=>ai('think',s)); s.covered=(o.covered||[]).filter(p=>PIECES.includes(p));
      if(o.ready||s.q>=QMAX||!missing(s).length){ s.msgs.pop(); s.busy=false; return summarize(s); }
      s.q++; await aiSay(s,o.reply); }); };
  summarize=async function(s){ await guard(s,'',async()=>{ const o=await think(s,0,()=>ai('summarize',s)), sc=(o.scenes||[]).filter(Boolean).slice(0,3);
    if(!sc.length){ await aiSay(s,`${CALL}, 아직 글로 옮길 장면을 듣지 못했어요. 떠오르는 것이 있으면 한 줄이라도 적어 주세요.`); return; }
    s.scenes=sc.map((t,k)=>({text:t,si:-1,rank:k,k}));
    await aiSay(s,`${CALL}, 지금까지 이야기에서 제가 들은 가장 선명한 장면은 다음과 같아요.`,{scenes:true});
    if(sc.length===1) return choose(s,0,true);
    await aiSay(s,`${CALL}, 이 가운데 이번 글의 중심이 될 장면을 하나 골라 주세요.`); }); };
  writeDraft=async function(s){ if(s.busy) return; reach(s,'draft');
    await guard(s,'',async()=>{ const o=await think(s,0,()=>ai('draft',s,{note:`[고른 장면] ${s.scenes[s.chosen].text}`}));
      s.draft=toDoc('draft',o.title,o.body,null,1);
      await aiSay(s,'초고가 나왔어요. 고치고 싶은 곳이 있으면 말씀해 주세요. 다 되면 「퇴고로 넘어가기」를 눌러 주세요.',{pre:FIRST_LINE,card:copy(s.draft)}); },()=>{ if(!s.draft) reach(s,'think'); }); };
  // 서버(check.ts)가 고치기 전후 원고를 비교한 결과(out.check)를 사람 말로 옮긴다. AI가 쓴 「한 일 목록」은 믿지 않는다
  const checkNote=c=>{ if(!c) return ''; const L=[];
    if((c.missing||[]).length) L.push(`⚠ 고치기 전 글에 있던 말이 새 글에서 안 보여요: ${c.missing.map(x=>/^「/.test(x)?x:`「${x}」`).join(' ')}`);
    if((c.added||[]).length) L.push(`ℹ 말씀하신 적 없는 이음말이 들어갔어요: ${c.added.map(x=>`「${x}」`).join(' ')}`);
    return L.join('\n'); };
  fixByTalk=async function(s,which,text,opts){ s.msgs.forEach(m=>{ if(m.act) m.act.done=true; }); s.msgs.push({who:'me',text}); const doc=which==='draft'?s.draft:s.rev, again=which==='rev'&&s.placed.length>0;
    await guard(s,text,async()=>{ const o=await think(s,0,()=>ai('fix',s,{doc:docOf(doc),...(opts&&opts.note?{note:opts.note}:{})}));
      if(!o.changed){ if(o.proposal){ await aiSay(s,`${o.reply||'이렇게 바꾸면 어떨까요?'}\n\n제안: ${o.proposal}`,{act:{type:'propose',which,text:o.proposal,done:false}}); return; }
        await aiSay(s,o.reply||'말씀하신 곳을 찾지 못했어요. 어느 문장인지 조금 더 알려 주세요.'); return; }
      const d=toDoc(doc.kind,o.title,o.body,doc,doc.ver+1); if(/한 말이 아니/.test(text)) s.notMine++;
      const keep=copy(doc), c=o.check||{}, note=checkNote(c), act=((c.missing||[]).length||(c.added||[]).length)?{type:'restore',which,prev:keep,done:false}:null;
      if(which==='draft') s.draft=d; else s.rev=d;
      await aiSay(s,`${(o.why||[]).join('\n')}\n${note?note+'\n':''}${which==='draft'?'더 고칠 곳이 있으면 말씀해 주세요. 다 되면 「퇴고로 넘어가기」를 눌러 주세요.':again?'마음에 들면 「바꿔 담기」를 눌러 주세요.':'다 되면 「모아에 담기」를 눌러 주세요.'}`,{card:copy(d),...(act?{act}:{})}); }); };
  async function writeRev(s){ const o=await think(s,0,()=>ai('revise',s,{doc:docOf(s.draft)})); s.rev=toDoc('rev',o.title,o.body,s.draft,1);
    await aiSay(s,`퇴고본을 썼어요. 이렇게 고쳤어요.\n${(o.why||[]).map((w,i)=>`${'①②③④⑤⑥⑦⑧'[i]||'·'} ${w}`).join('\n')}\n${checkNote(o.check)?checkNote(o.check)+'\n(초고와 달라진 곳이에요. 필요하면 말씀해 주세요.)\n':''}마음에 안 드는 곳은 "○○은 원래대로 해 주세요"처럼 말씀해 주세요. 다 되면 「모아에 담기」를 눌러 주세요.`,{card:copy(s.rev)}); }
  toRevise=async function(s){ if(s.busy) return; reach(s,'revise'); s.rev=null; s.revAt=0; s.revQs=[]; s.revAns=[]; s.asking=true;
    await guard(s,'',async()=>{ const o=await think(s,0,()=>ai('revise_q',s,{doc:docOf(s.draft),note:'[이미 물은 퇴고 질문 수] 0'})), diag=(o.fixes||[]).length?o.fixes.join('\n'):'크게 고칠 곳은 없어요.';
      if(!o.question){ s.asking=false; await aiSay(s,`퇴고를 시작해요. 다섯 가지로 살펴봤어요.\n${diag}`); return writeRev(s); }
      s.revQs.push({q:o.question}); await aiSay(s,`퇴고를 시작해요. 다섯 가지로 살펴봤어요.\n${diag}\n\n${o.question}`); },()=>{ reach(s,'draft'); s.asking=false; }); };
  revAnswer=async function(s,text,forgot){ s.msgs.push({who:'me',text}); s.revAt++;
    await guard(s,text,async()=>{
      if(s.revAt<RQMAX){ const o=await think(s,0,()=>ai('revise_q',s,{doc:docOf(s.draft),note:`[이미 물은 퇴고 질문 수] ${s.revAt}`}));
        if(o.question){ s.revQs.push({q:o.question}); await aiSay(s,`${forgot?'그 자리는 비워 둘게요. ':''}${o.question}`); return; } s.msgs.pop(); s.busy=false; }
      s.asking=false; await writeRev(s); },()=>{ s.revAt--; s.asking=!s.rev; }); };
  // 대화 저장: 그릴 때마다 표시해 두었다가 1.5초 묶어서. 새 책이면 그때 책을 만든다
  async function saveAI(){ if(!BOOK&&!(await ensureBook())) return; const now=new Date().toISOString();
    const rows=Object.values(sessions).filter(s=>s.dirty).map(s=>{ s.dirty=false; const {busy,dirty,...st}=s; return {user_id:user.id,book_id:BOOK,topic_key:s.topic.id,topic:s.topic,state:{...st,busy:false},updated_at:now}; });
    if(!rows.length) return; rows.push({user_id:user.id,book_id:BOOK,topic_key:'_kept',topic:{title:'남겨 둔 장면'},state:{kept,seq,sid},updated_at:now});
    const {error}=await sb.from('ai_threads').upsert(rows,{onConflict:'book_id,topic_key'}); if(error) console.error(error); }
  const draw=render;
  render=function(top){ draw(top); if(!ui.open) return; $('aiLeft').textContent=`오늘 남은 양 ${Math.max(0,Math.round(100-today/30))}%`; if(cur){ cur.dirty=true; clearTimeout(saveT); saveT=setTimeout(saveAI,1500); } };
  (async()=>{ const [{data:c},{data:th}]=await Promise.all([sb.from('ai_consents').select('user_id').eq('user_id',user.id).maybeSingle(),
      BOOK?sb.from('ai_threads').select('topic_key,state').eq('book_id',BOOK):Promise.resolve({data:[]})]);
    ui.agreed=!!c;
    (th||[]).forEach(r=>{ if(r.topic_key==='_kept'){ kept.push(...(r.state.kept||[])); seq=Math.max(seq,r.state.seq||0); sid=Math.max(sid,r.state.sid||0); } else sessions[r.topic_key]={...r.state,busy:false,dirty:false}; }); })();
}
window.__aiProto={sessions,kept,get cur(){ return cur; },get calls(){ return aiCalls; },get won(){ return wonAll; },ui,docText,PIECES};   // 자동 시험용
})();
