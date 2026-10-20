// 아주 작은 가짜 supabase: 표 + RLS 흉내(내 책/공개 책/관리자) + 저장소
export const S = globalThis.__S = { books:[], media:[], admins:['adm'], unapproved:[], userInserts:0, files:{}, users:{'jwt-u1':'u1','jwt-u2':'u2','jwt-adm':'adm'} };
const pub = b => b && b.is_public && !b.admin_hidden && !b.deleted_at;
export function createClient(url, key, opts={}){
  const service = key==='SERVICE';
  const auth = opts.global?.headers?.Authorization || '';
  const uid = S.users[auth.replace(/^Bearer\s+/,'')] || null;
  const visible = (t,r) => service ? true : t==='books' ? (r.owner_id===uid || pub(r) || S.admins.includes(uid))
    : t==='media' ? (()=>{ const b=S.books.find(x=>x.id===r.book_id); return b&&(b.owner_id===uid||pub(b)||S.admins.includes(uid)); })() : true;
  function q(t){ let f=[], op='select', patch, one=null, head=false, lim=null, cols='*';
    const api={ select(c,o){ if(o?.head) head=true; if(typeof c==='string') cols=c; return api; }, insert(v){ op='insert'; patch=v; return api; }, update(v){ op='update'; patch=v; return api; },
      eq(k,v){ f.push(r=>r[k]===v); return api; }, in(k,v){ f.push(r=>v.includes(r[k])); return api; },
      not(k,o,v){ if(o==='is') f.push(r=>r[k]!==null&&r[k]!==undefined); if(o==='like'){ const p=v.replace('%',''); f.push(r=>!String(r[k]).startsWith(p)); } return api; },
      limit(n){ lim=n; return api; }, single(){ one='s'; return api; }, maybeSingle(){ one='m'; return api; },
      then(res){ res(run()); } };
    function run(){
      if(op==='insert'){ if(!service){ S.userInserts++; const b=S.books.find(x=>x.id===patch.book_id); if(!b||b.owner_id!==uid||patch.owner_id!==uid) return {data:null,error:{code:'42501'}}; } // 회원 권한 INSERT 는 0011 뒤엔 실제로 불가(권한 없음) — 횟수만 센다
        const used=S.media.filter(m=>m.book_id===patch.book_id).reduce((n,m)=>n+m.size_bytes,0); if(used+patch.size_bytes>200*1048576) return {data:null,error:{code:'54000'}};
        const r={id:crypto.randomUUID(),...patch}; S.media.push(r); return {data:r,error:null}; }
      if(t==='media' && !service && !uid && op==='select' && /owner_id|storage_path|size_bytes|caption|\*/.test(cols)) return {data:null,error:{code:'42501',message:'permission denied for table media'}}; // 0015: 비로그인은 id·book_id·kind 만
      let rows=S[t].filter(r=>visible(t,r)&&f.every(g=>g(r)));
      if(op==='update'){ rows.forEach(r=>Object.assign(r,patch)); return {error:null}; }
      if(lim) rows=rows.slice(0,lim);
      if(head) return {count:rows.length};
      if(one) return {data:rows[0]??null,error:one==='s'&&!rows[0]?{}:null};
      return {data:rows,error:null}; }
    return api; }
  const storage={ from(){ return {
    async createSignedUrls(ps,ttl){ return {data:ps.map(p=>({signedUrl:`https://sb.test/sign/${p}?ttl=${ttl}`}))}; },
    async list(dir,{search}){ const k=dir+'/'+search; return {data:S.files[k]?[{name:search,metadata:{size:S.files[k].size,mimetype:S.files[k].type}}]:[]}; },
    async remove(ps){ ps.forEach(p=>delete S.files[p]); return {error:null}; },
    async download(p){ const f=S.files[p]; return f?{data:new Blob([new Uint8Array(f.size)],{type:f.type}),error:null}:{data:null,error:{}}; } }; } };
  return { from:q, storage, rpc:async n=>({data: n==='am_i_admin' ? S.admins.includes(uid) : n==='am_i_approved' ? (!!uid && !S.unapproved.includes(uid)) : null}),
    auth:{ async getUser(j){ const u=S.users[j]; return {data:{user:u?{id:u}:null}}; } } };
}
