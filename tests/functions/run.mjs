const S = (await import('./mock-sb.mjs')).S;
const env={SUPABASE_URL:'https://x.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'SERVICE',SUPABASE_ANON_KEY:'ANON',R2_ACCOUNT_ID:'acc',R2_ACCESS_KEY_ID:'AK',R2_SECRET_ACCESS_KEY:'SK',R2_BUCKET:'book-media'};
let handler; globalThis.Deno={ env:{get:k=>env[k]}, serve:h=>{ handler=h; } };
// 가짜 R2: 서명 주소의 서명 헤더·만료를 확인하고 메모리에 보관
const R2={}; const realFetch=globalThis.fetch;
globalThis.fetch=async (url,init={})=>{ const u=new URL(url); if(!u.host.endsWith('r2.cloudflarestorage.com')) return realFetch(url,init);
  if(!u.searchParams.get('X-Amz-Signature')) return new Response('',{status:403});
  const signed=u.searchParams.get('X-Amz-SignedHeaders').split(';'); const m=(init.method||'GET');
  const key=decodeURIComponent(u.pathname.replace(/^\/book-media\/?/,''));
  if(m==='GET'&&u.searchParams.get('list-type')){ const pre=u.searchParams.get('prefix'); return new Response(`<x>${Object.keys(R2).filter(k=>k.startsWith(pre)).map(k=>`<Key>${k}</Key>`).join('')}<IsTruncated>false</IsTruncated></x>`); }
  if(m==='PUT'){ const body=init.body; const size=body.size; if(signed.includes('content-length')&&init.__len!==undefined&&init.__len!==size) return new Response('',{status:403}); R2[key]={size,type:(init.headers||{})['Content-Type']||(init.headers||{})['content-type']}; return new Response(''); }
  if(m==='HEAD'){ const o=R2[key]; return o?new Response(null,{headers:{'content-length':String(o.size),'content-type':o.type}}):new Response(null,{status:404}); }
  if(m==='DELETE'){ delete R2[key]; return new Response(null,{status:204}); }
  return new Response('',{status:400}); };
await import(process.argv[2]);
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
// 설정 전(비밀 값 없음)
for(const k of ['R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET']) delete env[k];
