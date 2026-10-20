// 체험 원고 임시 보관함: 로그인하지 않고 쓴 책을 「이 기기의 브라우저」(IndexedDB)에만 남긴다. 서버로 보내지 않는다.
// - 로그인 편집기(2026-10-20, D14): 서버에 저장되지 못한 수정을 'book:<책 번호>' 열쇠로 같은 보관함에 남겨 두고, 다시 열 때 복구를 제안한다
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
  // 연결은 일마다 열고 닫는다(열어 둔 채면 보관함을 지우거나 판을 올릴 때 모든 탭이 멈춘다)
  const run = async (mode, fn) => { const d = await open(); d.onversionchange = () => d.close(); return new Promise((res, rej) => { const t = d.transaction(STORE, mode); const out = fn(t.objectStore(STORE)); t.oncomplete = () => { d.close(); res(out && out.result); }; t.onerror = () => { d.close(); rej(t.error); }; t.onabort = () => { d.close(); rej(t.error); }; }); };
  window.DemoDraft = {
    // { savedAt, title, cur, pages } 또는 null
    // key: 'current'(체험 책, 기본) 또는 'book:<책 번호>' · 'new:<회원 번호>'(로그인 편집기의 기기 사본)
    async get(key = KEY) { try { const v = await run('readonly', s => s.get(key)); return v && Array.isArray(v.pages) && v.pages.length ? v : null; } catch (err) { console.error(err); return null; } },
    async put(v, key = KEY) { try { await run('readwrite', s => s.put(v, key)); return true; } catch (err) { console.error(err); return false; } },
    async clear(key = KEY) { try { await run('readwrite', s => s.delete(key)); return true; } catch (err) { console.error(err); return false; } },
  };
})();
