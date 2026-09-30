/* 인물대백과사 · 페이지 책 그리기 (서가·내보내기 공용)
   저장된 페이지 데이터는 다른 사람이 만든 것일 수 있으므로, 그리기 전에 모든 값을 다시 검사한다.
   - 좌표·크기: 숫자만, 페이지 안으로 제한
   - 글: 허용 목록 태그와 글자색/굵기/기울임/밑줄 스타일만
   - 미디어: 저장된 주소는 쓰지 않고, media_id로 서버에서 받은 주소만 사용 */
(function (global) {
  'use strict';
  const PW = 152, PH = 225;
  const PT_CQW = (4 / 3) / (PW * 3.7795275591) * 100;
  const COLOR_RE = /^(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*[\d.]+\s*)?\))$/i;
  const HEX6 = /^#[0-9a-f]{6}$/i;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };

  function sanitizeText(html) {
    const d = new DOMParser().parseFromString('<body>' + String(html || '') + '</body>', 'text/html');
    (function w(n) {
      [...n.childNodes].forEach(c => {
        if (c.nodeType === 3) return;
        if (c.nodeType !== 1) { c.remove(); return; }
        if (c.tagName === 'FONT') { const sp = d.createElement('span'); const col = c.getAttribute('color'); if (col && COLOR_RE.test(col)) sp.style.color = col; sp.append(...c.childNodes); c.replaceWith(sp); c = sp; }
        if (!['BR', 'B', 'STRONG', 'I', 'EM', 'U', 'DIV', 'P', 'SPAN'].includes(c.tagName)) {
          if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'IMG', 'VIDEO', 'AUDIO', 'SVG', 'MATH'].includes(c.tagName)) { c.remove(); return; }
          w(c); c.replaceWith(...c.childNodes); return;
        }
        const keep = {};
        if (c.tagName === 'SPAN') {
          const st = c.style;
          if (st.color && COLOR_RE.test(st.color.trim())) keep.color = st.color.trim();
          if (/^(bold|[6-9]00)$/.test(st.fontWeight)) keep['font-weight'] = '700';
          if (st.fontStyle === 'italic') keep['font-style'] = 'italic';
          if (/underline/.test(st.textDecoration || st.textDecorationLine || '')) keep['text-decoration'] = 'underline';
        }
        [...c.attributes].forEach(a => c.removeAttribute(a.name));
        const css = Object.entries(keep).map(([k, v]) => `${k}:${v}`).join(';');
        if (css) c.setAttribute('style', css);
        w(c);
      });
    })(d.body);
    return d.body.innerHTML;
  }

  const pct = (v, t) => (v / t * 100).toFixed(3) + '%';
  function box(e) {
    const x = num(e.x, 0, PW, 0), y = num(e.y, 0, PH, 0);
    const w = num(e.w, 1, PW - x, 10), h = num(e.h, 1, PH - y, 10);
    return `left:${pct(x, PW)};top:${pct(y, PH)};width:${pct(w, PW)};height:${pct(h, PH)}`;
  }
  function txStyle(e) {
    const fs = num(e.fs, 6, 60, 12);
    const color = COLOR_RE.test(String(e.color || '')) ? e.color : '#1B2B25';
    const align = ['left', 'center', 'right', 'justify'].includes(e.align) ? e.align : 'left';
    return `font-size:${(fs * PT_CQW).toFixed(3)}cqw;line-height:${fs >= 20 ? 1.3 : fs >= 15 ? 1.55 : 1.85};text-align:${align};color:${color};font-weight:${e.b ? 700 : 400};font-style:${e.i ? 'italic' : 'normal'};text-decoration:${e.u ? 'underline' : 'none'}`;
  }

  /* urls: { media_id: 서명된 주소 }  */
  function elHTML(e, urls) {
    if (!e || typeof e !== 'object') return '';
    let inner = '';
    if (e.type === 'text') {
      const font = e.font === 'sans' ? 'sans' : 'serif';
      inner = `<div class="tx ${font}" style="${txStyle(e)}">${sanitizeText(e.html)}</div>`;
    } else if (['image', 'video', 'audio'].includes(e.type)) {
      const src = urls && urls[e.media_id];
      if (!src) return '';
      const s = esc(src);
      if (e.type === 'image') inner = `<img src="${s}" alt="" loading="lazy" draggable="false">`;
      else if (e.type === 'video') inner = `<video src="${s}" controls playsinline preload="metadata" controlslist="nodownload noplaybackrate noremoteplayback" disablepictureinpicture></video>`;
      else inner = audioPlayer(s); // 내려받기 메뉴가 없는 재생기(BookViewer.wireAudio가 연결)
    } else return '';
    return `<div class="el" style="${box(e)}">${inner}</div>`;
  }
  function audioPlayer(escapedSrc) {
    return `<div class="ap" data-src="${escapedSrc}"><button type="button" class="ap-btn" aria-label="재생">▶</button><div class="ap-bar" aria-hidden="true"><i></i></div><span class="ap-t">0:00</span></div>`;
  }
  function pageHTML(p, urls) {
    const bg = HEX6.test(String(p.bg || '')) ? p.bg : '#FFFFFF';
    const els = Array.isArray(p.els) ? p.els : [];
    return `<div class="bk-pg" style="background:${bg}">${els.map(e => elHTML(e, urls)).join('')}</div>`;
  }
  const CSS = `.bk-pg{position:relative;aspect-ratio:152/225;container-type:inline-size;overflow:hidden;background:#fff}
.bk-pg .el{position:absolute}
.bk-pg .tx{width:100%;height:100%;overflow:hidden;word-break:keep-all;overflow-wrap:anywhere;white-space:pre-wrap;font-family:'Noto Serif KR','Batang',serif}
.bk-pg .tx.sans{font-family:'Pretendard',-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif}
.bk-pg img,.bk-pg video{width:100%;height:100%;object-fit:cover;display:block;border-radius:.6cqw}
.bk-pg .audio{width:100%;height:100%;border:.3cqw solid #E6EBE7;border-radius:1.6cqw;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:1.4cqw;background:#F6FAF8}
.bk-pg .audio .lb{font:2.8cqw sans-serif;color:#4A5A53}.bk-pg .audio audio{width:92%}`;

  global.BookRender = { PW, PH, sanitizeText, pageHTML, CSS, esc, audioPlayer };
})(window);
