import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import((p=>/^[A-Za-z]:/.test(p)?'file:///'+p.replace(/\\/g,'/'):p)(R+'/playwright/index.mjs'));
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=process.env.MOA_ROOT||'/home/user/LiveBecomeHistory';
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':'text/html'});res.end(d);} }); }).listen(8768);
const b=await chromium.launch({executablePath:process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:1000,height:1000}});
const BID='a12c83aa-33e6-49ed-91be-bc883000bb9e', now=new Date().toISOString();
const M={img:'6584bdba-a887-4a12-af11-399f84d88ef5',vid:'c7fc822d-e3fd-4b8a-9717-0278145fa41c',aud:'4b176f40-9077-4275-8e5a-4bf9a3c7122c'};
const seed={books:[{id:BID,owner_id:'u1',title:'한결C와 슬아',subtitle:'인물대백과사 첫 자서전',author_name:'김정선',is_public:true,admin_hidden:false,deleted_at:null,published_at:now,created_at:now,updated_at:now}],
 chapters:[{id:'c0',book_id:BID,position:0,title:'첫 번째 이야기',content:'인물대백과사에 오르는 첫 자서전<div>한결C와 슬아의 이야기</div>'},
  {id:'c1',book_id:BID,position:1,title:'새 이야기 2',content:`<p><img data-media="${M.img}"></p>`},
  {id:'c2',book_id:BID,position:2,title:'새 이야기 3',content:`<p><video data-media="${M.vid}"></video></p>`},
  {id:'c3',book_id:BID,position:3,title:'새 이야기 4',content:`너라는 등대<div><p><audio data-media="${M.aud}"></audio></p></div><div>한결C 작사/작곡</div><div>수노 노래</div>`}],
 media:[{id:M.img,book_id:BID,storage_path:'p/i.jpeg'},{id:M.vid,book_id:BID,storage_path:'p/v.mp4'},{id:M.aud,book_id:BID,storage_path:'p/a.mp3'}]};
await ctx.addInitScript(s=>{ window.__seed=s; },seed);
const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
await pg.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(process.argv[2],'utf8')+`\n;(function(){const _c=window.supabase.createClient;window.supabase.createClient=function(){const c=_c();c.storage.from=()=>({async createSignedUrl(p){return {data:{signedUrl:'data:application/octet-stream;base64,AAAA#'+p}}}});return c;}})();`}));
await pg.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
const ok=(n,c)=>console.log((c?'PASS ':'FAIL ')+n);
await pg.goto('http://localhost:8768/shelf/#/book/'+BID); await pg.waitForSelector('.cover'); await pg.waitForTimeout(400);
ok('표지: 제목·부제·지은이', (await pg.locator('.cover').innerText()).includes('한결C와 슬아')&&(await pg.locator('.cover').innerText()).includes('인물대백과사 첫 자서전')&&(await pg.locator('.cover').innerText()).includes('김정선'));
ok('목차 4장', (await pg.locator('.toc li').count())===4);
ok('1장 글 표시(태그 없는 글+div)', (await pg.locator('#c0').innerText()).includes('한결C와 슬아의 이야기'));
ok('2장 사진(img)', await pg.locator('#c1 img[src]').count()===1);
ok('3장 영상(video 컨트롤)', await pg.evaluate(()=>{const v=document.querySelector('#c2 video');return !!v&&v.controls&&!!v.src}));
ok('4장 노래(내려받기 메뉴 없는 재생기)', await pg.evaluate(()=>{const ap=document.querySelector('#c3 .oldap .ap');return !!ap&&!!ap._audio&&!!ap._audio.src&&!document.querySelector('#c3 audio[controls]')}));
ok('4장 노래 앞뒤 글도 표시', (await pg.locator('#c3').innerText()).includes('너라는 등대')&&(await pg.locator('#c3').innerText()).includes('수노 노래'));
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await pg.screenshot({path:'/tmp/realbook.png',fullPage:true});
await b.close(); srv.close();
