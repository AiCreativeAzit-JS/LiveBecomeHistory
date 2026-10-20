const S = (await import('./mock-sb.mjs')).S;
const env={SUPABASE_URL:'https://x.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'SERVICE',SUPABASE_ANON_KEY:'ANON',R2_ACCOUNT_ID:'acc',R2_ACCESS_KEY_ID:'AK',R2_SECRET_ACCESS_KEY:'SK',R2_BUCKET:'book-media'};
let handler; globalThis.Deno={ env:{get:k=>env[k]}, serve:h=>{ handler=h; } };
// 가짜 R2: 서명 주소의 서명 헤더·만료를 확인하고 메모리에 보관
const R2={}; const realFetch=globalThis.fetch;
globalThis.fetch=async (url,init={})=>{ const u=new URL(url); if(!u.host.endsWith('r2.cloudflarestorage.com')) return realFetch(url,init);
  if(!u.searchParams.get('X-Amz-Signature')) return new Response('',{status:403});
  const signed=u.searchParams.get('X-Amz-SignedHeaders').split(';'); const m=(init.method||'GET');
  const key=decodeURIComponent(u.pathname.replace(/^\/book-media\/?/,''));
  if(m==='GET'&&u.searchParams.get('list-type')){ const pre=u.searchParams.get('prefix')||''; return new Response(`<x>${Object.keys(R2).filter(k=>k.startsWith(pre)).map(k=>`<Contents><Key>${k}</Key><Size>${R2[k].size}</Size></Contents>`).join('')}<IsTruncated>false</IsTruncated></x>`); }
  if(m==='PUT'){ const body=init.body; const size=body.size; if(signed.includes('content-length')&&init.__len!==undefined&&init.__len!==size) return new Response('',{status:403}); R2[key]={size,type:(init.headers||{})['Content-Type']||(init.headers||{})['content-type']}; return new Response(''); }
  if(m==='HEAD'){ const o=R2[key]; return o?new Response(null,{headers:{'content-length':String(o.size),'content-type':o.type}}):new Response(null,{status:404}); }
  if(m==='DELETE'){ delete R2[key]; return new Response(null,{status:204}); }
  return new Response('',{status:400}); };
await import((p=>/^[A-Za-z]:/.test(p)?'file:///'+p.replace(/\\/g,'/'):p)(process.argv[2]));
const call=async(body,jwt)=>{ const r=await handler(new Request('https://f/media',{method:'POST',headers:{'content-type':'application/json',apikey:'sb_publishable_x',Authorization:'Bearer '+(jwt||'sb_publishable_x')},body:JSON.stringify(body)})); return r.json(); };
const ok=(n,c)=>console.log((c?'PASS ':'FAIL ')+n);
const B1='11111111-1111-4111-8111-111111111111', B2='22222222-2222-4222-8222-222222222222';
S.books.push({id:B1,owner_id:'u1',is_public:false},{id:B2,owner_id:'u2',is_public:true});
// 올리기
let up=await call({action:'upload',book_id:B1,kind:'image',type:'image/jpeg',size:1000,ext:'jpg'},'jwt-u1');
ok('upload: R2 서명 주소', up.backend==='r2' && up.url.includes('X-Amz-SignedHeaders=content-length%3Bcontent-type%3Bhost') && up.key.startsWith(`u1/${B1}/`));
ok('upload: 로그인 안 하면 거절', (await call({action:'upload',book_id:B1,kind:'image',type:'image/jpeg',size:1000})).error==='unauthorized');
ok('upload: 남의 책 거절', (await call({action:'upload',book_id:B2,kind:'image',type:'image/jpeg',size:1000},'jwt-u1')).error==='forbidden');
ok('upload: 종류 다르면 거절', (await call({action:'upload',book_id:B1,kind:'image',type:'video/mp4',size:1000},'jwt-u1')).error==='type');
ok('upload: 너무 크면 거절', (await call({action:'upload',book_id:B1,kind:'video',type:'video/mp4',size:51*1048576},'jwt-u1')).error==='too_big');
await fetch(up.url,{method:'PUT',body:new Blob([new Uint8Array(1000)]),headers:up.headers});
ok('commit: 파일 없으면 거절', (await call({action:'commit',book_id:B1,kind:'image',key:`u1/${B1}/${crypto.randomUUID()}.jpg`,backend:'r2'},'jwt-u1')).error==='missing');
ok('commit: 남의 폴더 경로 거절', (await call({action:'commit',book_id:B1,kind:'image',key:`u2/${B1}/${crypto.randomUUID()}.jpg`,backend:'r2'},'jwt-u1')).error==='forbidden');
const cm=await call({action:'commit',book_id:B1,kind:'image',key:up.key,backend:'r2',ttl:21600},'jwt-u1');
ok('commit: 기록 생성(r2: 경로, 실제 크기)', cm.media?.storage_path==='r2:'+up.key && cm.media.size_bytes===1000 && cm.url.includes('X-Amz-Expires=25200'));
// 크기 속인 파일
const up2=await call({action:'upload',book_id:B1,kind:'image',type:'image/jpeg',size:10,ext:'jpg'},'jwt-u1');
R2[up2.key]={size:16*1048576,type:'image/jpeg'}; // 서명과 다른 크기로 올라갔다고 가정
const cm2=await call({action:'commit',book_id:B1,kind:'image',key:up2.key,backend:'r2'},'jwt-u1');
ok('commit: 한도 넘는 실제 파일은 지우고 거절', cm2.error==='too_big' && !R2[up2.key]);
// 보기
const id=cm.media.id;
ok('sign: 주인은 받음(7일까지)', (await call({action:'sign',ids:[id],ttl:604800},'jwt-u1')).urls[id]?.includes('X-Amz-Expires=604800'));
ok('sign: 비공개 책은 남이 못 받음', !(await call({action:'sign',ids:[id]},'jwt-u2')).urls[id]);
ok('sign: 비공개 책은 비로그인 못 받음', !(await call({action:'sign',ids:[id]})).urls[id]);
ok('sign: 관리자는 받음(1시간까지 + 시간 맞춤 1시간)', (await call({action:'sign',ids:[id],ttl:604800},'jwt-adm')).urls[id]?.includes('X-Amz-Expires=7200'));
{ const a=(await call({action:'sign',ids:[id]},'jwt-u1')).urls[id], b=(await call({action:'sign',ids:[id]},'jwt-u1')).urls[id]; ok('sign: 같은 시간대엔 같은 주소(브라우저 캐시) + 캐시 지시', a===b && a.includes('response-cache-control=private')); }
S.books[0].is_public=true;
ok('sign: 공개 책은 비로그인도 받음(1시간)', (await call({action:'sign',ids:[id],ttl:604800})).urls[id]?.includes('X-Amz-Expires=7200'));
S.books[0].is_public=false;
// 위조 기록: 내 책에 남의 파일 경로
S.media.push({id:'33333333-3333-4333-8333-333333333333',book_id:B1,owner_id:'u1',storage_path:'r2:u2/x/y.jpg',size_bytes:1});
ok('sign: 남의 폴더를 가리키는 위조 기록은 서명 안 함', !(await call({action:'sign',ids:['33333333-3333-4333-8333-333333333333']},'jwt-u1')).urls['33333333-3333-4333-8333-333333333333']);
// 예전 저장소 파일 + 옮기기
S.files[`u1/${B1}/old.jpg`]={size:500,type:'image/jpeg'}; S.media.push({id:'44444444-4444-4444-8444-444444444444',book_id:B1,owner_id:'u1',kind:'image',storage_path:`u1/${B1}/old.jpg`,size_bytes:500});
ok('sign: 예전 저장소 파일도 서명', (await call({action:'sign',ids:['44444444-4444-4444-8444-444444444444']},'jwt-u1')).urls['44444444-4444-4444-8444-444444444444']?.startsWith('https://sb.test/'));
ok('migrate: 관리자만', (await call({action:'migrate'},'jwt-u1')).error==='forbidden');
S.media=S.media.filter(m=>m.id!=='33333333-3333-4333-8333-333333333333');
const mg=await call({action:'migrate',limit:10},'jwt-adm');
ok('migrate: R2로 옮기고 경로 갱신 · 예전 파일 삭제', mg.moved===1 && mg.remaining===0 && R2[`u1/${B1}/old.jpg`] && !S.files[`u1/${B1}/old.jpg`] && S.media.find(m=>m.id==='44444444-4444-4444-8444-444444444444').storage_path===`r2:u1/${B1}/old.jpg`);
// 지우기
R2[`u1/${B2}/z.jpg`]={size:1,type:'image/jpeg'};
ok('purge: 남의 책 거절', (await call({action:'purge',book_id:B2},'jwt-u1')).error==='forbidden');
const pg=await call({action:'purge',book_id:B1},'jwt-u1');
ok('purge: 내 책 폴더만 비움', pg.files===2 && !Object.keys(R2).some(k=>k.startsWith(`u1/${B1}/`)) && R2[`u1/${B2}/z.jpg`]);
// ── 사진 두 벌 보관(화면용 display + 인쇄용 print) ──
const B3='55555555-5555-4555-8555-555555555555'; S.books.push({id:B3,owner_id:'u1',is_public:true});
const put=(url,size,headers)=>fetch(url,{method:'PUT',body:new Blob([new Uint8Array(size)]),headers});
const u3=await call({action:'upload',book_id:B3,kind:'image',type:'image/jpeg',size:300,ext:'jpg',print:{size:1500}},'jwt-u1');
ok('두 벌: upload가 인쇄용 자리(같은 폴더 @print)도 발급', u3.print_key===u3.key.replace(/\.jpg$/,'@print.jpg') && u3.print_url.includes('X-Amz-SignedHeaders=content-length%3Bcontent-type%3Bhost'));
ok('두 벌: 영상·노래에는 인쇄용 자리 없음', !(await call({action:'upload',book_id:B3,kind:'audio',type:'audio/mpeg',size:300,ext:'mp3',print:{size:1500}},'jwt-u1')).print_key);
ok('두 벌: 인쇄용이 한도(15MB) 넘으면 거절', (await call({action:'upload',book_id:B3,kind:'image',type:'image/jpeg',size:300,ext:'jpg',print:{size:16*1048576}},'jwt-u1')).error==='too_big');
await put(u3.url,300,u3.headers); await put(u3.print_url,1500,u3.headers);
ok('두 벌: 인쇄용 키를 바꿔 보내면 거절', (await call({action:'commit',book_id:B3,kind:'image',key:u3.key,backend:'r2',print_key:`u1/${B3}/${crypto.randomUUID()}@print.jpg`},'jwt-u1')).error==='forbidden');
const c3=await call({action:'commit',book_id:B3,kind:'image',key:u3.key,backend:'r2',print_key:u3.print_key},'jwt-u1');
ok('두 벌: commit → 기록은 화면용 경로 · 크기는 두 벌 합계', c3.media?.storage_path==='r2:'+u3.key && c3.media.size_bytes===1800 && c3.url.includes(encodeURI(u3.key.split('/').pop())));
{ const u4=await call({action:'upload',book_id:B3,kind:'image',type:'image/jpeg',size:300,ext:'jpg',print:{size:1500}},'jwt-u1'); await put(u4.url,300,u4.headers);
  const c4=await call({action:'commit',book_id:B3,kind:'image',key:u4.key,backend:'r2',print_key:u4.print_key},'jwt-u1');
  ok('두 벌: 인쇄용이 안 올라왔으면 거절하고 화면용도 지움', c4.error==='missing' && !R2[u4.key]); }
const id3=c3.media.id, nm=k=>k.split('/').pop();
const signAs=async(jwt,variant)=>(await call({action:'sign',ids:[id3],ttl:3600,...(variant?{variant}:{})},jwt)).urls[id3]||'';
ok('① 편집기·서가(기본): 화면용 주소만', (await signAs('jwt-u1')).includes(nm(u3.key)) && !(await signAs('jwt-u1')).includes('%40print') && !(await signAs()).includes('%40print'));
ok('② 인쇄용 내려받기(주인 · variant print): 인쇄용 원본 주소', (await signAs('jwt-u1','print')).includes(encodeURIComponent(nm(u3.print_key))));
{ const u5=await call({action:'upload',book_id:B3,kind:'image',type:'image/jpeg',size:300,ext:'jpg'},'jwt-u1'); await put(u5.url,300,u5.headers);
  const c5=await call({action:'commit',book_id:B3,kind:'image',key:u5.key,backend:'r2'},'jwt-u1');
  const u=(await call({action:'sign',ids:[c5.media.id],variant:'print'},'jwt-u1')).urls[c5.media.id]||'';
  ok('③ 예전 사진(인쇄용 없음): print 요청에도 화면용으로 보임', c5.media.size_bytes===300 && u.includes(nm(u5.key)) && !u.includes('%40print')); }
ok('④ 남의 공개 책·비로그인·관리자의 print 요청: 인쇄용 원본은 안 줌(화면용만)', [await signAs('jwt-u2','print'),await signAs(undefined,'print'),await signAs('jwt-adm','print')].every(u=>u.includes(nm(u3.key))&&!u.includes('%40print')));
{ const pz=await call({action:'purge',book_id:B3},'jwt-u1');
  ok('⑤ 책 지우기: 두 벌 모두 사라짐', !Object.keys(R2).some(k=>k.startsWith(`u1/${B3}/`)) && pz.files>=3); }
// ── D22(RT-002): 기록은 서버 키로만 · 승인된 회원만 올린다 · 한도 ──
S.users['jwt-u3']='u3'; S.unapproved.push('u3'); const B4='66666666-6666-4666-8666-666666666666'; S.books.push({id:B4,owner_id:'u3',is_public:false});
ok('D22: 미승인 회원은 올릴 자리를 못 받음(not_approved)', (await call({action:'upload',book_id:B4,kind:'image',type:'image/jpeg',size:100,ext:'jpg'},'jwt-u3')).error==='not_approved');
ok('D22: 미승인 회원은 commit도 거절', (await call({action:'commit',book_id:B4,kind:'image',key:`u3/${B4}/${crypto.randomUUID()}.jpg`,backend:'r2'},'jwt-u3')).error==='not_approved');
ok('D22: 승인된 회원의 남의 책은 여전히 forbidden(승인 검사가 소유 검사를 대신하지 않음)', (await call({action:'upload',book_id:B4,kind:'image',type:'image/jpeg',size:100,ext:'jpg'},'jwt-u1')).error==='forbidden');
ok('D22: 지금까지 만든 media 기록은 모두 서비스 키로(회원 권한 INSERT 0건)', S.userInserts===0 && S.media.length>0);
{ S.media.push({id:crypto.randomUUID(),book_id:B1,owner_id:'u1',kind:'video',storage_path:'r2:full',size_bytes:200*1048576-50});
  ok('D22: 한도가 찬 책은 올릴 자리 거절(quota)', (await call({action:'upload',book_id:B1,kind:'image',type:'image/jpeg',size:100,ext:'jpg'},'jwt-u1')).error==='quota');
  // 자리를 받은 뒤 다른 파일이 먼저 한도를 채우면 commit 때 DB 트리거(54000)가 막고, 올린 파일은 지운다
  S.media.pop(); const slot=await call({action:'upload',book_id:B1,kind:'image',type:'image/jpeg',size:10,ext:'jpg'},'jwt-u1'); S.media.push({id:crypto.randomUUID(),book_id:B1,owner_id:'u1',kind:'video',storage_path:'r2:full',size_bytes:200*1048576-5});
  await put(slot.url,10,slot.headers);
  const c6=await call({action:'commit',book_id:B1,kind:'image',key:slot.key,backend:'r2'},'jwt-u1');
  ok('D22: commit 때 한도 넘으면 트리거(54000)→quota, 올린 파일은 지움', c6.error==='quota' && !R2[slot.key]); S.media.pop(); }
// ── D40(RT-602): 비로그인은 media 의 경로·주인 열을 못 읽어도(0015) 공개 책 사진 서명은 된다 ──
{ const B5='77777777-7777-4777-8777-777777777777', M5='88888888-8888-4888-8888-888888888888';
  S.books.push({id:B5,owner_id:'u2',is_public:true}); S.media.push({id:M5,book_id:B5,owner_id:'u2',kind:'image',storage_path:`r2:u2/${B5}/p.jpg`,size_bytes:5}); R2[`u2/${B5}/p.jpg`]={size:5,type:'image/jpeg'};
  const { createClient } = await import('./mock-sb.mjs');
  ok('D40: 가짜 DB도 비로그인의 media 경로·주인 열 읽기를 거부(0015 흉내)', (await createClient('u','ANON').from('media').select('id,owner_id,storage_path').in('id',[M5])).error?.code==='42501');
  ok('D40: 비로그인도 공개 책 사진 서명은 받음(함수는 id 만 읽고 경로는 서비스 키로)', !!(await call({action:'sign',ids:[M5]})).urls[M5]);
  S.books.find(b=>b.id===B5).is_public=false;
  ok('D40: 비공개가 되면 비로그인은 서명 못 받음(볼 수 있는지는 여전히 RLS 로)', !(await call({action:'sign',ids:[M5]})).urls[M5]);
  // ── D39(RT-601): 실제 R2 파일과 기록 대조 ──
  R2[`u2/${B5}/orphan.jpg`]={size:77,type:'image/jpeg'}; R2[`u2/${B5}/p@print.jpg`]={size:9,type:'image/jpeg'};
  const mine=await call({action:'audit'},'jwt-u2');
  ok('D39 대조(회원): 자기 폴더만 · 기록 없는 파일 1개(77B) · 인쇄용 사본은 기록 있는 것으로', mine.scope==='mine' && mine.r2_files===3 && mine.orphan_files===1 && mine.orphan_bytes===77 && mine.missing_files===0 && mine.rows===1, JSON.stringify(mine));
  const all=await call({action:'audit'},'jwt-adm');
  ok('D39 대조(관리자): 전체 범위', all.scope==='all' && all.r2_files>mine.r2_files && all.orphan_files>=1, JSON.stringify(all));
  ok('D39 대조: 비로그인 거절', (await call({action:'audit'})).error==='unauthorized'); }
// 설정 전(비밀 값 없음)
for(const k of ['R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET']) delete env[k];
