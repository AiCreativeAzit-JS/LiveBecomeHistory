// 출력·파일 신뢰성: 수정요청서 2차(2026-10-16) F08 인쇄 QR · F09 투명 PNG · F10 열리지 않는 파일 — 점검표 T23~T26, T28
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import(R+'/playwright/index.mjs');
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/home/user/LiveBecomeHistory';
const types={'.html':'text/html','.js':'application/javascript'};
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':types[path.extname(f)]||'text/plain'});res.end(d);} }); }).listen(8776);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const FAKE=fs.readFileSync(process.argv[2],'utf8'); const now=new Date().toISOString(); const U='http://localhost:8776';
const MEDIA=f=>fs.readFileSync(ROOT+'/tests/e2e/media/'+f);
const ok=(n,c,info='')=>console.log((c?'PASS ':'FAIL ')+n+(info&&!c?'  ← '+info:''));
const errs=[];
const open=async(ctx)=>{ const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('dialog',d=>d.accept().catch(()=>{})); return pg; };
const download=async(pg,kind)=>{ await pg.click('#btnExport'); await pg.waitForSelector('#exDlg:not([hidden])');
  const warn=await pg.locator('#exWarn').innerText();
  const [d]=await Promise.all([pg.waitForEvent('download'),pg.click(`#exDlg [data-ex=${kind}]`)]); const fp=`/tmp/output-${kind}.html`; await d.saveAs(fp); return {warn,h:fs.readFileSync(fp,'utf8')}; };
const qrs=h=>(h.match(/<div class="qr"><svg/g)||[]).length, noqrs=h=>(h.match(/class="qr noqr"/g)||[]).length;

/* ═════ 1) 체험 책(로그인 없음) ═════ */
{ const ctx=await b.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  await ctx.route(/fonts\.|supabase-js|jsdelivr|unpkg/,r=>r.abort());
  const pg=await open(ctx); const st=(f,a)=>pg.evaluate(f,a);
  await pg.goto(`${U}/studio/?blank=1`); await pg.waitForSelector('#canvas .pg');
  const slotOf=i=>st(i=>state.pages[i].els.find(e=>e.type==='slot').id,i);
  const put=async(kind,slot,file)=>{ await st(([k,s])=>{ pendingKind=k; pendingSlot=s; },[kind,slot]); await pg.setInputFiles('#file',file); await pg.waitForTimeout(700); };
  const toastNow=()=>pg.locator('#toast').innerText();
  const book=()=>st(()=>serialize()+'|'+history.length);

  // ── F10 · T26 열리지 않는 사진: 자리·원고 그대로, 안내 ──
  const s3=await slotOf(2);
  for(const [nm,mime,buf] of [['invalid-image.png','image/png',Buffer.from('MOA TEST: invalid image payload')],
                              ['broken.jpg','image/jpeg',Buffer.concat([Buffer.from([0xFF,0xD8,0xFF,0xE0]),Buffer.from('broken jpeg body')])],
                              ['empty.png','image/png',Buffer.alloc(0)]]){
    const before=await book();
    await put('image',s3,{name:nm,mimeType:mime,buffer:buf});
    ok(`T26 깨진 사진(${nm}) 자리에 넣기 → 자리·원고·되돌리기 기록 그대로`, (await book())===before && await st(s=>state.pages[2].els.some(e=>e.id===s),s3));
    ok(`T26 ${nm}: 성공 대신 「열리지 않아요 · 다시 골라 주세요」 안내`, /열리지 않아요.*다시 골라/.test(await toastNow()), await toastNow());
  }
  { const before=await book(); await st(()=>{ goPage(0); }); await st(()=>{ pendingKind='image'; pendingSlot=null; });
    await st(()=>{ state.pages[0].els=state.pages[0].els.filter(e=>e.type!=='slot'); }); const b2=await book();
    await pg.setInputFiles('#file',{name:'x.png',mimeType:'image/png',buffer:Buffer.from('not an image')}); await pg.waitForTimeout(600);
    ok('T26 「사진」 단추로 넣을 때도 깨진 파일은 새 상자·새 쪽 없음', (await book())===b2); }
  await pg.goto(`${U}/studio/?blank=1`); await pg.waitForSelector('#canvas .pg');

  // ── F10 · T28 열리지 않는 영상·노래: 0초 정상·성공으로 넘기지 않음 ──
  const s4=await slotOf(3), s5=await slotOf(4);
  for(const [kind,slot,nm,mime,buf,label] of [['video',s4,'broken.mp4','video/mp4',Buffer.from('fakevideobytes'),'깨진 영상'],
      ['video',s4,'broken.webm','video/webm',MEDIA('tiny.webm').subarray(0,40),'잘린 영상'],
      ['audio',s5,'broken.mp3','audio/mpeg',Buffer.from('ID3fakeaudiobytes'),'깨진 노래']]){
    const before=await book(); await put(kind,slot,{name:nm,mimeType:mime,buffer:buf});
    ok(`T28 ${label} → 자리·원고 그대로 + 「열리지 않아요」 안내`, (await book())===before && /열리지 않아요/.test(await toastNow()), await toastNow());
  }
  { const before=await book(); await put('video',s4,{name:'long.webm',mimeType:'video/webm',buffer:MEDIA('long.webm')});
    ok('61초 영상 → 길이 제한 안내(넣지 않음)', (await book())===before && /60초 이하/.test(await toastNow()), await toastNow()); }

  // ── F08 · T23 체험 책에 직접 넣은 영상·노래 → 인쇄용에 열 곳 없는 QR을 넣지 않음 ──
  await put('video',s4,{name:'v.webm',mimeType:'video/webm',buffer:MEDIA('tiny.webm')});
  ok('진짜 영상(1초 WebM)은 그 자리에 들어감', await st(()=>state.pages[3].els.some(e=>e.type==='video')) && /영상을 넣었어요/.test(await toastNow()));
  await put('audio',s5,{name:'tone.mp3',mimeType:'audio/mpeg',buffer:MEDIA('tone.mp3')});
  ok('진짜 노래(1초 MP3)는 그 자리에 들어감', await st(()=>state.pages[4].els.some(e=>e.type==='audio')) && /노래를 넣었어요/.test(await toastNow()));
  { const {warn,h}=await download(pg,'print');
    ok('T23 내려받기 안내: 체험 책 영상·노래는 QR 코드가 없다고 미리 알림', /체험 책에 넣은 영상·노래/.test(warn) && /QR 코드 대신/.test(warn) && /로그인/.test(warn), warn);
    ok('T23 인쇄용: QR 0개 · 영상·노래 자리 2곳은 「화면용 전자책에서」 안내', qrs(h)===0 && noqrs(h)===2 && /화면용 전자책에서 볼 수 있어요/.test(h) && /화면용 전자책에서 들을 수 있어요/.test(h));
    ok('T23 인쇄용: 「찍으면 재생돼요」·서가 첫 화면 주소 없음', !/찍으면/.test(h) && !/shelf\//.test(h)); }
  await pg.keyboard.press('Escape');

  // ── F09 · T25 투명 PNG: 화면용 크기(1400px) 아래·경계·위 모두 투명 유지, 출력도 같음 ──
  await st(()=>{ state.pages[2].bg='#16261F'; renderAll(); });
  const mk=(n,alpha)=>st(([n,alpha])=>new Promise(res=>{ const c=document.createElement('canvas'); c.width=c.height=n; const g=c.getContext('2d');
    if(!alpha){ g.fillStyle='#E9D8A6'; g.fillRect(0,0,n,n); } g.fillStyle='#C0392B'; g.beginPath(); g.arc(n/2,n/2,n/3,0,7); g.fill();
    c.toBlob(bl=>{ const r=new FileReader(); r.onload=()=>res(r.result.split(',')[1]); r.readAsDataURL(bl); },'image/png'); }),[n,alpha]);
  const look=()=>st(()=>new Promise(res=>{ const e=state.pages[2].els.find(e=>e.type==='image'); if(!e) return res(null); const im=new Image();
    im.onload=()=>{ const c=document.createElement('canvas'); c.width=im.naturalWidth; c.height=im.naturalHeight; const g=c.getContext('2d'); g.drawImage(im,0,0);
      res({type:e.src.slice(5,e.src.indexOf(';')), w:im.naturalWidth, corner:g.getImageData(1,1,1,1).data[3], mid:g.getImageData(c.width>>1,c.height>>1,1,1).data[3]}); }; im.src=e.src; }));
  const results={};
  for(const n of [1200,1400,2200]){
    const s3b=await slotOf(2); await put('image',s3b,{name:`alpha-${n}.png`,mimeType:'image/png',buffer:Buffer.from(await mk(n,true),'base64')}); await pg.waitForTimeout(400);
    const r=await look(); results[n]=r;
    ok(`T25 투명 PNG ${n}px → PNG·바탕 투명 그대로(모서리 투명, 가운데 불투명)`, r && r.type==='image/png' && r.corner===0 && r.mid===255, JSON.stringify(r));
    ok(`T25 ${n}px → 긴 변 ${Math.min(n,1400)}px`, r && r.w===Math.min(n,1400), JSON.stringify(r));
    if(n===2200){ ok('T25 2200px 「넣었어요」 안내에 줄인 사실 + 「투명한 바탕은 그대로」', /넣었어요.*줄였어요.*투명한 바탕은 그대로/.test(await toastNow()), await toastNow());
      const scr=await download(pg,'screen'), prt=await download(pg,'print'); const src=await st(()=>state.pages[2].els.find(e=>e.type==='image').src);
      ok('T25 내보내기(화면용·인쇄용)에도 같은 투명 PNG', scr.h.includes(src.slice(0,200)) && prt.h.includes(src.slice(0,200)) && src.startsWith('data:image/png')); }
    await pg.keyboard.press('Control+z'); await pg.waitForTimeout(150);
  }
  { const s3b=await slotOf(2); await put('image',s3b,{name:'photo-2200.png',mimeType:'image/png',buffer:Buffer.from(await mk(2200,false),'base64')}); await pg.waitForTimeout(400);
    const r=await look(); ok('대조: 투명 없는 큰 PNG(일반 사진)는 화면용 1400px JPEG로 줄임', r && r.type==='image/jpeg' && r.w===1400, JSON.stringify(r)); }
  await ctx.close(); }

/* ═════ 2) 로그인 책: 미발행 → 비밀 링크 → 발행 뒤 새로 넣은 노래 → 서가 발행 (T24) ═════ */
{ const BK='83000000-0000-4000-8000-000000000001', AUD='84000000-0000-4000-8000-000000000001', AUD2='84000000-0000-4000-8000-000000000002';
  const seed={profiles:[{id:'u1',display_name:'김정선'}],
   books:[{id:BK,owner_id:'u1',title:'노래 책',author_name:'김정선',format:'pages',is_public:false,admin_hidden:false,deleted_at:null,created_at:now,updated_at:now}],
   media:[{id:AUD,book_id:BK,owner_id:'u1',kind:'audio',storage_path:'u1/bk/a.mp3',size_bytes:100},{id:AUD2,book_id:BK,owner_id:'u1',kind:'audio',storage_path:'u1/bk/b.mp3',size_bytes:100}],
   pages:[{id:'85000000-0000-4000-8000-000000000001',book_id:BK,position:0,name:'노래',bg:'#FFFFFF',flow_from:null,els:[{id:'e3',type:'audio',x:16,y:40,w:120,h:34,name:'',media_id:AUD}]}]};
  const ctx=await b.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  await ctx.addInitScript(s=>{ window.__seed=s; localStorage.setItem('fakeSession',JSON.stringify({user:{id:'u1',email:'a@b.c'}})); },seed);
  await ctx.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:FAKE}));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  const pg=await open(ctx); const st=(f,a)=>pg.evaluate(f,a);
  await pg.goto(`${U}/studio/?book=${BK}`); await pg.waitForSelector('#canvas .pg'); await pg.waitForTimeout(800);
  const qrOf=url=>st(u=>qrSVG(u),url);
  { const {warn,h}=await download(pg,'print');
    ok('T24 미발행: 안내에 「QR 코드로 열 곳이 없어요 · 발행하거나 비밀 링크」', /아직 발행하지 않은 책/.test(warn) && /비밀 링크/.test(warn), warn);
    ok('T24 미발행: 인쇄용 QR 0개 · 안내 1곳', qrs(h)===0 && noqrs(h)===1); }
  await pg.click('#btnShare'); await pg.waitForSelector('#shDlg:not([hidden])'); await pg.click('#shMake'); await pg.waitForSelector('#shUrl'); await pg.keyboard.press('Escape');
  const token=await st(()=>shareToken), shelf=await st(()=>PUBLIC_SHELF);
  { const {warn,h}=await download(pg,'print');
    ok('T24 비밀 링크: QR 1개 = 그 노래의 비밀 링크 주소', qrs(h)===1 && noqrs(h)===0 && h.includes(await qrOf(`${shelf}#/s/${token}/m/${AUD}`)));
    ok('T24 비밀 링크: 「링크를 끊으면 QR도 열리지 않아요」 안내', /비밀 링크로 열려요/.test(warn), warn); }
  // 링크를 만든 뒤 새로 넣은 노래(아직 링크 내용에 없음)
  await st(a2=>{ snap(); state.pages[0].els.push({id:'e4',type:'audio',x:16,y:90,w:120,h:34,name:'',media_id:a2}); renderAll(); },AUD2);
  { const {warn,h}=await download(pg,'print');
    ok('T24 링크 뒤 새로 넣은 노래: 그 1곳만 QR 대신 안내, 기존 노래는 QR', qrs(h)===1 && noqrs(h)===1 && !h.includes(await qrOf(`${shelf}#/s/${token}/m/${AUD2}`)));
    ok('T24 안내: 「새로 넣은 영상·노래 1개는 아직 QR 코드가 없어요 · 지금 내용으로 새로 고침」', /1개는 아직 QR 코드가 없어요/.test(warn) && /새로 고침/.test(warn), warn); }
  await pg.click('#btnPublish'); await pg.waitForTimeout(800);
  { const {warn,h}=await download(pg,'print');
    ok('T24 서가 발행: QR 2개 = 서가의 그 노래 주소', qrs(h)===2 && noqrs(h)===0 && h.includes(await qrOf(`${shelf}#/book/${BK}/m/${AUD}`)) && h.includes(await qrOf(`${shelf}#/book/${BK}/m/${AUD2}`)));
    ok('T24 서가 발행·최신: QR 경고 없음', !/QR 코드가 없어요|열 곳이 없어요/.test(warn), warn); }
  await ctx.close(); }
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
