/* 모아 「말로 하기」: 휴대폰 브라우저에 들어 있는 음성 인식(Web Speech API)으로 말씀을 글자로 바꾼다. AI 비용 0원.
   목소리는 브라우저가 휴대폰의 음성 인식(안드로이드 크롬 = 구글, 아이폰 사파리 = 애플)으로 보내 글자로 바꾸고, 모아 서버로는 보내지 않으며 저장하지도 않는다.
   보안 주소(https)에서만 켜진다. 글칸(textarea)은 말하는 동안 글자가 바로 보이고, 원고 글칸(contenteditable)은 한 마디가 끝날 때마다 커서 자리에 들어간다.
   쓰는 법: MoaVoice.start(글칸, 상태 => …) · MoaVoice.stop() · MoaVoice.active() · MoaVoice.supported
   상태: 'on' 듣는 중 · 'off' 끝 · 'denied' 마이크 허용 안 됨(보안 주소가 아니거나 거절) · 'error' 인터넷 등 */
(()=>{
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, on = null;   // on = {el, onState, idle}
const isField = el => el.tagName === 'TEXTAREA' || el.tagName === 'INPUT';
const join = (base, t) => { t = t.trim(); if (!t) return base; const b = base.trimEnd(); return b ? b + ' ' + t : t; };
function putAtCaret(el, text){   // 원고 글칸: 커서가 이 칸 안에 없으면 끝에 둔다
  const sel = getSelection(); if (document.activeElement !== el) el.focus();
  if (!sel.rangeCount || !el.contains(sel.anchorNode)) { const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); sel.removeAllRanges(); sel.addRange(r); }
  const before = (el.textContent || '').length ? ' ' : '';
  document.execCommand('insertText', false, before + text.trim());   // 글칸의 input 이벤트가 그대로 일어나 저장된다
}
function run(){
  const o = on; if (!o) return;
  const r = new SR(); rec = r; r.lang = 'ko-KR'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
  const base = isField(o.el) ? o.el.value : ''; let got = false;
  r.onresult = ev => { if (on !== o) return; let fin = '', mid = '';
    for (let i = 0; i < ev.results.length; i++) { const t = ev.results[i][0].transcript; if (ev.results[i].isFinal) fin += t; else mid += t; }
    if (isField(o.el)) { o.el.value = join(base, fin + mid); o.el.dispatchEvent(new Event('input', {bubbles: true})); o.el.scrollTop = o.el.scrollHeight; }
    else if (fin.trim()) putAtCaret(o.el, fin);
    if (fin.trim()) got = true; };
  r.onerror = ev => { if (on !== o) return;
    if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') { const f = o.onState; V.stop(true); f && f('denied'); }
    else if (ev.error === 'network' || ev.error === 'audio-capture') { const f = o.onState; V.stop(true); f && f('error'); } };   // no-speech · aborted 는 아래 onend 가 처리
  r.onend = () => { if (on !== o || rec !== r) return; o.idle = got ? 0 : o.idle + 1; if (o.idle >= 2) V.stop(); else run(); };   // 한 마디마다 다시 듣는다 · 두 번 연달아 조용하면 끝
  try { r.start(); } catch (e) { const f = o.onState; V.stop(true); f && f('error'); }
}
const V = window.MoaVoice = {
  supported: !!SR,
  active: () => !!on,
  start(el, onState){ if (!SR || !el) return false; V.stop(); on = {el, onState, idle: 0}; onState && onState('on'); run(); return true; },
  stop(quiet){ const o = on; on = null; const r = rec; rec = null; if (r) { try { r.abort(); } catch (e) {} } if (o && o.onState && !quiet) o.onState('off'); }
};
})();
