import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import((p=>/^[A-Za-z]:/.test(p)?'file:///'+p.replace(/\\/g,'/'):p)(R+'/playwright/index.mjs'));
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=process.env.MOA_ROOT||'/home/user/LiveBecomeHistory', FAKE=process.argv[2];
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':f.endsWith('.js')?'text/javascript':'text/html'});res.end(d);} }); }).listen(8798);
const b=await chromium.launch({executablePath:process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ok=(n,c)=>console.log((c?'PASS ':'FAIL ')+n);
for(const [w,h,label] of [[1366,850,'PC'],[683,700,'200% 확대(좁은 화면)']]){
const pg=await b.newPage({viewport:{width:w,height:h}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
await pg.route('**/*supabase-js*',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(FAKE,'utf8')})); await pg.route(/fonts\./,r=>r.abort());
await pg.goto('http://localhost:8798/studio/'); await pg.waitForSelector('#canvas .pg');
await pg.evaluate(()=>{ for(let i=0;i<5;i++) state.pages.push({...JSON.parse(JSON.stringify(state.pages[1])),id:'x'+i}); renderAll(); });
await pg.click('#btnPreview'); await pg.waitForSelector('.bv-book'); await pg.waitForTimeout(300);
const cur=()=>pg.evaluate(()=>document.querySelector('#pvBody')._bv.current), two=await pg.evaluate(()=>document.querySelector('#pvBody')._bv.spread);
const box=await pg.locator('.bv-book').boundingBox(); const step=two?2:1;
console.log(label,'펼침:',two);
await pg.mouse.click(box.x+box.width*0.75, box.y+box.height*0.5); await pg.waitForTimeout(1500);
{ const c=await cur(); console.log('   cur',c); ok(label+': 오른쪽을 누르면 다음 쪽', c===step); }
await pg.mouse.click(box.x+box.width*0.25, box.y+box.height*0.5); await pg.waitForTimeout(1500);
{ const c=await cur(); console.log('   cur',c); ok(label+': 왼쪽을 누르면 앞 쪽', c===0); }
await pg.mouse.move(box.x+box.width*0.8, box.y+box.height*0.5); await pg.mouse.down(); await pg.mouse.move(box.x+box.width*0.3, box.y+box.height*0.5,{steps:8}); await pg.mouse.up(); await pg.waitForTimeout(1500);
{ const c=await cur(); console.log('   cur',c); ok(label+': 왼쪽으로 끌면 다음 쪽', c===step); }
await pg.mouse.move(box.x+box.width*0.2, box.y+box.height*0.5); await pg.mouse.down(); await pg.mouse.move(box.x+box.width*0.7, box.y+box.height*0.5,{steps:8}); await pg.mouse.up(); await pg.waitForTimeout(1500);
{ const c=await cur(); console.log('   cur',c); ok(label+': 오른쪽으로 끌면 앞 쪽', c===0); }
const hot=await pg.locator('.bv-hot.r').boundingBox(); await pg.mouse.click(hot.x+hot.width/2, hot.y+hot.height/2); await pg.waitForTimeout(1500);
{ const c=await cur(); console.log('   cur',c); ok(label+': 가장자리 단추는 한 번만 넘김', c===step); }
await pg.click('.bv-next'); await pg.waitForTimeout(1500);
{ const c=await cur(); console.log('   cur',c); ok(label+': 아래 → 단추도 그대로', c===step*2); }
console.log(errs.length?errs.join('\n'):'JS 오류 없음'); }
await b.close(); srv.close();
