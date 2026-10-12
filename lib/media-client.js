// 사진·영상·노래 파일 창구(브라우저 쪽). 파일은 서버 함수 'media'가 권한을 확인한 뒤 주는 임시 주소로만 오간다.
// - 올리기: ① 올릴 자리 받기(upload) → ② 파일 보내기(R2 서명 주소, 또는 예전 저장소) → ③ 확인·기록(commit)
// - 보기: 미디어 번호로 임시 주소 받기(sign). 공개 책은 1시간, 내 책은 최대 7일.
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
    async sign(sb, rows, ttl = 3600) {
      const list = [...new Map((rows || []).filter(r => r && r.id && r.storage_path).map(r => [r.id, r])).values()], urls = {};
      try {
        for (let i = 0; i < list.length; i += 200) Object.assign(urls, (await call(sb, { action: 'sign', ids: list.slice(i, i + 200).map(r => r.id), ttl })).urls || {});
      } catch (err) {
        console.error(err);
        const old = list.filter(r => !r.storage_path.startsWith('r2:') && !urls[r.id]);
        if (old.length) {
          const { data } = await sb.storage.from('book-media').createSignedUrls(old.map(r => r.storage_path), Math.min(ttl, 604800));
          (data || []).forEach((d, i) => { if (d && d.signedUrl) urls[old[i].id] = d.signedUrl; });
        }
      }
      return urls;
    },
    // 반환: { media: 기록, url: 임시 주소 }. 실패하면 e.code = quota | too_big | type | forbidden ...
    async upload(sb, file, { book_id, kind, ttl = 3600 }) {
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
      const slot = await call(sb, { action: 'upload', book_id, kind, type: file.type, size: file.size, ext });
      if (slot.backend === 'r2') {
        const r = await fetch(slot.url, { method: 'PUT', body: file, headers: slot.headers || { 'Content-Type': file.type } });
        if (!r.ok) throw new Error('put_' + r.status);
      } else {
        const up = await sb.storage.from('book-media').upload(slot.key, file, { contentType: file.type, upsert: false });
        if (up.error) throw up.error;
      }
      return call(sb, { action: 'commit', book_id, kind, key: slot.key, backend: slot.backend, ttl });
    },
    // 파일 내용(내려받기용 묶음 만들 때)
    async download(sb, row) {
      const u = (await this.sign(sb, [row], 600))[row.id];
      if (!u) throw new Error('no_url');
      const r = await fetch(u); if (!r.ok) throw new Error('get_' + r.status);
      return r.blob();
    },
    // 책을 완전히 지우기 전에 그 책의 파일을 모두 지운다
    purgeBook(sb, book_id) { return call(sb, { action: 'purge', book_id }); },
  };
})();
