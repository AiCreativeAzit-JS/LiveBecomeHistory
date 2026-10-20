// 메모리 기반 가짜 supabase-js (화면 로직 검증용)
(function(){
  const db={books:[],chapters:[],pages:[],book_snapshots:[],book_shares:[],media:[],reports:[],book_admin_notes:[],profiles:[{id:'u1',display_name:'김정선',approved:true}]};
  const files={}; let session=null; try{ session=JSON.parse(localStorage.getItem('fakeSession')||'null'); }catch{}
  let __saved=null; try{ __saved=JSON.parse(localStorage.getItem('fakeDB')||'null'); }catch{}
  if(__saved) Object.assign(db,__saved);
  else if(window.__seed){ Object.keys(window.__seed).forEach(k=>db[k]=JSON.parse(JSON.stringify(window.__seed[k]))); } const listeners=[];
  const uid=()=>'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>(Math.random()*16|0).toString(16));
  window.__db=db; const persist=()=>{ try{ localStorage.setItem('fakeDB',JSON.stringify(db)); }catch{} }; window.__persist=persist; window.__files=files;
  const sync=()=>{ if(!window.__multiTab) return; try{ const s=JSON.parse(localStorage.getItem('fakeDB')||'null'); if(s) Object.keys(s).forEach(k=>{ db[k]=s[k]; }); }catch{} }; // 같은 브라우저의 다른 탭이 저장한 것을 본다
  function q(table){
    const real=table; if(table==='shelf_books') table='books';
    let rng=null; let op='select', rows=null, filters=[], one=null, patch=null, ord=null;
    const api={
      select(){ if(op==='insert'||op==='update') return api; op='select'; return api; },
      insert(v){ op='insert'; patch=v; return api; },
      upsert(v){ op='upsert'; patch=v; return api; },
      not(k,o,v){ const list=String(v).replace(/[()]/g,'').split(','); filters.push(r=>!list.includes(String(r[k]))); return api; },
      update(v){ op='update'; patch=v; return api; },
      delete(){ op='delete'; return api; },
      eq(k,v){ filters.push(r=>r[k]===v); return api; },
      is(k,v){ filters.push(r=>(r[k]??null)===v); return api; },
      order(k,o){ ord=[k,o&&o.ascending===false?-1:1]; return api; },
      single(){ one='single'; return api; },
      maybeSingle(){ one='maybe'; return api; },
      in(k,vals){ filters.push(r=>vals.includes(r[k])); return api; },
      range(a,b){ rng=[a,b]; return api; },
      or(str){ const parts=str.split(',').map(p=>p.split('.')); filters.push(r=>parts.some(([k,o,v])=>String(r[k]||'').toLowerCase().includes(String(v).replace(/%/g,'').toLowerCase()))); return api; },
      then(res,rej){ const w=op!=='select'&&table!=='profiles', go=()=>{ try{ if(w&&window.__failWrite) return res({data:null,error:{message:'Failed to fetch'}}); res(run()); }catch(e){ rej(e); } };
        if(w&&window.__slowWrite) setTimeout(go,window.__slowWrite); else go(); } // __slowWrite(ms)·__failWrite: 느린 저장·끊긴 인터넷 흉내
    };
    function run(){
      sync(); let out;
      if(op==='upsert'){ const arr=Array.isArray(patch)?patch:[patch]; const key=(table==='book_snapshots'||table==='book_shares')?'book_id':'id'; out=arr.map(v=>{ const ex=db[table].find(r=>r[key]===v[key]); if(ex){ Object.assign(ex,v); return ex; } const d={...v}; db[table].push(d); return d; }); persist(); }
      else if(op==='insert'){
        const arr=Array.isArray(patch)?patch:[patch];
        if(table==='reports'&&arr.some(v=>db.reports.some(r=>r.book_id===v.book_id&&r.reporter_id===v.reporter_id))) return {data:null,error:{code:'23505',message:'dup'}};
        out=arr.map(v=>{ const now=new Date().toISOString();
          const d={ id:uid(), created_at:now, updated_at:now, deleted_at:null, is_public:false, admin_hidden:false, title:table==='books'?'제목 없는 책':'', subtitle:'', author_name:'', content:'', published_at:null, ...(table==='books'?{rev:0}:{}), ...v };
          db[table].push(d); return d; }); persist();
      } else {
        let m=db[table].filter(r=>filters.every(f=>f(r)));
        if(real==='shelf_books') m=m.filter(r=>r.is_public&&!r.admin_hidden&&!r.deleted_at);
        if(op==='update'){ m.forEach(r=>Object.assign(r,patch,{updated_at:new Date().toISOString()})); out=m; persist(); }
        else if(op==='delete'){ db[table]=db[table].filter(r=>!m.includes(r)); window.__db[table]=db[table]; out=m; persist(); }
        else { if(ord) m=[...m].sort((a,b)=>(a[ord[0]]>b[ord[0]]?1:-1)*ord[1]); if(rng) m=m.slice(rng[0],rng[1]+1); out=m.map(r=>({...r})); } // 읽기는 복사본(화면이 받은 행을 고쳐도 서버가 바뀌지 않게)
      }
      if(one) return { data: out[0]??null, error: (one==='single'&&!out[0])?{message:'not found'}:null };
      return { data: out, error:null };
    }
    return api;
  }
  window.__fireAuth=(ev,s)=>listeners.forEach(cb=>cb(ev,s===undefined?session:s)); // 시험용: 로그인 상태 변화(SIGNED_OUT 등) 알림
  window.supabase={ createClient(){ return {
    auth:{
      async getSession(){ return {data:{session:window.__authExpired?null:session}} },   // __authExpired: 로그인이 풀린 상태 흉내
      onAuthStateChange(cb){ listeners.push(cb); },
      async signInWithPassword({email,password}){ if(password!=='password123') return {error:{message:'Invalid login credentials'}};
        session={user:{id:email.startsWith('admin')?'adm':'u1',email}}; localStorage.setItem('fakeSession',JSON.stringify(session.user?session:null)); window.__authExpired=false;
        listeners.forEach(cb=>{ try{ cb('SIGNED_IN',session); }catch(e){ console.error(e); } }); return {data:{session},error:null}; },
      async signUp(a){ window.__lastSignUp=a; return {data:{session:null},error:null}; },
      async signOut(){ session=null; },
      async updateUser(a){ window.__pwChanged=a.password; return {data:{},error:null}; }
    },
    from:q,
    functions:{ async invoke(name,{body}){ // 가짜 shared-book / delete-account 함수
      if(name==='delete-account'){ // 로그인한 본인만, confirm 필요
        if(!session) return {data:null,error:{message:'unauthorized'}};
        if(!body||body.confirm!=='탈퇴') return {data:null,error:{message:'confirm_required'}};
        const uid=session.user.id, mine=new Set(db.books.filter(b=>b.owner_id===uid).map(b=>b.id));
        let nFiles=0; db.media.filter(m=>m.owner_id===uid).forEach(m=>{ if(m.storage_path){ delete files[m.storage_path]; nFiles++; } });
        for(const t of ['pages','book_snapshots','book_shares','chapters','book_admin_notes']) db[t]=db[t].filter(r=>!mine.has(r.book_id));
        db.reports=db.reports.filter(r=>!mine.has(r.book_id)&&r.reporter_id!==uid);
        db.media=db.media.filter(m=>m.owner_id!==uid&&!mine.has(m.book_id)); db.books=db.books.filter(b=>b.owner_id!==uid); db.profiles=db.profiles.filter(p=>p.id!==uid);
        window.__deletedUsers=(window.__deletedUsers||[]).concat(uid); persist();
        return {data:{ok:true,files:nFiles},error:null};
      }
      if(name==='media'&&localStorage.getItem('mediaDown')) return {data:null,error:{message:'down'}};
      if(name==='media'){ // 가짜 media 함수(권한: 내 책 / 공개 책 / 관리자)
        const uidNow=session&&session.user.id, isAdm=!!session&&(window.__admins||[]).includes(uidNow);
        const canSee=m=>{ const bk=db.books.find(x=>x.id===m.book_id); return bk&&(bk.owner_id===uidNow||isAdm||(bk.is_public&&!bk.admin_hidden&&!bk.deleted_at)); };
        const url=m=>files[m.storage_path]?URL.createObjectURL(files[m.storage_path]):'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        (window.__mediaCalls=window.__mediaCalls||[]).push(body);
        if(body.action==='commit'&&window.__mediaDelays&&window.__mediaDelays.length) await new Promise(r=>setTimeout(r,window.__mediaDelays.shift())); // 올리기 완료를 늦추기(순서 뒤바꾸기 시험)
        const printKey=k=>k.replace(/(\.[a-z0-9]{1,8})$/i,'@print$1'); // 사진 두 벌 보관: 인쇄용 원본
        if(body.action==='sign'){ const urls={}; db.media.filter(m=>body.ids.includes(m.id)&&m.storage_path&&canSee(m)).forEach(m=>{ const pk=printKey(m.storage_path);
            urls[m.id]= body.variant==='print'&&m.owner_id===uidNow&&m.kind==='image'&&files[pk] ? url({storage_path:pk}) : url(m); }); return {data:{urls},error:null}; }
        if(!uidNow) return {data:{error:'unauthorized'},error:null};
        if(body.action==='migrate'){ if(!isAdm) return {data:{error:'forbidden'},error:null};
          const old=db.media.filter(m=>m.storage_path&&!m.storage_path.startsWith('r2:')); const now=old.slice(0,body.limit||10); now.forEach(m=>m.storage_path='r2:'+m.storage_path); persist();
          return {data:{moved:now.length,failed:[],remaining:old.length-now.length},error:null}; }
        const bk=db.books.find(x=>x.id===body.book_id&&x.owner_id===uidNow); if(!bk) return {data:{error:'forbidden'},error:null};
        if(body.action==='upload'){ const used=db.media.filter(m=>m.book_id===bk.id).reduce((n,m)=>n+Number(m.size_bytes||0),0); if(used+body.size>200*1048576) return {data:{error:'quota'},error:null};
          const key=`${uidNow}/${bk.id}/${uid()}.${body.ext}`; return {data:{backend:'supabase',key,...(body.print&&body.kind==='image'&&!window.__oldMediaFn?{print_key:printKey(key)}:{})},error:null}; }
        if(body.action==='commit'){ const f=files[body.key], pf=body.print_key&&files[printKey(body.key)]; if(!f||(body.print_key&&!pf)) return {data:{error:'missing'},error:null};
          const d={id:uid(),book_id:bk.id,owner_id:uidNow,kind:body.kind,storage_path:body.key,size_bytes:f.size+(pf?pf.size:0),created_at:new Date().toISOString()}; db.media.push(d); persist(); return {data:{media:d,url:url(d)},error:null}; }
        if(body.action==='purge'){ let n=0; db.media.filter(m=>m.book_id===bk.id).forEach(m=>{ if(files[m.storage_path]){ delete files[m.storage_path]; } n++; }); window.__purged=(window.__purged||[]).concat(bk.id); return {data:{files:n},error:null}; }
        return {data:null,error:{message:'action'}};
      }
      if(name!=='shared-book') return {data:null,error:{message:'no fn'}};
      const sh=db.book_shares.find(x=>x.token===body.token); if(!sh) return {data:null,error:{message:'not_found'}};
      const b=db.books.find(x=>x.id===sh.book_id); if(!b||b.deleted_at||b.admin_hidden) return {data:null,error:{message:'not_found'}};
      const sn=db.book_snapshots.find(x=>x.book_id===b.id); if(!sn) return {data:null,error:{message:'not_found'}};
      const urls={}; db.media.filter(m=>m.book_id===b.id).forEach(m=>{ urls[m.id]=files[m.storage_path]?URL.createObjectURL(files[m.storage_path]):'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='; });
      return {data:{title:sn.title,author_name:sn.author_name,pages:sn.pages,urls},error:null}; } },
    async rpc(name,args){
      if(name==='save_pages'){ // 가짜 save_pages: 판 번호(rev) 검사 + 보낸 쪽 upsert + 지운 쪽 delete 를 한 번에(모두 되거나 모두 안 됨)
        (window.__saveCalls=window.__saveCalls||[]).push(Date.now()); (window.__saveArgs=window.__saveArgs||[]).push(args);
        if(window.__slowWrite) await new Promise(r=>setTimeout(r,window.__slowWrite));
        if(window.__failWrite) return {data:null,error:{message:'Failed to fetch'}};
        if(window.__authExpired) return {data:null,error:{code:'PGRST301',message:'JWT expired'},status:401};
        if(window.__denyWrite) return {data:null,error:{code:'42501',message:'new row violates row-level security policy'},status:403};
        sync();
        const me=session&&session.user.id, b=db.books.find(x=>x.id===args.p_book&&x.owner_id===me&&!x.deleted_at);
        if(!b) return {data:null,error:{code:'42501',message:'book not found'},status:403};
        const cur=b.rev||0;
        if(!args.p_replace && args.p_rev!=null && cur!==args.p_rev) return {data:{ok:false,conflict:true,rev:cur},error:null};
        const ts=new Date().toISOString();
        for(const p of (args.p_pages||[])){ const row={...p,book_id:b.id}; const ex=db.pages.find(r=>r.id===p.id); if(ex) Object.assign(ex,row,{updated_at:ts}); else db.pages.push({created_at:ts,updated_at:ts,...row}); }
        if(args.p_replace){ const keep=new Set((args.p_pages||[]).map(p=>p.id)); db.pages=db.pages.filter(r=>r.book_id!==b.id||keep.has(r.id)); }
        else if(args.p_deleted&&args.p_deleted.length){ const del=new Set(args.p_deleted); db.pages=db.pages.filter(r=>!(r.book_id===b.id&&del.has(r.id))); }
        b.rev=cur+1; if(args.p_title){ const t=String(args.p_title).trim().slice(0,120); if(t) b.title=t; } b.updated_at=ts; persist();
        return {data:{ok:true,rev:b.rev},error:null};
      }
      const isAdm = !!session && (window.__admins||[]).includes(session.user.id);
      if(name==='am_i_admin') return {data:isAdm,error:null};
      if(name==='admin_usage'){ if(!isAdm) return {data:null,error:{message:'forbidden'}};
        const sz=db.media.reduce((a,m)=>a+Number(m.size_bytes||0),0); return {data:{db_bytes:window.__dbBytes??(12*1024*1024),storage_bytes:sz,storage_files:db.media.length},error:null}; }
      if(name==='admin_set_approved'){ // 가입 승인·취소(관리자만)
        if(!isAdm) return {data:null,error:{message:'forbidden'}};
        const p=db.profiles.find(x=>x.id===args.u); if(p) p.approved=!!args.ok; persist(); return {data:null,error:null};
      }
      if(name==='admin_set_hidden'){
        if(!isAdm) return {data:null,error:{message:'forbidden'}};
        const b=db.books.find(x=>x.id===args.b); if(b) b.admin_hidden=args.hidden;
        const n=db.book_admin_notes.find(x=>x.book_id===args.b); if(n) n.note=args.note; else db.book_admin_notes.push({book_id:args.b,note:args.note});
        return {data:null,error:null};
      }
      return {data:null,error:{message:'unknown rpc'}};
    },
    storage:{ from(){ return {
      async upload(path,f){ files[path]=f; return {error:null} },
      async download(path){ window.__directStorage=(window.__directStorage||0)+1; return {data:files[path]||new Blob(['x'],{type:'image/png'}),error:null} },
      async createSignedUrl(path){ window.__directStorage=(window.__directStorage||0)+1; return {data:{signedUrl:files[path]?URL.createObjectURL(files[path]):'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='}} },
      async createSignedUrls(paths){ window.__directStorage=(window.__directStorage||0)+1; return {data:paths.map(p=>({path:p,signedUrl:files[p]?URL.createObjectURL(files[p]):'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='}))} },
      async remove(){ return {error:null} },
    }} }
  }}};
})();
