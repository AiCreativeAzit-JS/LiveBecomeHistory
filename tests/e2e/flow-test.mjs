// 글 흐름 엔진 시험: 수정요청서 1차(2026-10-16) F01~F04 · 점검표 T01~T06
// 재현 원고 docs/qa/모아_재현용_16문단.txt 를 /studio/?blank=1 의 2쪽 본문에 붙여 넣고 시작한다(요청서 S01)
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import((p=>/^[A-Za-z]:/.test(p)?'file:///'+p.replace(/\\/g,'/'):p)(R+'/playwright/index.mjs'));
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=process.env.MOA_ROOT||'/home/user/LiveBecomeHistory';
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':'text/html'});res.end(d);} }); }).listen(8771);
const b=await chromium.launch({executablePath:process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:1440,height:1000}});
await ctx.addInitScript(()=>{ try{ indexedDB.deleteDatabase('moa-demo'); }catch{} }); // 매번 새 기기처럼(체험 원고 「이어 쓰기」 창이 끼지 않게)
const TXT=fs.readFileSync(ROOT+'/docs/qa/모아_재현용_16문단.txt','utf8');
const ok=(n,c,info='')=>console.log((c?'PASS ':'FAIL ')+n+(info&&!c?'  ← '+info:''));
const errs=[];
let pg;
const st=(js,a)=>pg.evaluate(js,a);
const settle=async()=>{ let last=''; for(let i=0;i<40;i++){ await pg.waitForTimeout(120); const s=await st(()=>serialize()); if(s===last) return; last=s; } };
// 원고 한 벌: 2쪽부터 이어진 쪽들의 본문을 cont 표시대로 합친 것 → {chars: 글자(\n 포함), lines: 화면 줄 기준 문단들}
const doc=()=>st(()=>{ const d=document.createElement('div'); let i=1; d.innerHTML=flowEl(i).html;
  while(flowsInto(i)){ i++; joinFlow(d,flowEl(i).html,!!flowEl(i).cont); }
  return {chars:d.textContent, flat:flat(d), pages:i, total:state.pages.length}; });
const paras=f=>f.split('\n').filter(s=>s.trim());
const lines=f=>f.split('\n').length; // 줄바꿈 수(빈 줄 포함)
const caretInfo=()=>st(()=>({cur:state.cur, editing:state.editing, off:caretOffset(activeTx()), sel:state.sel}));
// i쪽 본문에서 "[문단 NN] … 합니다." 한 문단의 글자 범위를 고른다(줄바꿈은 남긴다)
const selectPara=(no)=>st(no=>{ const tx=activeTx(), pos=textPositions(tx), t=pos.map(([n,k])=>n.data[k]).join('');
  const a=t.indexOf(`[문단 ${no}]`); if(a<0) return -1; const E='남아 있어야 합니다.', z=t.indexOf(E,a)+E.length; if(z<E.length) return -1; const r=document.createRange(); r.setStart(pos[a][0],pos[a][1]); r.setEnd(pos[z-1][0],pos[z-1][1]+1);
  const s=getSelection(); s.removeAllRanges(); s.addRange(r); return a; },no);
async function fresh(){
  if(pg) await pg.close();
  pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('dialog',d=>d.accept().catch(()=>{}));
  await pg.route(/fonts\.|supabase-js|jsdelivr|unpkg/,r=>r.abort());
  await pg.goto('http://localhost:8771/studio/?blank=1'); await pg.waitForSelector('#canvas .pg');
}
async function openBody(i, where='start'){
  await pg.locator('.th').nth(i).click(); await pg.waitForTimeout(80);
  const id=await st(i=>flowEl(i).id,i); const bb=await pg.locator(`#canvas .el[data-id="${id}"]`).boundingBox();
  await pg.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await pg.waitForTimeout(60);
  await pg.keyboard.press(where==='start'?'Control+Home':'Control+End'); await pg.waitForTimeout(60);
}
async function pasteDoc(){ // S01: 2쪽 「첫 번째 이야기」 본문에 16문단 붙여넣기
  await openBody(1);
  await st(t=>{ const dt=new DataTransfer(); dt.setData('text/plain',t); document.activeElement.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true})); },TXT);
  await settle();
}
const want=paras(TXT.replace(/\r/g,''));

// ── S01 ──
await fresh(); const pages0=await st(()=>state.pages.length); const hist0=await st(()=>history.length);
await pasteDoc(); const D0=await doc();
console.log('  붙여넣기 뒤: 책',D0.total,'쪽 · 본문',D0.pages-0,'쪽(2쪽부터)');
ok('S01 긴 글이 3쪽 이상 자동으로 이어짐', D0.pages>=4, JSON.stringify(D0.pages));
ok('S01 붙여넣은 16문단이 그대로(문단 수·순서·글자)', JSON.stringify(paras(D0.flat))===JSON.stringify(want), paras(D0.flat).length+'문단');
ok('S01 붙여넣기 = 되돌리기 기록 1개', (await st(()=>history.length))===hist0+1);
// 진단용 원고는 문단 길이가 같아 쪽이 문단 사이에서 나뉜다 → 맨 앞에 빈 줄을 하나 넣어 한 줄씩 밀면 문단 한가운데서 나뉜다
{ const nCont=()=>st(()=>{ let n=0; for(let i=1;flowsInto(i);i++) if(flowEl(i+1).cont) n++; return n; }); let k=0;
  for(; k<4 && !(await nCont()); k++){ await openBody(1); await pg.keyboard.press('Control+Home'); await pg.keyboard.press('Enter'); await settle(); await pg.keyboard.press('Escape'); await settle(); }
  const D1=await doc();
  ok('S01 문단 한가운데서 나뉜 쪽에 cont 표시', (await nCont())>0, `빈 줄 ${k}개`);
  ok('S01 한 줄씩 밀려도 16문단 그대로', JSON.stringify(paras(D1.flat))===JSON.stringify(want)); }

// ── T01 / F01: 첫쪽·중간쪽 문단 삭제 3회, 커서 유지 ──
for(const [label,pi] of [['첫 본문쪽',1],['중간쪽',2]]){
  await fresh(); await pasteDoc(); await openBody(pi);
  const nos=await st(()=>{ const r=document.createRange(); r.selectNodeContents(activeTx()); return flat(r.cloneContents()).split('\n').map(l=>(l.match(/^\[문단 (\d\d)\] .*남아 있어야 합니다\.$/)||[])[1]).filter(Boolean); }); // 이 쪽에 통째로 있는 문단만
  const picks=[nos[0],nos[2]??nos[1],nos[1]].filter(Boolean).slice(0,3);
  let good=true, info='';
  for(const no of picks){
    const a=await selectPara(no); if(a<0){ good=false; info+=`[${no}] 없음 `; continue; }
    const before=(await doc()).chars;
    await pg.keyboard.press('Backspace'); await settle();
    const c=await caretInfo(), after=(await doc()).chars;
    const removed=before.length-after.length;
    if(!(c.editing && c.cur===pi && c.off===a && removed>40)){ good=false; info+=`[${no}] 커서 ${JSON.stringify(c)} 기대 off=${a} `; }
  }
  ok(`T01 ${label}: 문단 3개를 잇달아 지워도 커서가 지운 자리에`, good, info);
  // 이어지는 입력·Backspace·Delete가 그 자리에서
  const c0=await caretInfo(); const d1=(await doc()).chars; const tx0=await st(()=>activeTx().textContent);
  await pg.keyboard.type('가'); await settle();
  const tx1=await st(()=>activeTx().textContent);
  ok(`T01 ${label}: 이어서 친 글자가 그 자리에`, tx1.slice(0,c0.off)+'가'+tx1.slice(c0.off+1)===tx1 && tx1[c0.off]==='가' && tx1.slice(0,c0.off)===tx0.slice(0,c0.off));
  await pg.keyboard.press('Backspace'); await settle();
  ok(`T01 ${label}: 이어서 누른 Backspace가 그 자리 글자를 지움`, (await doc()).chars===d1 && (await caretInfo()).off===c0.off);
  const D1=await doc(); await pg.keyboard.press('Backspace'); await settle();
  const D2=await doc(), c2=await caretInfo(), nl=f=>(f.match(/\n/g)||[]).length;
  ok(`T01 ${label}: 한 번 더 Backspace → 바로 앞 글자 또는 줄바꿈 하나만 지움`, (D2.chars.length===D1.chars.length-1 && c2.off===c0.off-1) || (D2.chars===D1.chars && nl(D2.flat)===nl(D1.flat)-1 && c2.off===c0.off), `${D1.chars.length}→${D2.chars.length} off ${c0.off}→${c2.off}`);
  ok(`T01 ${label}: 지운 뒤 남은 문단은 갈라지지 않음`, paras(D2.flat).every(l=>/^\[문단 \d\d\] .*합니다\.$/.test(l)));
}

// ── T02 / F02: 앞쪽 끝에서 Delete ──
await fresh(); await pasteDoc(); await openBody(1,'end');
{ const D=await doc(); const G=await st(()=>activeTx().textContent.length); const contNext=await st(()=>!!flowEl(2).cont);
  const keep=await st(()=>JSON.stringify(state.pages.map(p=>p.els.filter(e=>e!==flowEl(state.pages.indexOf(p))).map(e=>e.html||e.src||e.kind))));
  await pg.keyboard.press('Delete'); await settle();
  const A=await doc(), c=await caretInfo();
  const expect = contNext ? D.chars.slice(0,G)+D.chars.slice(G+1) : D.chars;
  console.log('  경계 종류:',contNext?'문단 중간(글자 하나)':'문단 경계(줄 합치기)');
  ok('T02 앞쪽 끝 Delete → 다음 쪽 첫 글자(또는 문단 경계의 줄바꿈 하나)를 지움', A.chars===expect && (contNext || lines(A.flat)===lines(D.flat)-1), `len ${D.chars.length}→${A.chars.length} · 줄 ${lines(D.flat)}→${lines(A.flat)}`);
  ok('T02 커서는 그 자리(앞쪽 끝 원고 위치)에 남음', c.editing && c.cur===1 && c.off===G, JSON.stringify(c)+' G='+G);
  ok('T02 제목·사진 자리·다른 글상자는 그대로', await st(()=>JSON.stringify(state.pages.map(p=>p.els.filter(e=>e!==flowEl(state.pages.indexOf(p))).map(e=>e.html||e.src||e.kind)))) === keep);
  // 연달아 Delete 3번(문단 경계도 지남)
  for(let k=0;k<3;k++){ await pg.keyboard.press('Delete'); await settle(); }
  const A3=await doc(); ok('T02 연달아 Delete도 한 번에 하나씩(글자 또는 줄바꿈, 막히지 않음)', (A.chars.length-A3.chars.length)+(lines(A.flat)-lines(A3.flat))===3, `글자 ${A.chars.length}→${A3.chars.length} · 줄 ${lines(A.flat)}→${lines(A3.flat)}`);
}

// ── T03 / F02: 뒤쪽 맨 앞에서 Backspace + 대조(한 글자 뒤에서 Backspace) ──
await fresh(); await pasteDoc();
{ await openBody(2,'start'); const D=await doc();
  const G=await st(()=>{ const t=document.createElement('div'); t.innerHTML=flowEl(1).html; return t.textContent.length; });
  const contMe=await st(()=>!!flowEl(2).cont);
  await pg.keyboard.press('Backspace'); await settle();
  const A=await doc(), c=await caretInfo();
  const expect = contMe ? D.chars.slice(0,G-1)+D.chars.slice(G) : D.chars;
  console.log('  경계 종류:',contMe?'문단 중간(글자 하나)':'문단 경계(줄 합치기)');
  ok('T03 뒤쪽 맨 앞 Backspace → 앞쪽 마지막 글자(또는 문단 경계의 줄바꿈 하나)를 지움', A.chars===expect && (contMe || lines(A.flat)===lines(D.flat)-1), `줄 ${lines(D.flat)}→${lines(A.flat)}`);
  const pos=await st(()=>{ let off=caretOffset(activeTx()); for(let i=1;i<state.cur;i++){ const t=document.createElement('div'); t.innerHTML=flowEl(i).html; off+=t.textContent.length; } return off; });
  ok('T03 커서는 원고에서 지운 자리', c.editing && pos===(contMe?G-1:G), JSON.stringify(c)+' pos='+pos+' G='+G);
  for(let k=0;k<3;k++){ await pg.keyboard.press('Backspace'); await settle(); }
  const A3=await doc(); ok('T03 연달아 Backspace도 한 번에 하나씩(글자 또는 줄바꿈, 막히지 않음)', (A.chars.length-A3.chars.length)+(lines(A.flat)-lines(A3.flat))===3, `글자 ${A.chars.length}→${A3.chars.length} · 줄 ${lines(A.flat)}→${lines(A3.flat)}`);
}
await fresh(); await pasteDoc();
{ await openBody(2,'start'); await pg.keyboard.press('ArrowRight'); const D=await doc();
  const G=await st(()=>{ const t=document.createElement('div'); t.innerHTML=flowEl(1).html; return t.textContent.length; });
  await pg.keyboard.press('Backspace'); await settle(); const A=await doc();
  ok('T03 대조: 한 글자 뒤에서 Backspace는 평소처럼 그 글자만', A.chars===D.chars.slice(0,G)+D.chars.slice(G+1));
}

// ── T02·T03 / F02: 문단 경계에서 나뉜 쪽(cont 아님) → 두 문단을 합친다 ──
const twoPages=()=>st(()=>{ const p=state.pages[1]; flowEl(1).html='<div>앞쪽 마지막 문단입니다.</div>'; flowEl(1).cont=false;
  const np=blankPage(); np.name=p.name+' (이어서)'; np.flowFrom=p.id; np.els[0].html='<div>뒤쪽 첫 문단입니다.</div><div>둘째 문단.</div>'; state.pages.splice(2,0,np);
  state.sel=null; state.editing=false; renderAll(); return state.pages[1].els[0].html; });
for(const [label,key,pi,where] of [['T02 문단 경계 앞쪽 끝 Delete','Delete',1,'end'],['T03 문단 경계 뒤쪽 맨 앞 Backspace','Backspace',2,'start']]){
  await fresh(); const n0=await st(()=>state.pages.length); const title=await twoPages();
  await openBody(pi,where); await pg.keyboard.press(key); await settle();
  const r=await st(()=>{ const r=document.createRange(); const d=document.createElement('div'); d.innerHTML=flowEl(1).html; r.selectNodeContents(d); return flat(r.cloneContents()); });
  const c=await caretInfo();
  ok(`${label} → 두 문단이 한 문단으로, 빈 쪽은 정리`, r==='앞쪽 마지막 문단입니다.뒤쪽 첫 문단입니다.\n둘째 문단.' && (await st(()=>state.pages.length))===n0, JSON.stringify(r));
  ok(`${label} → 커서는 합친 자리`, c.editing && c.cur===1 && c.off==='앞쪽 마지막 문단입니다.'.length, JSON.stringify(c));
  ok(`${label} → 같은 쪽 제목 글상자는 그대로`, (await st(()=>state.pages[1].els[0].html))===title);
}
// T10 일부: 제목 글상자 맨 앞 Backspace는 본문 흐름을 건드리지 않음
await fresh(); await pasteDoc();
{ await pg.locator('.th').nth(2).click(); await st(()=>{ const p=state.pages[2]; p.els.unshift(T(MX,MT,CW,12,'중간 제목',{fs:18})); renderAll(); });
  ok('T10 이어진 쪽에 제목을 더해도 본문 글상자를 흐름 상자로 앎', await st(()=>flowEl(2)===state.pages[2].els[1]));
  const D=await doc(); await st(()=>{ const id=state.pages[2].els[0].id; select(id); startEdit(id); placeCaretAt(activeTx(),0); }); ok('T10 (제목 글상자 맨 앞에서 시작)', (await caretInfo()).off===0 && (await st(()=>state.sel===state.pages[2].els[0].id))); await pg.keyboard.press('Backspace'); await settle();
  ok('T10 이어진 쪽의 다른 글상자(제목) 맨 앞 Backspace → 본문·앞쪽 그대로', (await doc()).chars===D.chars && (await st(()=>plain(state.pages[2].els[0].html)))==='중간 제목');
}

// ── T04 / F03: 자동 분할과 되당김 3회 → 문단·줄바꿈·공백이 늘지 않음 ──
await fresh(); await pasteDoc();
{ const D=await doc(); let good=true, info='';
  const extra='덧붙인 시험 문장으로 앞쪽을 넘치게 합니다. '.repeat(14);
  for(let k=0;k<3;k++){
    await openBody(1,'start');
    await pg.keyboard.insertText(extra); await settle();
    const mid=await doc(); if(!mid.chars.startsWith(extra)){ good=false; info+=`${k}:넣기 `; }
    await openBody(1,'start');
    await st(n=>{ const tx=activeTx(), pos=textPositions(tx), r=document.createRange(); r.setStart(pos[0][0],pos[0][1]); r.setEnd(pos[n-1][0],pos[n-1][1]+1); const s=getSelection(); s.removeAllRanges(); s.addRange(r); },extra.length);
    await pg.keyboard.press('Backspace'); await settle();
    const A=await doc(); if(A.chars!==D.chars||A.flat!==D.flat){ good=false; info+=`${k}:글자 ${D.chars.length}→${A.chars.length} `; }
    if(A.total!==D.total){ good=false; info+=`${k}:쪽 ${D.total}→${A.total} `; }
  }
  ok('T04 분할·되당김 3회 뒤 원고(글자·문단·줄바꿈·공백)가 처음과 같음', good, info);
  ok('T04 「남아 있어야 / 합니다.」처럼 갈라진 문단 없음', paras((await doc()).flat).every(l=>/^\[문단 \d\d\] .*합니다\.$/.test(l)));
  ok('T04 빈 자동 쪽이 남지 않음', await st(()=>{ for(let i=1;flowsInto(i);i++) if(!plain(flowEl(i+1).html)) return false; return true; }));
}
// F01 화면 그대로: [문단 01]·[문단 03] 삭제 뒤 「남아 있어야」「합니다.」가 다른 줄로 갈라지지 않음
await fresh(); await pasteDoc(); await openBody(1);
for(const no of ['01','03']){ await selectPara(no); await pg.keyboard.press('Backspace'); await settle(); }
ok('T04 F01 재현 순서 뒤에도 문단 04 한 줄 유지(<div>남아 있어야 </div><div>합니다.</div> 없음)', paras((await doc()).flat).filter(l=>l.startsWith('[문단')).every(l=>l.endsWith('합니다.')) && !(await st(()=>state.pages.some(p=>p.els.some(e=>/남아 있어야\s*<\/div>\s*<div>\s*합니다/.test(e.html||''))))));

// ── T05 / F04: 붙여넣기 → Ctrl+Z 1번 / Ctrl+Y 1번 ──
await fresh();
{ await openBody(1); const before=await st(()=>serialize()); const c0=await caretInfo();
  await st(t=>{ const dt=new DataTransfer(); dt.setData('text/plain',t); document.activeElement.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true})); },TXT); await settle();
  const after=await st(()=>serialize()); const cA=await caretInfo();
  await pg.keyboard.press('Control+z'); await settle();
  const u=await st(()=>serialize()), cu=await caretInfo();
  ok('T05 Ctrl+Z 1번 → 글·쪽 모두 붙여넣기 전으로', u===before && (await st(()=>state.pages.length))===pages0, (await st(()=>state.pages.length))+'쪽');
  ok('T05 되돌린 뒤 커서도 붙여넣던 자리(편집 계속)', cu.editing && cu.cur===c0.cur && cu.sel===c0.sel && cu.off===c0.off, JSON.stringify(cu));
  await pg.keyboard.press('Control+y'); await settle();
  const r=await st(()=>serialize()), cr=await caretInfo();
  ok('T05 Ctrl+Y 1번 → 같은 원고·문단·쪽 구성으로 복구', r===after);
  ok('T05 다시 하기 뒤 커서도 붙여넣기 끝', cr.editing && cr.cur===cA.cur && cr.off===cA.off, JSON.stringify(cr)+' 기대 '+JSON.stringify(cA));
  // ── T06: 툴바 되돌리기·다시 하기도 같은 기록 ──
  await pg.click('#uUndo'); await settle(); const tu=await st(()=>serialize());
  await pg.click('#uRedo'); await settle(); const tr=await st(()=>serialize());
  ok('T06 툴바 되돌리기 = Ctrl+Z 결과', tu===u);
  ok('T06 툴바 다시 하기 = Ctrl+Y 결과', tr===r);
  // 한글 자판 상태(키 이름이 ㅋ)에서도 Ctrl+Z
  await openBody(2); await st(()=>{ const e=new KeyboardEvent('keydown',{key:'ㅋ',code:'KeyZ',ctrlKey:true,bubbles:true,cancelable:true}); document.activeElement.dispatchEvent(e); }); await settle();
  ok('T06 한글 입력 상태에서도 Ctrl+Z가 같은 기록을 씀', (await st(()=>serialize()))===u);
}
// 글자 입력은 잠깐 멈출 때까지 한 번에 되돌린다(한 글자씩 수십 번 누르지 않게)
await fresh(); await openBody(1);
{ const h0=await st(()=>history.length); await pg.keyboard.type('할머니의 빨간 대문'); await pg.waitForTimeout(100);
  ok('입력 한 묶음 = 되돌리기 1번', (await st(()=>history.length))===h0+1);
  await pg.keyboard.press('Control+z'); await settle(); ok('Ctrl+Z로 방금 친 글만 사라짐(편집 계속)', (await st(()=>plain(flowEl(1).html)))==='' && (await caretInfo()).editing);
}
// ── T07(모의) / R01: 한글 입력기 조합 중 쪽 넘김 ──
// 크롬 CDP로 입력기를 흉내 낸다(글자마다 초성 → 초성+중성 → 완성으로 조립했다가 확정). 실제 입력기 확인은 따로(정선C)
const JA='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const stages=ch=>{ const c=ch.charCodeAt(0)-0xAC00; if(c<0||c>11171) return [ch]; const l=Math.floor(c/588), v=Math.floor(c%588/28), t=c%28;
  const lv=String.fromCharCode(0xAC00+(l*21+v)*28); return t?[JA[l],lv,ch]:[JA[l],lv]; };
async function imeType(cdp,text){ for(const ch of text){ if(ch===' '){ await cdp.send('Input.insertText',{text:' '}); await pg.waitForTimeout(30); continue; }
  for(const s of stages(ch)){ await cdp.send('Input.imeSetComposition',{text:s,selectionStart:s.length,selectionEnd:s.length}); await pg.waitForTimeout(25); }
  await cdp.send('Input.insertText',{text:ch}); await pg.waitForTimeout(40); } }
const PH='할머니의 빨간 대문 앞에서 늘 놀았다';
for(const [label,how,newPara] of [['T07(모의) 한글 입력기로 쪽 끝에서 입력','ime',false],['쪽 끝에서 보통 입력(되당김 경로)','type',false],
    ['T07(모의) 다음 쪽이 새 문단으로 시작(견본 책처럼)','ime',true],['다음 쪽이 새 문단 · 보통 입력','type',true]]){
  await fresh(); await pasteDoc();
  if(newPara) await st(()=>{ // 정선C 화면 그대로: 앞쪽이 마지막 줄 끝까지 꽉 차고, 다음 쪽은 새 문단으로 시작
    const e=flowEl(1), w='같은 자리에서 같은 불을 켠다. ', tail='다음날도그다음날도같은자리에서같은불을'.repeat(4); let s='';
    measureOff(1,e,tx=>{ const fits=x=>{ tx.innerHTML='<div>'+x+'</div>'; return tx.scrollHeight<=tx.clientHeight+2; };
      while(fits(s+w)) s+=w; let i=0; while(i<tail.length&&fits(s+tail.slice(0,i+1))) i++; s+=tail.slice(0,i); });
    e.html='<div>'+s+'</div>'; const t=flowEl(2); t.html='<div>그 한결같음이 기다림의 전부다.</div>'+t.html; t.cont=false; renderAll(); });
  await openBody(1,'end'); const D=await doc(); const g0=await st(()=>caretOffset(activeTx()));
  if(how==='ime') await imeType(await pg.context().newCDPSession(pg),PH); else await pg.keyboard.type(PH,{delay:20});
  await settle(); const A=await doc();
  const at=A.chars.indexOf(PH);
  ok(`${label} → 글자가 쪼개지거나 겹치지 않고 순서대로`, at===g0 && A.chars===D.chars.slice(0,g0)+PH+D.chars.slice(g0), JSON.stringify(A.chars.slice(g0-5,g0+PH.length+5)));
  ok(`${label} → 입력한 글이 한 줄로 이어짐(중간에 줄이 갈라지지 않음)`, A.flat.includes(PH) && (!newPara || A.flat.includes(PH+'\n그 한결같음이 기다림의 전부다.')), JSON.stringify(A.flat.slice(A.flat.indexOf('있어야 할')-2, A.flat.indexOf('있어야 할')+60)));
  ok(`${label} → 커서가 다음 쪽으로 따라가 입력한 글 바로 뒤에`, await st(p=>{ const tx=activeTx(), o=caretOffset(tx); return tx.textContent.slice(0,o).endsWith(p.slice(-4)); },PH));
}
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
