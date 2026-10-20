// 키보드만으로 기존 글상자 고치기: 수정요청서 2차(2026-10-16) R11 · 점검표 T34
// 마우스 없이: Tab으로 제목·본문·설명 상자를 찾아 Enter로 편집 시작 → 입력 → Esc로 끝내기 → Tab으로 계속
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import((p=>/^[A-Za-z]:/.test(p)?'file:///'+p.replace(/\\/g,'/'):p)(R+'/playwright/index.mjs'));
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=process.env.MOA_ROOT||'/home/user/LiveBecomeHistory';
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':'text/html'});res.end(d);} }); }).listen(8792);
const b=await chromium.launch({executablePath:process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const pg=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('dialog',d=>d.accept().catch(()=>{}));
await pg.route(/fonts\.|supabase-js|jsdelivr|unpkg/,r=>r.abort());
const ok=(n,c,info='')=>console.log((c?'PASS ':'FAIL ')+n+(info&&!c?'  ← '+info:''));
const st=(f,a)=>pg.evaluate(f,a);
await pg.goto('http://localhost:8792/studio/?blank=1'); await pg.waitForSelector('#canvas .pg');
const at=()=>st(()=>{ const a=document.activeElement; const n=a&&a.closest&&a.closest('#canvas .el'); return n?{id:n.dataset.id, onBox:a===n, label:n.getAttribute('aria-label'), sel:state.sel, editing:state.editing}:{tag:a&&a.tagName}; });
// Tab만 눌러 캔버스의 상자에 닿을 때까지(최대 80번)
const tabToCanvas=async()=>{ for(let k=0;k<80;k++){ await pg.keyboard.press('Tab'); const a=await at(); if(a.id) return a; } return null; };
const tabUntil=async(pred,max=12)=>{ for(let k=0;k<max;k++){ const a=await at(); if(a.id && await st(pred,a.id)) return a; await pg.keyboard.press('Tab'); } return null; };
const textOf=id=>st(id=>{ const e=state.pages.flatMap(p=>p.els).find(e=>e.id===id); return e?plain(e.html):null; },id);

// ① 1쪽(표지): 마우스 없이 Tab으로 상자에 닿음
await pg.evaluate(()=>document.activeElement.blur());
const first=await tabToCanvas();
ok('T34 Tab만으로 쪽 안의 상자에 닿음 · 닿은 상자가 선택됨 · 무엇인지 읽힘', !!first && first.onBox && first.sel===first.id && /글상자|자리/.test(first.label||''), JSON.stringify(first));
// 표지 제목 상자(안내 「책 제목을 적어 보세요」)
const title=await tabUntil(id=>{ const e=page().els.find(e=>e.id===id); return e && e.type==='text' && /책 제목/.test(e.ph||''); });
ok('T34 제목 상자에 Tab으로 닿으면 「글상자: (비어 있음) 책 제목을… · Enter로 고치기」', !!title && /비어 있음.*책 제목.*Enter로 고치기/.test(title.label), JSON.stringify(title));
await pg.keyboard.press('Enter'); await pg.waitForTimeout(80);
ok('T34 Enter → 편집 시작(글 쓰는 칸에 포커스)', await st(()=>state.editing && document.activeElement===activeTx()));
await pg.keyboard.type('키보드로 쓴 제목'); await pg.keyboard.press('Escape'); await pg.waitForTimeout(80);
const t2=await at();
ok('T34 Esc → 편집 끝 · 포커스는 그 상자에 남음(Tab으로 계속 갈 수 있음)', !t2.editing && t2.id===title.id && t2.onBox, JSON.stringify(t2));
ok('T34 쓴 제목이 원고에 그대로', (await textOf(title.id))==='키보드로 쓴 제목');
ok('T34 고친 뒤 읽히는 이름도 새 글로', /글상자: 키보드로 쓴 제목/.test((await at()).label||''));
// 사진 자리: Enter → 파일 고르기
const slot=await tabUntil(id=>page().els.find(e=>e.id===id)?.type==='slot');
{ await st(()=>{ window.__picked=null; const o=pickMedia; pickMedia=(k,id)=>{ window.__picked=[k,id]; return o(k,id); }; });   // 앱이 그 자리로 파일 고르기를 여는지
  const fc=pg.waitForEvent('filechooser',{timeout:5000}).then(()=>true,()=>false); await pg.keyboard.press('Enter');
  const picked=await st(()=>window.__picked), chooser=await fc;
  ok('T34 사진 자리에 Tab으로 닿아 Enter → 그 자리로 사진 고르기를 엶', !!slot && /사진 자리 · Enter로 사진 넣기/.test(slot.label) && picked && picked[0]==='image' && picked[1]===slot.id, JSON.stringify({slot,picked}));
  if(!chooser) console.log('  (참고) 브라우저 파일 창 신호가 5초 안에 오지 않음 — 시험 기계가 바쁠 때 생김'); }
// ② 2쪽 본문: 썸네일로 쪽을 연 뒤(키보드) Tab으로 본문까지 → 이미 있는 글 끝에 이어 쓰기
await pg.focus('.th[data-i="1"]'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(80);
await st(()=>{ const b=flowEl(1); b.html='처음부터 있던 본문'; renderCanvas(); });
const body=await (async()=>{ for(let k=0;k<80;k++){ await pg.keyboard.press('Tab'); const a=await at(); if(a.id && await st(id=>flowEl(1).id===id,a.id)) return a; } return null; })();
ok('T34 2쪽 본문(이미 글이 있는 상자)에 Tab으로 닿음', !!body && /처음부터 있던 본문/.test(body.label), JSON.stringify(body));
await pg.keyboard.press('Enter'); await pg.keyboard.type(' + 이어 씀'); await pg.keyboard.press('Escape'); await pg.waitForTimeout(80);
ok('T34 Enter → 글 끝에서 이어 쓰기 → Esc', (await textOf(body.id))==='처음부터 있던 본문 + 이어 씀' && !(await at()).editing);
// ③ 3쪽 사진 설명(틀의 설명 자리)
await pg.focus('.th[data-i="2"]'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(80);
const desc=await (async()=>{ for(let k=0;k<80;k++){ await pg.keyboard.press('Tab'); const a=await at(); if(a.id && await st(id=>/사진 설명/.test(page().els.find(e=>e.id===id)?.ph||''),a.id)) return a; } return null; })();
await pg.keyboard.press('F2'); await pg.keyboard.type('키보드 설명'); await pg.keyboard.press('Escape'); await pg.waitForTimeout(80);
ok('T34 사진 설명 상자도 Tab으로 찾아 F2(또는 Enter)로 고치고 Esc', !!desc && (await textOf(desc.id))==='키보드 설명', JSON.stringify(desc));
// ④ 상자에 포커스가 있을 때 방향키 = 옮기기(원래 동작), Delete = 지우기, Ctrl+Z = 되돌리기
{ const before=await st(id=>{ const e=page().els.find(e=>e.id===id); return e.y; },desc.id); await pg.keyboard.press('ArrowUp');   // 설명 상자는 쪽 폭을 꽉 채워 좌우로는 못 움직인다
  ok('T34 상자에 포커스가 있을 때 방향키는 상자를 옮김(원래 동작)', Math.abs((await st(id=>page().els.find(e=>e.id===id).y,desc.id))-(before-1))<1e-6);
  await pg.keyboard.press('Delete'); await pg.waitForTimeout(80);
  ok('T34 Delete로 지운 뒤에도 포커스가 쪽의 다른 상자로(키보드가 길을 잃지 않음)', !(await st(id=>page().els.some(e=>e.id===id),desc.id)) && !!(await at()).id);
  await pg.keyboard.press('Control+z'); await pg.waitForTimeout(80);
  ok('T34 Ctrl+Z로 되살아남', await st(id=>page().els.some(e=>e.id===id&&plain(e.html)==='키보드 설명'),desc.id)); }
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
