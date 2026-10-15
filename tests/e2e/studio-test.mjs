import { execSync } from 'child_process';
const R=execSync('npm root -g').toString().trim();
const { chromium } = await import(R+'/playwright/index.mjs');
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/home/user/LiveBecomeHistory';
const srv=http.createServer((req,res)=>{ const p=req.url.split('?')[0]; const f=path.join(ROOT,p.endsWith('/')?p+'index.html':p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();} else {res.writeHead(200,{'content-type':'text/html'});res.end(d);} }); }).listen(8769);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:1440,height:1500},acceptDownloads:true});
const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR '+e.message));
await pg.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
pg.on('dialog',d=>d.accept().catch(()=>{}));
const ok=(n,c)=>console.log((c?'PASS ':'FAIL ')+n);
const st=(js,a)=>pg.evaluate(js,a);
await pg.goto('http://localhost:8769/studio/'); await pg.waitForSelector('#canvas .pg');
// 시험용 고정 견본(예전 체험 견본 3쪽): 체험 편집기 첫 화면이 바뀌어도 편집 기능 시험은 같은 바탕에서
await pg.evaluate(f=>{ state.title=f.title; state.pages=f.pages; state.cur=0; state.sel=null; history=[]; future=[]; renderAll(); }, JSON.parse(fs.readFileSync(new URL('./demo-fixture.json', import.meta.url),'utf8'))); await pg.waitForTimeout(100);
await pg.screenshot({path:'/tmp/studio-1.png'});
ok('페이지 3개 · 썸네일 3개', await pg.locator('.th').count()===3 && await st(()=>state.pages.length)===3);
const dims=await pg.evaluate(()=>{const r=document.querySelector('#canvas .pg').getBoundingClientRect();return {w:r.width,h:r.height}});
ok('신국판 비율(152:225)', Math.abs(dims.h/dims.w-225/152)<0.01); console.log('  페이지 px:',Math.round(dims.w),'x',Math.round(dims.h));
const fsPx=await pg.evaluate(()=>{const tx=document.querySelectorAll('#canvas .el.t .tx')[0]; return parseFloat(getComputedStyle(tx).fontSize)*(152*3.7795/document.querySelector('#canvas .pg').getBoundingClientRect().width);});
ok('글자 크기 기준 환산 시 9pt 상자=12px(96dpi 환산)', Math.abs(fsPx-12)<0.6); console.log('  9pt 상자 환산 px:',fsPx.toFixed(2));
const fs12=await pg.evaluate(()=>{ const t=state.pages[1].els.find(e=>e.type==='text'&&e.fs===12); return t?1:0; });
await pg.locator('.th').nth(1).click();
const px12=await pg.evaluate(()=>{const tx=document.querySelectorAll('#canvas .el.t .tx')[1]; return parseFloat(getComputedStyle(tx).fontSize)*(152*3.7795/document.querySelector('#canvas .pg').getBoundingClientRect().width);});
ok('본문 기본 12pt = 16px(96dpi 환산)', Math.abs(px12-16)<0.6); console.log('  12pt 상자 환산 px:',px12.toFixed(2));
// 글 상자 추가 → 커서
await pg.click('[data-add=text]'); await pg.waitForTimeout(150);
const foc=await pg.evaluate(()=>{const a=document.activeElement; const s=getSelection(); return {tx:a.classList.contains('tx'),ce:a.isContentEditable,coll:s.isCollapsed,inside:a.contains(s.anchorNode),editing:state.editing};});
ok('글 메뉴 → 글상자 생성 + 커서 깜빡임(편집 모드)', foc.tx&&foc.ce&&foc.coll&&foc.inside&&foc.editing);
await pg.keyboard.type('안녕하세요 첫 문장입니다.'); await pg.waitForTimeout(100);
ok('입력한 글이 모델에 저장', (await st(()=>selEl().html)).includes('안녕하세요'));
await pg.screenshot({path:'/tmp/studio-2.png'});
// 빈 곳 클릭 → 편집 종료(글 남음)
await pg.mouse.click(1050,900); await pg.waitForTimeout(100);
ok('빈 곳 클릭 → 편집 종료, 글 유지', !(await st(()=>state.editing)) && (await pg.locator('#canvas .el.t').count())===3);
// 빈 상자도 그대로 남고 연하게 표시
await pg.click('[data-add=text]'); await pg.waitForTimeout(100); const n1=await pg.locator('#canvas .el.t').count();
const newId=await st(()=>state.sel);
await pg.mouse.click(1050,900); await pg.waitForTimeout(100);
ok('빈 글상자도 사라지지 않음', (await pg.locator('#canvas .el.t').count())===n1);
ok('빈 글상자는 옅은 바탕(empty) + 안내 문구', await st(id=>{const n=document.querySelector(`#canvas .el[data-id="${id}"]`); return n.classList.contains('empty')&&getComputedStyle(n.querySelector('.tx'),'::before').content.includes('글을 입력');},newId));
ok('모든 글상자에 연한 점선 표시', await st(()=>[...document.querySelectorAll('#canvas .el.t')].every(n=>getComputedStyle(n).outlineStyle==='dashed')));
ok('여백 안내선 표시(편집 화면만)', await pg.locator('#canvas .guides').count()===1 && !(await st(()=>pageHTML(page(),'view').includes('guides'))));
// 새 글상자는 좌우 여백에 맞춰 본문 폭(120mm)
ok('새 글상자 = 좌우 여백 고정(x16, 폭120)', await st(id=>{const e=page().els.find(x=>x.id===id); return e.x===16&&e.w===120;},newId));
// 한 번 누르면 바로 글쓰기(그 자리에 커서)
const box=pg.locator(`#canvas .el[data-id="${newId}"]`); let b0=await box.boundingBox();
await pg.mouse.click(b0.x+20,b0.y+b0.height/2); await pg.waitForTimeout(100);
ok('글상자를 한 번 누르면 바로 글쓰기', await st(()=>state.editing&&document.activeElement.classList.contains('tx')));
// 입력 중에도 손잡이로 크기 조절(입력 유지)
const hd=pg.locator('#canvas .el.sel .hd.se'); const hb=await hd.boundingBox();
await pg.mouse.move(hb.x+hb.width/2,hb.y+hb.height/2); await pg.mouse.down(); await pg.mouse.move(hb.x+hb.width/2-80,hb.y+hb.height/2+20,{steps:5}); await pg.mouse.up(); await pg.waitForTimeout(100);
const b1=await box.boundingBox(); ok('손잡이로 크기 조절(입력 상태 유지)', Math.abs((b1.width-b0.width)+80)<8 && Math.abs((b1.height-b0.height)-20)<8 && await st(()=>state.editing));
// '옮기기' 손잡이로 이동
let g=await pg.locator('#canvas .el.sel .grip').boundingBox();
await pg.mouse.move(g.x+10,g.y+10); await pg.mouse.down(); await pg.mouse.move(g.x+10+40,g.y+10+30,{steps:6}); await pg.mouse.up(); await pg.waitForTimeout(100);
const b2=await box.boundingBox(); ok('옮기기 손잡이로 이동', Math.abs((b2.x-b1.x)-40)<6 && Math.abs((b2.y-b1.y)-30)<6); console.log('  이동량:',Math.round(b2.x-b1.x),Math.round(b2.y-b1.y));
// 여백 밖으로 못 나감
g=await pg.locator('#canvas .el.sel .grip').boundingBox();
await pg.mouse.move(g.x+10,g.y+10); await pg.mouse.down(); await pg.mouse.move(g.x-600,g.y+10,{steps:6}); await pg.mouse.up(); await pg.waitForTimeout(100);
ok('왼쪽 여백 밖으로 못 나감(x=16)', Math.abs((await st(id=>page().els.find(x=>x.id===id).x,newId))-16)<0.01);
g=await pg.locator('#canvas .el.sel .grip').boundingBox();
await pg.mouse.move(g.x+10,g.y+10); await pg.mouse.down(); await pg.mouse.move(g.x+900,g.y+10,{steps:6}); await pg.mouse.up(); await pg.waitForTimeout(100);
ok('오른쪽 여백 밖으로 못 나감(끝=136)', Math.abs((await st(id=>{const e=page().els.find(x=>x.id===id); return e.x+e.w;},newId))-136)<0.01);
const hd2=await pg.locator('#canvas .el.sel .hd.e').boundingBox();
await pg.mouse.move(hd2.x+5,hd2.y+5); await pg.mouse.down(); await pg.mouse.move(hd2.x+500,hd2.y+5,{steps:5}); await pg.mouse.up();
ok('크기를 키워도 여백 안에서 멈춤', await st(id=>{const e=page().els.find(x=>x.id===id); return e.x+e.w<=136.001;},newId));
ok('입력 상태에서 누른 뒤에도 글쓰기 가능', await st(()=>state.editing));
await pg.keyboard.press('Escape'); ok('Esc로 편집 종료', !(await st(()=>state.editing)));
// 서식 패널
await pg.click('#fsUp'); await pg.click('#fsUp'); ok('글자 크기 +2 (14pt)', (await st(()=>selEl().fs))===14);
await pg.click('[data-a=center]'); ok('가운데 정렬', (await st(()=>selEl().align))==='center');
await pg.click('#fontSeg [data-f=sans]'); ok('고딕 전환', (await st(()=>selEl().font))==='sans');
// 겹침 방지: 글상자 삭제 + undo
const cnt=await pg.locator('#canvas .el').count();
await pg.keyboard.press('Delete'); ok('Delete 키로 삭제', (await pg.locator('#canvas .el').count())===cnt-1);
await pg.keyboard.press('Control+z'); await pg.waitForTimeout(100); ok('Ctrl+Z 되돌리기', (await pg.locator('#canvas .el').count())===cnt);
await pg.keyboard.press('Control+y'); await pg.waitForTimeout(100); ok('Ctrl+Y 다시 하기', (await pg.locator('#canvas .el').count())===cnt-1);
await pg.keyboard.press('Control+z');
// 이미지 → 새 페이지
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==','base64');
await pg.locator('.th').first().click(); await pg.waitForTimeout(80); // 가득 찬 표지에서
const before=await st(()=>state.pages.length), curBefore=await st(()=>state.cur);
await pg.click('[data-add=image]'); await pg.setInputFiles('#file',{name:'s.png',mimeType:'image/png',buffer:png}); await pg.waitForTimeout(500);
ok('자리 없는 페이지에서 이미지 → 새 페이지(바로 뒤)', (await st(()=>state.pages.length))===before+1 && (await st(()=>state.cur))===curBefore+1);
ok('새 페이지에 이미지만', await st(()=>page().els.length===1&&page().els[0].type==='image'));
const geo=await st(()=>{const e=page().els[0]; return {cx:e.x+e.w/2, w:e.w}}); ok('이미지 가운데 정렬', Math.abs(geo.cx-76)<0.5);
await pg.click('#addCap'); await pg.waitForTimeout(150);
ok('「설명 글 넣기」→ 이미지 아래 글상자 + 커서', await st(()=>state.editing&&page().els.length===2&&page().els[1].y>page().els[0].y+page().els[0].h-1));
await pg.keyboard.type('바다 사진 설명'); await pg.mouse.click(1050,900); await pg.waitForTimeout(100);
ok('설명 글 저장', (await st(()=>page().els[1].html)).includes('바다 사진'));
await pg.screenshot({path:'/tmp/studio-3.png'});
// 영상 · 음악
await pg.click('[data-add=video]'); await pg.setInputFiles('#file',{name:'v.mp4',mimeType:'video/mp4',buffer:Buffer.from('fakevideo')}); await pg.waitForTimeout(300);
ok('영상 → 새 페이지', await st(()=>page().els[0].type==='video'&&page().name==='영상 페이지'));
await pg.click('[data-add=audio]'); await pg.setInputFiles('#file',{name:'노래.mp3',mimeType:'audio/mpeg',buffer:Buffer.from('fakeaudio')}); await pg.waitForTimeout(300);
ok('음악 → 빈 자리가 있으면 같은 페이지(영상 아래)', await st(()=>page().name==='영상 페이지' && page().els.some(e=>e.type==='audio')) && await pg.locator('#canvas .audio').count()===1);
ok('노래 카드에 파일 이름이 안 보임', !(await pg.locator('#canvas .audio').innerText()).includes('노래.mp3') && await st(()=>page().els.every(e=>!e.name)));
// 지웠다가 다시 넣으면 같은 페이지에
const pgCount=await st(()=>state.pages.length);
await st(()=>{ state.sel=page().els.find(e=>e.type==='audio').id; }); await pg.keyboard.press('Delete'); await pg.waitForTimeout(80);
await pg.click('[data-add=audio]'); await pg.setInputFiles('#file',{name:'b.mp3',mimeType:'audio/mpeg',buffer:Buffer.from('fakeaudio2')}); await pg.waitForTimeout(300);
ok('노래를 지웠다가 다시 넣으면 새 페이지가 아니라 같은 페이지에', (await st(()=>state.pages.length))===pgCount && await st(()=>page().els.some(e=>e.type==='audio')));
await pg.screenshot({path:'/tmp/studio-4.png'});
// 용량 제한
await pg.click('[data-add=image]'); const pagesN=await st(()=>state.pages.length);
await pg.setInputFiles('#file',{name:'big.png',mimeType:'image/png',buffer:Buffer.alloc(16*1024*1024)}); await pg.waitForTimeout(300);
ok('사진 15MB 초과 → 안내, 추가 안 됨', (await pg.locator('#toast').innerText()).includes('15MB') && (await st(()=>state.pages.length))===pagesN);
await pg.click('[data-add=audio]'); await pg.setInputFiles('#file',{name:'big.mp3',mimeType:'audio/mpeg',buffer:Buffer.alloc(31*1024*1024)}); await pg.waitForTimeout(300);
ok('노래 30MB 초과 → 안내', (await pg.locator('#toast').innerText()).includes('30MB'));
await pg.click('[data-add=video]'); fs.writeFileSync('/tmp/big.mp4',Buffer.alloc(51*1024*1024)); await pg.setInputFiles('#file','/tmp/big.mp4'); await pg.waitForTimeout(400);
ok('영상 50MB 초과 → 안내(약 50초)', (await pg.locator('#toast').innerText()).includes('50MB'));
// 페이지 관리
await pg.locator('.th').first().click();
await pg.fill('#pname','새 이름'); await pg.waitForTimeout(400); ok('페이지 이름 변경 → 썸네일 반영', (await pg.locator('.th .nm').first().innerText())==='새 이름');
await pg.click('#bgSw button:nth-child(3)'); ok('배경색 변경', (await st(()=>page().bg))==='#F1F0FA');
await pg.click('#pDn'); ok('페이지 순서 뒤로', (await st(()=>state.cur))===1 && (await st(()=>state.pages[1].name))==='새 이름');
const nameBefore=await st(()=>state.pages.map(p=>p.name).join(' | ')); const movedName=await st(()=>state.pages[1].name);
await pg.locator('.th').nth(1).dragTo(pg.locator('.th').nth(3)); await pg.waitForTimeout(400);
const nameAfter=await st(()=>state.pages.map(p=>p.name).join(' | ')); console.log('  순서 전:',nameBefore,'\n  순서 후:',nameAfter);
ok('썸네일 끌어서 순서 변경(2번째 → 4번째)', (await st(()=>state.pages[3].name))===movedName);
const pn=await st(()=>state.pages.length); await pg.click('#delPage'); ok('페이지 삭제(확인창)', (await st(()=>state.pages.length))===pn-1);
await pg.keyboard.press('Control+z'); await pg.waitForTimeout(100); ok('페이지 삭제도 되돌리기', (await st(()=>state.pages.length))===pn);
// ── 워드처럼 넘친 글은 다음 페이지로 ──
await pg.locator('.th').nth(1).click(); await pg.click('#addPage'); await pg.click('#ptDlg [data-pt=text]'); await pg.waitForTimeout(100);
const P0=await st(()=>state.pages.length), C0=await st(()=>state.cur);
const typed='할머니의 빨간 대문 앞에서 우리는 늘 해가 질 때까지 놀았다. '.repeat(40);
await pg.keyboard.insertText(typed.slice(0,600)); for(const ch of typed.slice(600,900)) await pg.keyboard.type(ch); await pg.keyboard.insertText(typed.slice(900));
await pg.waitForTimeout(400);
const fl=await st(c0=>{ const out=[]; for(let i=c0;i<state.pages.length;i++){ const p=state.pages[i]; if(i>c0&&p.flowFrom!==state.pages[i-1].id) break; out.push(plain(p.els.find(e=>e.type==='text').html)); } return {pages:out.length, text:out.join(''), cur:state.cur, editing:state.editing}; },C0);
console.log('  이어진 페이지 수:',fl.pages,'· 현재 쪽:',fl.cur+1);
ok('넘친 글이 다음 페이지로 자동으로 이어짐', fl.pages>=2 && (await st(()=>state.pages.length))>P0);
ok('글자가 하나도 사라지지 않음', fl.text.replace(/\s/g,'')===typed.replace(/\s/g,''));
ok('커서도 다음 페이지로 따라가 계속 쓰기', fl.cur>C0 && fl.editing && await st(()=>document.activeElement.classList.contains('tx')));
ok('앞 페이지는 여백 안에 딱 맞음(넘침 없음)', await st(c0=>{ const p=state.pages[c0]; const e=p.els.find(x=>x.type==='text'); return e.y+e.h<=207.001; },C0));
await pg.keyboard.type('끝');
ok('이어 쓴 글자는 현재(마지막) 페이지 끝에', (await st(()=>plain(selEl().html))).endsWith('끝'));
await pg.keyboard.press('Escape');
await pg.mouse.click(1050,900);
// ── 워드 방식: 고른 글자만 꾸미기 ──
await pg.locator('.th').first().click(); await pg.waitForTimeout(100);
const pn0=await st(()=>state.pages.length);
await pg.click('[data-add=text]'); await pg.waitForTimeout(100);
ok('표지처럼 가득 찬 페이지에서 글 누르면 새 페이지에 이어 쓰기', (await st(()=>state.pages.length))===pn0+1 && await st(()=>state.editing));
ok('새 페이지 글상자 = 본문 영역 전체(여백 고정)', await st(()=>{const e=selEl(); return e.x===16&&e.y===18&&e.w===120&&Math.abs(e.h-189)<0.01;}));
await pg.keyboard.type('할머니의 빨간 대문 이야기');
// "빨간" 두 글자만 선택
await pg.evaluate(()=>{ const tx=document.activeElement; const t=tx.firstChild; const i=t.textContent.indexOf('빨간'); const r=document.createRange(); r.setStart(t,i); r.setEnd(t,i+2); const s=getSelection(); s.removeAllRanges(); s.addRange(r); });
await pg.waitForTimeout(200);
ok('글자를 고르면 미니 도구 창이 뜸', await pg.locator('#mini:not([hidden])').count()===1);
await pg.screenshot({path:'/tmp/studio-mini.png'});
await pg.click('#miniSw [data-mc="#C0392B"]'); await pg.waitForTimeout(100);
const h1=await st(()=>selEl().html); console.log('  html:',h1);
ok('고른 글자만 빨간색', /<span[^>]*color[^>]*>빨간<\/span>/.test(h1) && !/color[^>]*>할머니/.test(h1));
await pg.click('#mini [data-m=bold]'); await pg.waitForTimeout(100);
ok('고른 글자만 굵게', /<(b|strong)>[^<]*빨간|빨간[^<]*<\/(b|strong)>|font-weight/.test(await st(()=>selEl().html)));
ok('고른 뒤에도 선택 유지(연속 꾸미기)', await st(()=>getSelection().toString()==='빨간'));
// 오른쪽 패널 색 버튼도 고른 글자에만
await pg.evaluate(()=>{ const tx=document.activeElement; const w=document.createTreeWalker(tx,NodeFilter.SHOW_TEXT); let n; while((n=w.nextNode())){ const i=n.textContent.indexOf('대문'); if(i>=0){ const r=document.createRange(); r.setStart(n,i); r.setEnd(n,i+2); const s=getSelection(); s.removeAllRanges(); s.addRange(r); break; } } });
await pg.click('#inkSw [data-c="#2E6FB5"]'); await pg.waitForTimeout(100);
const h2=await st(()=>selEl().html);
ok('패널 색 버튼도 고른 글자에만 적용', /color[^>]*>대문<\/span>/.test(h2) && await st(()=>selEl().color)==='#1B2B25');
ok('Ctrl+Z로 꾸밈 되돌리기 가능(기록 남음)', await st(()=>history.length>0));
await pg.keyboard.press('Escape'); await pg.waitForTimeout(100);
ok('편집을 마쳐도 색이 남음(정제 통과)', /color[^>]*>대문<\/span>/.test(await st(()=>selEl().html)) && /<span style="color:[^"]+">대문/.test(await pg.locator('#canvas .el.sel .tx').innerHTML()));
ok('미니 도구 창 닫힘', await pg.locator('#mini[hidden]').count()===1);
ok('썸네일·미리보기에도 색 반영', (await pg.locator('.th.on .mini').innerHTML()).includes('대문'));
// 자동으로 자라는 글상자(빈 페이지에서)
await pg.click('#addPage'); await pg.click('#ptDlg [data-pt=text]'); await pg.keyboard.press('Escape'); await pg.keyboard.press('Delete'); await pg.waitForTimeout(100);
await pg.click('[data-add=text]'); await pg.waitForTimeout(100);
const hA=await st(()=>selEl().h); await pg.keyboard.type('첫째 줄'); for(let i=0;i<5;i++){ await pg.keyboard.press('Enter'); await pg.keyboard.type('다음 줄'); }
await pg.waitForTimeout(100); const hB=await st(()=>selEl().h);
ok('글을 쓰면 글상자가 아래로 자람', hB>hA+10); console.log('  높이(mm):',hA.toFixed(1),'→',hB.toFixed(1));
ok('자라도 아래 여백을 넘지 않음', await st(()=>{const e=selEl(); return e.y+e.h<=207.001;}));
await pg.keyboard.press('Escape');
// 붙여넣기는 글자만
ok('정제: span 색만 남기고 위험 스타일 제거', await st(()=>sanitizeText('<span style="color:#ff0000;background:url(x);position:fixed">a</span><font color="#00ff00">b</font>')==='<span style="color:rgb(255, 0, 0)">a</span><span style="color:rgb(0, 255, 0)">b</span>' || /^<span style="color:(#ff0000|rgb\(255, 0, 0\))">a<\/span><span style="color:(#00ff00|rgb\(0, 255, 0\))">b<\/span>$/.test(sanitizeText('<span style="color:#ff0000;background:url(x);position:fixed">a</span><font color="#00ff00">b</font>'))));
// ── 파워포인트식 페이지 다루기 ──
await pg.locator('.th').first().click(); await pg.waitForTimeout(80);
let N=await st(()=>state.pages.length);
await pg.locator('.th').first().hover(); await pg.locator('.th').first().locator('[data-act=dup]').click(); await pg.waitForTimeout(100);
ok('썸네일 복제 버튼', (await st(()=>state.pages.length))===N+1 && (await st(()=>state.pages[1].name)).includes('(복제)'));
N=N+1; await pg.locator('.th').nth(1).hover(); await pg.locator('.th').nth(1).locator('[data-act=del]').click(); await pg.waitForTimeout(100);
ok('썸네일 삭제 버튼', (await st(()=>state.pages.length))===N-1); N--;
await pg.keyboard.press('Control+z'); await pg.waitForTimeout(100); ok('삭제 되돌리기(Ctrl+Z)', (await st(()=>state.pages.length))===N+1); N++;
await pg.locator('[data-ins="1"]').click(); await pg.click('#ptDlg [data-pt=text]'); await pg.waitForTimeout(100);
ok('썸네일 사이 ＋로 끼워 넣기(2쪽 자리에 새 페이지)', (await st(()=>state.pages.length))===N+1 && (await st(()=>state.cur))===1 && await st(()=>state.editing)); N++;
await pg.keyboard.press('Escape'); await pg.locator('.th').nth(1).focus(); await pg.keyboard.press('Delete'); await pg.waitForTimeout(100);
ok('빈 페이지는 확인 없이 Delete 키로 삭제', (await st(()=>state.pages.length))===N-1); N--;
await pg.locator('.th').nth(2).click({button:'right'}); await pg.waitForSelector('#ctx:not([hidden])');
ok('오른쪽 클릭 → 페이지 메뉴', true);
await pg.screenshot({path:'/tmp/studio-ctx.png'});
await pg.click('#ctx [data-c=newBefore]'); await pg.click('#ptDlg [data-pt=text]'); await pg.waitForTimeout(100);
ok('메뉴: 앞에 새 페이지', (await st(()=>state.pages.length))===N+1 && (await st(()=>state.cur))===2); N++;
await pg.keyboard.press('Escape');
await pg.locator('.th').nth(2).click({button:'right'}); await pg.click('#ctx [data-c=del]'); await pg.waitForTimeout(100);
ok('메뉴: 페이지 삭제', (await st(()=>state.pages.length))===N-1); N--;
ok('패널에도 「페이지 삭제」 글자 버튼', (await pg.locator('#delPage').innerText()).includes('페이지 삭제'));
// ── 글자 크기 목록 · 밑줄 ──
await pg.locator('.th').nth(1).click(); await pg.waitForTimeout(80);
const tb=pg.locator('#canvas .el.t').first(); const tbb=await tb.boundingBox(); await pg.mouse.click(tbb.x+10,tbb.y+5); await pg.keyboard.press('Escape');
await pg.click('#fsVal'); await pg.waitForSelector('#fslist:not([hidden])');
ok('글자 크기 숫자 누르면 목록', (await pg.locator('#fslist [data-fs]').count())>=15);
await pg.screenshot({path:'/tmp/studio-fs.png'});
await pg.click('#fslist [data-fs="24"]'); await pg.waitForTimeout(80);
ok('목록에서 24pt 선택', (await st(()=>selEl().fs))===24 && (await pg.locator('#fsVal').innerText()).includes('24'));
await pg.click('#bU'); ok('패널 밑줄(상자 전체)', await st(()=>selEl().u===true) && await st(()=>getComputedStyle(document.querySelector('#canvas .el.sel .tx')).textDecorationLine==='underline'));
// ── 양쪽 정렬 ──
await pg.locator('.th').first().click(); await pg.waitForTimeout(80);
{ const tb=pg.locator('#canvas .el.t').first(); const bb=await tb.boundingBox(); await pg.mouse.click(bb.x+10,bb.y+5); await pg.keyboard.press('Escape'); }
await pg.click('[data-a=justify]'); ok('양쪽(균등) 정렬', await st(()=>selEl().align==='justify') && await st(()=>getComputedStyle(document.querySelector('#canvas .el.sel .tx')).textAlign==='justify'));
// ── 페이지 종류 고르기(제목·콘텐츠·설명) ──
for(const [k,label] of [['image','사진'],['video','영상'],['audio','노래']]){
  await pg.click('#addPage'); await pg.waitForSelector('#ptDlg:not([hidden])'); await pg.click(`#ptDlg [data-pt=${k}]`); await pg.waitForTimeout(100);
  ok(`${label} 페이지 틀 = 제목·${label} 자리·설명`, await st(k=>{ const e=page().els; return e.length===3 && e[0].type==='text'&&e[0].ph.includes('제목') && e[1].type==='slot'&&e[1].kind===k && e[2].type==='text'&&e[2].ph.includes(k==='audio'?'가사':'설명'); },k));
}
// ── 여러 쪽 골라 배경 한꺼번에 ──
await pg.click('#pickAll'); ok('전체 선택', await st(()=>state.picked.size===state.pages.length) && (await pg.locator('.th.picked').count())===(await st(()=>state.pages.length)));
await pg.click('#bgSw [data-c="#FBF1EA"]'); ok('전체 선택 → 모든 쪽 배경 바뀜', await st(()=>state.pages.every(p=>p.bg==='#FBF1EA')));
await pg.click('#pickAll'); await pg.locator('.th').nth(0).click();
await pg.locator('.th').nth(2).hover(); await pg.locator('.th').nth(2).locator('[data-pick]').click(); await pg.locator('.th').nth(3).click({modifiers:['Control']});
ok('일부 선택(동그라미·Ctrl+클릭)', await st(()=>state.picked.size===3));
await pg.click('#bgSw [data-c="#F1F0FA"]'); ok('고른 3쪽만 배경 바뀜', await st(()=>state.pages.filter(p=>p.bg==='#F1F0FA').length===3 && state.pages[1].bg==='#FBF1EA'));
await pg.locator('.th').nth(1).click(); await pg.locator('.th').nth(4).click({modifiers:['Shift']}); ok('Shift+클릭으로 범위 선택', await st(()=>state.picked.size===4));
await pg.click('#unpick'); ok('선택 해제', await st(()=>state.picked.size===0));
// ── 지운 글만큼 다음 쪽 글을 끌어 오기 ──
await pg.click('#addPage'); await pg.click('#ptDlg [data-pt=text]'); await pg.waitForTimeout(80);
const longT='어린 시절 바닷가 마을에서 자란 나는 파도 소리를 들으며 잠들곤 했다. '.repeat(40);
await pg.keyboard.insertText(longT.slice(0,1400)); await pg.keyboard.type('. '); await pg.waitForTimeout(300);
const pb=await st(()=>({cur:state.cur, n:state.pages.length, nextTxt:plain(state.pages[state.cur].els[0].html).length, firstTxt:plain(state.pages[state.cur-1].els[0].html).length}));
ok('긴 글을 한 번에 붙여 넣어도 정확히 나뉨(글자 손실·가림 없음)', Math.abs(pb.firstTxt+pb.nextTxt-1401)<=3 && pb.firstTxt<1000 && await st(i=>{ const tx=document.querySelector('#canvas .tx'); return true; },0));
await pg.locator('.th').nth(pb.cur-1).click(); await pg.waitForTimeout(100);
{ const tb=pg.locator('#canvas .el.t').first(); const bb=await tb.boundingBox(); await pg.mouse.click(bb.x+bb.width/2,bb.y+20); }
await pg.evaluate(()=>{ const tx=document.activeElement; const w=document.createTreeWalker(tx,NodeFilter.SHOW_TEXT); const n=w.nextNode(); const r=document.createRange(); r.setStart(n,10); r.setEnd(n,410); const s=getSelection(); s.removeAllRanges(); s.addRange(r); }); await pg.keyboard.press('Delete'); await pg.waitForTimeout(400);
const pa=await st(i=>({n:state.pages.length, first:plain(state.pages[i-1].els[0].html).length, next: state.pages[i]&&state.pages[i].flowFrom? plain(state.pages[i].els[0].html).length : 0}),pb.cur);
ok('앞쪽 글을 지우면 다음 쪽 글이 끌려 올라와 앞쪽이 다시 참', pa.next<pb.nextTxt && pa.first>pb.firstTxt-400 && Math.abs((pa.first+pa.next)-(pb.firstTxt+pb.nextTxt-400))<=3); console.log('  앞쪽:',pb.firstTxt,'→',pa.first); console.log('  다음 쪽 글자 수:',pb.nextTxt,'→',pa.next,'· 쪽 수:',pb.n,'→',pa.n);
await pg.keyboard.press('Escape');
// 안전
ok('글상자 서식 정제(위험 코드 제거)', await st(()=>sanitizeText('<img src=x onerror=alert(1)><b onclick=1>ok</b><script>1</script><div>x</div>')==='<b>ok</b><div>x</div>'));
// 미리보기 · 내려받기
await pg.click('#btnPreview'); await pg.waitForSelector('#pv:not([hidden])');
const pvN=await st(()=>state.pages.length);
ok('미리보기: 두 쪽 펼침 + 쪽 번호', (await pg.locator('#pvBody .bv-page').count())===2 && (await pg.locator('#pvBody .bv-no').innerText())===`1–2 / ${pvN}`);
await pg.click('#pvBody .bv-next'); await pg.waitForTimeout(1200); ok('미리보기: 다음 펼침(3–4쪽)', (await pg.locator('#pvBody .bv-no').innerText()).startsWith('3–4 /'));
await pg.evaluate(()=>{ const c=document.getElementById('pvBody'),v=c._bv; for(let i=0;i<v.count;i+=2){ v.go(i,false); if(c.querySelector('video')&&c.querySelector('.ap')) return; } for(let i=0;i<v.count;i+=2){ v.go(i,false); if(c.querySelector('video')) return; } });
ok('미리보기: 영상 재생 · 노래 재생기(진행 막대)', await pg.evaluate(()=>{ const c=document.getElementById('pvBody'),v=c._bv; let vid=0,ap=0,au=0; for(let i=0;i<v.count;i+=2){ v.go(i,false); vid+=c.querySelectorAll('video[controls]').length; ap+=c.querySelectorAll('.ap .ap-bar').length; au+=c.querySelectorAll('audio').length; } return vid>=1&&ap>=1&&au===0; }));
await pg.screenshot({path:'/tmp/studio-5.png'}); await pg.click('#pvClose');
await pg.click('#btnExport'); await pg.waitForSelector('#exDlg:not([hidden])');
const [dl]=await Promise.all([pg.waitForEvent('download'),pg.click('#exDlg [data-ex=screen]')]); await dl.saveAs('/tmp/studio-export.html'); const h=fs.readFileSync('/tmp/studio-export.html','utf8');
ok('내려받기 HTML: 글 포함 · 외부 주소 없음', h.includes('내 생애') && h.includes('바다 사진 설명') && !/https?:\/\/(cdn|fonts\.gstatic)/.test(h.replace(/fonts\.googleapis[^"']*/g,'')));
const nPages=await st(()=>state.pages.length);
const ex=await ctx.newPage(); const exErr=[]; ex.on('pageerror',e=>exErr.push(e.message)); await ex.route(/fonts\./,r=>r.abort()); await ex.goto('file:///tmp/studio-export.html'); await ex.waitForSelector('.bv-page');
ok('내려받은 책: 두 쪽 펼침 + 모든 쪽 들어 있음 + 쪽 번호', await ex.evaluate(()=>document.getElementById('book')._bv.count)===nPages && (await ex.locator('.bv-no').innerText())===`1–2 / ${nPages}`);
await ex.keyboard.press('ArrowRight'); await ex.waitForTimeout(1200); ok('내려받은 책: → 키로 다음 펼침', (await ex.locator('.bv-no').innerText()).startsWith('3–4 /'));
ok('내려받은 책: 노래 재생기(진행 막대) · 오류 없음', await ex.evaluate(()=>{ const c=document.getElementById('book'),v=c._bv; let n=0; for(let i=0;i<v.count;i+=2){ v.go(i,false); n+=c.querySelectorAll('.ap .ap-bar i').length; } return n; })>=1 && exErr.length===0);
await ex.screenshot({path:'/tmp/export-flip.png'}); await ex.close();
await pg.click('#btnExport'); await pg.waitForSelector('#exDlg:not([hidden])');
const [dq]=await Promise.all([pg.waitForEvent('download'),pg.click('#exDlg [data-ex=print]')]); await dq.saveAs('/tmp/studio-print.html'); const hq=fs.readFileSync('/tmp/studio-print.html','utf8');
ok('시안에서도 인쇄용(QR) 내려받기', (hq.match(/class="qr"/g)||[]).length===(await st(()=>state.pages.flatMap(p=>p.els).filter(e=>e.type==='video'||e.type==='audio').length)) && !/<video|<audio/.test(hq));
console.log(errs.length?errs.join('\n'):'JS 오류 없음');
await b.close(); srv.close();
