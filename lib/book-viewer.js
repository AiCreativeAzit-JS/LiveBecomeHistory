/* 인물대백과사 · 책 보기 부품 (서가·비밀 링크·화면용 전자책 공용)
   1) 가로로 넘기는 책(한 쪽씩, 쪽 번호, ← → 키·밀기)
   2) 진행 막대가 잘 보이는 노래 재생기(내려받기 메뉴 없음)
   3) 저작권 보호: 우클릭·끌기·복사·인쇄 막기, 영상 내려받기 메뉴 숨기기
   ※ 화면 녹화·개발자 도구까지 막을 수는 없다. '가볍게 퍼 가기'를 막는 장치다. */
(function (global) {
  'use strict';
  const CSS = `
.bv{position:relative;max-width:100%;margin:0 auto}
.bv-track{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;scrollbar-width:none;outline:none}
.bv-track::-webkit-scrollbar{display:none}
.bv-page{flex:0 0 100%;scroll-snap-align:center;display:flex;flex-direction:column;align-items:center;padding:6px 0 4px}
.bv-page .bk-pg,.bv-page .pg{width:min(540px,calc(100vw - 40px),calc((100vh - 170px) * 152 / 225));box-shadow:0 10px 30px rgba(20,40,32,.14)}
.bv-num{margin-top:10px;font:600 13px/1 'Pretendard',sans-serif;color:#7B8A83;letter-spacing:.04em}
.bv-nav{display:flex;align-items:center;justify-content:center;gap:14px;margin:14px 0 4px;font-family:'Pretendard',sans-serif}
.bv-nav button{width:46px;height:46px;border-radius:50%;border:1.5px solid #CFC8AE;background:#fff;color:#0B3324;font-size:22px;cursor:pointer;display:grid;place-items:center}
.bv-nav button:hover:not(:disabled){background:#0B3324;color:#fff}.bv-nav button:disabled{opacity:.3;cursor:default}
.bv-no{min-width:88px;text-align:center;font-weight:700;color:#0B3324;font-size:15px}
.bv-side{position:absolute;top:0;bottom:60px;width:12%;cursor:pointer;z-index:2}.bv-side.l{left:0}.bv-side.r{right:0}
.ap{width:100%;height:100%;display:flex;align-items:center;gap:3cqw;padding:0 3.5cqw;border:.3cqw solid #D8E6DF;border-radius:1.6cqw;background:linear-gradient(135deg,#F1F7F4,#fff);font-family:'Pretendard',sans-serif}
.ap-btn{flex:none;width:10cqw;height:10cqw;border-radius:50%;border:none;background:#0F5B48;color:#fff;font-size:4cqw;cursor:pointer;display:grid;place-items:center;padding:0}
.ap-btn:hover{background:#0B4536}
.ap-bar{flex:1;height:2.2cqw;border-radius:2cqw;background:#DCE8E2;position:relative;cursor:pointer;overflow:hidden}
.ap-bar i{position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,#E0A52E,#C0392B);border-radius:2cqw}
.ap.playing .ap-bar{box-shadow:0 0 0 .4cqw rgba(224,165,46,.25)}
.ap-t{flex:none;font-size:2.8cqw;font-weight:700;color:#0B4536;min-width:14cqw;text-align:right;font-variant-numeric:tabular-nums}
.bv-protect,.bv-protect *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.bv-protect img{pointer-events:none;-webkit-user-drag:none}
`;
  const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  /* 노래 재생기: data-src 가 있는 .ap 를 찾아 연결한다(한 번에 한 곡만 재생) */
  function wireAudio(root) {
    root.querySelectorAll('.ap[data-src]').forEach(ap => {
      if (ap._wired) return; ap._wired = true;
      const a = new Audio(); a.preload = 'none'; a.src = ap.dataset.src; ap.removeAttribute('data-src');
      a.setAttribute('controlsList', 'nodownload');
      const btn = ap.querySelector('.ap-btn'), bar = ap.querySelector('.ap-bar'), fill = ap.querySelector('.ap-bar i'), t = ap.querySelector('.ap-t');
      const upd = () => { const d = a.duration || 0; fill.style.width = d ? (a.currentTime / d * 100) + '%' : '0'; t.textContent = fmt(a.currentTime) + (d ? ' / ' + fmt(d) : ''); };
      btn.onclick = () => { if (a.paused) { document.querySelectorAll('audio').forEach(x => x !== a && x.pause()); (global.__bvAudios || []).forEach(x => x !== a && x.pause()); a.play(); } else a.pause(); };
      a.addEventListener('play', () => { btn.textContent = '❚❚'; btn.setAttribute('aria-label', '멈춤'); ap.classList.add('playing'); });
      a.addEventListener('pause', () => { btn.textContent = '▶'; btn.setAttribute('aria-label', '재생'); ap.classList.remove('playing'); });
      a.addEventListener('timeupdate', upd); a.addEventListener('loadedmetadata', upd); a.addEventListener('ended', () => { a.currentTime = 0; upd(); });
      bar.onclick = ev => { const r = bar.getBoundingClientRect(); if (a.duration) a.currentTime = (ev.clientX - r.left) / r.width * a.duration; };
      (global.__bvAudios = global.__bvAudios || []).push(a); ap._audio = a;
    });
  }
  /* 영상: 내려받기·PIP 메뉴 숨기기 */
  function wireVideo(root) {
    root.querySelectorAll('video').forEach(v => { v.setAttribute('controlsList', 'nodownload noplaybackrate noremoteplayback'); v.disablePictureInPicture = true; v.setAttribute('disablePictureInPicture', ''); });
  }
  /* 저작권 보호: 우클릭·끌기·복사·잘라내기·인쇄 */
  function protect(root, opts = {}) {
    root.classList.add('bv-protect');
    const stop = e => { e.preventDefault(); if (opts.onBlocked) opts.onBlocked(e.type); };
    ['contextmenu', 'dragstart', 'copy', 'cut', 'selectstart'].forEach(t => root.addEventListener(t, stop));
    if (opts.blockPrint !== false && !document.getElementById('bv-noprint')) {
      const st = document.createElement('style'); st.id = 'bv-noprint';
      st.textContent = '@media print{body>*{display:none!important}body::before{content:"이 책은 작가의 저작권 보호를 위해 인쇄할 수 없어요.";display:block;font:16px sans-serif;padding:40px;text-align:center}}';
      document.head.appendChild(st);
      document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && ['p', 's'].includes(e.key.toLowerCase())) { e.preventDefault(); if (opts.onBlocked) opts.onBlocked(e.key.toLowerCase() === 'p' ? 'print' : 'save'); } });
    }
  }
  /* 가로 넘김: pagesHTML(쪽마다 HTML 문자열 배열)을 container 에 그린다 */
  function flip(container, pagesHTML, opts = {}) {
    const n = pagesHTML.length;
    container.innerHTML = `<div class="bv"><div class="bv-track" tabindex="0" aria-label="책 쪽들 (← → 키로 넘기기)">${pagesHTML.map((h, i) => `<section class="bv-page" id="${opts.idPrefix || 'c'}${i}" aria-label="${i + 1}쪽">${h}<div class="bv-num">${i + 1}</div></section>`).join('')}</div>
      <div class="bv-nav"><button type="button" class="bv-prev" aria-label="앞 쪽">‹</button><span class="bv-no" aria-live="polite">1 / ${n}</span><button type="button" class="bv-next" aria-label="다음 쪽">›</button></div></div>`;
    const track = container.querySelector('.bv-track'), no = container.querySelector('.bv-no'), prev = container.querySelector('.bv-prev'), next = container.querySelector('.bv-next');
    let cur = 0;
    const setNo = i => { cur = i; no.textContent = `${i + 1} / ${n}`; prev.disabled = i <= 0; next.disabled = i >= n - 1; };
    const go = (i, smooth = true) => { i = Math.max(0, Math.min(n - 1, i)); track.scrollTo({ left: i * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' }); setNo(i); };
    track.addEventListener('scroll', () => { const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); if (i !== cur) setNo(i); }, { passive: true });
    prev.onclick = () => go(cur - 1); next.onclick = () => go(cur + 1);
    track.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(cur + 1); } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(cur - 1); } });
    document.addEventListener('keydown', e => { if (!container.isConnected || /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return; if (e.key === 'ArrowRight') go(cur + 1); else if (e.key === 'ArrowLeft') go(cur - 1); });
    addEventListener('resize', () => go(cur, false));
    setNo(0);
    return { go, get current() { return cur; }, count: n };
  }
  function injectCSS() { if (document.getElementById('bv-css')) return; const st = document.createElement('style'); st.id = 'bv-css'; st.textContent = CSS; document.head.appendChild(st); }
  global.BookViewer = { CSS, flip, wireAudio, wireVideo, protect, injectCSS };
})(window);
