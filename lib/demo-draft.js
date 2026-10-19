// 체험 원고 임시 보관함: 로그인하지 않고 쓴 책을 「이 기기의 브라우저」(IndexedDB)에만 남긴다. 서버로 보내지 않는다.
// - 체험 편집기: 고칠 때마다 저장 → 다시 열면 「이어 쓰기 / 지우고 새로 시작」
// - 내 서재(로그인 뒤): 「내 서재로 옮기기 / 지우기」 → 옮기면 내 책이 되고 여기서는 지운다
// 사진·영상·노래(체험에서 직접 넣은 것)는 data: 주소째 들어 있어 크기가 커도 되도록 localStorage 대신 IndexedDB를 쓴다.
(function () {
  const DB = 'moa-demo', STORE = 'draft', KEY = 'current';
  const open = () => new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const run = async (mode, fn) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction(STORE, mode); const out = fn(t.objectStore(STORE)); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); };
  window.DemoDraft = {
    // { savedAt, title, cur, pages } 또는 null
    async get() { try { const v = await run('readonly', s => s.get(KEY)); return v && Array.isArray(v.pages) && v.pages.length ? v : null; } catch (err) { console.error(err); return null; } },
    async put(v) { try { await run('readwrite', s => s.put(v, KEY)); return true; } catch (err) { console.error(err); return false; } },
    async clear() { try { await run('readwrite', s => s.delete(KEY)); return true; } catch (err) { console.error(err); return false; } },
  };
})();
