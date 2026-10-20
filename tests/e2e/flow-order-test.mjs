// 이어진 원고 사이에 쪽 끼우기: 레드팀 4단계(2026-10-20) RT-401 → D24
// 1쪽→(이어서) 원고 사이에 빈 쪽을 끼우고, 앞쪽 끝에 글을 더 써 넘치게 한 뒤, 끼운 쪽을 지운다.
// 기대: 「(이어서)」가 둘 생기지 않고 원고가 한 사슬로 이어지며, 글자는 하나도 잃거나 겹치지 않고, 끼워 쓴 글은 그 자리(앞쪽 끝 = 뒤쪽 글 앞)에 놓인다(워드와 같은 순서)
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import((p=>/^[A-Za-z]:/.test(p)?'file:///'+p.replace(/\\/g,'/'):p)(R+'/playwright/index.mjs'));
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=process.env.MOA_ROOT||'/home/user/LiveBecomeHistory';
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':'text/html'});res.end(d);} }); }).listen(8795);
const b=await chromium.launch({executablePath:process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:1440,height:1000}});
await ctx.addInitScript(()=>{ try{ indexedDB.deleteDatabase('moa-demo'); }catch{} });
const ok=(n,c,info='')=>console.log((c?'PASS ':'FAIL ')+n+(info&&!c?'  ← '+info:''));
const errs=[]; let pg;
const st=(js,a)=>pg.evaluate(js,a);
async function fresh(){ if(pg) await pg.close(); pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('dialog',d=>d.accept().catch(()=>{}));
  await pg.route(/fonts\.|supabase-js|jsdelivr|unpkg/,r=>r.abort()); await pg.goto('http://localhost:8795/studio/?blank=1'); await pg.waitForSelector('#canvas .pg'); }
const lines=(a,z,pre='줄')=>Array.from({length:z-a+1},(_,k)=>`${pre} ${String(a+k).padStart(2,'0')}`);
// 2쪽(index 1)의 본문에 줄들을 넣고 흐르게 한다
const fill=(ls)=>st(ls=>{ const e=flowEl(1); e.html=ls.map(l=>`<div>${l}</div>`).join(''); settle(1); renderAll(); return state.pages.length; },ls);
// index 1 에서 시작하는 사슬: 쪽 번호들과 줄 순서
const chain=()=>st(()=>{ const idx=[1]; let i=1; const out=[]; const grab=i=>{ const d=document.createElement('div'); d.innerHTML=flowEl(i).html; return flat(d).split('\n').filter(x=>x.trim()); };
  out.push(...grab(1)); while(flowsInto(i)){ i++; idx.push(i); out.push(...grab(i)); }
  const dup=state.pages.map(p=>p.flowFrom).filter(Boolean); const dupSet=new Set(dup.filter((x,k)=>dup.indexOf(x)!==k));
  const cont=state.pages.map((p,k)=>[k,p]).filter(([k,p])=>p.flowFrom).map(([k])=>k);
  return {idx, lines:out, total:state.pages.length, dupFlowFrom:[...dupSet].length, contPages:cont, names:state.pages.map(p=>p.name)}; });

/* ── 준비: 1쪽(index 1)→(이어서) 두 쪽짜리 원고 ── */
await fresh(); const L=lines(1,60);
let N=await fill(L); let C=await chain();
ok('준비: 60줄이 2쪽 이상으로 이어짐', C.idx.length>=2 && JSON.stringify(C.lines)===JSON.stringify(L), `${C.idx.length}쪽 · ${C.lines.length}줄`);
const firstPageLines=await st(()=>{ const d=document.createElement('div'); d.innerHTML=flowEl(1).html; return flat(d).split('\n').filter(x=>x.trim()); });
const restLines=L.slice(firstPageLines.length);

/* ── RT-401 재현 순서 ── */
await st(()=>insertPageAt(2,'text')); await pg.keyboard.press('Escape');
ok('D24 이어진 원고 사이에 끼우면 알림(원고가 이 쪽을 건너 이어짐 · 지우면 다시 붙음)', /이어진 원고 사이/.test(await pg.locator('#toast').innerText()), await pg.locator('#toast').innerText());
const ADD=lines(1,6,'추가');
await st(a=>{ const e=flowEl(1); e.html=e.html+a.map(l=>`<div>${l}</div>`).join(''); settle(1); renderAll(); },ADD);
let C2=await chain();
ok('D24 앞쪽에 글을 더 써 넘치면 새 「(이어서)」가 생기되, 떨어져 있던 「(이어서)」는 그 뒤에 다시 이어짐(같은 쪽을 잇는 쪽이 둘이 아님)', C2.dupFlowFrom===0, JSON.stringify(C2));
await st(()=>{ const ei=state.pages.findIndex((p,k)=>k>1&&!p.flowFrom&&p.els.every(e=>e.type==='text'&&!plain(e.html))); delPageAt(ei,false); });   // 끼운 빈 쪽(새 조각이 그 앞에 끼어 index 3)을 지운다
let C3=await chain();
const expect=[...firstPageLines, ...ADD, ...restLines];
ok('RT-401 끼운 쪽을 지우면 원고가 한 사슬로 다시 이어짐(모든 「(이어서)」 쪽이 사슬 안)', C3.idx.length===C3.contPages.length+1 && C3.dupFlowFrom===0, JSON.stringify({idx:C3.idx, cont:C3.contPages}));
ok('RT-401 글자 유실·중복 없음(66줄 그대로)', C3.lines.length===66 && new Set(C3.lines).size===66, `${C3.lines.length}줄`);
ok('RT-401 순서: 앞쪽 끝에 써 넣은 글은 그 자리(앞쪽 글 뒤 · 뒤쪽 글 앞)에 놓인다 — 워드와 같은 순서', JSON.stringify(C3.lines)===JSON.stringify(expect), C3.lines.slice(firstPageLines.length-2, firstPageLines.length+8).join(','));
ok('RT-401 지운 뒤 앞쪽 글을 지우면 뒤쪽 글이 당겨 올라옴(사슬이 살아 있음)', await st(()=>{ const e=flowEl(1); const d=document.createElement('div'); d.innerHTML=e.html; const ls=flat(d).split('\n').filter(x=>x.trim()); e.html=ls.slice(0,Math.max(1,ls.length-20)).map(l=>`<div>${l}</div>`).join(''); settle(1); renderAll(); const d2=document.createElement('div'); d2.innerHTML=flowEl(1).html; return flat(d2).split('\n').filter(x=>x.trim()).length>ls.length-20; }));
/* ── 원고 끝(마지막 쪽)에 이어 쓰면 맨 뒤에 붙는다 ── */
await fresh(); await fill(L); await st(()=>insertPageAt(2,'text')); await pg.keyboard.press('Escape'); await st(()=>delPageAt(2,false));   // 끼웠다 바로 지움(글을 더 쓰기 전이라 index 2가 빈 쪽)
const TAIL=lines(61,66);
await st(a=>{ let i=1; while(flowsInto(i)) i++; const e=flowEl(i); e.html=e.html+a.map(l=>`<div>${l}</div>`).join(''); settle(i); renderAll(); },TAIL);
const C4=await chain();
ok('D24 원고의 마지막 쪽 끝에 이어 쓰면 01→66 오름차순 그대로', JSON.stringify(C4.lines)===JSON.stringify([...L,...TAIL]) && C4.dupFlowFrom===0, C4.lines.slice(-8).join(','));
/* ── 예전 판에서 이미 뒤섞인 책(같은 쪽을 잇는 「(이어서)」 둘): 열 때 바로잡기 ── */
await fresh(); await fill(L);
const H=await st(()=>{ const src=state.pages[1]; const dup={...blankPage(), id:uid(), name:src.name+' (이어서)', flowFrom:src.id}; dup.els[0].html='<div>옛 조각</div>'; state.pages.splice(2,0,dup); // 옛 판처럼: 새 조각이 기존 (이어서) 앞에 끼어들고 둘 다 1쪽을 가리킴
  const before=state.pages.map(p=>[p.name,p.flowFrom===src.id]); const fixed=healFlow(); const after=state.pages.map((p,k)=>[k,p.flowFrom]);
  return {fixed, dup:state.pages.map(p=>p.flowFrom).filter(Boolean).filter((x,k,a)=>a.indexOf(x)!==k).length, chainOk:flowsInto(1)&&flowsInto(2), before, after}; });
ok('D24 같은 쪽을 잇는 「(이어서)」가 둘인 책을 열면 뒤 것을 앞 것의 사슬 끝에 붙여 한 줄로 바로잡음', H.fixed===1 && H.dup===0 && H.chainOk, JSON.stringify(H));
ok('D24 없는 쪽을 가리키는 flowFrom은 지움', await st(()=>{ state.pages[2].flowFrom='no-such-page'; const n=healFlow(); return n===1 && state.pages[2].flowFrom===null; }));
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
