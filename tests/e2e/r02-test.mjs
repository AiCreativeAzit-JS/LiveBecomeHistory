// 여러 쪽 되당김과 연결 유지: 수정요청서 1차(2026-10-16) R02 · 점검표 T08·T09·T10
// 원고: docs/qa/모아_재현용_16문단.txt 를 두 벌(문단 01~32)로 이어 /studio/?blank=1 2쪽 본문에 붙여 넣는다(5쪽 넘게 이어짐)
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import(R+'/playwright/index.mjs');
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/home/user/LiveBecomeHistory';
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':'text/html'});res.end(d);} }); }).listen(8782);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:1440,height:1000}});
const T16=fs.readFileSync(ROOT+'/docs/qa/모아_재현용_16문단.txt','utf8').replace(/\r/g,'');
const TXT=T16.trimEnd()+'\n'+T16.replace(/\[문단 (\d\d)\]/g,(m,n)=>`[문단 ${String(+n+16).padStart(2,'0')}]`);
const ok=(n,c,info='')=>console.log((c?'PASS ':'FAIL ')+n+(info&&!c?'  ← '+info:''));
const errs=[]; let pg;
const st=(js,a)=>pg.evaluate(js,a);
const settle=async()=>{ let last=''; for(let i=0;i<40;i++){ await pg.waitForTimeout(120); const s=await st(()=>serialize()); if(s===last) return; last=s; } };
const paras=f=>f.split('\n').filter(s=>s.trim());
const NO=s=>(s.match(/^\[문단 (\d\d)\]/)||[])[1];
const want=paras(TXT);
// i쪽부터 이어진 쪽들 → {idx:[쪽 번호], flat:원고 글자, gaps:[빈자리 남은 중간 쪽], emptyAuto:[비어 있는 자동 쪽]}
const chain=(i0=1)=>st(i0=>{ const idx=[i0]; let i=i0; const d=document.createElement('div'); d.innerHTML=flowEl(i).html;
  while(flowsInto(i)){ i++; idx.push(i); joinFlow(d,flowEl(i).html,!!flowEl(i).cont); }
  const gaps=idx.slice(0,-1).filter(j=>measureOff(j,flowEl(j),tx=>roomLeft(tx)));
  const emptyAuto=state.pages.map((p,j)=>j).filter(j=>state.pages[j].flowFrom && state.pages[j].els.every(e=>e.type==='text'&&!plain(e.html)));
  return {idx, flat:flat(d), gaps, emptyAuto, total:state.pages.length}; },i0);
// 책 전체의 글자(모든 글상자) — 이동·복제에서 글이 사라지거나 생기지 않았는지
const allText=()=>st(()=>state.pages.flatMap(p=>p.els.filter(e=>e.type==='text').map(e=>plain(e.html))).join('\n'));
const countNo=(t,no)=>(t.match(new RegExp(`\\[문단 ${no}\\]`,'g'))||[]).length;
async function fresh(){
  if(pg) await pg.close();
  pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('dialog',d=>d.accept().catch(()=>{}));
  await pg.route(/fonts\.|supabase-js|jsdelivr|unpkg/,r=>r.abort());
  await pg.goto('http://localhost:8782/studio/?blank=1'); await pg.waitForSelector('#canvas .pg');
}
async function openBody(i){
  await pg.locator('.th').nth(i).click(); await pg.waitForTimeout(80);
  const id=await st(i=>flowEl(i).id,i); const bb=await pg.locator(`#canvas .el[data-id="${id}"]`).boundingBox();
  await pg.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await pg.waitForTimeout(60);
}
async function pasteDoc(){
  await openBody(1); await pg.keyboard.press('Control+Home');
  await st(t=>{ const dt=new DataTransfer(); dt.setData('text/plain',t); document.activeElement.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true})); },TXT);
  await settle(); await pg.keyboard.press('Escape'); await settle();
}
// 편집 중 글상자에서 통째로 들어 있는 문단 번호들
const wholeParas=()=>st(()=>{ const r=document.createRange(); r.selectNodeContents(activeTx()); return flat(r.cloneContents()).split('\n').map(l=>(l.match(/^\[문단 (\d\d)\] .*남아 있어야 합니다\.$/)||[])[1]).filter(Boolean); });
// 문단 a~z(통째로)를 골라 Delete
async function deleteParas(a,z){
  await st(([a,z])=>{ const tx=activeTx(), pos=textPositions(tx), t=pos.map(([n,k])=>n.data[k]).join('');
    const s0=t.indexOf(`[문단 ${a}]`), E='남아 있어야 합니다.', z0=t.indexOf(E,t.indexOf(`[문단 ${z}]`))+E.length;
    const r=document.createRange(); r.setStart(pos[s0][0],pos[s0][1]); r.setEnd(pos[z0-1][0],pos[z0-1][1]+1); const s=getSelection(); s.removeAllRanges(); s.addRange(r); },[a,z]);
  await pg.keyboard.press('Delete'); await settle();
}

/* ── 준비 ── */
await fresh(); await pasteDoc();
const C0=await chain();
ok('준비: 32문단이 2쪽부터 5쪽 넘게 이어짐', C0.idx.length>=5 && JSON.stringify(paras(C0.flat))===JSON.stringify(want), `본문 ${C0.idx.length}쪽`);
console.log('  본문 쪽:',C0.idx.map(i=>i+1).join(','),'· 책',C0.total,'쪽');
const title0=await st(()=>state.pages[1].els.find(e=>e.type==='text'&&e!==flowEl(1)).id);

/* ── T08 5쪽 이상 본문에서 대량 삭제 ── */
for(const [label,k] of [['첫 본문쪽',0],['중간쪽',2]]){
  await fresh(); await pasteDoc(); const B=await chain(); const pi=B.idx[k];
  await openBody(pi); const ws=await wholeParas(); const del=ws.slice(0,Math.max(1,ws.length)); // 이 쪽에 통째로 든 문단 모두
  await deleteParas(del[0],del[del.length-1]);
  const A=await chain(); const exp=want.filter(p=>!del.includes(NO(p)));
  ok(`T08 ${label}(${pi+1}쪽) 문단 ${del.length}개 삭제 → 나머지 원고 그대로(순서·글자)`, JSON.stringify(paras(A.flat))===JSON.stringify(exp), `${paras(A.flat).length} vs ${exp.length}`);
  ok(`T08 ${label}: 뒤쪽 글이 끝까지 연달아 당겨짐(중간에 빈자리 남은 쪽 없음)`, A.gaps.length===0, 'gaps '+A.gaps.map(i=>i+1));
  ok(`T08 ${label}: 비어 버린 자동 쪽 정리 · 본문 쪽 수 줄어듦`, A.emptyAuto.length===0 && A.idx.length<B.idx.length, `${B.idx.length}→${A.idx.length}쪽, 빈 쪽 ${A.emptyAuto}`);
  if(k===0) ok('T10 제목 상자는 그대로(본문과 합쳐지지 않음)', await st(()=>{ const t=state.pages[1].els.find(e=>e.type==='text'&&e!==flowEl(1)); return !!t && !plain(t.html) && !!t.ph; }));
}
// 아주 크게: 첫 본문쪽 전부 + 둘째 쪽까지 지우기(Ctrl+A로 한 쪽 통째 → 이어서 한 번 더)
{ await fresh(); await pasteDoc(); const B=await chain();
  for(let n=0;n<2;n++){ await openBody(1); await pg.keyboard.press('Control+a'); await pg.keyboard.press('Delete'); await settle(); }
  const A=await chain(); const left=paras(A.flat);
  ok('T08 첫 쪽을 두 번 통째로 비움 → 남은 원고는 원래 순서의 뒷부분', left.length>0 && JSON.stringify(left.slice(1))===JSON.stringify(want.slice(want.length-left.length+1)), left.slice(0,2).join(' / ').slice(0,80));
  ok('T08 통째로 비운 뒤에도 중간 빈자리·빈 자동 쪽 없음', A.gaps.length===0 && A.emptyAuto.length===0 && A.idx.length<B.idx.length, `${B.idx.length}→${A.idx.length}쪽 gaps ${A.gaps}`); }

/* ── T09 이어진 쪽 이동·복제·수동 삭제 ── */
// (가) 이동: 글은 하나도 사라지거나 생기지 않고, 되돌리기·제자리로 옮기면 다시 이어짐
{ await fresh(); await pasteDoc(); const B=await chain(); const t0=await allText(), s0=await st(()=>serialize());
  const m=B.idx[2]; await st(m=>{ state.cur=m; movePage(m,m-1); },m); await settle();
  const t1=await allText();
  ok('T09 이어진 쪽을 한 칸 위로 이동 → 글 그대로(문단마다 한 번씩)', t1.length===t0.length && Array.from({length:32},(_,i)=>String(i+1).padStart(2,'0')).every(n=>countNo(t1,n)===1));
  ok('T09 이동한 자리에서는 이어짐이 끊김(다른 쪽 글을 끌어 오거나 합치지 않음)', (await chain()).idx.length<B.idx.length);
  await pg.keyboard.press('Control+z'); await settle();
  ok('T09 Ctrl+Z로 이동 전 그대로', (await st(()=>serialize()))===s0);
  await st(m=>{ state.cur=m; movePage(m,m-1); },m); await settle(); await st(m=>{ state.cur=m-1; movePage(m-1,m); },m); await settle();
  const Cb=await chain(); ok('T09 제자리로 다시 옮기면 다시 이어짐', Cb.idx.length===B.idx.length && JSON.stringify(paras(Cb.flat))===JSON.stringify(want)); }
// (나) 복제: 원래 원고의 이어짐은 그대로, 복제본은 따로 한 쪽
for(const [label,k] of [['중간 이어진 쪽',2],['본문 첫 쪽',0]]){
  await fresh(); await pasteDoc(); const B=await chain(); const m=B.idx[k];
  const segOrig=await st(m=>plain(flowEl(m).html),m);
  await st(m=>dupPage(m),m); await pg.waitForSelector('#dupDlg:not([hidden])');               // 이어진 쪽이면 어디에 둘지 묻는다
  const lab=await pg.locator('#dupAfter').innerText(); await pg.click('#dupDlg [data-dup=after]'); await settle();
  ok(`T09 ${label} 복제 → 「바로 아래 / 이어진 글이 끝난 뒤(${B.idx.at(-1)+2}쪽)」를 묻고, 「끝난 뒤」를 고름`, lab.includes(`${B.idx.at(-1)+2}쪽`), lab);
  const A=await chain(); const copies=await st(seg=>state.pages.map((p,j)=>j).filter(j=>state.pages[j].name.endsWith('(복제)') && state.pages[j].els.some(e=>e.type==='text'&&plain(e.html)===seg)),segOrig);
  ok(`T09 ${label} 복제 → 원래 원고는 끊기지 않고 그대로 이어짐`, A.idx.length===B.idx.length && JSON.stringify(paras(A.flat))===JSON.stringify(want), `${B.idx.length}→${A.idx.length}쪽`);
  ok(`T09 ${label} 복제 → 복제본 1쪽(같은 글)은 원고 흐름 밖`, copies.length===1 && !A.idx.includes(copies[0]) && await st(j=>!state.pages[j].flowFrom,copies[0]), JSON.stringify(copies));
  // 복제 뒤 원고를 크게 지워도 복제본 글은 끌려 오지 않음
  await openBody(B.idx[0]); const ws=await wholeParas(); await deleteParas(ws[0],ws[ws.length-1]);
  const A2=await chain(), t2=await allText();
  ok(`T09 ${label} 복제 뒤 대량 삭제 → 원고만 당겨지고 복제본은 제자리 그대로`, A2.gaps.length===0 && JSON.stringify(paras(A2.flat))===JSON.stringify(want.filter(p=>!ws.includes(NO(p)))) && t2.includes(segOrig), 'gaps '+A2.gaps);
}
// (나-2) 「바로 아래」를 고르면: 복제본은 바로 아래 쪽, 글 흐름은 거기서 나뉨(글은 그대로)
{ await fresh(); await pasteDoc(); const B=await chain(); const m=B.idx[1], t0=await allText();
  await st(m=>dupPage(m),m); await pg.waitForSelector('#dupDlg:not([hidden])'); await pg.click('#dupDlg [data-dup=below]'); await settle();
  const t1=await allText();
  ok('T09 「바로 아래」 → 복제본이 바로 아래 쪽에', await st(m=>state.pages[m+1].name.endsWith('(복제)') && state.cur===m+1,m));
  ok('T09 「바로 아래」 → 원고는 그 쪽에서 나뉘고 글은 하나도 사라지지 않음(복제본만큼 늘어남)', (await chain()).idx.length===2 && Array.from({length:32},(_,i)=>String(i+1).padStart(2,'0')).every(n=>countNo(t1,n)>=1) && t1.length>t0.length); }
// (나-3) 이어지지 않은 쪽은 묻지 않고 바로 아래에(오른쪽 클릭 메뉴)
{ await fresh(); await pg.locator('.th').nth(0).click({button:'right'}); await pg.click('#ctx [data-c=dup]'); await pg.waitForTimeout(150);
  ok('T09 이어지지 않은 1쪽 복제 → 묻지 않고 바로 아래 2쪽에', await pg.locator('#dupDlg').isHidden() && await st(()=>state.pages[1].name==='표지 (복제)' && state.cur===1)); }
// (다) 수동 삭제: 지운 쪽의 글만 빠지고, 앞뒤 쪽은 계속 이어짐
for(const [label,k] of [['중간 이어진 쪽',2],['본문 첫 쪽',0],['마지막 이어진 쪽',-1]]){
  await fresh(); await pasteDoc(); const B=await chain(); const m=B.idx.at(k), s0=await st(()=>serialize());
  const seg=await st(m=>{ const d=document.createElement('div'); d.innerHTML=flowEl(m).html; return flat(d); },m);
  await st(m=>delPageAt(m),m); await settle();
  const A=await chain(k===0?B.idx[0]:1), expN=paras(seg).map(NO).filter(Boolean);
  const gone=want.filter(p=>!(paras(A.flat).some(q=>q===p)));
  ok(`T09 ${label}(${m+1}쪽) 삭제 → 그 쪽에 통째로 있던 문단만 빠짐`, want.filter(p=>expN.includes(NO(p))&&paras(seg).includes(p)).every(p=>gone.includes(p)) && gone.every(p=>{ const n=NO(p); return seg.includes(`[문단 ${n}]`) || seg.includes(p.slice(-12)); }), 'gone '+gone.map(NO));
  ok(`T09 ${label} 삭제 → 남은 쪽들은 계속 한 원고로 이어짐`, A.idx.length===B.idx.length-1 && A.gaps.length===0, `${B.idx.length}→${A.idx.length}쪽 gaps ${A.gaps}`);
  await pg.keyboard.press('Control+z'); await settle();
  ok(`T09 ${label} 삭제 → Ctrl+Z로 그대로`, (await st(()=>serialize()))===s0);
}

/* ── T10 이어진 쪽에 따로 넣은 글상자(사진 설명 등) ── */
{ await fresh(); await pasteDoc(); const B=await chain(); const mid=B.idx[2];
  // 중간 이어진 쪽 위쪽에 작은 설명 상자를 하나 더 둔다(본문과 겹치지 않게 본문을 아래로)
  const capId=await st(mid=>{ const p=state.pages[mid], f=flowEl(mid); const c=T(MX,MT,CW,10,'사진 설명: 할머니 댁 대문',{fs:10}); f.y=MT+12; f.h=LIM.y1-f.y; p.els.push(c); renderAll(); return c.id; },mid);
  await st(mid=>settle(mid),mid); await settle();
  const before=await chain();
  await openBody(1); for(let n=0;n<3;n++){ await pg.keyboard.press('Control+a'); await pg.keyboard.press('Delete'); await settle(); await openBody(1); }
  const A=await chain(), t=await allText();
  ok('T10 이어진 쪽의 설명 상자는 본문으로 끌려가지 않고 그 쪽에 그대로', await st(id=>state.pages.some(p=>p.els.some(e=>e.id===id&&plain(e.html)==='사진 설명: 할머니 댁 대문')),capId) && (t.match(/사진 설명: 할머니 댁 대문/g)||[]).length===1 && !A.flat.includes('사진 설명'));
  ok('T10 설명 상자 쪽의 본문이 비어도 뒤쪽 원고는 계속 당겨짐(중간 빈자리 없음)', A.gaps.length===0, 'gaps '+A.gaps.map(i=>i+1)+' / 쪽 '+A.idx.map(i=>i+1));
  const left=paras(A.flat); ok('T10 남은 원고 순서 그대로', left.length>0 && JSON.stringify(left.slice(1))===JSON.stringify(want.slice(want.length-left.length+1)));
}
// 본문 첫 쪽 아래 끝에 닿는 작은 글상자(사진 설명)가 있어도 본문이 흐름 글상자
{ await fresh(); await pasteDoc();
  const capId=await st(()=>{ const p=state.pages[1], body=flowEl(1); const c=T(MX+80,LIM.y1-8,CW-80,8,'쪽 아래 설명',{fs:9}); p.els.push(c); renderAll(); return c.id; });
  ok('T10 아래 끝에 닿는 작은 설명 상자가 있어도 흐름 글상자는 본문', await st(id=>flowEl(1).id!==id && plain(flowEl(1).html).includes('[문단 01]'),capId));
  await openBody(1); await pg.keyboard.press('Control+End'); for(let n=0;n<3;n++){ await pg.keyboard.press('Backspace'); } await settle();
  ok('T10 본문을 고쳐도 설명 상자 글은 그대로', await st(id=>plain(state.pages[1].els.find(e=>e.id===id).html)==='쪽 아래 설명',capId));
}
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
