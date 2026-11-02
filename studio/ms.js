/* 폰 원고 화면(시험판) — studio/?ms=1 (내 책은 ?book=…&ms=1)
   책 쪽을 줄여 보여 주는 대신, 원고를 위에서 아래로 큰 글자(18px)로 펼쳐 쓴다. 쪽 나누기는 편집기의 글 흐름 엔진(settle)이 그대로 맡는다.
   원칙: 이 화면은 「컴퓨터 편집기에서 글자를 고친 것」과 같은 일만 한다 — 사진·글상자의 자리는 옮기지 않고,
   새 사진·영상·노래·글은 이야기 끝 다음에 새 쪽으로만 넣는다(컴퓨터에서 손으로 짠 쪽은 그대로).
   편집기(index.html)의 state·settle·flowEl·pickMedia·저장을 그대로 쓴다(같은 전역). 저장은 편집기의 1.5초 자동 저장이 맡는다. */
(()=>{
const KIND={image:'사진',video:'영상',audio:'노래'}, OBJ={image:'사진을',video:'영상을',audio:'노래를'};
const css=`
body.ms{background:#FBF8F1;margin:0;height:auto;overflow:visible}   /* 편집기는 화면 전체를 손으로 못 움직이게 잠가 둔다(overflow:hidden) — 원고 화면은 풀어야 위아래로 밀린다 */
body.ms:has(.aip:not([hidden])){overflow:hidden}   /* AI 창이 열려 있을 때는 뒤 원고가 같이 밀리지 않게 */
body.ms .app{display:contents!important}
body.ms .app>:not(.aip){display:none!important}   /* 편집기 화면은 감추고 AI 창(있으면)만 남긴다 */
body.ms .aip{visibility:visible;position:fixed;inset:0;z-index:80;border:0}
.msr{max-width:680px;margin:0 auto;min-height:100vh;padding:0 16px 120px;box-sizing:border-box;font-family:'Noto Sans KR',system-ui,sans-serif;color:#1B2B25}
.msr *{box-sizing:border-box}
.ms-top{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:8px;margin:0 -16px;padding:8px 12px;background:#FBF8F1;border-bottom:1px solid #E4DCC8}
.ms-top button{min-height:44px;font:inherit;font-size:16px;font-weight:700;padding:0 14px;border-radius:12px;border:1px solid #D9D2BA;background:#fff;color:#0B3324;white-space:nowrap}
.ms-top .ms-pvbtn{background:#0F5B48;border-color:#0F5B48;color:#fff}
.ms-save{flex:1;min-width:0;font-size:14px;color:#5F5D54;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ms-save[data-state=err],.ms-save[data-state=conflict],.ms-save[data-state=auth],.ms-save[data-state=perm]{color:#B03A2E;font-weight:700}
.ms-top #msHelp{padding:0 12px}
.ms-tools .ms-mic{position:absolute;right:12px;bottom:calc(100% + 10px);flex:none;max-width:none;min-height:54px;flex-direction:row;gap:6px;padding:0 20px;border-radius:999px;border:2px solid #0F5B48;background:#fff;color:#0F5B48;font-size:17px;font-weight:800;box-shadow:0 4px 14px rgba(11,51,36,.18)}
.ms-tools .ms-mic svg{width:22px;height:22px} .ms-tools .ms-mic svg .fill,.ms-sheet svg .fill{fill:currentColor;stroke:none}
.ms-tip svg,.ms-hl svg{width:1.15em;height:1.15em;vertical-align:-0.22em;fill:none;stroke:#0F5B48;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.ms-tools .ms-mic.on{background:#B03A2E;border-color:#B03A2E;color:#fff}
.ms-tip{margin:12px 0 0;padding:12px 14px;border-radius:12px;background:#EEF5F1;border:1px solid #CFE3D8;font-size:16px;line-height:1.65;color:#23413A}
.ms-tip[hidden]{display:none}
.ms-tip .ms-small{display:block;margin:8px 0 0 auto;min-height:44px}
.ms-sheet{position:fixed;inset:0;z-index:95;background:rgba(20,30,25,.38);display:flex;align-items:flex-end;justify-content:center}
.ms-sheet[hidden],.ms-sheet [data-sheet][hidden]{display:none}
.ms-sheet-in{width:100%;max-width:680px;max-height:88vh;overflow-y:auto;background:#FBF8F1;border-radius:20px 20px 0 0;padding:18px 16px calc(16px + env(safe-area-inset-bottom));font-family:'Noto Sans KR',system-ui,sans-serif;color:#1B2B25;box-sizing:border-box}
.ms-sheet h3{margin:0 0 12px;font-size:21px;color:#0B3324}
.ms-row{display:flex;align-items:center;gap:14px;width:100%;min-height:64px;margin:0 0 10px;padding:12px 14px;font:inherit;text-align:left;text-decoration:none;color:#0B3324;background:#fff;border:1px solid #D9D2BA;border-radius:14px;box-sizing:border-box}
.ms-row svg{flex:none;width:28px;height:28px;fill:none;stroke:#0F5B48;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.ms-row b{display:block;font-size:18px} .ms-row small{display:block;font-size:14.5px;color:#5F5D54;line-height:1.5}
.ms-hl{margin:0 0 10px;padding:12px 14px;border-radius:12px;background:#fff;font-size:17px;line-height:1.65}
.ms-big{display:block;width:100%;min-height:56px;margin:4px 0 0;font:inherit;font-size:18px;font-weight:800;line-height:56px;text-align:center;text-decoration:none;color:#fff;background:#0F5B48;border:0;border-radius:14px;box-sizing:border-box}
.ms-big.ghost{color:#0B3324;background:#fff;border:1px solid #D9D2BA;margin-top:12px;line-height:54px}
.ms-trial{margin:12px 0 0;padding:10px 12px;border-radius:12px;background:#F1ECDD;font-size:15px;line-height:1.6;color:#4A473F}
.ms-trial a{color:#0F5B48;font-weight:700}
.ms-title{display:block;width:100%;margin:14px 0 4px;font:inherit;font-size:24px;font-weight:800;line-height:1.4;border:0;border-bottom:2px solid #E4DCC8;background:transparent;padding:10px 2px;color:#0B3324;outline:none;border-radius:0}
.ms-title:focus{border-bottom-color:#0F5B48}
.ms-grp{margin:26px 0 0;scroll-margin-top:76px}   /* 그 자리로 옮겨 갈 때 위 줄(내 책·책으로 보기)에 가리지 않게 */
.ms-pno{display:flex;align-items:center;gap:10px;font-size:14px;color:#7A776C;margin:0 0 6px}
.ms-pno::after{content:'';flex:1;height:1px;background:#E4DCC8}
.ms-tx{font-size:18px!important;line-height:1.8;min-height:1.8em;padding:8px 10px;margin:2px -10px;border-radius:10px;outline:none;word-break:keep-all;overflow-wrap:anywhere;white-space:pre-wrap;color:#1B2B25;font-weight:400;-webkit-user-select:text;user-select:text;scroll-margin:90px 0 140px}
.ms-tx *{color:inherit!important;font-size:inherit!important;background:none!important}
.ms-tx div,.ms-tx p{margin:0}
.ms-tx.h{font-size:22px!important;font-weight:800;color:#0B4536;line-height:1.5}
.ms-tx:focus{background:#fff;box-shadow:0 0 0 2px #0F5B48}
.ms-tx:empty::before{content:attr(data-ph);color:#77736A;white-space:pre-line;pointer-events:none}
.ms-warn{margin:4px 0 0;padding:8px 10px;border-radius:10px;background:#FBEDE9;color:#8E2F24;font-size:15px;line-height:1.6}
.ms-media{margin:10px 0 4px}
.ms-media img,.ms-media video{display:block;width:100%;max-height:70vh;object-fit:contain;border-radius:12px;background:#EFEAE0}
.ms-audio{display:flex;flex-direction:column;gap:8px;padding:14px;border-radius:12px;background:#FBF1EA;font-size:17px;font-weight:700;color:#6B4A2E}
.ms-audio audio{width:100%}
.ms-mrow{display:flex;justify-content:flex-end;margin:4px 0 0}
.ms-small{min-height:44px;font:inherit;font-size:15px;padding:0 14px;border-radius:10px;border:1px solid #D9D2BA;background:#fff;color:#5F5D54}
.ms-slot{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;width:100%;min-height:120px;margin:10px 0 4px;font:inherit;font-size:18px;font-weight:700;color:#0F5B48;border:2px dashed #B8B09A;border-radius:14px;background:#fff}
.ms-slot svg,.ms-tools svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.ms-empty{display:flex;justify-content:flex-end;margin:6px 0 0}
.ms-end{margin:34px 0 0;font-size:15px;line-height:1.7;color:#7A776C;text-align:center}
.ms-tools{position:fixed;left:0;right:0;bottom:0;z-index:40;display:flex;gap:6px;justify-content:center;padding:8px 10px calc(8px + env(safe-area-inset-bottom));background:#fff;border-top:1px solid #E4DCC8;box-shadow:0 -4px 14px rgba(11,51,36,.06)}
.ms-tools button{flex:1;max-width:120px;min-height:58px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font:inherit;font-size:15px;font-weight:700;color:#0B3324;background:#fff;border:1px solid #E4DCC8;border-radius:12px;padding:4px 2px}
.ms-tools .ms-done{background:#0F5B48;border-color:#0F5B48;color:#fff}
.ms-tools .ms-done[hidden]{display:none}
.ms-load{padding:60px 0;text-align:center;font-size:17px;color:#5F5D54}
body.ms .pv{background:#F4F6F4;z-index:60}
body.ms .toast{bottom:calc(92px + env(safe-area-inset-bottom));font-size:16px;line-height:1.5;text-align:center;border-radius:16px}
.ms-ai{display:flex;align-items:center;gap:12px;width:100%;margin:16px 0 0;padding:14px 16px;font:inherit;text-align:left;border:2px solid #0F5B48;border-radius:16px;background:#E8F3EE;color:#0B3324}
.ms-ai[hidden],.ms-tools [hidden]{display:none}
.ms-ai svg{flex:none;width:34px;height:34px;fill:none;stroke:#0F5B48;stroke-width:1.8;stroke-linejoin:round}
.ms-ai b{display:block;font-size:19px;font-weight:800}
.ms-ai span span{display:block;font-size:15px;line-height:1.5;color:#3D5A4F;margin-top:2px}
.ms-tools .ms-aib{color:#0F5B48;border-color:#0F5B48;background:#E8F3EE}
.ms-placed{margin:0 0 8px;padding:12px 14px;border-radius:12px;background:#FFF6DF;border:1px solid #E8C873;font-size:16px;line-height:1.6;color:#5A4300}
.ms-placed .row{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
@media(max-width:360px){.msr{padding:0 12px 120px}.ms-top{margin:0 -12px}.ms-top button{padding:0 10px;font-size:15px}.ms-tools{gap:4px;padding-left:6px;padding-right:6px}.ms-tools button{font-size:13.5px}}
`;
const IC={
  image:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.6"/><path d="M21 15l-5-5L5 21"/></svg>',
  video:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M10 9l5 3-5 3z"/></svg>',
  audio:'<svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
  text:'<svg viewBox="0 0 24 24"><path d="M4 7V5h16v2M12 5v14M9 19h6"/></svg>',
  done:'<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
  mic:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
  stop:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect class="fill" x="7" y="7" width="10" height="10" rx="2"/></svg>',
  more:'<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
  desk:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
  ai:'<svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>'
};
const MIC=!!(window.MoaVoice&&MoaVoice.supported)&&matchMedia('(pointer:coarse)').matches;   // 「말로 하기」를 보일까(폰 · 브라우저에 음성 인식이 있을 때)
let placed=null;   // 방금 AI 창에서 담은 글 {pid(첫 쪽 id), title, rep}
const josa=(w,a,b)=>{ const c=String(w).charCodeAt(String(w).length-1); return (c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28>0)?a:b; };
let root, list, curEnd=-1, warn=new Set(), queued=false, timer=null, composing=false;

// 쪽 묶음: 시작 쪽 + 그 쪽에서 「(이어서)」로 이어진 쪽들(한 이야기의 원고)
function groups(){ const out=[]; state.pages.forEach((p,i)=>{ if(i>0&&flowsInto(i-1)) out[out.length-1].end=i; else out.push({start:i,end:i}); }); return out; }
const groupAt = pi => groups().find(g=>pi>=g.start&&pi<=g.end);
// 묶음의 본문이 여러 쪽에 걸쳐 흐르면 하나로 이어 보여 준다(편집기의 cont 규칙 그대로 이어 붙임)
function mergedFlow(g){ if(g.end===g.start) return null; const f0=flowEl(g.start); if(!f0) return null;
  let html=f0.html||''; for(let k=g.start+1;k<=g.end;k++){ const f=flowEl(k); if(f&&plain(f.html)) html = plain(html) ? mergeHTML(html,f.html,!!f.cont) : f.html; }
  return {el:f0, html}; }
function findEl(id){ for(let i=0;i<state.pages.length;i++){ const e=state.pages[i].els.find(x=>x.id===id); if(e) return {pi:i,e}; } return null; }
const isEmptyPage = p => p.els.every(e=>e.type==='slot'||(e.type==='text'&&!plain(e.html)));
const byPos = (a,b) => (a.y-b.y)||(a.x-b.x);

function txNode(e, html){ const d=document.createElement('div');
  d.className='ms-tx'+(e.fs>=16?' h':''); d.contentEditable='true'; d.spellcheck=false; d.dataset.k=e.id;
  d.setAttribute('role','textbox'); d.setAttribute('aria-multiline','true');
  const ph=e.ph||(e.fs>=16?'제목을 적어 주세요':'여기를 눌러 글을 적어 주세요'); d.dataset.ph=ph; d.setAttribute('aria-label',ph.split('\n')[0]);
  d.innerHTML=sanitizeText(html); if(!d.textContent.trim()) d.innerHTML='';
  d._orig=sanitizeText(d.innerHTML); return d; }
function mediaNode(e){ const w=document.createElement('div'); w.className='ms-media';
  if(e.type==='image') w.innerHTML=`<img src="${esc(e.src||'')}" alt="${esc(e.alt||'')}">`;
  else if(e.type==='video') w.innerHTML=`<video src="${esc(e.src||'')}" controls controlslist="nodownload" playsinline preload="metadata"></video>`;
  else w.innerHTML=`<div class="ms-audio">🎵 노래<audio src="${esc(e.src||'')}" controls controlslist="nodownload" preload="metadata"></audio></div>`;
  w.insertAdjacentHTML('beforeend',`<div class="ms-mrow"><button type="button" class="ms-small" data-del="${esc(e.id)}">${KIND[e.type]} 빼기</button></div>`);
  return w; }
function slotNode(e){ const k=e.kind||'image', b=document.createElement('button'); b.type='button'; b.className='ms-slot'; b.dataset.slot=e.id; b.dataset.kind=k;
  b.innerHTML=`${IC[k]}<span>눌러서 ${KIND[k]} 넣기</span>`; return b; }
function groupNode(g){ const s=document.createElement('section'); s.className='ms-grp'; s.dataset.g=state.pages[g.start].id;
  s.innerHTML=`<div class="ms-pno">${g.start+1}${g.end>g.start?'~'+(g.end+1):''}쪽</div>`;
  if(placed&&state.pages.slice(g.start,g.end+1).some(p=>p.id===placed.pid)) s.insertAdjacentHTML('beforeend',`<div class="ms-placed" role="status">✓ AI와 쓴 「${esc(placed.title)}」${josa(placed.title,'을','를')} ${placed.rep?'바꿔 담았어요':'담았어요'}. 아래 글을 눌러 바로 고치셔도 돼요.
    <div class="row"><button type="button" class="ms-small" data-undo>되돌리기</button><button type="button" class="ms-small" data-aiback>AI와 더 고치기</button></div></div>`);
  const mf=mergedFlow(g); const add=n=>s.appendChild(n);
  const put=(e,html)=>{ if(e.type==='text'){ add(txNode(e,html)); if(warn.has(e.id)) s.insertAdjacentHTML('beforeend','<p class="ms-warn">책 쪽에 자리가 모자라 이 글의 뒷부분이 책에 안 보여요. 글을 줄이거나 컴퓨터 편집기에서 칸을 넓혀 주세요.</p>'); }
    else if(e.type==='slot') add(slotNode(e)); else if(e.type==='image'||e.type==='video'||e.type==='audio') add(mediaNode(e)); };
  for(let k=g.start;k<=g.end;k++){ const f=k>g.start&&mf?flowEl(k):null;
    for(const e of [...state.pages[k].els].sort(byPos)){ if(e===f) continue; put(e, mf&&e===mf.el?mf.html:e.html); } }
  if(g.start===g.end && state.pages.length>1 && isEmptyPage(state.pages[g.start])) s.insertAdjacentHTML('beforeend',`<div class="ms-empty"><button type="button" class="ms-small" data-rm="${esc(state.pages[g.start].id)}">빈 쪽 지우기</button></div>`);
  return s; }

function render(){ queued=false; if(!list) return;
  const a=document.activeElement, keep=a&&list.contains(a)&&a.classList.contains('ms-tx')&&a.closest('.ms-grp');   // 글을 쓰는 중인 묶음은 그대로 둔다(다시 그리면 커서가 사라진다)
  const fresh=groups().map(groupNode);
  if(!keep){ list.replaceChildren(...fresh); }
  else { const i=fresh.findIndex(s=>s.dataset.g===keep.dataset.g);
    [...list.children].forEach(c=>{ if(c!==keep) c.remove(); });
    if(i<0) list.append(...fresh); else { keep.before(...fresh.slice(0,i)); keep.after(...fresh.slice(i+1)); } }
  $('msTitle')!==document.activeElement && ($('msTitle').value=state.title);
  const ai=!!$('aiTile'); $('msAi').hidden=!ai; $('msAiB').hidden=!ai;
  const W=window.AIP&&AIP.week();   // 이번 주 글감을 첫 화면 큰 칸에 바로 보인다(고를 것 없이 「눌러서 시작」)
  if(W) $('msAiSub').textContent=`이번 주 글감 「${W.title}」 · ${W.status==='쓰는 중'?'쓰던 이야기를 이어서 해요.':'묻는 말에 답하면 AI가 글로 정리해 드려요.'}`;   // AI와 쓰기: 편집기에 AI 창이 있을 때만(시험 참여자 · 체험 ?ai=proto)
}
const queue = () => { if(!queued){ queued=true; requestAnimationFrame(render); } };

// 글상자가 글보다 작으면 아래로 키운다(아래 다른 상자·쪽 아래 여백까지). 쪽 아래 여백까지 닿은 본문이면 넘친 글은 다음 쪽으로(settle)
function grow(pi,e){
  const need=measureOff(pi,e,tx=>{ const px=tx.closest('.canvas').getBoundingClientRect().width/PW; return tx.scrollHeight/px+1; });
  let lim=LIM.y1-e.y; for(const o of state.pages[pi].els){ if(o===e||xOverlap(o,e)<=0.5||o.y<e.y+e.h-0.5) continue; lim=Math.min(lim,o.y-e.y-2); }
  if(need>e.h+0.3) e.h=Math.max(e.h,Math.min(need,lim));
  if(e.y+e.h>=LIM.y1-0.05 && flowEl(pi)===e){ warn.delete(e.id); settle(pi); return; }
  if(need>e.h+0.5) warn.add(e.id); else warn.delete(e.id); }
function commit(node){ clearTimeout(timer); if(!node||!node.isConnected) return;
  const loc=findEl(node.dataset.k); if(!loc) return;
  const html=node.textContent.trim()?sanitizeText(node.innerHTML):'';
  if(html===(node._orig||'')) return; node._orig=html;
  const {pi,e}=loc, g=groupAt(pi), mf=g&&mergedFlow(g);
  snap('ms:'+e.id);
  if(mf&&mf.el===e){ e.html=html; for(let k=g.start+1;k<=g.end;k++){ const f=flowEl(k); if(f){ f.html=''; f.cont=false; } } settle(g.start); }
  else { e.html=html; grow(pi,e); }
  renderThumbs(); }

// 넣을 자리: 마지막으로 쓰던 이야기 끝 다음(없으면 책 맨 뒤). 이야기 한가운데(이어진 쪽 사이)에는 끼우지 않는다
function insertAt(){ const g=curEnd>=0&&groupAt(Math.min(curEnd,state.pages.length-1)); return g?g.end+1:state.pages.length; }
function newGroupFocus(id,sel){ render(); const s=list.querySelector(`.ms-grp[data-g="${id}"]`); if(!s) return; s.scrollIntoView({block:'center'}); const t=s.querySelector(sel); t&&t.focus(); }
function addText(){ const i=insertAt(); snap(); const p=blankPage(); p.name='새 글'; state.pages.splice(i,0,p); curEnd=i; renderThumbs(); newGroupFocus(p.id,'.ms-tx'); }
let pendingPage=null;
function addMedia(kind){ const i=insertAt(); snap(); const p=mediaPageTemplate(kind); state.pages.splice(i,0,p); curEnd=i; state.cur=i; renderThumbs();
  newGroupFocus(p.id,'.ms-slot'); pendingPage=p.id; pickMedia(kind, p.els.find(e=>e.type==='slot').id); }
// 파일 고르기를 그냥 닫으면 방금 만든 빈 쪽을 치운다
function dropPending(){ const id=pendingPage; pendingPage=null; const i=state.pages.findIndex(p=>p.id===id);
  if(i>=0 && state.pages.length>1 && isEmptyPage(state.pages[i])){ state.pages.splice(i,1); curEnd=Math.min(curEnd,state.pages.length-1); state.cur=Math.min(state.cur,state.pages.length-1); renderThumbs(); } }
function removeMedia(id){ const loc=findEl(id); if(!loc) return; const {pi,e}=loc;
  if(!confirm(`이 ${KIND[e.type]}을(를) 책에서 뺄까요?`)) return;
  snap(); const sl=e.slot; state.pages[pi].els=state.pages[pi].els.flatMap(x=>x.id!==id?[x]:(sl?[{id:uid(),type:'slot',kind:e.type,x:sl.x,y:sl.y,w:sl.w,h:sl.h}]:[]));
  renderThumbs(); toast(`${KIND[e.type]}을(를) 뺐어요`); }
function removePage(id){ const i=state.pages.findIndex(p=>p.id===id); if(i<0||state.pages.length<2||!isEmptyPage(state.pages[i])) return;
  snap(); relinkRemoved(new Set([id])); state.pages.splice(i,1); if(i>0&&flowsInto(i-1)) settle(i-1);
  state.cur=Math.min(state.cur,state.pages.length-1); renderThumbs(); toast('빈 쪽을 지웠어요'); }

function build(){
  document.head.insertAdjacentHTML('beforeend',`<style id="msCss">${css}</style>`);
  const desk=new URL(location.href); desk.searchParams.delete('ms');
  root=document.createElement('div'); root.className='msr'; root.id='ms';
  const oc=window.MOA_OPENCHAT_URL||'';
  root.innerHTML=`<header class="ms-top"><button type="button" id="msBack" aria-label="내 서재로">‹ 내 책</button><span class="ms-save" id="msSave" role="status"></span><button type="button" id="msHelp" aria-label="막힐 때 도움">도움</button><button type="button" class="ms-pvbtn" id="msPv">책으로 보기</button></header>
  <p class="ms-tip" id="msTip"${tipSeen()?' hidden':''}>${IC.mic} <b>말로 쓰셔도 돼요.</b> ${MIC?'글칸을 누르면 나오는 <b>「'+IC.mic+'말로 하기」</b>를 누르고 말씀하시면 글자로 적혀요.':'글칸을 누른 뒤 키보드의 <b>마이크 단추</b>를 누르고 말씀하시면 글자로 적혀요.'} <button type="button" class="ms-small" id="msTipX">알겠어요</button></p>
  <input class="ms-title" id="msTitle" aria-label="책 제목" maxlength="60" placeholder="책 제목" spellcheck="false">
  <button type="button" class="ms-ai" id="msAi" hidden>${IC.ai}<span><b>AI와 이야기하며 쓰기</b><span id="msAiSub">묻는 말에 답하면 AI가 글로 정리해 드려요. 다 되면 「모아에 담기」를 눌러 책에 넣어요.</span></span></button>
  <div id="msList"><p class="ms-load">불러오는 중…</p></div>
  <p class="ms-end">아래 단추로 사진이나 새 글을 더할 수 있어요. 영상·노래는 「더 보기」에 있어요.<br>방금 쓰던 이야기 다음에 들어가요.</p>
  <nav class="ms-tools" id="msTools" aria-label="넣기">
    <button type="button" class="ms-mic" id="msMic" hidden aria-pressed="false">${IC.mic}말로 하기</button>
    <button type="button" class="ms-done" id="msDone" hidden>${IC.done}다 썼어요</button>
    <button type="button" class="ms-aib" id="msAiB" data-ai hidden>${IC.ai}AI와 쓰기</button>
    <button type="button" data-add="image">${IC.image}사진</button><button type="button" data-add="text">${IC.text}새 글</button><button type="button" data-more>${IC.more}더 보기</button>
  </nav>
  <div class="ms-sheet" id="msSheet" hidden><div class="ms-sheet-in" role="dialog" aria-modal="true" aria-labelledby="msSheetT">
    <div data-sheet="more"><h3 id="msSheetT">더 넣기</h3>
      <button type="button" class="ms-row" data-add="video">${IC.video}<span><b>영상 넣기</b><small>휴대폰에 있는 영상을 골라요</small></span></button>
      <button type="button" class="ms-row" data-add="audio">${IC.audio}<span><b>노래·목소리 넣기</b><small>녹음해 둔 소리를 골라요</small></span></button>
      <a class="ms-row" href="${esc(desk.pathname+desk.search)}" id="msDesk">${IC.desk}<span><b>컴퓨터 화면으로 보기</b><small>쪽 모양을 손으로 짜는 화면이에요. 컴퓨터에서 쓰기 좋아요</small></span></a></div>
    <div data-sheet="help"><h3>막히면 이렇게 하세요</h3>
      <p class="ms-hl">${IC.mic} <b>글자 치기가 어려우면</b> ${MIC?'글칸을 누르면 나오는 「말로 하기」를 누르고 말씀하세요. 다 말씀하시면 「그만 말하기」를 눌러요. 말씀은 휴대폰의 음성 인식(구글·애플)이 글자로 바꾸고, 모아는 목소리를 저장하지 않아요.':'글칸을 누른 뒤 키보드의 마이크 단추를 누르고 말씀하세요.'}</p>
      <p class="ms-hl">✓ <b>저장은 저절로 돼요.</b> 위에 「저장됨」이 보이면 그대로 닫으셔도 괜찮아요.</p>
      <p class="ms-hl">💬 <b>그래도 막히면</b> 카카오톡 오픈채팅방에 물어보세요. 강사가 답해 드려요.</p>
      ${oc?`<a class="ms-big" href="${esc(oc)}" target="_blank" rel="noopener">오픈채팅방 열기</a>`:'<p class="ms-hl" style="background:none;padding:0 2px">오픈채팅방은 첫 수업에서 알려 드려요.</p>'}</div>
    <button type="button" class="ms-big ghost" data-sheetx>닫기</button>
  </div></div>`;
  document.body.appendChild(root); list=$('msList');
}
// 「말로 쓰기」 안내는 한 번 「알겠어요」를 누르면 이 기기에서는 다시 안 보인다(저장이 막힌 브라우저면 매번 보임)
function tipSeen(){ try{ return localStorage.getItem('moa-ms-tip')==='1'; }catch(e){ return false; } }
// 「말로 하기」(lib/voice.js): 원고 글칸을 쓰는 동안 아래 줄 위에 뜬다. 한 마디가 끝날 때마다 커서 자리에 글이 들어간다(AI 비용 0원)
function micState(st){ const b=$('msMic'), live=st==='on'; if(b){ b.classList.toggle('on',live); b.setAttribute('aria-pressed',String(live)); b.innerHTML=live?IC.stop+'그만 말하기':IC.mic+'말로 하기'; }
  if(st==='denied') toast(window.isSecureContext?'마이크를 쓸 수 없어요. 휴대폰에 「허용」을 눌러 주세요':'이 주소에서는 마이크를 쓸 수 없어요(보안 주소 https에서만 돼요)');
  if(st==='error') toast('말을 글자로 바꾸지 못했어요. 인터넷 연결을 확인해 주세요'); }
function toggleMic(){ if(MoaVoice.active()){ MoaVoice.stop(); return; }
  const a=document.activeElement; if(!a||!a.classList.contains('ms-tx')){ toast('먼저 글칸을 눌러 주세요'); return; }
  let seen=false; try{ seen=localStorage.getItem('moa-mic-note')==='1'; localStorage.setItem('moa-mic-note','1'); }catch(e){}
  if(!seen) toast('말씀은 휴대폰의 음성 인식(구글·애플)이 글자로 바꿔요. 모아는 목소리를 저장하지 않아요');
  MoaVoice.start(a,micState); }
function openSheet(k){ const sh=$('msSheet'); sh.querySelectorAll('[data-sheet]').forEach(d=>d.hidden=d.dataset.sheet!==k); sh.hidden=false; sh.querySelector('button,a')?.focus(); }
const closeSheet=()=>{ $('msSheet').hidden=true; };
function doAdd(kind){ const a=document.activeElement; if(a&&a.classList.contains('ms-tx')){ commit(a); a.blur(); }
  placed=null; kind==='text' ? addText() : addMedia(kind); }
function wire(){
  $('msBack').onclick=()=>{ document.activeElement?.blur(); $('back').click(); };
  $('msPv').onclick=()=>{ document.activeElement?.blur(); openPV(); };
  $('msTitle').addEventListener('input',()=>{ state.title=$('msTitle').value; $('title').value=state.title; });
  $('msDone').onclick=()=>document.activeElement?.blur();
  // 쓰는 중에 아래 단추를 눌러도 먼저 글칸이 닫히며 단추 줄이 움직이지 않게(움직이면 누른 단추가 안 눌린다) — 닫는 일은 눌린 뒤에
  $('msTools').addEventListener('mousedown',ev=>{ if(ev.target.closest('button')) ev.preventDefault(); });
  $('msTools').addEventListener('click',ev=>{ if(ev.target.closest('#msMic')) return toggleMic();
    if(window.MoaVoice&&MoaVoice.active()) MoaVoice.stop();
    if(ev.target.closest('[data-ai]')) return openAI();
    if(ev.target.closest('[data-more]')){ const a=document.activeElement; if(a&&a.classList.contains('ms-tx')){ commit(a); a.blur(); } return openSheet('more'); }
    const b=ev.target.closest('[data-add]'); if(b) doAdd(b.dataset.add); });
  // 아래에서 올라오는 판(더 보기 · 도움): 바깥이나 「닫기」를 누르면 닫힌다
  $('msSheet').addEventListener('click',ev=>{ if(ev.target.id==='msSheet'||ev.target.closest('[data-sheetx]')) return closeSheet();
    const b=ev.target.closest('[data-add]'); if(b){ closeSheet(); doAdd(b.dataset.add); } });
  $('msSheet').addEventListener('keydown',ev=>{ if(ev.key==='Escape') closeSheet(); });
  $('msHelp').onclick=()=>{ document.activeElement?.blur(); openSheet('help'); };
  $('msTipX').onclick=()=>{ $('msTip').hidden=true; try{ localStorage.setItem('moa-ms-tip','1'); }catch(e){} };
  $('msAi').onclick=openAI;
  list.addEventListener('click',ev=>{ const s=ev.target.closest('[data-slot]'); if(s){ curEnd=findEl(s.dataset.slot)?.pi??curEnd; pickMedia(s.dataset.kind,s.dataset.slot); return; }
    const d=ev.target.closest('[data-del]'); if(d) return removeMedia(d.dataset.del);
    const r=ev.target.closest('[data-rm]'); if(r) return removePage(r.dataset.rm);
    if(ev.target.closest('[data-undo]')){ placed=null; undo(); return; }   // 담기 전으로(편집기 되돌리기 한 번 — AI 창도 「담을 자리 고르기」로 돌아간다)
    if(ev.target.closest('[data-aiback]')) return openAI(); });
  list.addEventListener('focusin',ev=>{ const t=ev.target.closest('.ms-tx'); if(!t) return; placed=null; const loc=findEl(t.dataset.k); if(loc){ curEnd=loc.pi; state.cur=loc.pi; } $('msDone').hidden=false; $('msMic').hidden=!MIC; });
  list.addEventListener('focusout',ev=>{ const t=ev.target.closest('.ms-tx'); if(!t) return; if(MIC&&MoaVoice.active()) MoaVoice.stop(); commit(t); $('msDone').hidden=true; $('msMic').hidden=true; queue(); });
  list.addEventListener('input',ev=>{ const t=ev.target.closest('.ms-tx'); if(!t) return; clearTimeout(timer); if(!composing) timer=setTimeout(()=>commit(t),800); });
  list.addEventListener('compositionstart',()=>{ composing=true; clearTimeout(timer); });
  list.addEventListener('compositionend',ev=>{ composing=false; const t=ev.target.closest&&ev.target.closest('.ms-tx'); if(t){ clearTimeout(timer); timer=setTimeout(()=>commit(t),800); } });
  // 붙여 넣는 글은 글자만(다른 곳의 글꼴·색·그림은 넣지 않는다), 줄바꿈 \r\n → \n
  list.addEventListener('paste',ev=>{ if(!ev.target.closest('.ms-tx')) return; ev.preventDefault(); const t=(ev.clipboardData?.getData('text/plain')||'').replace(/\r\n?/g,'\n'); document.execCommand('insertText',false,t); });
  list.addEventListener('drop',ev=>{ if(ev.target.closest('.ms-tx')) ev.preventDefault(); });
  list.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&ev.target.closest('.ms-tx')) ev.target.blur(); });
  $('file').addEventListener('cancel',()=>{ if(pendingPage) dropPending(); });
  $('file').addEventListener('change',()=>{ pendingPage=null; });
  // 저장 상태는 편집기의 표시를 그대로 옮겨 보여 준다
  const SHORT={fresh:'쓰면 저장돼요',saving:'저장 중…',ok:'✓ 저장됨',err:'⚠ 저장 실패',conflict:'⚠ 저장 멈춤',auth:'⚠ 다시 로그인',perm:'⚠ 저장 권한 없음',load:'불러오는 중…'};   // 폰 위 줄은 좁아 짧게, 누르면 원래 안내 전체
  const mirror=()=>{ const s=$('save'), k=s.dataset.state||''; $('msSave').textContent=SHORT[k]||s.textContent||(ONLINE?'':'체험 중 · 이 기기에만 남아요'); $('msSave').dataset.state=k; $('msSave').title=s.textContent; };
  $('msSave').onclick=()=>{ const t=$('save').textContent; if(t) toast(t); };
  new MutationObserver(mirror).observe($('save'),{childList:true,characterData:true,subtree:true,attributes:true}); mirror();
  // 키보드가 올라오면 아래 도구 줄을 키보드 바로 위로
  // 키보드가 올라와 있으면 body.kb: AI 창은 답 칸 · 말로 하기 · 보내기만 남기고 접는다(보내기가 키보드에 가리지 않게, ai-proto.js CSS)
  //  키보드는 직접 알 수 없어서, 글칸에 커서가 있고 보이는 높이가 가장 컸을 때의 80% 아래로 줄면 올라온 것으로 본다
  const vv=window.visualViewport; if(vv){ let maxH=vv.height;
    const editing=()=>{ const a=document.activeElement; return !!a&&(a.tagName==='TEXTAREA'||(a.tagName==='INPUT'&&a.type==='text')||a.isContentEditable); };
    const place=()=>{ const off=Math.max(0,innerHeight-vv.height-vv.offsetTop); $('msTools').style.transform=off>1?`translateY(${-off}px)`:'';
      const p=$('aiPanel'); if(p) Object.assign(p.style,off>1||vv.offsetTop>0?{top:vv.offsetTop+'px',height:vv.height+'px',bottom:'auto'}:{top:'',height:'',bottom:''});   // AI 창도 키보드 위까지만(입력칸이 가려지지 않게)
      if(!editing()) maxH=Math.max(maxH,vv.height);
      const kb=editing()&&vv.height<maxH*0.8;
      if(kb!==document.body.classList.contains('kb')){ document.body.classList.toggle('kb',kb); const bd=$('aiBody'); if(bd) bd.scrollTop=bd.scrollHeight; } };
    vv.addEventListener('resize',place); vv.addEventListener('scroll',place);
    document.addEventListener('focusin',()=>setTimeout(place,60)); document.addEventListener('focusout',()=>setTimeout(place,120));
    window.addEventListener('orientationchange',()=>setTimeout(()=>{ maxH=vv.height; place(); },400)); }
  // 편집기가 쪽 목록을 다시 그릴 때(사진 넣기 끝·저장 불러오기·되돌리기 등) 원고 화면도 따라 그린다
  const rt=renderThumbs; renderThumbs=function(){ rt.apply(this,arguments); queue(); };
}
// AI와 쓰기: 편집기의 AI 창(ai-proto.js)을 폰 화면 전체로 연다. 처음이면 편집기와 같은 동의 화면부터
function openAI(){ const a=document.activeElement; if(a&&a.classList.contains('ms-tx')){ commit(a); a.blur(); } const t=$('aiTile'); t&&t.click(); }
// AI 창에서 「모아에 담기」·「바꿔 담기」를 누르면: 창을 닫고 원고 화면에서 담긴 글을 보여 준다
function onPlaced(pid,title,rep){ placed={pid,title,rep}; const x=$('aiClose'); x&&x.click(); render();
  const i=state.pages.findIndex(p=>p.id===pid), g=i>=0&&groupAt(i), s=g&&list.querySelector(`.ms-grp[data-g="${state.pages[g.start].id}"]`);
  s&&s.scrollIntoView({block:'start'}); }
window.MS={ onPlaced, help:()=>openSheet('help'), start(){
  if(!root){ build(); wire(); }
  if($('center').querySelector('.fatal')){ document.body.classList.remove('ms'); root.hidden=true; return; }   // 열 수 없는 책·로그인 필요 안내는 편집기 화면 그대로
  endEdit(); state.zoom=1; render();
  document.addEventListener('moa-ai-ready',queue);   // AI 창은 회원 정보를 읽은 뒤에 붙는다 → 붙으면 「AI와 쓰기」를 보인다
} };
})();
