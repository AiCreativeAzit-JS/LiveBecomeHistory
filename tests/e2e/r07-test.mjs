// 세로·정사각 영상이 잘리지 않게: 수정요청서 2차(2026-10-16) R07 · 점검표 T29
// 9:16·1:1·16:9 표식 영상을 편집·미리보기·화면용 전자책에서 비교한다(시험용 크로미움은 MP4를 못 열어 WebM)
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import((p=>/^[A-Za-z]:/.test(p)?'file:///'+p.replace(/\\/g,'/'):p)(R+'/playwright/index.mjs'));
import http from 'http'; import fs from 'fs'; import path from 'path'; import os from 'os';
const ROOT=process.env.MOA_ROOT||'/home/user/LiveBecomeHistory';
const types={'.html':'text/html','.js':'application/javascript'};
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':types[path.extname(f)]||'text/plain'});res.end(d);} }); }).listen(8789);
const b=await chromium.launch({executablePath:process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const pg=await (await b.newContext({viewport:{width:1440,height:1000},acceptDownloads:true})).newPage();
const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('dialog',d=>d.accept().catch(()=>{}));
await pg.route(/fonts\.|supabase-js|jsdelivr|unpkg/,r=>r.abort());
const ok=(n,c,info='')=>console.log((c?'PASS ':'FAIL ')+n+(info&&!c?'  ← '+info:''));
const st=(f,a)=>pg.evaluate(f,a);
const MEDIA=f=>fs.readFileSync(ROOT+'/tests/e2e/media/'+f);
await pg.goto('http://localhost:8789/studio/?blank=1'); await pg.waitForSelector('#canvas .pg');
const put=async(slotPage,file)=>{ const before=await st(()=>state.pages.flatMap(p=>p.els).filter(e=>e.type==='video').map(e=>e.id)), n=before.length;
  await st(sp=>{ if(sp!=null){ goPage(sp); pendingSlot=state.pages[sp].els.find(e=>e.type==='slot').id; } else { goPage(1); pendingSlot=null; } pendingKind='video'; },slotPage);
  await pg.setInputFiles('#file',{name:file,mimeType:'video/webm',buffer:MEDIA(file)});
  for(let t=0;t<40 && (await st(()=>state.pages.flatMap(p=>p.els).filter(e=>e.type==='video').length))===n;t++) await pg.waitForTimeout(100);
  return st(before=>{ const v=state.pages.flatMap(p=>p.els).find(e=>e.type==='video'&&!before.includes(e.id)); return v?{ratio:v.h/v.w, w:v.w, h:v.h, id:v.id}:null; },before); };
const near=(a,b)=>Math.abs(a-b)<0.02;
// 9:16 세로 영상 → 16:9 견본 자리(4쪽)에: 자리 안에 세로 그대로
const tall=await put(3,'tall.webm');
ok('T29 9:16 세로 영상을 16:9 견본 자리에 → 상자도 세로(16/9) · 자리 안에', near(tall.ratio,16/9) && tall.h<=await st(()=>CW*9/16+0.01), JSON.stringify(tall));
// 1:1 영상 → 「영상」 단추(빈 곳·새 페이지)
const sq=await put(null,'square.webm'); ok('T29 1:1 영상 → 상자도 정사각', near(sq.ratio,1), JSON.stringify(sq));
const wide=await put(null,'tiny.webm'); ok('T29 16:9 영상 → 상자 16:9(전과 같음)', near(wide.ratio,9/16), JSON.stringify(wide));
// 편집 화면: 영상은 전체 보기(잘리지 않음)
ok('T29 편집 화면의 영상은 전체 보기(object-fit: contain)', await st(id=>{ const p=state.pages.findIndex(p=>p.els.some(e=>e.id===id)); goPage(p); const v=document.querySelector(`#canvas .el[data-id="${id}"] video`); return v && getComputedStyle(v).objectFit==='contain'; },tall.id));
// 미리보기
await pg.click('#btnPreview'); await pg.waitForSelector('#pv:not([hidden])'); await pg.waitForTimeout(300);
ok('T29 미리보기의 영상도 전체 보기(모든 펼침면)', await st(()=>{ const c=$('pvBody'), v=c._bv, fits=[]; for(let i=0;i<v.count;i+=(v.spread?2:1)){ v.go(i,false); c.querySelectorAll('video').forEach(x=>fits.push(getComputedStyle(x).objectFit)); } return fits.length===3 && fits.every(f=>f==='contain'); }));
await pg.keyboard.press('Escape');
// 화면용 전자책
{ await pg.click('#btnExport'); const [d]=await Promise.all([pg.waitForEvent('download'),pg.click('#exDlg [data-ex=screen]')]); const fp=path.join(os.tmpdir(),'r07.html'); await d.saveAs(fp);
  const ex=await pg.context().newPage(); await ex.goto('file:///'+fp.split(path.sep).join('/').replace(/^[/]+/,'')); await ex.waitForSelector('.bv-page'); await ex.waitForTimeout(300);
  const fits=await ex.evaluate(()=>{ const c=document.getElementById('book'), v=c._bv, out=[]; for(let i=0;i<v.count;i+=(v.spread?2:1)){ v.go(i,false); c.querySelectorAll('video').forEach(x=>{ const r=x.parentElement.getBoundingClientRect(); out.push({fit:getComputedStyle(x).objectFit, ratio:+(r.height/r.width).toFixed(2)}); }); } return out; });
  ok('T29 화면용 전자책: 영상 3개 모두 전체 보기 · 상자 비율 = 영상 비율(세로·정사각·가로)', fits.length===3 && fits.every(f=>f.fit==='contain') && fits.some(f=>near(f.ratio,16/9)) && fits.some(f=>near(f.ratio,1)) && fits.some(f=>near(f.ratio,9/16)), JSON.stringify(fits)); await ex.close(); }
ok('T29 서가·비밀 링크(공통 책 그리기)도 영상은 전체 보기', /\.bk-pg video\{object-fit:contain\}/.test(fs.readFileSync(ROOT+'/lib/book-render.js','utf8')));
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
