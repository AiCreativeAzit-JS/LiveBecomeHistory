// 올리기가 끝났을 때 넣을 곳: 수정요청서 2차(2026-10-16) R09 · 점검표 T32
// 넣을 곳(쪽·자리)은 파일을 고른 순간에 정한다 — 올리는 동안 다른 쪽으로 가거나, 완료 순서가 뒤바뀌거나, 쪽이 지워져도
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import(R+'/playwright/index.mjs');
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/home/user/LiveBecomeHistory';
const types={'.html':'text/html','.js':'application/javascript'};
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':types[path.extname(f)]||'text/plain'});res.end(d);} }); }).listen(8790);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const FAKE=fs.readFileSync(process.argv[2],'utf8'); const U='http://localhost:8790';
const ok=(n,c,info='')=>console.log((c?'PASS ':'FAIL ')+n+(info&&!c?'  ← '+info:''));
const ctx=await b.newContext({viewport:{width:1440,height:1000}});
await ctx.addInitScript(()=>{ localStorage.setItem('fakeSession',JSON.stringify({user:{id:'u1',email:'a@b.c'}})); });
await ctx.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:FAKE}));
await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
const errs=[]; let pg; const st=(f,a)=>pg.evaluate(f,a);
const fresh=async()=>{ if(pg) await pg.close(); pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('dialog',d=>d.accept().catch(()=>{}));
  await pg.goto(`${U}/studio/?new=1`); await pg.waitForSelector('#canvas .pg'); await pg.waitForTimeout(800); };
const png=async(c)=>st(c=>new Promise(res=>{ const k=document.createElement('canvas'); k.width=40; k.height=30; const g=k.getContext('2d'); g.fillStyle=c; g.fillRect(0,0,40,30); k.toBlob(bl=>{ const r=new FileReader(); r.onload=()=>res(r.result.split(',')[1]); r.readAsDataURL(bl); },'image/png'); }),c);
const choose=async(pageIdx,slot,b64,name)=>{ await st(([pi,slot])=>{ goPage(pi); pendingKind='image'; pendingSlot=slot?state.pages[pi].els.find(e=>e.type==='slot'&&(e.kind||'image')==='image').id:null; },[pageIdx,slot]);
  await pg.setInputFiles('#file',{name,mimeType:'image/png',buffer:Buffer.from(b64,'base64')}); await pg.waitForTimeout(150); };
const imgsOn=i=>st(i=>state.pages[i]?state.pages[i].els.filter(e=>e.type==='image').length:-1,i);
const until=async(fn,arg,ms=6000)=>{ for(let t=0;t<ms;t+=100){ if(await st(fn,arg)) return true; await pg.waitForTimeout(100); } return false; };
const nImgs=()=>state.pages.flatMap(p=>p.els).filter(e=>e.type==='image').length;
const waitMedia=async n=>{ await until(n=>__db.media.length>=n && state.pages.flatMap(p=>p.els).filter(e=>e.type==='image').length>=n,n); await pg.waitForTimeout(200); };
// 그 쪽 사진의 색(빨강/파랑/초록) — 어느 파일이 어디 들어갔는지
const colorOn=i=>st(i=>new Promise(res=>{ const e=state.pages[i].els.find(e=>e.type==='image'); if(!e) return res(null); const im=new Image(); im.onload=()=>{ const c=document.createElement('canvas'); c.width=4; c.height=4; const g=c.getContext('2d'); g.drawImage(im,0,0,4,4); const [r,gg,b]=g.getImageData(1,1,1,1).data; res(r>150?'red':b>gg?'blue':'green'); }; im.onerror=()=>res('err'); im.src=e.src; }),i);

/* ① 3쪽 자리에 고르고, 올리는 동안 2쪽으로 가서 글을 씀 */
await fresh(); await st(()=>{ window.__mediaDelays=[1500]; });
const red=await png('#C0392B'); await choose(2,true,red,'a.png');
await pg.locator('.th').nth(1).click(); await pg.waitForTimeout(80);
{ const id=await st(()=>flowEl(1).id); const bb=await pg.locator(`#canvas .el[data-id="${id}"]`).boundingBox(); await pg.mouse.click(bb.x+bb.width/2,bb.y+30); }
await pg.keyboard.type('올리는 동안 쓰는 글'); await waitMedia(1); await pg.keyboard.type(' 계속');
ok('T32 올리는 동안 다른 쪽으로 가도 → 처음 고른 3쪽 자리에 들어감', (await imgsOn(2))===1 && await st(()=>!state.pages[2].els.some(e=>e.type==='slot'&&(e.kind||'image')==='image')) && (await imgsOn(1))===0);
ok('T32 그동안 쓰던 2쪽 화면·편집은 끊기지 않음(끌고 가지 않음)', await st(()=>state.cur===1 && state.editing && plain(flowEl(1).html).includes('올리는 동안 쓰는 글 계속')), await st(()=>plain(flowEl(1).html)));
ok('T32 「3쪽 자리에 사진을 넣었어요」 안내', /3쪽 자리에 사진을 넣었어요/.test(await pg.locator('#toast').innerText()), await pg.locator('#toast').innerText());
/* ② 완료 순서 역전: 3쪽 자리(느림) → 1쪽 표지 자리(빠름) */
await fresh(); await st(()=>{ window.__mediaDelays=[1800,0]; });
const blue=await png('#1F4E79'), green=await png('#2E7D32');
await choose(2,true,blue,'slow.png'); await choose(0,true,green,'fast.png'); await waitMedia(2);
const c3=await colorOn(2), c1=await colorOn(0);
ok('T32 완료 순서가 뒤바뀌어도 각자 처음 고른 자리에(먼저 고른 느린 파랑 → 3쪽, 나중 고른 빠른 초록 → 1쪽)', c3==='blue' && c1==='green', JSON.stringify({c3,c1}));
/* ③ 올리는 동안 그 쪽을 지움 */
await fresh(); await st(()=>{ window.__mediaDelays=[1500]; });
await choose(2,true,red,'gone.png'); await st(()=>{ goPage(1); delPageAt(2,false); window.__toasts=[]; const t0=toast; toast=m=>{ window.__toasts.push(m); t0(m); }; }); await waitMedia(1);
ok('T32 올리는 동안 넣을 쪽이 지워지면 → 지금 쪽(또는 바로 뒤 새 쪽)에 넣고 그렇다고 알림', (await st(nImgs))===1 && await st(()=>window.__toasts.some(t=>/넣으려던 쪽이 없어져서/.test(t))), JSON.stringify(await st(()=>window.__toasts)));
/* ④ 「사진」 단추(자리 없음)도 고른 쪽에: 2쪽에서 고르고 4쪽으로 이동 */
await fresh(); await st(()=>{ window.__mediaDelays=[1500]; });
const p2=await st(()=>state.pages[1].id), p4=await st(()=>state.pages[3].id);
await choose(1,false,green,'btn.png'); await pg.locator('.th').nth(3).click(); await waitMedia(1);
ok('T32 「사진」 단추로 고른 것도 고른 2쪽(또는 그 바로 뒤 새 쪽)에 · 보던 쪽은 그대로', await st(([p2,p4])=>{ const i=state.pages.findIndex(p=>p.els.some(e=>e.type==='image')), j=state.pages.findIndex(p=>p.id===p2); return (i===j||i===j+1) && state.pages[state.cur].id===p4; },[p2,p4]), JSON.stringify(await st(()=>({cur:state.cur, at:state.pages.findIndex(p=>p.els.some(e=>e.type==='image'))}))));
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
