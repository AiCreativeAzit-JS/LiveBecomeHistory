// 대용량 미디어 보관: 수정요청서 1차(2026-10-16) R04 · 점검표 T13·T14 (+ 2차 R08 T31 미디어 1건 포함 실패)
// 로그인 책에 15MB 아래(노래 1MB)·위(영상 20MB) 미디어를 두고 화면용 전자책을 내려받는다
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import(R+'/playwright/index.mjs');
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/home/user/LiveBecomeHistory';
const types={'.html':'text/html','.js':'application/javascript'};
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':types[path.extname(f)]||'text/plain'});res.end(d);} }); }).listen(8784);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const FAKE=fs.readFileSync(process.argv[2],'utf8'); const now=new Date().toISOString(); const U='http://localhost:8784';
const ok=(n,c,info='')=>console.log((c?'PASS ':'FAIL ')+n+(info&&!c?'  ← '+info:''));
const BK='8b000000-0000-4000-8000-000000000001', AUD='8c000000-0000-4000-8000-000000000001', VID='8c000000-0000-4000-8000-000000000002';
const MB=1048576;
const seed={profiles:[{id:'u1',display_name:'김정선'}],
 books:[{id:BK,owner_id:'u1',title:'큰 영상 책',author_name:'김정선',format:'pages',is_public:false,admin_hidden:false,deleted_at:null,created_at:now,updated_at:now}],
 media:[{id:AUD,book_id:BK,owner_id:'u1',kind:'audio',storage_path:'u1/bk/a.mp3',size_bytes:1*MB},{id:VID,book_id:BK,owner_id:'u1',kind:'video',storage_path:'u1/bk/v.mp4',size_bytes:20*MB}],
 pages:[{id:'8d000000-0000-4000-8000-000000000001',book_id:BK,position:0,name:'노래',bg:'#FFFFFF',flow_from:null,els:[{id:'e1',type:'audio',x:16,y:40,w:120,h:34,name:'',media_id:AUD}]},
        {id:'8d000000-0000-4000-8000-000000000002',book_id:BK,position:1,name:'영상',bg:'#FFFFFF',flow_from:null,els:[{id:'e2',type:'video',x:16,y:40,w:120,h:67.5,name:'',media_id:VID}]}]};
const ctx=await b.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
await ctx.addInitScript(s=>{ window.__seed=s; localStorage.setItem('fakeSession',JSON.stringify({user:{id:'u1',email:'a@b.c'}})); },seed);
await ctx.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:FAKE}));
await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
const pg=await ctx.newPage(); const errs=[], dialogs=[]; pg.on('pageerror',e=>errs.push('PAGEERR '+e.message));
let answer=true; pg.on('dialog',d=>{ dialogs.push(d.message()); (answer?d.accept():d.dismiss()).catch(()=>{}); });
const st=(f,a)=>pg.evaluate(f,a);
await pg.goto(`${U}/studio/?book=${BK}`); await pg.waitForSelector('#canvas .pg'); await pg.waitForTimeout(800);
// 저장소에 실제 크기의 파일(노래 1MB · 영상 20MB)
await st(MB=>{ window.__files['u1/bk/a.mp3']=new Blob([new Uint8Array(1*MB)],{type:'audio/mpeg'}); window.__files['u1/bk/v.mp4']=new Blob([new Uint8Array(20*MB)],{type:'video/mp4'}); },MB);
const download=async(kind='screen')=>{ await pg.click('#btnExport'); await pg.waitForSelector('#exDlg:not([hidden])'); const warn=await pg.locator('#exWarn').innerText();
  const dl=pg.waitForEvent('download',{timeout:60000}).catch(()=>null); await pg.click(`#exDlg [data-ex=${kind}]`); const d=await dl; if(!d) return {warn,h:null};
  const fp=`/tmp/r04-${kind}.html`; await d.saveAs(fp); return {warn,h:fs.readFileSync(fp,'utf8'),fp}; };

/* ── T13 15MB 아래·위 미디어 출력 ── */
{ const {h,fp}=await download('screen');
  ok('T13 15MB 아래 노래(1MB)는 파일 안에(data:)', /data:audio\/mpeg;base64,/.test(h));
  ok('T13 15MB 넘는 영상(20MB)도 파일 안에(data:) — 만료되는 링크 없음', /data:video\/mp4;base64,/.test(h) && !/X-Amz-|blob:|https?:\/\/[^"'\s]*\.(mp4|mp3)/.test(h) && fs.statSync(fp).size>20*MB*1.3, `${(fs.statSync(fp).size/MB).toFixed(1)}MB`);
  ok('T13 「이 파일 하나로 언제든」 안내와 실제 포함 방식이 일치', /이 파일 하나로 언제든 열어볼 수 있어요/.test(h));
  // T14 오프라인: 인터넷을 모두 막고 연 내려받은 파일 → 바깥 요청 없이 영상·노래가 파일 안 주소
  const off=await b.newContext(); const net=[]; await off.route('**/*',r=>{ if(r.request().url().startsWith('file:')) return r.continue(); net.push(r.request().url()); r.abort(); });
  const ex=await off.newPage(); await ex.goto('file://'+fp); await ex.waitForSelector('.bv-page'); await ex.waitForTimeout(400);
  const srcs=await ex.evaluate(async()=>{ const c=document.getElementById('book'), v=c._bv, out=[]; for(let i=0;i<v.count;i+=(v.spread?2:1)){ v.go(i,false); c.querySelectorAll('video').forEach(x=>out.push('v:'+x.src.slice(0,5))); c.querySelectorAll('.ap').forEach(x=>out.push('a:'+(x._audio?x._audio.src.slice(0,5):x.dataset.src?.slice(0,5)))); } return out; });
  ok('T14 인터넷 없이 연 파일: 영상·노래가 모두 파일 안 주소(data:) · 바깥 요청 0', srcs.length>=2 && srcs.every(s=>s.endsWith('data:')) && net.length===0, JSON.stringify({srcs,net}));
  await off.close(); }

/* ── 큰 책: 내려받기 전에 파일 크기 안내 ── */
await st(VID=>{ window.__realSize=mediaInfo[VID].size_bytes; mediaInfo[VID].size_bytes=120*1048576; },VID);
{ await pg.click('#btnExport'); await pg.waitForSelector('#exDlg:not([hidden])'); const w=await pg.locator('#exWarn').innerText();
  ok('영상·노래 합계가 크면(약 121MB) 내려받기 전에 파일 크기 안내', /약 121MB/.test(w), w); await pg.keyboard.press('Escape'); }
await st(VID=>{ mediaInfo[VID].size_bytes=window.__realSize; },VID);

/* ── T31(2차 R08) 미디어 1건을 담지 못했을 때 ── */
await st(AUD=>{ window.__realDl=MediaClient.download; MediaClient.download=async(sb,row,v)=>{ if(row.id===AUD) throw new Error('get_503'); return window.__realDl.call(MediaClient,sb,row,v); }; },AUD);
answer=false; dialogs.length=0;
{ const r=await download('screen');
  ok('T31 노래 1개를 담지 못하면 먼저 묻고(어떤 것이 몇 개인지), 「취소」면 내려받지 않음', r.h===null && dialogs.some(m=>/노래 1개를 파일에 담지 못했어요/.test(m)), JSON.stringify(dialogs));
  await pg.waitForTimeout(200); ok('T31 취소 뒤 안내 「내려받기를 멈췄어요」', /멈췄어요/.test(await pg.locator('#toast').innerText())); }
answer=true; dialogs.length=0;
{ const r=await download('screen'); await pg.waitForTimeout(300);
  ok('T31 「확인」이면 그것만 빼고 내려받음(깨진 링크·편집기 임시 주소 없음)', r.h && !/data:audio/.test(r.h) && /data:video\/mp4/.test(r.h) && !/blob:|X-Amz-/.test(r.h));
  ok('T31 내려받은 뒤 안내에 「담지 못한 1개는 빠졌어요」', /담지 못한 1개는 빠졌어요/.test(await pg.locator('#toast').innerText()), await pg.locator('#toast').innerText()); }
await st(()=>{ MediaClient.download=window.__realDl; });
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
