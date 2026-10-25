/* 모아 편집기 · AI 옆 창 시제품 (2026-10-26, PRD 초안 v0.1 5-1장 B안)
   켜는 법: 체험 편집기 주소에 ?ai=proto (studio/index.html 맨 아래에서 체험 모드일 때만 불러온다. 로그인한 내 책 편집에는 나오지 않음)
   - AI 답은 모두 미리 써 둔 가짜 답이다. 서버·AI 회사로 아무것도 보내지 않는다.
     말투와 단계 규칙은 「AI 회고 파트너 프롬프트 v3」(2026-09-18)를 따른다: 되비추기 1~2문장 + 질문 하나, 질문은 모두 5개,
     정리 단계 장면 후보 ①②③, 초고 첫 줄 고정 문장, 다섯 가지 진단(통과는 조용히), 편집자 질문 하나. 호칭은 PRD 제안값 「선생님」.
   - 「모아에 담기」는 편집기의 되돌리기 기록(snap)·글 흐름(settle)을 그대로 써서 새 글 쪽으로만 넣는다(있던 쪽은 건드리지 않음).
   - 노래 만들기 같은 2차 기능은 보이지 않게 둔다. 대화·글감 상태는 이 화면에만 있고 새로 고치면 사라진다.
   - 2026-10-26 대표 의견 반영: 견본 책이면 빈 책으로 열기 · 첫 화면 「내 글」 목록 · 지난 단계 다시 보기와 되돌아가기(더 이야기하기 ·
     초고로 돌아가기 · 이 글 다시 다듬기 · 이전 판으로) · Ctrl+Enter 보내기 · 담은 뒤 「사진 넣기」 뺌 · AI 부른 횟수 표시(시제품 전용)
   편집기의 state·snap·settle·renderAll 등은 studio/index.html 의 전역 이름을 그대로 쓴다. */
(()=>{ 'use strict';
const CALL='선생님';                         // 호칭(프롬프트 v3는 「고문님」 고정 → 과정별 설정은 1차 기능)
const MAXQ=5;                                // 생각하기 질문 수(시작 인사의 첫 질문 포함, 프롬프트 v3 11장)
const fast=()=>!!window.__aiFast;            // 자동 시험에서는 기다리지 않는다
const wait=ms=>new Promise(r=>setTimeout(r,fast()?0:ms));
const reduce=()=>fast()||matchMedia('(prefers-reduced-motion: reduce)').matches;
const josa=(w,a,b)=>{ const t=String(w).replace(/["'」』”’)\s]+$/,''); const c=t.charCodeAt(t.length-1); return (c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28>0)?a:b; };
const split=t=>(String(t).replace(/\s+/g,' ').trim().match(/[^.!?…]+[.!?…]*["'」”’]*\s*/g)||[]).map(x=>x.trim()).filter(Boolean);

/* ═══════════════ 가짜 자료(하드코딩) ═══════════════ */
const WEEK={id:'w1',src:'week',label:'1주차 · 이번 주 글감',title:'내 생애 최고의 순간',first:'가장 먼저 떠오르는 장면은 무엇인가요?'};
// 기본 글감 꾸러미: 대표님이 쓰실 자리(PRD 5-1). 지금 문구는 시제품용 예시
const PACK=[
  {id:'p1',label:'기본 글감 · 어린 시절',title:'어린 시절 살던 집',first:'그 집을 떠올리면 가장 먼저 보이는 자리는 어디인가요?'},
  {id:'p2',label:'기본 글감 · 학창 시절',title:'학교 가는 길',first:'그 길에서 가장 먼저 떠오르는 장면은 무엇인가요?'},
  {id:'p3',label:'기본 글감 · 첫 일',title:'첫 출근',first:'첫 출근 날, 가장 먼저 떠오르는 장면은 무엇인가요?'},
  {id:'p4',label:'기본 글감 · 가족',title:'부모님',first:'부모님을 떠올리면 가장 먼저 보이는 모습은 무엇인가요?'},
  {id:'p5',label:'기본 글감 · 인생의 전환점',title:'인생이 바뀐 날',first:'그날 가장 먼저 떠오르는 장면은 무엇인가요?'},
  {id:'p6',label:'기본 글감 · 지금의 나',title:'요즘 나의 하루',first:'요즘 하루 가운데 가장 좋아하는 때는 언제인가요?'},
  {id:'p7',label:'기본 글감 · 남기고 싶은 말',title:'손주에게 남기고 싶은 말',first:'손주를 떠올리면 가장 먼저 하고 싶은 말은 무엇인가요?'}];
// 「예시 답 넣기」로 넣는 어르신 답 다섯 개와, 그 답에 맞춰 미리 써 둔 AI 답(되비추기 + 질문 하나)·장면·초고 문장
// s3 「그날 새벽 공기는 유난히 매서웠다」는 말씀에 없는 문장(made) — 「제가 한 말이 아니에요」를 시험해 보도록 일부러 넣었다
const SAMPLE=[
  {a:'아무래도 공장 준공식 날이 아닐까 싶어요. 칠십구년 겨울이었어요.',
   r:'칠십구년 겨울, 공장 준공식 날이 가장 먼저 떠오르셨네요. 지금은 그 장면을 조금 따라가 보겠습니다. 그날 아침, 가장 먼저 눈에 들어온 것은 무엇이었나요?',
   scene:'칠십구년 겨울, 공장 준공식 날', title:'준공식 날', rank:3,
   sents:[{id:'s1',t:'칠십구년 겨울, 공장 준공식 날이었다.',alt:'공장 준공식 날, 칠십구년 겨울이었다.'}]},
  {a:'새벽에 나갔는데 눈이 와 있었어요. 현장 사람들이 빗자루를 들고 마당을 쓸고 있더라고요. 박 기사가 제일 앞에 있었고요.',
   r:'새벽 마당에 눈이 와 있었고, 빗자루를 든 사람들 맨 앞에 박 기사가 있었네요. 그날 박 기사가 한 말 가운데 지금도 귀에 남은 말이 있나요?',
   scene:'눈 온 새벽, 빗자루를 든 사람들 맨 앞에 서 있던 박 기사', title:'눈 쓸던 새벽', rank:1,
   sents:[{id:'s2',t:'새벽에 나가 보니 눈이 와 있었다.',alt:'새벽에 나갔더니 눈이 와 있었다.',plain:'새벽에 나가니 눈이 와 있었다.'},
          {id:'s3',t:'그날 새벽 공기는 유난히 매서웠다.',made:true,alt:'새벽 공기가 매서웠다.',rev:'새벽 공기가 매서웠다.'},
          {id:'s4',t:'현장 사람들이 빗자루를 들고 마당을 쓸고 있었다.',alt:'빗자루를 든 현장 사람들이 마당을 쓸고 있었다.'},
          {id:'s5',t:'박 기사가 제일 앞에 있었다.',alt:'그 맨 앞에 박 기사가 있었다.',rev:'맨 앞에 박 기사가 있었다.'}]},
  {a:'기계를 처음 돌릴 때 박 기사가 "됐습니다!" 하고 소리쳤어요. 저는 아무 말도 못 하고 그 사람 손만 잡았던 것 같아요.',
   r:'박 기사가 "됐습니다!" 하고 소리친 순간, 선생님은 말 대신 그 사람 손을 잡으셨네요. 그 손을 잡던 때, 함께 떠오르는 다른 사람이 있나요?',
   scene:'기계가 처음 돌던 순간, 박 기사의 "됐습니다!"와 말없이 잡은 손', title:'됐습니다', rank:0,
   sents:[{id:'s6',t:'기계를 처음 돌릴 때 박 기사가 "됐습니다!" 하고 소리쳤다.',alt:'기계가 처음 돌던 순간, 박 기사가 "됐습니다!" 하고 소리쳤다.'},
          {id:'s7',t:'나는 아무 말도 못 하고 그의 손만 잡았던 것 같다.',alt:'나는 아무 말도 하지 못했다. 그 사람 손만 잡았던 것 같다.',rev:'나는 아무 말도 못 했다. 그의 손만 잡았던 것 같다.',anchor:true}]},
  {a:'그러고 보니 아버지 생각이 나네요. 아버지가 늘 "기계는 사람이 돌리는 거다" 하셨거든요. 그날 그 말이 생각났어요.',
   r:'"그러고 보니" 하시며 "기계는 사람이 돌리는 거다"라는 아버지 말씀이 떠오르셨네요. 그 말이 그날 떠오른 데에는 어떤 까닭이 있었을까요?',
   scene:'"기계는 사람이 돌리는 거다" 하시던 아버지의 말', title:'기계는 사람이 돌리는 거다', rank:2,
   sents:[{id:'s8',t:'그러고 보니 그날 아버지 생각이 났다.',alt:'그날, 아버지 생각이 났다.',rev:'그날 아버지 생각이 났다.'},
          {id:'s9',t:'아버지는 늘 "기계는 사람이 돌리는 거다" 하셨다.',alt:'"기계는 사람이 돌리는 거다." 아버지가 늘 하시던 말이다.'}]},
  {a:'기계가 아니라 그 새벽에 마당 쓸던 사람들 덕분에 공장이 선 거니까요. 지금도 눈 오는 날이면 그 사람들 얼굴이 생각나요.',
   r:null, scene:'눈 오는 날이면 생각나는 그 사람들 얼굴', title:'눈 오는 날', rank:4,
   sents:[{id:'s10',t:'공장은 기계가 아니라, 그 새벽에 마당을 쓸던 사람들 덕분에 섰다.',alt:'그 공장을 세운 것은 기계가 아니라 그 새벽 마당을 쓸던 사람들이었다.'},
          {id:'s11',t:'지금도 눈 오는 날이면 그 사람들 얼굴이 생각난다.',alt:'눈이 오는 날이면 지금도 그 사람들 얼굴이 떠오른다.'}]}];
const SAMPLE_EDIT={q:'박 기사가 "됐습니다!" 하고 소리쳤을 때, 선생님이 손을 잡으며 하신 말이나 행동이 더 기억나시나요?',
  a:'손을 잡고 둘이 그냥 웃었어요. 박 기사 손이 기름투성이였는데 그것도 몰랐어요.', ins:['둘이 그냥 웃었다.','박 기사 손이 기름투성이였는데, 그것도 몰랐다.']};
// 「이 장면 더 이야기하기」: 고른 장면(예시 이야기의 SAMPLE 번호)을 한두 가지 더 묻는다. 들은 말만 초고의 그 장면 뒤에 넣는다
const MORE={
  1:{q:'그 새벽 마당을 쓸던 사람들 가운데, 박 기사 말고 떠오르는 얼굴이 있나요?',a:'막내 김 군이요. 빗자루가 모자라서 삽으로 눈을 밀고 있었어요.',sents:['막내 김 군은 빗자루가 모자라 삽으로 눈을 밀고 있었다.']},
  2:{q:'기계가 처음 돌던 그 순간, 귀에 들리던 소리가 기억나시나요?',a:'쿵쿵 하다가 윙 하고 고르게 돌았어요. 다들 숨도 안 쉬고 듣고 있었어요.',sents:['기계는 쿵쿵 하다가 윙 하고 고르게 돌았다.','다들 숨도 안 쉬고 듣고 있었다.']},
  3:{q:'아버지가 그 말씀을 하시던 때가 언제였는지 기억나시나요?',a:'제가 공고 다닐 때, 고장 난 라디오를 고치시면서 하신 말씀이에요.',sents:['아버지가 그 말을 하신 것은 내가 공고에 다닐 때, 고장 난 라디오를 고치시면서였다.']}};
const MORE_MAX=2;   // 더 묻는 질문은 두 개까지(생각하기 다섯 개와 따로)
// 직접 쓴 답에는 정해진 틀로 답한다(기억의 지도에서 고른 질문, 이미 한 질문은 다시 하지 않음)
const GQ=['그때 선생님 곁에 가장 선명하게 남아 있는 사람은 누구인가요?','그 자리에서 오간 말 가운데 지금도 귀에 남은 말이 있나요?','그 일이 있기 바로 전에는 어떤 일이 있었나요?','그 뒤로 선생님에게 달라진 것이 있다면 무엇인가요?','이 이야기를 하다 보니 함께 떠오르는 다른 장면이 있나요?'];
const EASY=['그곳을 떠올리면 가장 먼저 보이는 물건 하나는 무엇인가요?','그때 손에 들고 있던 것이 있었다면 무엇이었나요?','그날 날씨 가운데 기억나는 것이 있나요?'];
const DIAG_NAMES=['① 경험이 구체적인가','② 성장이 보이는가','③ 개인적인가','④ 읽는 재미가 있는가','⑤ 다른 사람도 공감하겠는가'];
const FIRST_LINE=`이 글은 ${CALL}이 말씀하신 것만으로 썼습니다. 다른 기억이 나면 말씀해 주세요.`;   // 프롬프트 v3 19장(호칭만 바꿈)
const MARK_KO={redo:'다시 써 주세요',drop:'빼 주세요',notmine:'제가 한 말이 아니에요'};

/* ═══════════════ 상태(이 화면에만) ═══════════════ */
const sessions={};   // 글감 id → 대화 하나 = 글 한 편
const kept=[];       // 남겨 둔 장면 {id,title,from}
const ui={open:false, view:'topics', pack:0, own:''};
let cur=null, budget=12, seq=0, aiCalls=0;
const call=s=>{ s.calls++; aiCalls++; };   // 시제품 전용: AI를 부른 횟수(되풀이할수록 한도가 어떻게 느껴지는지 보려고)
const STEP_N={think:0,draft:1,revise:2,place:3,done:4};
const reach=(s,k)=>{ s.step=k; s.view=null; s.reached=Math.max(s.reached,STEP_N[k]); s.updated=Date.now(); };
const topicOf=id=>id===WEEK.id?WEEK:PACK.find(p=>p.id===id)||kept.find(k=>k.id===id)||(sessions[id]&&sessions[id].topic);
const status=id=>{ const s=sessions[id]; return !s?'아직':s.placed.length?'담음':'쓰는 중'; };
const consented=()=>{ try{ return localStorage.getItem('moa-ai-proto-consent')==='1'; }catch(e){ return !!ui.agreed; } };

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
.aip-head b{font-family:var(--serif);font-size:19px;color:var(--brand-2);white-space:nowrap}
.aip-pro{font-size:12.5px;font-weight:700;color:#8A5A00;background:#FFF3DC;border-radius:999px;padding:2px 9px;white-space:nowrap}
.aip-x{margin-left:auto;min-width:44px;padding:0 12px;border-radius:10px;font-size:16px;font-weight:600;border:1px solid var(--line)!important;background:#fff}
.aip-steps{display:flex;gap:4px;list-style:none;margin:0;padding:8px 10px 6px;font-size:15px}
.aip-steps li{flex:1;text-align:center;padding:5px 0;border-radius:9px;color:var(--faint);font-weight:700;white-space:nowrap;display:grid;place-items:center}
.aip-steps li.on{background:var(--brand);color:#fff} .aip-steps li.done{color:var(--brand)} .aip-steps li.see{box-shadow:inset 0 0 0 2px var(--gold)}
.aip-steps li:has(button){padding:0} .aip-steps li button{width:100%;height:100%;font:inherit;color:inherit;border-radius:9px} .aip-steps li button:hover{background:var(--brand-soft)} .aip-steps li.on button:hover{background:var(--brand-2)}
.vbar{border-radius:12px;background:#FFF8EA;border:1px solid #F0DDB1;color:#5E4508;padding:8px 12px;margin:0 0 12px;font-size:16px}
.mrow{display:flex;flex-wrap:wrap;align-items:center;gap:2px 8px;width:100%;text-align:left;border:1px solid var(--line);border-radius:12px;padding:8px 12px;background:#fff;margin-bottom:6px}
.mrow:hover{border-color:var(--brand)} .mrow b{font-family:var(--serif);font-size:17px} .mrow .chip{margin-left:0} .mrow span.w{flex-basis:100%;font-size:14.5px;color:var(--muted)}
.prev{margin-top:8px}
.aip-sub{display:flex;justify-content:space-between;gap:8px;padding:0 10px 6px 16px;font-size:15px;color:var(--muted);border-bottom:1px solid var(--line)}
.aip-sub{align-items:center} .aip-sub b{color:var(--ink);font-weight:700;min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap} .aip-sub .qn{white-space:nowrap;color:var(--brand-2);font-weight:700}
.aip-tl{white-space:nowrap;padding:0 10px;border-radius:10px;border:1px solid var(--line)!important;background:#fff;font-size:15px;font-weight:600;color:var(--brand-2)}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.aip-body{flex:1;min-height:0;overflow-y:auto;padding:14px 14px 18px;position:relative}
.aip-foot{border-top:1px solid var(--line);padding:10px 12px;display:flex;flex-direction:column;gap:8px}
.aip-foot:empty{display:none}
.aip-status{display:flex;justify-content:space-between;padding:6px 16px 8px;font-size:14px;color:var(--muted);border-top:1px solid var(--line)}
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
.msg{margin:0 0 12px;padding:11px 14px;border-radius:14px;white-space:pre-wrap}
.msg.ai{background:var(--bg)} .msg.me{background:var(--brand-soft);margin-left:26px}
.msg .who{display:block;font-size:13.5px;font-weight:700;color:var(--muted);margin-bottom:1px}
.msg.wait{color:var(--muted)} .msg.wait i{display:inline-block;animation:aiDot 1.2s infinite;font-style:normal} .msg.wait i:nth-child(2){animation-delay:.2s} .msg.wait i:nth-child(3){animation-delay:.4s}
@keyframes aiDot{0%,60%,100%{opacity:.25}30%{opacity:1}}
.scene{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;border:1.5px solid var(--line);border-radius:12px;padding:10px 12px;background:#fff;margin:0 0 8px;font-size:17px}
.scene:hover:not(:disabled){border-color:var(--brand);background:var(--brand-soft)} .scene .n{font-weight:800;color:var(--brand)}
.scene.on{border:2px solid var(--brand);background:var(--brand-soft)} .scene:disabled{cursor:default;opacity:.6} .scene.on:disabled{opacity:1}
.aip textarea,.aip input[type=text]{width:100%;font:inherit;font-size:18px;line-height:1.55;padding:10px 12px;border:1.5px solid var(--line);border-radius:12px;background:#fff;color:var(--ink);resize:vertical}
.aip textarea{min-height:92px} .aip-head b:focus{outline:none} .aip textarea:focus,.aip input[type=text]:focus{outline:none;border-color:var(--brand)}
.fixed{font-size:16.5px;color:var(--brand-2);background:var(--brand-soft);border-radius:10px;padding:8px 12px;margin:0 0 10px}
.endline{font-size:16px;color:var(--muted);margin:10px 0 4px}
.ms{background:#FFFDF8;border:1px solid #EADFC8;border-radius:12px;padding:14px 16px 16px;font-family:var(--serif);font-size:17.5px;line-height:1.9;box-shadow:0 1px 3px rgba(60,40,10,.06)}
.ms-meta{font-family:var(--sans);font-size:13.5px;color:var(--muted);display:flex;justify-content:space-between;margin-bottom:4px}
.ms h4{font-size:20px;margin:0 0 8px;color:#0B4536;text-align:center}
.ms p{margin:0 0 .8em} .ms p:last-child{margin:0}
.ms .s.ro{cursor:default} .ms .s.ro:hover{background:none}
.ms .s{cursor:pointer;border-radius:4px;padding:1px 0;transition:background .12s} .ms .s:hover{background:#EFF5F1}
.ms .s:focus-visible{outline:2px solid var(--brand);outline-offset:1px}
.ms .s.cur{background:#E3F0EA;box-shadow:0 0 0 2px var(--brand)}
.ms .s.m-redo{background:#FFF3DC;text-decoration:underline wavy #C79F45 1.5px;text-underline-offset:5px}
.ms .s.m-drop{text-decoration:line-through;color:var(--faint)}
.ms .s.m-notmine{background:#FBE9E7;text-decoration:underline wavy #B4483E 1.5px;text-underline-offset:5px}
.ms .s.mine{color:#2E5E8F} .ms .s.ans{background:#EEF6F1}
.ms .tag{font-family:var(--sans);font-size:12px;font-weight:700;border-radius:6px;padding:0 5px;margin:0 3px;vertical-align:2px;background:#fff;border:1px solid currentColor}
.smenu{border:2px solid var(--brand);border-radius:14px;padding:10px;margin:10px 0;background:#fff;display:flex;flex-direction:column;gap:8px}
.smenu .sq{margin:0;font-family:var(--serif);font-size:16px;color:var(--muted)}
.mbar{display:flex;flex-direction:column;gap:8px;margin:10px 0;padding:10px;border-radius:12px;background:#FFF8EA;border:1px solid #F0DDB1}
.mbar p{margin:0;font-size:16px}
.qfix{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 4px} .qfix .ab{width:auto;flex:1 1 auto;font-size:15.5px;padding:8px 10px}
.diag{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:0 0 12px;background:#fff}
.diag h5{margin:0 0 6px;font-size:15px;color:var(--muted)} .diag .fix{margin:0 0 6px;padding:7px 10px;border-radius:9px;background:#FFF3DC;color:#5E4508;font-size:16.5px}
.diag .fix b{display:block;font-size:15px;color:#8A5A00} .diag .pass{margin:4px 0 0;font-size:14.5px;color:var(--faint)}
.diff{border:1px dashed #C9D6CF;border-radius:12px;padding:10px 12px;margin:12px 0;font-size:16px;line-height:1.85;white-space:pre-wrap;background:#FBFCFB}
.diff del{color:#B4483E;background:#FBE9E7;text-decoration:line-through} .diff ins{color:#0B4536;background:#DDF0E5;text-decoration:none;font-weight:600}
.diff h5{margin:0 0 4px;font-size:14.5px;color:var(--muted);white-space:normal}
.popt{display:block;width:100%;text-align:left;border:1.5px solid var(--line);border-radius:12px;padding:10px 14px;background:#fff;margin-bottom:8px}
.popt b{display:block;font-size:17.5px} .popt span{display:block;font-size:15px;color:var(--muted)}
.popt.on{border:2px solid var(--brand);background:var(--brand-soft)} .popt.on b::before{content:"● ";color:var(--brand)}
.plist{display:flex;flex-direction:column;gap:6px;margin:6px 0 10px;max-height:240px;overflow-y:auto}
.plist button{text-align:left;border:1px solid var(--line);border-radius:10px;padding:6px 12px;background:#fff;font-size:16px}
.plist button.on{border:2px solid var(--gold);background:#FFF8EA;font-weight:700}
.pinfo{border-radius:12px;background:var(--bg);padding:10px 12px;font-size:16px;margin:6px 0}
.aidone{border-radius:14px;background:var(--brand-soft);padding:14px;margin:0 0 12px}
.aidone b{display:block;font-size:20px;color:var(--brand-2);font-family:var(--serif)}
.ins.ai-here{height:32px;margin:2px 0 8px}
.ins.ai-here::before{opacity:1;height:4px;top:14px;background:var(--gold)}
.ins.ai-here::after{content:attr(data-here);opacity:1;width:auto;white-space:nowrap;padding:0 10px;height:24px;top:4px;border-radius:999px;background:var(--gold);font:700 12.5px/24px var(--sans)}
.app.ai-pick .ins:not(.ai-here)::before{opacity:.35}
.th.ai-new{border-color:var(--gold);background:#FFF8EA}
.th.ai-new::after{content:"새 글";position:absolute;right:6px;bottom:6px;font:700 11px/1 var(--sans);color:#fff;background:var(--gold);border-radius:6px;padding:3px 5px}
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
  <ol class="aip-steps" id="aiSteps"></ol><div class="aip-sub" id="aiSub"></div>
  <div class="aip-body" id="aiBody"></div><div id="aiLive" class="sr" aria-live="polite"></div>
  <div class="aip-foot" id="aiFoot"></div>
  <div class="aip-status"><span id="aiLeft"></span><span id="aiCalls" title="시제품 전용: AI를 부른 횟수(이 글 / 모두)"></span><span id="aiSaved">✓ 저장됨</span></div>
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
function closePanel(){ ui.open=false; panel.hidden=true; app.classList.remove('ai-on','ai-wide','ai-pick'); marks(); relayout(); $('aiTile').focus({preventScroll:true}); }
function layoutFor(){ const wide=!!cur&&(cur.step==='place'||cur.step==='done'); app.classList.toggle('ai-wide',wide); app.classList.toggle('ai-pick',!!cur&&cur.step==='place'&&cur.place.mode==='pick'); }
// 체험 화면에 서가 견본 책(다른 분의 책)이 펼쳐져 있으면, 내 글은 빈 책에서 쓰도록 빈 책으로 다시 연다(대표 의견 2026-10-26)
function onTile(){ if(sampleTitle && QS.get('blank')!=='1'){ location.href='?blank=1&ai=proto&aiopen=1'; return; } openPanel(); }
$('aiTile').onclick=onTile; $('aiClose').onclick=closePanel;
// 「빈 책으로 시작하기 / 견본 책 보기」 안내 띠의 링크도 시제품 주소(?ai=proto)를 유지한다
$('demoBar').addEventListener('click',ev=>{ const a=ev.target.closest('a'); if(!a) return; const u=new URL(a.href); u.searchParams.set('ai','proto'); a.href=u.href; },true);
if(QS.get('aiopen')==='1') (async()=>{ const until=async f=>{ while(!f()) await new Promise(r=>setTimeout(r,150)); };
  await until(()=>document.querySelector('#canvas .pg'));
  if(window.DemoDraft&&await DemoDraft.get()){ await until(()=>!$('draftDlg').hidden); await until(()=>$('draftDlg').hidden); }   // 「지난번 체험하던 책이 있어요」를 먼저 고르게
  window.history.replaceState(null,'',location.pathname+'?blank=1&ai=proto'); openPanel(); toast('견본 책 대신 빈 책에서 시작해요'); })();   // history 는 편집기의 되돌리기 기록 이름이라 window.history
$('aiConsent').addEventListener('click',ev=>{ const b=ev.target.closest('[data-con]'); if(ev.target.id!=='aiConsent'&&!b) return;
  $('aiConsent').hidden=true;
  if(b&&b.dataset.con==='ok'){ ui.agreed=true; try{ localStorage.setItem('moa-ai-proto-consent','1'); }catch(e){} openPanel(); } else $('aiTile').focus(); });
$('aiConsent').addEventListener('keydown',ev=>{ if(ev.key==='Escape'){ $('aiConsent').hidden=true; $('aiTile').focus(); } });

/* ═══════════════ 그리기 ═══════════════ */
const STEPS=[['think','생각하기'],['draft','초고'],['revise','퇴고'],['place','담기']];
function render(top){
  if(!ui.open) return;
  const s=cur, at=s?(s.step==='done'?4:STEPS.findIndex(x=>x[0]===s.step)):-1;
  const v=s&&(s.view||s.step);
  $('aiSteps').innerHTML=STEPS.map(([k,n],i)=>{ const lab=`${i<at?'✓ ':''}${n}`, can=s&&!s.busy&&k!=='place'&&i<=s.reached&&!(k==='think'&&s.step==='think');   // 지난 단계는 눌러서 다시 본다
    return `<li class="${i<at?'done':i===at?'on':''}${s&&s.view===k?' see':''}"${i===at?' aria-current="step"':''}>${can?`<button type="button" data-act="view" data-v="${k}" title="${n} 다시 보기">${lab}</button>`:lab}</li>`; }).join('');
  $('aiSub').innerHTML = s ? `<b title="글감: ${esc(s.topic.title)}">${esc(s.topic.title)}</b>${s.step==='think'&&!s.view?`<span class="qn">${s.more!=null?`더 묻기 ${s.more} / ${MORE_MAX}`:`질문 ${Math.min(s.q,MAXQ)} / ${MAXQ}`}</span>`:''}<button type="button" class="aip-tl" data-act="topics" title="다른 글감 고르기(이 대화는 그대로 남아요)">글감 목록</button>` : `<b>글감 고르기</b>`;
  $('aiLeft').textContent=`글 약 ${budget}편 더`; $('aiCalls').textContent=s?`AI 부름 ${s.calls}번`:`AI 부름 모두 ${aiCalls}번`;
  const keepTop=body.scrollTop, toBottom=s&&v==='think';
  body.innerHTML = !s ? topicsView() : (s.view?`<div class="vbar">지난 단계 「${STEPS[STEP_N[s.view]][1]}」를 보고 있어요. 고치려면 아래 「돌아가서 고치기」를 누르세요.</div>`:'')
    +(v==='think' ? thinkView(s) : v==='draft' ? draftView(s) : v==='revise' ? reviseView(s) : placeView(s));
  foot.innerHTML = !s ? '' : footView(s);
  foot.querySelectorAll('button').forEach(b=>{ if(s&&s.busy) b.disabled=true; });
  body.scrollTop = top ? 0 : toBottom ? body.scrollHeight : keepTop;
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
  const wk=status(WEEK.id)==='아직', fresh=kept.filter(k=>!sessions[k.id]), ks=fresh.slice(0,wk?2:3);
  return `${wk?`<h4 class="vh">무엇을 써 볼까요?</h4>${tcard(WEEK,true)}`:''}${mineList()}
    <h5 class="vh5">남겨 둔 장면</h5>${ks.length?ks.map(k=>`<div class="kwrap">${tcard(k)}<button type="button" class="kdel" data-act="keepdel" data-id="${k.id}" title="이 장면 지우기" aria-label="남겨 둔 장면 지우기: ${esc(k.title)}">지우기</button></div>`).join('')+(fresh.length>ks.length?`<p class="note">남겨 둔 장면이 ${fresh.length-ks.length}개 더 있어요.</p>`:''):`<p class="note">생각하기에서 고르지 않은 장면이 여기에 모여요. 다음 글감으로 쓸 수 있어요.</p>`}
    <div class="arow" style="margin-top:12px"><button class="ab" type="button" data-act="pack">다른 글감 보기</button><button class="ab" type="button" data-act="own">내가 정하기</button></div>`;
}
// 내 글: 글감 하나 = 글 한 편. 쓰는 중·담은 글이 쌓이고, 눌러서 이어 간다(PRD 5-1 「책마다 글감 목록이 쌓이고」)
function where(s){ const p=s.placed[s.placed.length-1];
  if(p){ const a=state.pages.findIndex(x=>x.id===p.ids[0]); if(a<0) return '담은 쪽을 지웠어요'; const n=p.ids.filter(id=>state.pages.some(x=>x.id===id)).length; return `${n>1?`${a+1}~${a+n}쪽`:`${a+1}쪽`}에 담음`+(s.placed.length>1?` · ${s.placed.length}번 담음`:''); }
  return {think:s.chosen!=null?'초고 쓰기 전':`생각하기 · 질문 ${Math.min(s.q,MAXQ)} / ${MAXQ}`,draft:s.draft?`초고 ${s.draft.ver}판`:'초고 쓰는 중',revise:s.rev&&s.rev.doc?`퇴고본 ${s.rev.doc.ver}판`:'퇴고 중',place:'담을 자리 고르는 중',done:''}[s.step]; }
function mineList(){ const list=Object.values(sessions).sort((a,b)=>b.updated-a.updated); if(!list.length) return '';
  const d=list.filter(s=>s.placed.length).length;
  return `<h5 class="vh5" style="margin-top:4px">내 글 · ${list.length}편${d?` (담음 ${d}편)`:''}</h5>`+list.map(s=>`<button type="button" class="mrow" data-act="topic" data-id="${s.topic.id}"><b>${esc(s.topic.title)}</b>${chip(s.topic.id)}<span class="w">${esc(where(s))} · 눌러서 이어 가기</span></button>`).join(''); }
const bubble=(m,k)=>`<div class="msg ${m.who}${m.wait?' wait':''}" data-k="${k}"><span class="who">${m.who==='ai'?'AI':'나'}</span>${m.wait?'생각하고 있어요 <i>●</i><i>●</i><i>●</i>':`<span class="tx">${esc(m.text)}</span>`}</div>`
  +(m.scenes&&cur.scenes?cur.scenes.map((c,i)=>`<button type="button" class="scene${cur.chosen===i?' on':''}" data-act="scene" data-i="${i}"${cur.chosen!=null||cur.busy?' disabled':''}><span class="n">${'①②③'[i]}</span><span>${esc(c.text)}</span></button>`).join(''):'');
function thinkView(s){ const mo=moreSample(s);
  const left=!s.view&&!s.busy&&(mo||(s.topic.id===WEEK.id&&s.sampleAt<SAMPLE.length&&!s.scenes));   // 시제품 전용 버튼은 대화 끝에(입력칸 자리를 차지하지 않게)
  if(mo&&left) return s.msgs.map(bubble).join('')+`<button class="ab sample" type="button" data-act="sample-more">시제품 · 예시 답 넣기</button>`;
  return s.msgs.map(bubble).join('')+(left?`<button class="ab sample" type="button" data-act="sample" title="시제품 전용: 미리 써 둔 어르신 답을 입력칸에 넣어요">시제품 · 예시 답 넣기 (${s.sampleAt+1}/${SAMPLE.length})</button>`:''); }
const PH_IN='여기에 답을 적어 주세요. 엔터는 줄바꿈, Ctrl+Enter는 보내기예요.';
function footView(s){
  if(s.view){ const back={think:`<button class="ab" type="button" data-act="more">이 장면 더 이야기하기</button>`,draft:`<button class="ab" type="button" data-act="goto-draft">초고로 돌아가서 고치기</button>`,revise:`<button class="ab" type="button" data-act="goto-revise">퇴고로 돌아가서 고치기</button>`}[s.view];
    return `<button class="ab pri" type="button" data-act="view" data-v="">지금 단계로 돌아가기</button>${s.view==='think'&&s.chosen==null?'':back}`; }
  if(s.step==='think'){
    if(s.more!=null) return `<textarea id="aiIn" data-k="input" aria-label="답 적는 칸 (엔터는 줄바꿈, Ctrl+Enter는 보내기)" placeholder="${PH_IN}">${esc(s.input)}</textarea>
      <div class="arow"><button class="ab" type="button" data-act="idk">잘 모르겠어요</button><button class="ab pri" type="button" data-act="send">보내기</button></div>
      <button class="ab" type="button" data-act="redraft">여기까지 듣고 초고 다시 쓰기</button>`;   // 「이 장면 더 이야기하기」
    if(s.chosen!=null) return `<button class="ab pri" type="button" data-act="draft">초고 쓰기</button>`;
    if(s.scenes) return '';   // 장면 카드를 눌러 고른다
    return `<textarea id="aiIn" data-k="input" aria-label="답 적는 칸 (엔터는 줄바꿈, Ctrl+Enter는 보내기)" placeholder="${PH_IN}">${esc(s.input)}</textarea>
      <button class="ab pri" type="button" data-act="send">보내기</button>
      <div class="arow"><button class="ab" type="button" data-act="idk">잘 모르겠어요</button><button class="ab" type="button" data-act="sum"${s.answers.length?'':' disabled title="답을 하나 이상 하시면 정리할 수 있어요"'}>여기까지 정리해 주세요</button></div>`; }
  if(s.step==='draft') return `<button class="ab pri" type="button" data-act="revise">퇴고로 넘어가기</button><button class="ab" type="button" data-act="revise-skip">질문 없이 바로 퇴고</button>`;
  if(s.step==='revise'){ const r=s.rev; if(!r||r.phase==='think') return '';
    if(r.phase==='ask') return `<textarea id="aiAns" data-k="ansInput" aria-label="편집자 질문에 답 적는 칸 (엔터는 줄바꿈, Ctrl+Enter는 보내기)" placeholder="기억나는 것을 적어 주세요. 엔터는 줄바꿈, Ctrl+Enter는 보내기예요.">${esc(s.ansInput)}</textarea>
      <div class="arow"><button class="ab" type="button" data-act="forgot">기억 안 나요</button><button class="ab pri" type="button" data-act="answer">답하기</button></div>`;
    return `<button class="ab pri" type="button" data-act="place">모아에 담기</button><button class="ab" type="button" data-act="refix">다시 고쳐 주세요</button>`; }
  if(s.step==='place') return `<button class="ab pri" type="button" data-act="insert">이 자리에 담기</button><button class="ab" type="button" data-act="back-rev">퇴고본으로 돌아가기</button>`;
  return `<button class="ab pri" type="button" data-act="next">다음 글감 고르기</button><div class="arow"><button class="ab" type="button" data-act="repolish">이 글 다시 다듬기</button><button class="ab" type="button" data-act="undo">되돌리기</button></div>`;
}
// 원고 카드: 문장마다 눌러서 표시(다시 써 주세요 · 빼 주세요 · 제가 한 말이 아니에요)
const paras=doc=>{ const g=[]; doc.sents.forEach(x=>{ (g[x.p]=g[x.p]||[]).push(x); }); return g.filter(Boolean); };
const docText=doc=>paras(doc).map(p=>p.map(x=>x.t).join(' ')).join('\n\n');
function card(s,doc,kind,ro){
  const n=docText(doc).length;
  return `<div class="ms" data-doc="${kind}"><div class="ms-meta"><span>${kind==='draft'?'초고':'퇴고본'} ${doc.ver}판</span><span>${n.toLocaleString()}자</span></div><h4>${esc(doc.title)}</h4>`
    +paras(doc).map(p=>`<p>${p.map(x=>{ if(ro) return `<span class="s ro${x.mine?' mine':''}${x.ans||x.more?' ans':''}">${esc(x.t)}</span>`; const m=s.marks[x.id]; return `<span class="s${m?' m-'+m:''}${x.mine?' mine':''}${x.ans?' ans':''}${s.sel===x.id?' cur':''}" data-sid="${x.id}" role="button" tabindex="0" aria-label="문장: ${esc(x.t)}${m?' · 표시: '+MARK_KO[m]:''}">${esc(x.t)}${m?`<span class="tag">${MARK_KO[m]}</span>`:''}</span>`; }).join(' ')}</p>`).join('')+`</div>`
    +(ro?'':sentMenu(s,doc)+marksBar(s));
}
function sentMenu(s,doc){ const x=s.sel&&doc.sents.find(y=>y.id===s.sel); if(!x) return ''; const m=s.marks[x.id];
  return `<div class="smenu" role="group" aria-label="고른 문장 고치기"><p class="sq">「${esc(x.t)}」</p>${Object.entries(MARK_KO).map(([k,v])=>`<button class="ab${m===k?' pri':''}" type="button" data-act="mark" data-m="${k}">${v}</button>`).join('')}
    <div class="arow">${m?`<button class="ab" type="button" data-act="mark" data-m="">표시 지우기</button>`:'<span></span>'}<button class="ab" type="button" data-act="selclose">닫기</button></div></div>`; }
function marksBar(s){ const n=Object.keys(s.marks).length; if(!n) return '';
  return `<div class="mbar"><p>표시한 곳 <b>${n}군데</b> · 모아서 한 번에 보내요</p><button class="ab pri" type="button" data-act="apply">표시한 곳 고쳐 받기</button><button class="ab" type="button" data-act="unmark">표시 모두 지우기</button></div>`; }
const waitMsg=s=>s.busy?bubble({who:'ai',wait:true},'w'):'';
const aiNote=s=>s.note?`<div class="msg ai note"><span class="who">AI</span>${esc(s.note)}</div>`:'';
const prevBtn=(h,k)=>h.length?`<button class="ab prev" type="button" data-act="prev" data-k="${k}" title="AI를 부르지 않아요">이전 판으로 (${h[h.length-1].ver}판)</button>`:'';
function draftView(s){ if(!s.draft) return waitMsg(s);
  if(s.view) return `<p class="fixed">${esc(FIRST_LINE)}</p>${card(s,s.draft,'draft',true)}`;
  return `<p class="fixed">${esc(FIRST_LINE)}</p>${card(s,s.draft,'draft')}${prevBtn(s.draftHist,'draft')}
    <div class="qfix" role="group" aria-label="빠른 고침"><button class="ab" type="button" data-act="qfix" data-k="plain">더 담백하게</button><button class="ab" type="button" data-act="qfix" data-k="short">더 짧게</button><button class="ab" type="button" data-act="more">이 장면 더 이야기하기</button></div>
    ${s.mineOpen?`<label class="note" for="aiMine">내가 한 줄 더하기 · 쓰신 그대로 글 끝에 넣어요</label><textarea id="aiMine" data-k="mineInput" style="min-height:80px">${esc(s.mineInput)}</textarea><div class="arow" style="margin-top:8px"><button class="ab" type="button" data-act="mine-close">그만두기</button><button class="ab pri" type="button" data-act="mine-add">넣기</button></div>`
      :`<button class="ab" type="button" data-act="mine-open" style="margin-top:6px">내가 한 줄 더하기</button>`}
    ${aiNote(s)}<p class="endline">초고가 나왔습니다. 읽어 보시고, 준비되시면 「퇴고로 넘어가기」를 눌러 주세요.</p>${waitMsg(s)}`; }
function diagCard(r){ const fix=r.diag.filter(d=>d.fix), pass=r.diag.filter(d=>!d.fix);
  return `<div class="diag"><h5>다섯 가지 진단</h5>${fix.map(d=>`<div class="fix"><b>${d.name} — 고칠 곳</b>${esc(d.fix)}</div>`).join('')}
    ${pass.length?`<p class="pass">통과 ${pass.length}가지: ${pass.map(d=>d.name.slice(0,1)).join(' ')}</p>`:''}</div>`; }
function reviseView(s){ const r=s.rev; if(!r||!r.diag) return waitMsg(s);
  let h=diagCard(r);
  if(r.q) h+=bubble({who:'ai',text:r.q},'q');
  if(r.phase==='ask'&&r.scripted&&!s.busy&&!s.view) h+=`<button class="ab sample" type="button" data-act="sample-edit">시제품 · 예시 답 넣기</button>`;
  if(r.ans!=null) h+=bubble({who:'me',text:r.ans||'기억 안 나요.'},'a');
  if(r.doc){ h+=card(s,r.doc,'rev',!!s.view)+(s.view?'':prevBtn(s.revHist,'rev'));
    h+=`<button class="ab" type="button" data-act="diff" aria-pressed="${s.showDiff}" style="margin-top:10px">${s.showDiff?'바뀐 곳 숨기기':'바뀐 곳 보기'}</button>`;
    if(s.showDiff) h+=`<div class="diff"><h5>초고와 비교 · <del>지운 곳</del> <ins>더한 곳</ins></h5>${diffHTML(docText(s.draft),docText(r.doc))}</div>`;
    if(!s.view) h+=aiNote(s)+`<p class="endline">퇴고가 끝났습니다. 준비되시면 「모아에 담기」를 눌러 주세요.</p>`; }
  return h+waitMsg(s); }
function placeView(s){
  if(s.step==='done'){ const n=s.inserted.ids.length, a=s.inserted.at+1;
    return `<div class="aidone"><b>✓ 담았어요</b>${n>1?`${a}~${a+n-1}쪽`:`${a}쪽`}에 「${esc(s.rev.doc.title)}」${josa(s.rev.doc.title,'을','를')} 새 글 쪽으로 넣었어요. 있던 쪽은 그대로예요.</div>
      <p class="note">이제 이 글은 ${CALL} 원고예요. 지면에서 직접 고치실 수 있어요.</p>
      <p class="note">생각하기·초고·퇴고 과정은 지워지지 않았어요. 위 단계 표시를 누르면 다시 볼 수 있고, 「이 글 다시 다듬기」로 한 번 더 고쳐 담을 수 있어요(담은 쪽은 그대로 두고 새 쪽으로 하나 더 들어가요).</p>`; }
  const at=placeAt(s), L=state.pages.length, pg=i=>`${i}쪽 「${esc(state.pages[i-1].name)}」 뒤`, n=estimate(s);
  const opt=(m,b,sub)=>`<button type="button" class="popt${s.place.mode===m?' on':''}" data-act="pmode" data-m="${m}" aria-pressed="${s.place.mode===m}"><b>${b}</b><span>${sub}</span></button>`;
  return `<h4 class="vh">어디에 담을까요?</h4>
    ${opt('after','지금 보던 쪽 뒤',pg(chainEnd(state.cur)+1))}${opt('end','책 맨 뒤',pg(L))}${opt('pick','직접 고르기','왼쪽 쪽 목록에서 자리를 누르거나 아래에서 골라요')}
    ${s.place.mode==='pick'?`<div class="plist" role="group" aria-label="담을 자리">${state.pages.map((p,i)=>flowsInto(i)?'':`<button type="button" data-act="pickat" data-at="${i+1}" class="${at===i+1?'on':''}">${i+1}쪽 「${esc(p.name)}」 뒤</button>`).join('')}</div>`:''}
    <div class="pinfo">「${esc(s.rev.doc.title)}」 · 새 글 약 ${n}쪽<br><b>${at+1}쪽</b>부터 들어가요. 있던 쪽은 그대로 두고 새 쪽으로만 넣어요.</div>`;
}

/* ═══════════════ 쪽 목록 표시(「여기」 · 새 글) ═══════════════ */
function marks(){
  $('thumbs').querySelectorAll('.ai-here').forEach(n=>{ n.classList.remove('ai-here'); n.removeAttribute('data-here'); });
  $('thumbs').querySelectorAll('.ai-new').forEach(n=>n.classList.remove('ai-new'));
  if(!ui.open||!cur) return;
  if(cur.step==='place'){ const i=$('thumbs').querySelector(`.ins[data-ins="${placeAt(cur)}"]`);
    if(i){ i.classList.add('ai-here'); i.dataset.here=`여기 · 새 글 약 ${estimate(cur)}쪽`; i.scrollIntoView({block:'nearest'}); } }
  if(cur.step==='done') cur.inserted.ids.forEach(id=>$('thumbs').querySelector(`.th[data-id="${id}"]`)?.classList.add('ai-new'));
}
// 쪽 목록을 다시 그릴 때마다(쪽 이동·되돌리기 등) 표시를 다시 붙이고, 담은 글이 되돌리기로 빠졌으면 담기 전 화면으로
function syncPlaced(s){   // 되돌리기로 마지막에 담은 쪽이 빠지면 담기 전 화면으로, 다시 하기(Ctrl+Y)로 살아나면 「담았어요」로
  const last=s.placed[s.placed.length-1];
  if(last&&s.step==='done'&&!state.pages.some(p=>p.id===last.ids[0])){ s.undone=s.placed.pop(); s.inserted=s.placed[s.placed.length-1]||null; s.step='place'; budget++; return 'undo'; }
  if(s.undone&&s.step==='place'){ const at=state.pages.findIndex(p=>p.id===s.undone.ids[0]);
    if(at>=0){ s.placed.push({...s.undone,at}); s.inserted=s.placed[s.placed.length-1]; s.undone=null; s.step='done'; budget--; return 'redo'; } }   // 같은 글을 두 번 담지 않게
  return null; }
new MutationObserver(()=>{
  let ch=null; Object.values(sessions).forEach(s=>{ const r=syncPlaced(s); if(r&&(s===cur||!ch)) ch=r; });
  if(ch==='undo') toast('되돌렸어요 · 책은 담기 전 그대로예요');
  if(ch){ render(true); return; }
  if(ui.open&&cur&&cur.step==='place'){ const old=cur.place.shown; if(placeAt(cur)!==old){ render(); return; } }
  if(ui.open&&!cur) render();   // 첫 화면 「내 글」의 쪽 번호
  else marks(); }).observe($('thumbs'),{childList:true});
// 「직접 고르기」일 때는 쪽 목록을 누르면 자리를 고른다(쪽 이동·새 쪽 끼우기 대신)
$('thumbs').addEventListener('click',ev=>{ if(!(ui.open&&cur&&cur.step==='place'&&cur.place.mode==='pick')) return;
  const ins=ev.target.closest('[data-ins]'), th=ev.target.closest('.th'); if(!ins&&!th) return;
  ev.stopPropagation(); ev.preventDefault(); pickAt(ins?+ins.dataset.ins:+th.dataset.i+1); },true);

/* ═══════════════ 담기(편집기 장치 그대로) ═══════════════ */
const chainEnd=i=>{ while(flowsInto(i)) i++; return i; };   // 이어진 원고는 끝 쪽까지 한 덩어리로 본다(사이에 끼우지 않음)
function placeAt(s){ const L=state.pages.length; let at;
  if(s.place.mode==='end') at=L; else if(s.place.mode==='pick'&&s.place.at!=null) at=Math.min(Math.max(1,s.place.at),L); else at=chainEnd(state.cur)+1;
  at=chainEnd(at-1)+1; s.place.shown=at; return at; }
function pickAt(at){ const s=cur; const fixed=chainEnd(at-1)+1;
  if(fixed!==at) toast('이어진 글 사이에는 넣지 않고, 그 글이 끝나는 쪽 뒤에 담을게요');
  s.place.at=fixed; render(); }
function writingPage(doc,name){
  const html=paras(doc).map(p=>esc(p.map(x=>x.t).join(' '))).join('<br><br>');
  return {id:uid(),name,bg:'#FFFFFF',els:[T(MX,24,CW,12,esc(doc.title),{fs:18,b:true,align:'center',color:'#0B4536'}), T(MX,44,CW,PH-MB-44,html)]};   // 본문 상자는 아래 여백까지 → 넘치면 「(이어서)」 쪽으로
}
// 몇 쪽이 될지: 편집기 글 흐름(settle)을 빈 책에 한 번 돌려 본다(실제 책은 건드리지 않음)
function estimate(s){ const key=docText(s.rev.doc)+'|'+state.zoom; if(s.est&&s.est.key===key) return s.est.n;
  const keep=state.pages; let n=1; try{ state.pages=[writingPage(s.rev.doc,s.topic.title)]; settle(0); n=state.pages.length; } finally{ state.pages=keep; }
  s.est={key,n}; return n; }
function insertWriting(s){
  endEdit(); const at=placeAt(s), pg=writingPage(s.rev.doc,s.topic.title);
  snap();                                   // 되돌리기 한 번 = 담기 전으로
  state.pages.splice(at,0,pg); settle(at);  // 넘친 글은 편집기와 똑같이 「(이어서)」 쪽으로
  const ids=[pg.id]; for(let i=at;flowsInto(i);i++) ids.push(state.pages[i+1].id);
  state.cur=at; state.sel=null; s.inserted={ids,at}; s.placed.push(s.inserted); s.undone=null; reach(s,'done'); budget=Math.max(0,budget-1);
  renderAll(); render(true); toast(`${at+1}쪽에 새 글로 담았어요 · 되돌리기 한 번이면 원래대로예요`);
}

/* ═══════════════ 가짜 AI ═══════════════ */
async function aiSay(s,text,extra){
  s.busy=true; s.msgs.push({who:'ai',wait:true}); render(); await wait(650+Math.random()*450);
  const m=s.msgs[s.msgs.length-1]; delete m.wait; Object.assign(m,{text:''},extra||{});
  if(reduce()) m.text=text;
  else { render(); for(let i=0;i<text.length;i+=2){ m.text=text.slice(0,i+2); const n=cur===s&&body.querySelector(`.msg[data-k="${s.msgs.length-1}"] .tx`); if(n){ n.textContent=m.text; body.scrollTop=body.scrollHeight; } await wait(14); } }
  m.text=text; s.busy=false; if(cur===s){ render(); $('aiLive').textContent=text; } }
function greet(t){ const tt=`'${t.title}'${josa(t.title,'을','를')}`;
  return t.id===WEEK.id ? `안녕하세요, ${CALL}. 오늘은 ${CALL}의 삶에서 ${tt} 찾아보겠습니다. 처음부터 정답을 정할 필요는 없습니다. 이야기를 하다 보면 생각하지 못했던 장면이 떠오를 수도 있습니다. ${t.first}`   // 프롬프트 v3 4장
    : `안녕하세요, ${CALL}. 오늘은 '${t.title}' 이야기를 나눠 보겠습니다. 처음부터 정답을 정할 필요는 없습니다. ${t.first}`; }
function mirror(t){ const f=(split(t)[0]||t).replace(/[.!?…]+$/,''); const sn=f.length>28?f.slice(0,28).trim()+'…':f; return `"${sn}" — 이 장면이 선명하게 남아 있네요.`; }
const nextQ=s=>GQ[s.gq++%GQ.length], nextEasy=s=>EASY[s.ez++%EASY.length];
function startTopic(t){
  if(!sessions[t.id]){ sessions[t.id]={topic:t,step:'think',msgs:[],q:0,answers:[],sampleAt:0,gq:0,ez:0,input:'',busy:false,scenes:null,chosen:null,
    draft:null,marks:{},sel:null,mineOpen:false,mineInput:'',note:'',rev:null,ansInput:'',showDiff:true,place:{mode:'after',at:null},inserted:null,notMine:0,
    calls:0,reached:0,view:null,more:null,moreAns:[],draftHist:[],revHist:[],placed:[],undone:null,updated:Date.now()};
    cur=sessions[t.id]; cur.q=1; call(cur); render(true); aiSay(cur,greet(t)); return; }
  cur=sessions[t.id]; cur.view=null; cur.updated=Date.now(); render(true); }
async function send(kind){ const s=cur; if(s.busy) return;
  const text=kind==='idk'?'잘 모르겠어요.':s.input.trim(); if(!text){ toast('답을 적은 뒤 「보내기」를 눌러 주세요'); $('aiIn')?.focus(); return; }
  if(s.more!=null) return moreAnswer(s,text,kind);
  call(s); s.updated=Date.now(); s.msgs.push({who:'me',text}); if(kind!=='idk'){ s.input=''; s.answers.push({text,si:SAMPLE.findIndex(x=>x.a===text)}); }
  if(s.q>=MAXQ) return summarize(s);   // 다섯 번째 질문의 답을 받으면 정리로(프롬프트 v3 11장)
  const si=kind==='idk'?-1:s.answers[s.answers.length-1].si;
  const reply=kind==='idk'?`그럼 조금 다른 쪽에서 여쭤 보겠습니다. ${nextEasy(s)}`:si>=0&&SAMPLE[si].r?SAMPLE[si].r:`${mirror(text)} ${nextQ(s)}`;
  s.q++; await aiSay(s,reply); $('aiIn')?.focus(); }
function sceneCands(s){ return s.answers.map((a,k)=>a.si>=0?{text:SAMPLE[a.si].scene,si:a.si,rank:SAMPLE[a.si].rank,k}:{text:(split(a.text)[0]||a.text).replace(/[.!?…]+$/,'').slice(0,60),si:-1,rank:10-Math.min(a.text.length/100,5),k})
  .sort((a,b)=>a.rank-b.rank).slice(0,3); }
async function summarize(s){
  const c=sceneCands(s); if(!c.length){ await aiSay(s,`${CALL}, 아직 글로 옮길 장면을 듣지 못했습니다. 떠오르는 것이 있으면 한 줄이라도 적어 주세요.`); return; }
  s.scenes=c; await aiSay(s,`${CALL}, 지금까지 이야기에서 제가 들은 가장 선명한 장면은 다음과 같습니다.`,{scenes:true});
  if(c.length===1){ await aiSay(s,`${CALL}이 이야기하신 ${s.topic.id===WEEK.id?'최고의 순간':'장면'}은 ${c[0].text}입니다.`); return choose(s,0,true); }   // 후보가 하나면 고르게 하지 않는다(프롬프트 v3 12장)
  await aiSay(s,s.topic.id===WEEK.id?`${CALL}, 이 가운데 이번 회고글의 중심이 될 '${WEEK.title}'${josa(WEEK.title,'을','를')} 하나 골라 주세요.`:`${CALL}, 이 가운데 이번 글의 중심이 될 장면을 하나 골라 주세요.`); }
async function choose(s,i,auto){ if(s.chosen!=null) return; if(!auto) call(s); s.chosen=i; const c=s.scenes[i];
  const left=s.scenes.filter((x,k)=>k!==i&&!kept.some(y=>y.title===x.text));   // 고르지 않은 장면은 묻지 않고 「남겨 둔 장면」으로(PRD 제안)
  left.forEach(x=>kept.push({id:'k'+(++seq),label:'남겨 둔 장면',title:x.text,first:'이 장면에서 가장 먼저 떠오르는 것은 무엇인가요?',from:s.topic.title}));
  if(left.length) toast(`고르지 않은 장면 ${left.length}개는 「남겨 둔 장면」에 두었어요`);
  await aiSay(s,`${c.text}${josa(c.text,'을','를')} 중심으로 초고를 쓰겠습니다. 준비되시면 「초고 쓰기」를 눌러 주세요.`); }
let sid=0;
function buildDraft(s){ const sents=[]; let p=0;
  s.answers.forEach((a,k)=>{ const src=a.si>=0?SAMPLE[a.si].sents.map(x=>({...x})):split(a.text).map(t=>({id:'g'+(++sid),t}));
    src.forEach(x=>sents.push({...x,orig:x.t,p,ak:k})); p++; });
  const c=s.scenes[s.chosen]; return {title:c.si>=0?SAMPLE[c.si].title:s.topic.title, sents, ver:1}; }
async function think(s,ms,fn,show){ s.busy=true; render(); await wait(ms); fn(); s.busy=false; if(cur!==s) return; render();
  const n=show&&body.querySelector(typeof show==='function'?show():show); if(n) n.scrollIntoView({block:'start'}); }   // 새로 나온 결과가 보이게
function writeDraft(s){ call(s); reach(s,'draft'); s.note=''; render(true); return think(s,1300,()=>{ s.draft=buildDraft(s); }); }
// 「이 장면 더 이야기하기」: 생각하기로 돌아가 고른 장면만 더 묻고, 들은 말을 초고의 그 장면 뒤에 넣는다(지어내지 않음, 초고의 다른 고침은 그대로)
const chosenSi=s=>{ const c=s.scenes&&s.scenes[s.chosen]; return c?c.si:-1; };
const moreSample=s=>s.more!=null&&!s.moreAns.some(a=>a.mi!=null)&&MORE[chosenSi(s)]?MORE[chosenSi(s)]:null;
async function moreStart(s){ if(s.busy) return; const c=s.scenes&&s.scenes[s.chosen]; if(!c){ toast('먼저 생각하기에서 장면을 골라 주세요'); return; }
  call(s); reach(s,'think'); s.more=1; s.moreAns=[]; s.input=''; render(true);
  const m=MORE[c.si];
  await aiSay(s,`${c.text}${josa(c.text,'을','를')} 조금 더 따라가 보겠습니다. ${m?m.q:nextQ(s)}`); $('aiIn')?.focus(); }
async function moreAnswer(s,text,kind){ s.msgs.push({who:'me',text}); s.input=''; s.updated=Date.now();
  if(kind!=='idk'){ const mi=Object.keys(MORE).find(k=>MORE[k].a===text); s.moreAns.push({text,mi:mi!=null?+mi:null}); }
  if(s.more>=MORE_MAX) return redraft(s);   // 두 번째 답까지 들으면 바로 초고를 다시 쓴다
  call(s); s.more++; await aiSay(s,kind==='idk'?`그럼 조금 다른 쪽에서 여쭤 보겠습니다. ${nextEasy(s)}`:`${mirror(text)} ${nextQ(s)}`); $('aiIn')?.focus(); }
function redraft(s){ if(s.busy) return; const add=s.moreAns; s.more=null; s.moreAns=[];
  if(!add.length){ reach(s,'draft'); render(true); toast('더 들은 말이 없어 초고는 그대로예요'); return; }
  call(s); reach(s,'draft'); render(true);
  return think(s,1300,()=>{ const d=s.draft; keep(s.draftHist,d); const c=s.scenes[s.chosen];
    const idx=d.sents.map((x,i)=>x.ak===c.k?i:-1).filter(i=>i>=0), at=idx.length?idx[idx.length-1]:-1;
    const p=at>=0?d.sents[at].p:Math.max(-1,...d.sents.map(x=>x.p))+1;
    const ns=add.flatMap(a=>(a.mi!=null?MORE[a.mi].sents:split(a.text)).map(t=>({id:'n'+(++sid),t,orig:t,p,ak:c.k,more:true})));
    d.sents.splice(at>=0?at+1:d.sents.length,0,...ns); d.ver++;
    toast(`더 들은 말로 초고 ${d.ver}판을 썼어요 · 「이전 판으로」를 누르면 앞 판으로 돌아가요`); }, '.ms[data-doc=draft]'); }
const keep=(h,doc)=>h.push(JSON.parse(JSON.stringify(doc)));   // 판을 남겨 「이전 판으로」(AI를 부르지 않음)
// 문장 표시를 모아서 한 번에 고친다(AI 호출 한 번 — PRD 5-1 「비용과 기록」)
function applyMarks(s,doc){ const ids=Object.keys(s.marks); if(!ids.length){ toast('고칠 문장을 먼저 눌러 표시해 주세요'); return; }
  let none=0, nm=0; call(s); keep(doc===s.draft?s.draftHist:s.revHist,doc);
  return think(s,1100,()=>{ doc.sents=doc.sents.flatMap(x=>{ const m=s.marks[x.id]; if(!m) return [x];
      if(m==='drop') return []; if(m==='notmine'){ nm++; return []; }
      if(x.alt&&x.t!==x.alt) return [{...x,t:x.alt}]; none++; return [x]; });
    s.notMine+=nm; doc.ver++; s.marks={}; s.sel=null; s.note='';
    toast(`${doc===s.draft?'초고':'퇴고본'} ${doc.ver}판이 나왔어요`+(nm?` · 「제가 한 말이 아니에요」 ${nm}곳은 뺐어요`:'')+(none?` · (시제품) 다시 쓸 문장이 준비되지 않은 ${none}곳은 그대로예요`:'')); }, doc===s.draft?'.ms[data-doc=draft]':'.ms[data-doc=rev]'); }
function quickFix(s,k){ const d=s.draft, scripted=d.sents.some(x=>/^s\d/.test(x.id)); call(s); const snapD=JSON.parse(JSON.stringify(d));
  return think(s,1100,()=>{ const before=docText(d);
    if(k==='plain') d.sents=d.sents.filter(x=>!x.made).map(x=>x.plain&&x.t===x.orig?{...x,t:x.plain}:x);
    if(k==='short') d.sents=scripted?d.sents.filter(x=>!x.made&&!['s8','s9','s5'].includes(x.id)):d.sents.filter(x=>x.p!==Math.max(...d.sents.map(y=>y.p))||d.sents.every(y=>y.p===d.sents[0].p));
    s.note=''; if(docText(d)===before){ toast('(시제품) 이 글에는 미리 써 둔 고침이 없어 그대로예요'); return; }
    s.draftHist.push(snapD); d.ver++; toast(`초고 ${d.ver}판 · ${k==='plain'?'더 담백하게':'더 짧게'} 고쳤어요`); }, '.ms[data-doc=draft]'); }
function enterRevise(s,skip){ call(s); if(s.rev&&s.rev.doc) keep(s.revHist,s.rev.doc); reach(s,'revise'); s.sel=null; s.marks={}; s.note='';
  const scripted=s.draft.sents.some(x=>x.anchor);
  s.rev={phase:'think',scripted,skip,diag:null,q:null,ans:null,doc:null}; render(true);
  return think(s,1300,()=>{ const r=s.rev;
    r.diag=DIAG_NAMES.map((name,i)=>({name,fix:scripted?(i===3?'박 기사의 "됐습니다!" 뒤 장면이 한 줄로 끝나 있어요':null):(i===0?'그날 오간 말 한 줄이 있으면 장면이 더 잘 보여요':null)}));
    if(skip){ r.doc=makeRevision(s,null); r.phase='done'; return; }   // 「이대로 좋아요」: 편집자 질문 없이(프롬프트 v3 26장)
    r.q=scripted?SAMPLE_EDIT.q:`그 장면에서 누가 어떤 말을 했는지, 기억나는 말 한마디가 있나요?`; r.phase='ask'; }, ()=>s.rev.doc?'.ms[data-doc=rev]':'.msg[data-k=q]'); }
function makeRevision(s,ans){ const d=s.draft, out=[]; let ra=0;
  const add=ans?(ans===SAMPLE_EDIT.a?SAMPLE_EDIT.ins:split(ans)).map(t=>({id:'ra'+(++ra),t,orig:t,ans:true})):[];
  const anchor=d.sents.find(x=>x.anchor)||d.sents.filter(x=>x.p===d.sents[0].p).pop();
  d.sents.forEach(x=>{ out.push({...x,id:'r'+x.id,t:x.rev&&x.t===x.orig?x.rev:x.t,alt:null}); if(x===anchor) add.forEach(a=>out.push({...a,p:x.p})); });
  return {title:d.title,sents:out,ver:(s.revHist.length?Math.max(...s.revHist.map(x=>x.ver)):0)+1}; }
function answerEdit(s,forgot){ const r=s.rev; const a=forgot?'':s.ansInput.trim(); if(!forgot&&!a){ toast('답을 적거나 「기억 안 나요」를 눌러 주세요'); return; }
  call(s); r.ans=a; s.ansInput=''; r.phase='think';
  return think(s,1300,()=>{ r.doc=makeRevision(s,a||null); r.phase='done'; }, '.ms[data-doc=rev]'); }   // 기억 안 나면 그 자리는 비워 둔 채 퇴고
// 바뀐 곳 보기: AI가 아니라 화면이 초고와 퇴고본을 낱말 단위로 맞대어 표시한다(AI 비용 없음, 프롬프트 v3 28장 「고친 목록을 쓰지 않는다」)
function diffHTML(a,b){ const A=a.split(/(\s+)/), B=b.split(/(\s+)/), n=A.length, m=B.length;
  const L=Array.from({length:n+1},()=>new Uint16Array(m+1));
  for(let i=n-1;i>=0;i--) for(let j=m-1;j>=0;j--) L[i][j]=A[i]===B[j]?L[i+1][j+1]+1:Math.max(L[i+1][j],L[i][j+1]);
  let i=0,j=0,o=''; const del=t=>/^\s+$/.test(t)?'':`<del>${esc(t)}</del>`, ins=t=>/^\s+$/.test(t)?esc(t):`<ins>${esc(t)}</ins>`;
  while(i<n&&j<m){ if(A[i]===B[j]){ o+=esc(A[i]); i++; j++; } else if(L[i+1][j]>=L[i][j+1]) o+=del(A[i++]); else o+=ins(B[j++]); }
  while(i<n) o+=del(A[i++]); while(j<m) o+=ins(B[j++]); return o.replace(/<\/del><del>/g,'').replace(/<\/ins><ins>/g,''); }

/* ═══════════════ 누르기 ═══════════════ */
panel.addEventListener('input',ev=>{ const k=ev.target.dataset.k; if(k&&cur) cur[k]=ev.target.value; if(ev.target.id==='aiOwn') ui.own=ev.target.value; });
panel.addEventListener('click',ev=>{
  const sp=ev.target.closest('.ms .s[data-sid]'); if(sp&&cur&&!cur.busy&&!cur.view){ cur.sel=cur.sel===sp.dataset.sid?null:sp.dataset.sid; render(); body.querySelector('.smenu')?.scrollIntoView({block:'nearest'}); return; }
  const b=ev.target.closest('[data-act]'); if(!b||b.disabled) return; const s=cur, a=b.dataset.act;
  const doc=s&&(s.step==='revise'?s.rev&&s.rev.doc:s.draft);
  ({
    topic:()=>startTopic(topicOf(b.dataset.id)), pack:()=>{ ui.view='pack'; render(true); }, packmore:()=>{ ui.pack++; render(true); },
    own:()=>{ ui.view='own'; render(true); $('aiOwn').focus(); }, home:()=>{ ui.view='topics'; render(true); },
    ownstart:()=>{ const t=ui.own.trim(); if(!t){ toast('쓰고 싶은 글감을 적어 주세요'); $('aiOwn').focus(); return; }
      ui.own=''; ui.view='topics'; startTopic({id:'o'+(++seq),label:'내가 정한 글감',title:t,first:'이 이야기에서 가장 먼저 떠오르는 장면은 무엇인가요?'}); },
    keepdel:()=>{ const i=kept.findIndex(k=>k.id===b.dataset.id); if(i>=0) kept.splice(i,1); toast('남겨 둔 장면을 지웠어요'); render(); },
    send:()=>send('me'), idk:()=>send('idk'), sum:()=>{ if(!s.busy){ call(s); summarize(s); } },
    sample:()=>{ s.input=SAMPLE[s.sampleAt].a; s.sampleAt++; render(); const t=$('aiIn'); t.focus(); t.setSelectionRange(t.value.length,t.value.length); },
    scene:()=>choose(s,+b.dataset.i), draft:()=>writeDraft(s),
    mark:()=>{ if(b.dataset.m) s.marks[s.sel]=b.dataset.m; else delete s.marks[s.sel]; s.sel=null; render(); },
    selclose:()=>{ s.sel=null; render(); }, unmark:()=>{ s.marks={}; s.sel=null; render(); }, apply:()=>applyMarks(s,doc),
    qfix:()=>quickFix(s,b.dataset.k), more:()=>moreStart(s), redraft:()=>redraft(s),
    'sample-more':()=>{ s.input=moreSample(s).a; render(); const t=$('aiIn'); t.focus(); t.setSelectionRange(t.value.length,t.value.length); },
    prev:()=>{ const h=b.dataset.k==='draft'?s.draftHist:s.revHist, d=h.pop(); if(!d) return; if(b.dataset.k==='draft') s.draft=d; else s.rev.doc=d; s.marks={}; s.sel=null; render(); toast(`${d.ver}판으로 돌아갔어요`); },
    view:()=>{ s.view=b.dataset.v&&b.dataset.v!==s.step?b.dataset.v:null; s.sel=null; render(true); },
    'goto-draft':()=>{ reach(s,'draft'); s.sel=null; s.marks={}; render(true); }, 'goto-revise':()=>{ reach(s,'revise'); s.sel=null; s.marks={}; render(true); },
    repolish:()=>{ reach(s,'revise'); s.sel=null; s.marks={}; render(true); toast('퇴고본을 다시 고칠 수 있어요 · 담은 쪽은 그대로예요'); }, 'mine-open':()=>{ s.mineOpen=true; render(); $('aiMine').focus(); }, 'mine-close':()=>{ s.mineOpen=false; render(); },
    'mine-add':()=>{ const t=s.mineInput.trim(); if(!t){ toast('넣을 한 줄을 적어 주세요'); return; }
      keep(s.draftHist,s.draft); s.draft.sents.push({id:'m'+(++sid),t,orig:t,mine:true,p:Math.max(-1,...s.draft.sents.map(x=>x.p))+1}); s.draft.ver++; s.mineInput=''; s.mineOpen=false; render(); toast('쓰신 그대로 글 끝에 넣었어요'); },
    revise:()=>enterRevise(s,false), 'revise-skip':()=>enterRevise(s,true),
    answer:()=>answerEdit(s,false), forgot:()=>answerEdit(s,true), 'sample-edit':()=>{ s.ansInput=SAMPLE_EDIT.a; render(); $('aiAns').focus(); },
    diff:()=>{ s.showDiff=!s.showDiff; render(); },
    refix:()=>Object.keys(s.marks).length?applyMarks(s,doc):toast('고칠 문장을 퇴고본에서 눌러 표시한 뒤 다시 눌러 주세요'),
    place:()=>{ reach(s,'place'); s.sel=null; s.marks={}; render(true); }, 'back-rev':()=>{ reach(s,'revise'); render(true); },
    pmode:()=>{ s.place.mode=b.dataset.m; if(b.dataset.m==='pick'&&s.place.at==null) s.place.at=chainEnd(state.cur)+1; render(); },
    pickat:()=>pickAt(+b.dataset.at), insert:()=>insertWriting(s),
    undo:()=>undo(),
    next:()=>{ cur=null; ui.view='topics'; render(true); }, topics:()=>{ cur=null; ui.view='topics'; render(true); }
  })[a]?.();
});
// AI 창 안에서 누른 키는 편집기 단축키(상자 지우기·방향키로 옮기기)로 가지 않게 한다. Ctrl+Z·Y(앱 되돌리기)는 그대로
panel.addEventListener('keydown',ev=>{
  const sp=ev.target.closest&&ev.target.closest('.ms .s[data-sid]');
  if(sp&&(ev.key==='Enter'||ev.key===' ')){ ev.preventDefault(); sp.click(); }
  if(ev.key==='Escape'&&cur&&cur.sel){ cur.sel=null; render(); }
  if(ev.key==='Enter'&&!ev.isComposing&&ev.keyCode!==229&&((ev.ctrlKey||ev.metaKey)||ev.target.id==='aiOwn')){
    const act={aiIn:'send',aiAns:'answer',aiMine:'mine-add',aiOwn:'ownstart'}[ev.target.id]; if(act){ ev.preventDefault(); panel.querySelector(`[data-act="${act}"]`)?.click(); } }
  if((ev.ctrlKey||ev.metaKey)&&!ev.altKey&&/^Key[ZY]$/.test(ev.code)&&!/^(INPUT|TEXTAREA)$/.test(ev.target.tagName)) return;
  ev.stopPropagation(); });
window.__aiProto={sessions,kept,get cur(){ return cur; },get calls(){ return aiCalls; },ui};   // 자동 시험용
})();
