// 사진 두 벌 보관(docs/DESIGN.md 「사진 두 벌 보관 설계」): 화면용 1400px + 인쇄용 원본 2700px
// ① 편집기·서가·화면용 전자책은 화면용만 ② 인쇄용 전자책은 인쇄용 원본 ③ 예전 사진(인쇄용 없음)도 인쇄용에 보임 · 용량은 두 벌 합계
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import(R+'/playwright/index.mjs');
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/home/user/LiveBecomeHistory';
const types={'.html':'text/html','.js':'application/javascript'};
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':types[path.extname(f)]||'text/plain'});res.end(d);} }); }).listen(8778);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const FAKE=fs.readFileSync(process.argv[2],'utf8'); const now=new Date().toISOString(); const U='http://localhost:8778';
const ok=(n,c,info='')=>console.log((c?'PASS ':'FAIL ')+n+(info&&!c?'  ← '+info:''));
const BK='86000000-0000-4000-8000-000000000001', OLDIMG='87000000-0000-4000-8000-000000000001';
const seed={profiles:[{id:'u1',display_name:'김정선'}],
 books:[{id:BK,owner_id:'u1',title:'사진 책',author_name:'김정선',format:'pages',is_public:false,admin_hidden:false,deleted_at:null,created_at:now,updated_at:now}],
 media:[{id:OLDIMG,book_id:BK,owner_id:'u1',kind:'image',storage_path:'u1/bk/old.jpg',size_bytes:100}],
 pages:[{id:'88000000-0000-4000-8000-000000000001',book_id:BK,position:0,name:'예전 사진',bg:'#FFFFFF',flow_from:null,els:[{id:'e1',type:'image',x:16,y:40,w:120,h:80,name:'',media_id:OLDIMG}]}]};
const ctx=await b.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
await ctx.addInitScript(s=>{ window.__seed=s; localStorage.setItem('fakeSession',JSON.stringify({user:{id:'u1',email:'a@b.c'}})); },seed);
await ctx.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:FAKE}));
await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('dialog',d=>d.accept().catch(()=>{}));
const st=(f,a)=>pg.evaluate(f,a);
await pg.goto(`${U}/studio/?book=${BK}`); await pg.waitForSelector('#canvas .pg'); await pg.waitForTimeout(800);

// 시험 사진 만들기(브라우저 캔버스): 가로 w×h, 투명 여부
const mk=(w,h,alpha)=>st(([w,h,alpha])=>new Promise(res=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d');
  if(!alpha){ const gr=g.createLinearGradient(0,0,w,h); gr.addColorStop(0,'#E9D8A6'); gr.addColorStop(1,'#0B4536'); g.fillStyle=gr; g.fillRect(0,0,w,h); }
  g.fillStyle='#C0392B'; g.beginPath(); g.arc(w/2,h/2,Math.min(w,h)/3,0,7); g.fill();
  c.toBlob(bl=>{ const r=new FileReader(); r.onload=()=>res(r.result.split(',')[1]); r.readAsDataURL(bl); },'image/png'); }),[w,h,alpha]);
// 그림 정보: 가로 크기 · 종류 · 모서리 투명도
const dimsOf=src=>st(src=>new Promise(res=>{ const im=new Image(); im.onload=()=>{ const c=document.createElement('canvas'); c.width=im.naturalWidth; c.height=im.naturalHeight; const g=c.getContext('2d'); g.drawImage(im,0,0);
  res({w:im.naturalWidth,h:im.naturalHeight,corner:g.getImageData(1,1,1,1).data[3]}); }; im.onerror=()=>res(null); im.src=src; }),src);
const fileInfo=key=>st(async k=>{ const f=window.__files[k]; if(!f) return null; const u=URL.createObjectURL(f); const im=new Image(); im.src=u; await im.decode();
  const c=document.createElement('canvas'); c.width=im.naturalWidth; c.height=im.naturalHeight; const g=c.getContext('2d'); g.drawImage(im,0,0);
  return {w:im.naturalWidth,type:f.type,size:f.size,corner:g.getImageData(1,1,1,1).data[3]}; },key);
const addPhoto=async(name,b64)=>{ const before=await st(()=>__db.media.length); await st(()=>{ goPage(state.pages.length-1); pendingKind='image'; pendingSlot=null; });
  await pg.setInputFiles('#file',{name,mimeType:'image/png',buffer:Buffer.from(b64,'base64')});
  for(let i=0;i<40 && (await st(()=>__db.media.length))===before;i++) await pg.waitForTimeout(150); await pg.waitForTimeout(300);
  return st(()=>{ const m=__db.media[__db.media.length-1], up=(__mediaCalls||[]).filter(c=>c.action==='upload').pop(); return {m, up, pk:m.storage_path.replace(/(\.[a-z0-9]{1,8})$/i,'@print$1')}; }); };

// ── 큰 사진(3000×2000): 두 벌 ──
const big=await addPhoto('big.png',await mk(3000,2000,false));
{ const d=await fileInfo(big.m.storage_path), p=await fileInfo(big.pk);
  ok('큰 사진: 화면용 긴 변 1400px JPEG', d && d.w===1400 && d.type==='image/jpeg', JSON.stringify(d));
  ok('큰 사진: 인쇄용 원본 긴 변 2700px JPEG(같은 폴더 @print)', p && p.w===2700 && p.type==='image/jpeg', JSON.stringify(p));
  ok('큰 사진: 올리기 요청에 인쇄용 크기 · 기록 크기는 두 벌 합계', big.up.print && big.up.print.size===p.size && big.m.size_bytes===d.size+p.size, JSON.stringify({up:big.up.print,sz:big.m.size_bytes}));
  ok('큰 사진: 안내에 「인쇄용 원본은 따로 보관」', /인쇄용 원본은 따로 보관/.test(await pg.locator('#toast').innerText()), await pg.locator('#toast').innerText());
  const el=await st(id=>state.pages.flatMap(p=>p.els).find(e=>e.media_id===id),big.m.id);
  ok('① 편집기 화면의 사진 = 화면용(1400px)', (await dimsOf(el.src))?.w===1400); }
// ── 작은 사진(800×600): 한 벌만 ──
const small=await addPhoto('small.png',await mk(800,600,false));
ok('작은 사진(1400px 이하): 한 벌만(인쇄용 자리 요청 없음)', !small.up.print && !(await st(k=>!!window.__files[k],small.pk)) && small.m.size_bytes===(await fileInfo(small.m.storage_path)).size);
// ── 투명 큰 사진(3000×3000): 두 벌 모두 PNG·투명 그대로 ──
const clear=await addPhoto('logo.png',await mk(3000,3000,true));
{ const d=await fileInfo(clear.m.storage_path), p=await fileInfo(clear.pk);
  ok('투명 큰 사진: 화면용 1400px · 인쇄용 2700px 모두 PNG · 바탕 투명', d&&p && d.w===1400 && p.w===2700 && d.type==='image/png' && p.type==='image/png' && d.corner===0 && p.corner===0, JSON.stringify({d,p})); }

// ── 새 화면 + 두 벌을 모르는 예전 서버 함수(배포 순서가 어긋나도): 화면용 한 벌로 정상 ──
await st(()=>{ window.__oldMediaFn=true; });
{ const o=await addPhoto('old-fn.png',await mk(3000,2000,false)); const d=await fileInfo(o.m.storage_path);
  ok('예전 서버 함수: 화면용 한 벌로 올라가고 기록 크기 = 그 한 벌', d && d.w===1400 && !(await st(k=>!!window.__files[k],o.pk)) && o.m.size_bytes===d.size, JSON.stringify(d));
  await st(id=>{ const p=state.pages[state.pages.length-1]; p.els=p.els.filter(e=>e.media_id!==id); renderAll(); },o.m.id); }
await st(()=>{ window.__oldMediaFn=false; });
// ── 내려받기: 화면용 전자책은 화면용, 인쇄용 전자책은 인쇄용 원본 ──
const imgWidths=async h=>{ const srcs=[...h.matchAll(/<img[^>]*src="(data:image\/[^"]+)"/g)].map(m=>m[1]).concat([...h.matchAll(/src=\\"(data:image\/[^"\\]+)\\"/g)].map(m=>m[1]));
  const out=[]; for(const s of srcs) out.push((await dimsOf(s))?.w); return out.sort((a,b)=>a-b); };
const download=async kind=>{ await st(()=>{ window.__mediaCalls=[]; }); await pg.click('#btnExport'); await pg.waitForSelector('#exDlg:not([hidden])');
  const [d]=await Promise.all([pg.waitForEvent('download'),pg.click(`#exDlg [data-ex=${kind}]`)]); const fp=`/tmp/photo2-${kind}.html`; await d.saveAs(fp);
  return {h:fs.readFileSync(fp,'utf8'), calls:await st(()=>window.__mediaCalls.filter(c=>c.action==='sign'))}; };
{ const {h,calls}=await download('print'); const ws=await imgWidths(h);
  ok('② 인쇄용 전자책: 큰 사진·투명 사진은 인쇄용 원본(2700px)', ws.filter(w=>w===2700).length===2 && !ws.includes(1400), JSON.stringify(ws));
  ok('③ 인쇄용 전자책: 예전 사진·작은 사진(인쇄용 없음)도 그대로 들어감', ws.length===4 && ws.includes(800), JSON.stringify(ws));
  ok('인쇄용 전자책: 서명 요청이 variant print', calls.length>0 && calls.every(c=>c.variant==='print')); }
{ const {h,calls}=await download('screen'); const ws=await imgWidths(h);
  ok('① 화면용 전자책: 화면용(1400px)만, 인쇄용 원본 없음', ws.filter(w=>w===1400).length===2 && !ws.includes(2700), JSON.stringify(ws));
  ok('① 화면용 전자책: 서명 요청에 variant 없음', calls.length>0 && calls.every(c=>!c.variant)); }
// 미리보기·편집기 다시 열기도 화면용
await st(()=>{ window.__mediaCalls=[]; }); await pg.reload(); await pg.waitForSelector('#canvas .pg'); await pg.waitForTimeout(800);
ok('① 편집기를 다시 열 때 서명 요청에 variant 없음', await st(()=>(window.__mediaCalls||[]).filter(c=>c.action==='sign').every(c=>!c.variant) && (window.__mediaCalls||[]).some(c=>c.action==='sign')));
// 서가 독자: 공개한 뒤 서가에서 받는 주소는 화면용
await st(()=>{ const b=__db.books[0]; b.is_public=true; b.published_at=new Date().toISOString(); __persist(); });
await pg.click('#btnPublish'); await pg.waitForTimeout(800);
{ const g=await ctx.newPage(); await g.goto(`${U}/shelf/#/book/${BK}`); await g.waitForSelector('.bk-pg'); await g.waitForTimeout(800);
  const calls=await g.evaluate(()=>(window.__mediaCalls||[]).filter(c=>c.action==='sign'));
  ok('① 서가: 서명 요청에 variant 없음(인쇄용 원본은 서가로 안 나감)', calls.length>0 && calls.every(c=>!c.variant)); await g.close(); }
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
