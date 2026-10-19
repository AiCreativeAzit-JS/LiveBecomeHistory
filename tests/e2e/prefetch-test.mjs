// 책 보기: 앞뒤 펼침면 사진을 미리 받는지(넘기기 전에 요청이 나가는지)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/home/user/LiveBecomeHistory', FAKE=process.argv[2];
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; if(p.startsWith('/img/')){ res.writeHead(200,{'content-type':'image/svg+xml'}); res.end('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'); return; }
  const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p); fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':f.endsWith('.js')?'text/javascript':'text/html'});res.end(d);} }); }).listen(8802);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const pg=await b.newPage({viewport:{width:1366,height:850}}); const reqs=[]; pg.on('request',r=>{ if(r.url().includes('/img/')) reqs.push(r.url().split('/img/')[1]); });
await pg.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(FAKE,'utf8')})); await pg.route(/fonts\./,r=>r.abort());
const ok=(n,c)=>console.log((c?'PASS ':'FAIL ')+n);
await pg.goto('http://localhost:8802/studio/?blank=1'); await pg.waitForSelector('#canvas .pg');
await pg.evaluate(()=>{ state.pages=Array.from({length:10},(_,i)=>({id:'p'+i,name:'',bg:'#FFFFFF',els:[{id:'e'+i,type:'image',x:16,y:20,w:100,h:80,src:'/img/'+i+'.svg',name:''}]})); state.cur=0; renderAll(); });
await pg.click('#btnPreview'); await pg.waitForSelector('.bv-book'); await pg.waitForTimeout(600);
ok('열자마자 다음 펼침면(3·4쪽, 5·6쪽) 사진을 미리 요청', ['2.svg','3.svg','4.svg','5.svg'].every(x=>reqs.includes(x)));
await pg.click('.bv-next'); await pg.waitForTimeout(1300);
ok('넘기면 그다음 펼침면(7·8쪽)도 미리 요청', reqs.includes('6.svg') && reqs.includes('7.svg'));
await b.close(); srv.close();
