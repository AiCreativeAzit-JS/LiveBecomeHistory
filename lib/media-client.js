// 사진·영상·노래 파일 창구(브라우저 쪽). 파일은 서버 함수 'media'가 권한을 확인한 뒤 주는 임시 주소로만 오간다.
// - 올리기: ① 올릴 자리 받기(upload) → ② 파일 보내기(R2 서명 주소, 또는 예전 저장소) → ③ 확인·기록(commit)
// - 보기: 미디어 번호로 임시 주소 받기(sign). 공개 책은 1시간, 내 책은 최대 7일.
// - 사진 두 벌 보관: 화면용(display)과 인쇄용 원본(print)을 함께 올리고, 인쇄용 내려받기만 variant 'print'로 받는다.
//   서버 함수가 두 벌을 모르는 예전 판이어도 화면용 한 벌로 그대로 동작한다.
(function () {
  async function call(sb, body) {
    const { data, error } = await sb.functions.invoke('media', { body });
    if (error) throw new Error('media_' + (error.message || 'error'));
    if (data && data.error) { const e = new Error(data.error); e.code = data.error; throw e; }
    return data || {};
  }
  window.MediaClient = {
    // rows: 미디어 기록({id, storage_path}) 배열 → { 번호: 임시 주소 }
    // 창구(서버 함수)가 응답하지 않으면, 예전 저장소 파일만이라도 예전 방식(저장소 규칙)으로 서명해 화면이 끊기지 않게 한다.
    // variant: 'print'면 내 책 사진은 인쇄용 원본 주소(없으면 화면용)
    async sign(sb, rows, ttl = 3600, variant) {
      // 경로(storage_path)를 모르는 행(비로그인 서가는 사진 번호만 읽음)도 서버 함수에 보낸다. null 은 파일 없는 기록이라 뺀다
      const list = [...new Map((rows || []).filter(r => r && r.id && r.storage_path !== null).map(r => [r.id, r])).values()], urls = {};
      try {
        for (let i = 0; i < list.length; i += 200) Object.assign(urls, (await call(sb, { action: 'sign', ids: list.slice(i, i + 200).map(r => r.id), ttl, ...(variant === 'print' ? { variant } : {}) })).urls || {});
      } catch (err) {
        console.error(err);
        const old = list.filter(r => r.storage_path && !r.storage_path.startsWith('r2:') && !urls[r.id]);
        if (old.length) {
          const { data } = await sb.storage.from('book-media').createSignedUrls(old.map(r => r.storage_path), Math.min(ttl, 604800));
          (data || []).forEach((d, i) => { if (d && d.signedUrl) urls[old[i].id] = d.signedUrl; });
        }
      }
      return urls;
    },
    // 반환: { media: 기록, url: 임시 주소 }. 실패하면 e.code = quota | too_big | type | forbidden ...
    // print: 사진의 인쇄용 원본(File, 화면용과 같은 종류). 서버가 자리를 주면 함께 올린다
    async upload(sb, file, { book_id, kind, ttl = 3600, print = null }) {
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
      const two = !!(print && kind === 'image' && print.type === file.type);
      const slot = await call(sb, { action: 'upload', book_id, kind, type: file.type, size: file.size, ext, ...(two ? { print: { size: print.size } } : {}) });
      if (slot.backend === 'r2') {
        const headers = slot.headers || { 'Content-Type': file.type };
        const puts = [fetch(slot.url, { method: 'PUT', body: file, headers })];
        if (two && slot.print_url) puts.push(fetch(slot.print_url, { method: 'PUT', body: print, headers }));
        for (const r of await Promise.all(puts)) if (!r.ok) throw new Error('put_' + r.status);
      } else {
        const up = await sb.storage.from('book-media').upload(slot.key, file, { contentType: file.type, upsert: false });
        if (up.error) throw up.error;
        if (two && slot.print_key) { const pu = await sb.storage.from('book-media').upload(slot.print_key, print, { contentType: print.type, upsert: false }); if (pu.error) throw pu.error; }
      }
      return call(sb, { action: 'commit', book_id, kind, key: slot.key, backend: slot.backend, ttl, ...(two && slot.print_key ? { print_key: slot.print_key } : {}) });
    },
    // 파일 내용(내려받기용 묶음 만들 때)
    async download(sb, row, variant) {
      const u = (await this.sign(sb, [row], 600, variant))[row.id];
      if (!u) throw new Error('no_url');
      const r = await fetch(u); if (!r.ok) throw new Error('get_' + r.status);
      return r.blob();
    },
    // 책을 완전히 지우기 전에 그 책의 파일을 모두 지운다
    purgeBook(sb, book_id) { return call(sb, { action: 'purge', book_id }); },
  };
})();
