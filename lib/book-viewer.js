/* 인물대백과사 · 책 보기 부품 (서가·비밀 링크·화면용 전자책 공용)
   1) 책처럼 넘기는 보기: 넓은 화면은 두 쪽 펼침(1·2쪽 → 3·4쪽), 좁은 화면은 한 쪽. 책장이 넘어가는 효과, 쪽 번호,
      ‹ › 버튼·← → 키·마우스 휠(스크롤)·손가락으로 밀기·책 가장자리 누르기
   2) 진행 막대가 잘 보이는 노래 재생기(내려받기 메뉴 없음)
   3) 저작권 보호: 우클릭·끌기·복사·인쇄 막기, 영상 내려받기 메뉴 숨기기
   ※ 화면 녹화·개발자 도구까지 막을 수는 없다. '가볍게 퍼 가기'를 막는 장치다. */
(function (global) {
  'use strict';
  const CSS = `
.bv{position:relative;margin:0 auto;font-family:'Pretendard',sans-serif}
.bv-stage{display:flex;justify-content:center;padding:8px 0 2px;perspective:2600px;touch-action:pan-y}
.bv-book{position:relative;display:flex;box-shadow:0 16px 40px rgba(20,40,32,.20);background:#fff}
.bv-slot{position:relative;width:var(--pw);height:calc(var(--pw) * 225 / 152);overflow:hidden;background:#fff}
.bv-book.two .bv-slot.l::after,.bv-book.two .bv-slot.r::after{content:"";position:absolute;top:0;bottom:0;width:5%;pointer-events:none;z-index:4}
.bv-book.two .bv-slot.l::after{right:0;background:linear-gradient(to left,rgba(0,0,0,.07),transparent)}
.bv-book.two .bv-slot.r::after{left:0;background:linear-gradient(to right,rgba(0,0,0,.08),transparent)}
.bv-page{position:relative;width:100%;height:100%}
.bv-page .bk-pg,.bv-page .pg{width:100%!important;box-shadow:none!important}
.bv-blank{width:100%;height:100%;background:linear-gradient(135deg,#FBFAF6,#F1EEE4)}
.bv-num{position:absolute;bottom:1.8%;left:0;right:0;text-align:center;font:600 11px/1 'Pretendard',sans-serif;color:#9AA7A1;pointer-events:none;z-index:3}
.bv-book.two .l .bv-num{text-align:left;padding-left:6%}.bv-book.two .r .bv-num{text-align:right;padding-right:6%}
.bv-leaf{position:absolute;top:0;width:var(--pw);height:100%;transform-style:preserve-3d;z-index:10;transition:transform .75s cubic-bezier(.35,.1,.25,1)}
.bv-leaf>div{position:absolute;inset:0;overflow:hidden;background:#fff;-webkit-backface-visibility:hidden;backface-visibility:hidden}
.bv-leaf>.b{transform:rotateY(180deg)}
.bv-leaf>div::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:5;opacity:0;transition:opacity .75s}
.bv-leaf.go>div::after{opacity:1}
.bv-leaf.nx>.f::after,.bv-leaf.pv>.b::after{background:linear-gradient(to right,rgba(0,0,0,.16),transparent 55%)}
.bv-leaf.nx>.b::after,.bv-leaf.pv>.f::after{background:linear-gradient(to left,rgba(0,0,0,.16),transparent 55%)}
.bv-hot{position:absolute;top:0;bottom:0;width:7%;z-index:8;cursor:pointer}.bv-hot.l{left:0}.bv-hot.r{right:0}
.bv-hot:hover{background:linear-gradient(to right,rgba(11,51,36,.06),transparent)}.bv-hot.r:hover{background:linear-gradient(to left,rgba(11,51,36,.06),transparent)}
.bv-nav{display:flex;align-items:center;justify-content:center;gap:14px;margin:14px 0 2px}
.bv-nav button{width:46px;height:46px;border-radius:50%;border:1.5px solid #CFC8AE;background:#fff;color:#0B3324;font-size:22px;cursor:pointer;display:grid;place-items:center}
.bv-nav button:hover:not(:disabled){background:#0B3324;color:#fff}.bv-nav button:disabled{opacity:.3;cursor:default}
.bv-no{min-width:96px;text-align:center;font-weight:700;color:#0B3324;font-size:15px;font-variant-numeric:tabular-nums}
.bv-hint{text-align:center;font-size:12.5px;color:#9AA7A1;margin:2px 0 0}
.bv-now{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:60;display:flex;align-items:center;gap:12px;background:#0B3324;color:#fff;padding:8px 10px 8px 18px;border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,.22);font:600 14px 'Pretendard',sans-serif}
.bv-now[hidden]{display:none}.bv-now button{border:none;border-radius:999px;background:#E0A52E;color:#0B3324;font:700 13px 'Pretendard',sans-serif;padding:7px 14px;cursor:pointer}
@media (prefers-reduced-motion:reduce){.bv-leaf,.bv-leaf>div::after{transition:none}}
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

  /* 노래 재생기: data-src 가 있는 .ap 를 찾아 연결한다.
     같은 노래는 책 전체에서 하나의 Audio만 쓴다 → 쪽을 넘겨도(재생기가 화면에서 사라져도) 멈추지 않고,
     사용자가 멈추거나 다른 노래를 틀 때까지 계속 흐른다. 한 번에 한 곡만 재생. */
  const songs = new Map();                                   // 주소 → Audio (책 하나 안에서 공유)
  const nowBars = new Set();                                 // 「재생 중」 막대들(뷰어마다 하나)
  const playing = () => [...songs.values()].find(a => !a.paused) || null;
  function refreshNow() {
    const a = playing();
    nowBars.forEach(bar => {
      if (!bar.isConnected) { nowBars.delete(bar); return; }
      const visible = a && [...a._uis].some(ui => ui.isConnected);
      bar.hidden = !a || visible;                            // 노래 쪽이 보이면 그 쪽 재생기로 충분
    });
  }
  function stopAll() { songs.forEach(a => a.pause()); }
  function wireAudio(root) {
    root.querySelectorAll('.ap[data-src]').forEach(ap => {
      if (ap._wired) return; ap._wired = true;
      const src = ap.dataset.src; ap.removeAttribute('data-src');
      let a = songs.get(src);
      if (!a) {
        a = new Audio(); a.preload = 'none'; a.src = src; a.setAttribute('controlsList', 'nodownload'); a._uis = new Set();
        const sync = () => { a._uis.forEach(ui => { if (!ui.isConnected) { a._uis.delete(ui); return; } ui._upd(); }); refreshNow(); };
        ['play', 'pause', 'timeupdate', 'loadedmetadata'].forEach(t => a.addEventListener(t, sync));
        a.addEventListener('ended', () => { a.currentTime = 0; sync(); });
        songs.set(src, a); (global.__bvAudios = global.__bvAudios || []).push(a);
      }
      const btn = ap.querySelector('.ap-btn'), bar = ap.querySelector('.ap-bar'), fill = ap.querySelector('.ap-bar i'), t = ap.querySelector('.ap-t');
      ap._upd = () => { const d = a.duration || 0; fill.style.width = d ? (a.currentTime / d * 100) + '%' : '0';
        t.textContent = fmt(a.currentTime) + (d ? ' / ' + fmt(d) : '');
        btn.textContent = a.paused ? '▶' : '❚❚'; btn.setAttribute('aria-label', a.paused ? '재생' : '멈춤'); ap.classList.toggle('playing', !a.paused); };
      btn.onclick = () => { if (a.paused) { document.querySelectorAll('audio').forEach(x => x !== a && x.pause()); songs.forEach(x => x !== a && x.pause()); a.play(); } else a.pause(); };
      bar.onclick = ev => { const r = bar.getBoundingClientRect(); if (a.duration) a.currentTime = (ev.clientX - r.left) / r.width * a.duration; };
      a._uis.add(ap); a._ap = ap; ap._audio = a; ap._upd();
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
  /* 책 보기: pagesHTML(쪽마다 HTML 문자열 배열)을 container 에 그린다.
     넓은 화면(두 쪽이 들어가면) = 펼침면 [1·2] → [3·4] …, 좁은 화면 = 한 쪽씩.
     보이는 쪽만 그리고(무거운 영상·노래를 한꺼번에 불러오지 않음), 넘길 때 책장이 넘어가는 효과를 준다. */
  function flip(container, pagesHTML, opts = {}) {
    const n = pagesHTML.length, pre = opts.idPrefix || 'c';
    const reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    container.innerHTML = `<div class="bv"><div class="bv-stage"><div class="bv-book" tabindex="0" aria-label="책 (← → 키, 스크롤, 밀기로 넘기기)"></div></div>
      <div class="bv-nav"><button type="button" class="bv-prev" aria-label="앞 쪽">‹</button><span class="bv-no" aria-live="polite"></span><button type="button" class="bv-next" aria-label="다음 쪽">›</button></div>
      <p class="bv-hint">‹ › · ← → 키 · 스크롤 · 밀어서 넘겨요</p>
      <div class="bv-now" hidden role="status"><span>♪ 노래가 흐르고 있어요</span><button type="button" class="bv-stop">❚❚ 멈춤</button></div></div>`;
    const stage = container.querySelector('.bv-stage'), book = container.querySelector('.bv-book'), no = container.querySelector('.bv-no'), prev = container.querySelector('.bv-prev'), next = container.querySelector('.bv-next');
    let two = false, cur = 0, busy = false;                 // cur: 보이는 첫 쪽(펼침면이면 짝수)
    const step = () => two ? 2 : 1;
    const startOf = i => two ? i - (i % 2) : i;
    function pageEl(i) {
      const d = document.createElement('div');
      if (i < 0 || i >= n) { d.className = 'bv-blank'; return d; }
      d.className = 'bv-page'; d.id = pre + i; d.setAttribute('aria-label', (i + 1) + '쪽');
      d.innerHTML = pagesHTML[i] + `<div class="bv-num">${i + 1}</div>`;
      wireAudio(d); wireVideo(d); if (opts.onPage) opts.onPage(d, i);
      return d;
    }
    const slot = side => { const s = document.createElement('div'); s.className = 'bv-slot ' + side; return s; };
    function layout() {
      const W = Math.max(240, (container.clientWidth || global.innerWidth) - 8);
      const H = Math.max(300, global.innerHeight - (opts.reserve ?? 200));
      const t = opts.spread !== false && W >= 700 && n > 1;
      const pw = t ? Math.min(W / 2, H * 152 / 225, 470) : Math.min(W, H * 152 / 225, 540);
      book.style.setProperty('--pw', Math.floor(pw) + 'px');
      if (t !== two) { two = t; cur = startOf(cur); render(); }
    }
    function render() {
      book.classList.toggle('two', two); book.innerHTML = '';
      if (two) { const l = slot('l'), r = slot('r'); l.append(pageEl(cur)); r.append(pageEl(cur + 1)); book.append(l, r); }
      else { const one = slot('one'); one.append(pageEl(cur)); book.append(one); }
      const hl = document.createElement('div'), hr = document.createElement('div');
      hl.className = 'bv-hot l'; hl.title = '앞 쪽'; hl.onclick = () => go(cur - step());
      hr.className = 'bv-hot r'; hr.title = '다음 쪽'; hr.onclick = () => go(cur + step());
      book.append(hl, hr); status();
    }
    function status() {
      const last = two ? Math.min(cur + 2, n) : cur + 1;
      no.textContent = (last - cur > 1 ? `${cur + 1}–${last}` : `${cur + 1}`) + ` / ${n}`;
      prev.disabled = cur <= 0; next.disabled = cur + step() >= n;
      refreshNow();                                          // 노래는 쪽을 넘겨도 계속 재생(멈춤은 사용자가)
    }
    // 책장 넘기기: 넘어가는 한 장(leaf)의 앞면·뒷면에 쪽을 붙여 3D로 돌린다
    function turn(dir) {
      const slots = book.querySelectorAll('.bv-slot');
      const leaf = document.createElement('div'); leaf.className = 'bv-leaf ' + (dir > 0 ? 'nx' : 'pv');
      const f = document.createElement('div'), b = document.createElement('div'); f.className = 'f'; b.className = 'b'; leaf.append(f, b);
      const pw = parseFloat(book.style.getPropertyValue('--pw'));
      let done;
      if (two && dir > 0) {                       // 오른쪽 장이 왼쪽으로
        const [L, R] = slots; const nl = pageEl(cur + 2), nr = pageEl(cur + 3);
        f.append(R.firstElementChild); b.append(nl); R.replaceChildren(nr);
        leaf.style.left = pw + 'px'; leaf.style.transformOrigin = 'left center';
        done = () => L.replaceChildren(nl);
        requestAnimationFrame(() => requestAnimationFrame(() => { leaf.classList.add('go'); leaf.style.transform = 'rotateY(-180deg)'; }));
      } else if (two) {                           // 왼쪽 장이 오른쪽으로
        const [L, R] = slots; const nl = pageEl(cur - 2), nr = pageEl(cur - 1);
        f.append(L.firstElementChild); b.append(nr); L.replaceChildren(nl);
        leaf.style.left = '0px'; leaf.style.transformOrigin = 'right center';
        done = () => R.replaceChildren(nr);
        requestAnimationFrame(() => requestAnimationFrame(() => { leaf.classList.add('go'); leaf.style.transform = 'rotateY(180deg)'; }));
      } else if (dir > 0) {                       // 한 쪽 보기: 지금 쪽이 왼쪽으로 넘어감
        const [S] = slots; const np = pageEl(cur + 1);
        f.append(S.firstElementChild); b.append(pageEl(-1)); S.replaceChildren(np);
        leaf.style.left = '0px'; leaf.style.transformOrigin = 'left center';
        done = () => {};
        requestAnimationFrame(() => requestAnimationFrame(() => { leaf.classList.add('go'); leaf.style.transform = 'rotateY(-180deg)'; }));
      } else {                                    // 한 쪽 보기: 앞 쪽이 왼쪽에서 덮어옴
        const [S] = slots; const pp = pageEl(cur - 1);
        f.append(pp); b.append(pageEl(-1));
        leaf.style.left = '0px'; leaf.style.transformOrigin = 'left center'; leaf.style.transition = 'none'; leaf.style.transform = 'rotateY(-180deg)';
        done = () => S.replaceChildren(pp);
        requestAnimationFrame(() => requestAnimationFrame(() => { leaf.style.transition = ''; leaf.classList.add('go'); leaf.style.transform = 'rotateY(0deg)'; }));
      }
      book.append(leaf); busy = true;
      let ended = false;
      const end = () => { if (ended) return; ended = true; done(); leaf.remove(); cur += dir * step(); status(); busy = false; };
      leaf.addEventListener('transitionend', e => { if (e.target === leaf && e.propertyName === 'transform') end(); });
      setTimeout(end, 1000);                      // 효과가 꺼진 환경에서도 반드시 끝나게
    }
    function go(i, smooth = true) {
      if (busy) return;
      i = startOf(Math.max(0, Math.min(n - 1, i)));
      if (i === cur) return;
      if (smooth && !reduce && Math.abs(i - cur) === step()) turn(i > cur ? 1 : -1);
      else { cur = i; render(); }
    }
    const nowBar = container.querySelector('.bv-now'); nowBars.add(nowBar);
    nowBar.querySelector('.bv-stop').onclick = () => { const a = playing(); if (a) a.pause(); };
    prev.onclick = () => go(cur - step()); next.onclick = () => go(cur + step());
    book.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(cur + step()); } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(cur - step()); } });
    document.addEventListener('keydown', e => { if (!container.isConnected || e.target.closest && e.target.closest('.bv-book')) return; if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable) return; if (e.key === 'ArrowRight') go(cur + step()); else if (e.key === 'ArrowLeft') go(cur - step()); });
    // 마우스 휠(스크롤)로 넘기기: 한 번 굴리면 한 번 넘김
    let wheelLock = 0, acc = 0;
    stage.addEventListener('wheel', e => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if ((d > 0 && next.disabled) || (d < 0 && prev.disabled)) return;   // 끝 쪽에서는 화면 스크롤을 막지 않음
      e.preventDefault();
      if (busy || Date.now() < wheelLock) return;
      acc += d; if (Math.abs(acc) < 30) return;
      go(cur + (acc > 0 ? step() : -step())); acc = 0; wheelLock = Date.now() + 700;
    }, { passive: false });
    // 손가락으로 밀기
    let tx = null, ty = null;
    stage.addEventListener('touchstart', e => { const t = e.changedTouches[0]; tx = t.clientX; ty = t.clientY; }, { passive: true });
    stage.addEventListener('touchend', e => { if (tx === null) return; const t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty; tx = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(cur + (dx < 0 ? step() : -step())); }, { passive: true });
    addEventListener('resize', () => { if (container.isConnected) layout(); });
    layout(); if (!book.firstChild) render();
    const api = { go: (i, smooth = true) => go(i, smooth), get current() { return cur; }, get spread() { return two; }, count: n };
    container._bv = api;
    return api;
  }
  function injectCSS() { if (document.getElementById('bv-css')) return; const st = document.createElement('style'); st.id = 'bv-css'; st.textContent = CSS; document.head.appendChild(st); }
  global.BookViewer = { CSS, flip, wireAudio, wireVideo, protect, injectCSS, stopAll };
})(window);
