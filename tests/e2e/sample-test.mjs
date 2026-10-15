import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/home/user/LiveBecomeHistory', FAKE=process.argv[2];
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':f.endsWith('.js')?'text/javascript':'text/html'});res.end(d);} }); }).listen(8800);
const B='26ac5df5-b3f1-400c-a03f-e77ccb6f0d39', IMG='aaaaaaaa-1111-4111-8111-111111111111', VID='bbbbbbbb-2222-4222-8222-222222222222';
const T=(id,html)=>({id,type:'text',x:16,y:20,w:120,h:30,html,fs:12,align:'left',color:'#222',font:'serif'});
const seed={books:[{id:B,owner_id:'u9',title:'한결C의 에세이 2편-등대의 시간',author_name:'김정선',is_public:true,admin_hidden:false,deleted_at:null,format:'pages'}],
  media:[{id:IMG,book_id:B,owner_id:'u9',kind:'image',storage_path:`u9/${B}/i.jpg`,size_bytes:200000},{id:VID,book_id:B,owner_id:'u9',kind:'video',storage_path:`u9/${B}/v.mp4`,size_bytes:1300000}],
  book_snapshots:[{book_id:B,title:'한결C의 에세이 2편-등대의 시간',author_name:'김정선',pages:[
    {id:'p1',position:0,name:'표지',bg:'#FFFFFF',flow_from:null,els:[T('t1','등대의 시간'),{id:'m1',type:'image',x:16,y:60,w:120,h:90,media_id:IMG,name:''}]},
    {id:'p2',position:1,name:'영상',bg:'#F1F5F3',flow_from:null,els:[T('t2','파도 소리'),{id:'m2',type:'video',x:16,y:60,w:120,h:70,media_id:VID,name:''}]},
    {id:'p3',position:2,name:'글',bg:'#FFFFFF',flow_from:null,els:[T('t3','<script>alert(1)</script>바다')]}]}]};
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:1366,height:850},acceptDownloads:true});
await ctx.addInitScript(s=>{ window.__seed=s; localStorage.setItem('noLogin','1'); },seed);
const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('dialog',d=>{ errs.push('DIALOG '+d.message()); d.dismiss(); });
await pg.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(FAKE,'utf8')})); await pg.route(/fonts\./,r=>r.abort());
const ok=(n,c)=>console.log((c?'PASS ':'FAIL ')+n);
await pg.goto('http://localhost:8800/studio/'); await pg.waitForSelector('#canvas .pg'); await pg.waitForTimeout(500);
ok('견본 책이 펼쳐짐(3쪽·제목)', await pg.evaluate(()=>state.pages.length===3 && state.title.includes('등대의 시간')));
ok('견본 사진·영상 주소가 들어감(media 함수)', await pg.evaluate(()=>state.pages.flatMap(p=>p.els).filter(e=>e.media_id&&e.src).length===2 && (window.__mediaCalls||[]).some(c=>c.action==='sign')));
ok('견본 글의 스크립트는 정제됨', await pg.evaluate(()=>!state.pages[2].els[0].html.includes('<script')));
ok('안내 띠: 견본 책 + 빈 책으로 시작', (await pg.locator('#demoBar').innerText()).includes('등대의 시간') && await pg.locator('#demoBar a[href="?blank=1"]').count()===1);
ok('원본 책은 그대로(저장 안 함)', await pg.evaluate(()=>!(window.__mediaCalls||[]).some(c=>c.action!=='sign')));
// 내려받기: 견본 미디어 빠짐 + 안내
await pg.click('#btnExport'); ok('내려받기 안내: 견본 미디어는 빠짐', (await pg.locator('#exWarn').innerText()).includes('저작권'));
const [dl]=await Promise.all([pg.waitForEvent('download'), pg.click('[data-ex=screen]')]); const html=fs.readFileSync(await dl.path(),'utf8');
ok('내려받은 책: 견본 사진·영상 없음, 글은 있음', !/<img[^>]+src=|<video/.test(html.replace(/data:image\/svg[^"]*/g,'')) && html.includes('등대의 시간'));
// 오른쪽 클릭 막기
ok('사진 오른쪽 클릭 메뉴 막음', await pg.evaluate(()=>{ const i=document.querySelector('#canvas img'); const ev=new MouseEvent('contextmenu',{bubbles:true,cancelable:true}); i.dispatchEvent(ev); return ev.defaultPrevented; }));
// 빈 책으로
await pg.evaluate(()=>{ window.onbeforeunload=null; }); 
await pg.goto('http://localhost:8800/studio/?blank=1'); await pg.waitForSelector('#canvas .pg'); await pg.waitForTimeout(400);
ok('빈 책으로 시작: 견본 3쪽 + 안내', await pg.evaluate(()=>!state.title.includes('등대')) && (await pg.locator('#demoBar').innerText()).includes('빈 책'));
console.log(errs.filter(e=>!e.startsWith('DIALOG')).join('\n')||'JS 오류 없음'); await b.close(); srv.close();
