// 홈(랜딩) 상단 메뉴의 「로그인 / 내 서재」(대표 지적 D47): 컴퓨터·폰 모두 첫 화면 상단에서 한 번에 로그인 화면으로
import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import((p=>/^[A-Za-z]:/.test(p)?'file:///'+p.replace(/\\/g,'/'):p)(R+'/playwright/index.mjs'));
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=process.env.MOA_ROOT||'/home/user/LiveBecomeHistory';
const TYPES={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':TYPES[path.extname(f)]||'application/octet-stream'});res.end(d);} }); }).listen(8797);
const b=await chromium.launch({executablePath:process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const U='http://localhost:8797';
const ok=(n,c,info)=>console.log((c?'PASS ':'FAIL ')+n+(c||info===undefined?'':'  ← '+info));
const errs=[];
const KEY='sb-qsucbnvicaviatdpnfxx-auth-token';
const page=async(w,h,store)=>{ const ctx=await b.newContext({viewport:{width:w,height:h}}); if(store!==undefined) await ctx.addInitScript(([k,v])=>{ localStorage.setItem(k,v); },[KEY,store]);
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('PAGEERR '+e.message));
  await pg.route(/fonts\.(googleapis|gstatic)\.com|docs\.google\.com/,r=>r.abort());
  await pg.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(process.argv[2],'utf8')}));
  await pg.goto(U+'/'); await pg.waitForSelector('header .links'); return pg; };
const nav=pg=>pg.evaluate(()=>{ const vis=e=>{ const r=e.getBoundingClientRect(), s=getComputedStyle(e); return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'; };
  const a=document.getElementById('navLogin'), r=a?a.getBoundingClientRect():null;
  return { links:[...document.querySelectorAll('header .links a')].filter(vis).map(x=>x.textContent.trim()), login:a?{text:a.textContent.trim(),href:a.getAttribute('href'),visible:vis(a),top:Math.round(r.top),right:Math.round(r.right)}:null,
    overflowX: document.documentElement.scrollWidth>innerWidth, linksInside:[...document.querySelectorAll('header .links a')].filter(vis).every(x=>x.getBoundingClientRect().right<=innerWidth+0.5), w:innerWidth }; });

// ① 컴퓨터(1280): 상단에 「로그인」, /editor/ 로
{ const pg=await page(1280,800); const n=await nav(pg);
  ok('컴퓨터: 상단 메뉴에 「로그인」이 보임(첫 화면 위쪽)', !!n.login && n.login.visible && n.login.text==='로그인' && n.login.top<80, JSON.stringify(n.login));
  ok('컴퓨터: 「로그인」은 로그인 화면(/editor/)으로', n.login?.href==='/editor/');
  ok('컴퓨터: 메뉴 순서 모아 편집기 · 서가 · 로그인', n.links.slice(0,3).join('·')==='모아 편집기·서가·로그인', n.links.join('·'));
  await pg.click('#navLogin'); await pg.waitForURL(/\/editor\/$/); await pg.waitForSelector('#f');
  ok('컴퓨터: 누르면 로그인 화면이 열림', (await pg.locator('h1').innerText())==='로그인');
  await pg.context().close(); }
// ② 폰(375·320): 강조 메뉴만 남는 폭에서도 「로그인」이 보이고, 넘침 없음
for(const w of [375,320]){ const pg=await page(w,740); const n=await nav(pg);
  ok(`폰 ${w}px: 상단에 모아 편집기 · 서가 · 로그인 · 문의하기`, n.links.join('·')==='모아 편집기·서가·로그인·문의하기 ↗', n.links.join('·'));
  ok(`폰 ${w}px: 가로 넘침 없고 메뉴가 화면 안에`, !n.overflowX && n.linksInside, JSON.stringify(n));
  ok(`폰 ${w}px: 「로그인」이 첫 화면 위쪽(헤더 안)`, !!n.login && n.login.visible && n.login.top<120, JSON.stringify(n.login));
  if(w===375) await pg.screenshot({path:path.join(process.env.TEMP||'/tmp','home-375.png')});
  await pg.context().close(); }
// ③ 이 기기에 로그인 기록이 있으면 「내 서재」(같은 자리, 같은 주소)
{ const pg=await page(1280,800,JSON.stringify({access_token:'x',refresh_token:'y',user:{id:'u1'}})); const n=await nav(pg);
  ok('로그인 기록이 있으면 「내 서재」로 바뀜(주소는 /editor/)', n.login?.text==='내 서재' && n.login?.href==='/editor/', JSON.stringify(n.login));
  await pg.context().close(); }
{ const pg=await page(375,740,JSON.stringify({access_token:'x',refresh_token:'y'})); const n=await nav(pg);
  ok('폰에서도 「내 서재」, 넘침 없음', n.login?.text==='내 서재' && !n.overflowX && n.linksInside, JSON.stringify(n));
  await pg.context().close(); }
// ④ 기록이 깨져 있으면 그냥 「로그인」(오류 없이)
{ const pg=await page(1280,800,'{깨진값'); const n=await nav(pg);
  ok('깨진 로그인 기록이면 「로그인」 그대로', n.login?.text==='로그인', JSON.stringify(n.login));
  await pg.context().close(); }
// ⑤ 기존 본문 바로가기(「계정이 있다면 로그인 · 내 서재 →」)도 그대로
{ const pg=await page(1280,800); ok('본문 바로가기 「계정이 있다면 로그인 · 내 서재 →」 유지', await pg.locator('#services a[href="/editor/"]').count()===1); await pg.context().close(); }
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
