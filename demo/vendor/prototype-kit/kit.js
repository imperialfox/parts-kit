/* Prototype kit 1.1.0 · MIT · https://github.com/imperialfox/prototype-kit
   Shared frame, controls, inspector and editing tools for clickable app prototypes, for any app.
   Prototype-only: nothing here is ever built into an app.
   Use: put the app in one element (e.g. <div id="app">), then call Kit.start({ app: 'Your app', root: '#app', controls: [...] }). */
(function () {
  'use strict';

  const DEV = {
    iphone: { w: 402, h: 874, r: 54, b: 10, label: 'iPhone' },
    ipad: { w: 820, h: 1180, r: 30, b: 14, label: 'iPad' },
    mac: { w: 1440, h: 900, r: 12, b: 3, label: 'Mac' }
  };
  const STY = { 68: 'Big numeral', 56: 'Big numeral', 44: 'Big numeral', 34: 'Large title', 28: 'Title 1', 22: 'Title 2', 20: 'Title 3', 17: 'Body', 16: 'Callout', 15: 'Subhead', 13: 'Footnote', 12: 'Caption 1', 11: 'Caption 2' };
  const PINK = '#e0457b', BLUE = '#007aff', RED = '#ff3b30', NS = 'http://www.w3.org/2000/svg';
  const RO = 'This version is read-only. Use “Make this the draft” to change it.', LOCKED = 'Locked. Double-click it to unlock.';
  const VERSION = '1.1.0';
  const AN = { l: 'Align left', c: 'Align centre', r: 'Align right', t: 'Align top', m: 'Align middle', b: 'Align bottom' };

  const S = {
    opts: null, root: null, el: {}, device: 'iphone', look: 0, motion: 0, inspect: true, skel: false, onion: 1, onionDepth: 2, userGuides: [], gd: null, lastTx: null, tweening: false, custom: {},
    phone: false, open: true, launcher: 'circle', scale: 1,
    sel: [], key: null, multi: false, snap: true, alignTo: 'key', original: false, versions: [], viewing: -1, draftModel: null, saving: false, lastTap: null,
    model: { v: 1, edits: {} }, undo: [], redo: [], lastNudge: 0, nextGroup: 1,
    hover: null, ptr: null, guides: [], cursor: null, err: '', status: '', showText: false, copied: null,
    inspShut: true, tok: new Map(), touched: new Set(), raf: 0, lsKey: '',
    real: {}, realMode: 0, realStrength: 1
  };

  /* ---------- small helpers ---------- */
  const r1 = v => Math.round(v);
  const fmt = v => { const n = Math.round(v * 10) / 10; return String(Number.isInteger(n) ? n : n.toFixed(1)); };
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const k in (attrs || {})) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'style') e.style.cssText = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    kids.flat(Infinity).forEach(c => { if (c == null || c === false) return; e.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c))); });
    return e;
  }
  function sv(tag, attrs, txt) {
    const e = document.createElementNS(NS, tag);
    for (const k in (attrs || {})) e.setAttribute(k, attrs[k]);
    if (txt != null) e.textContent = txt;
    return e;
  }
  function icon(k) {
    const s = sv('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' });
    const L = (a, b, c, d) => s.appendChild(sv('line', { x1: a, y1: b, x2: c, y2: d }));
    const R = (x, y, w, hh) => s.appendChild(sv('rect', { x, y, width: w, height: hh, rx: 1 }));
    const P = d => s.appendChild(sv('path', { d }));
    switch (k) {
      case 'sliders': L(2, 4, 14, 4); L(2, 8, 14, 8); L(2, 12, 14, 12);
        [[5, 4], [11, 8], [7, 12]].forEach(([x, y]) => s.appendChild(sv('circle', { cx: x, cy: y, r: 1.8, fill: 'currentColor' }))); break;
      case 'chev': P('M6 3l5 5-5 5'); break;
      case 'min': P('M9.5 2.5v4h4M6.5 13.5v-4h-4'); break;
      case 'l': L(2, 2, 2, 14); R(4, 4, 9, 3); R(4, 9, 6, 3); break;
      case 'c': L(8, 2, 8, 14); R(3, 4, 10, 3); R(5, 9, 6, 3); break;
      case 'r': L(14, 2, 14, 14); R(3, 4, 9, 3); R(6, 9, 6, 3); break;
      case 't': L(2, 2, 14, 2); R(4, 4, 3, 9); R(9, 4, 3, 6); break;
      case 'm': L(2, 8, 14, 8); R(4, 3, 3, 10); R(9, 5, 3, 6); break;
      case 'b': L(2, 14, 14, 14); R(4, 3, 3, 9); R(9, 6, 3, 6); break;
      case 'dx': L(2, 2, 2, 14); L(14, 2, 14, 14); R(5, 5, 2, 6); R(9, 5, 2, 6); break;
      case 'dy': L(2, 2, 14, 2); L(2, 14, 14, 14); R(5, 5, 6, 2); R(5, 9, 6, 2); break;
      case 'insp': s.appendChild(sv('path', { d: 'M2.5 6V3.5a1 1 0 011-1H6M10 2.5h2.5a1 1 0 011 1V6M2.5 10v2.5a1 1 0 001 1H6' })); P('M8.5 8.5l5.5 2-2.3.9-.9 2.3z'); break;
      case 'undo': P('M5 3.5L2 6.5l3 3M2 6.5h8a4 4 0 010 8H8'); break;
      case 'redo': P('M11 3.5l3 3-3 3M14 6.5H6a4 4 0 000 8h2'); break;
    }
    return s;
  }
  const store = (() => { try { const t = '__kit_t'; localStorage.setItem(t, '1'); localStorage.removeItem(t); return localStorage; } catch (e) { return null; } })();

  /* ---------- keys, names, geometry ---------- */
  function pathOf(el) {
    const parts = []; let e = el;
    while (e && e !== S.root) { const p = e.parentElement; if (!p) return null; parts.unshift([...p.children].indexOf(e)); e = p; }
    return parts.join('.');
  }
  function keyOf(el) {
    if (el.dataset && el.dataset.kitDup) return 'd:' + el.dataset.kitDup;
    const n = el.getAttribute && el.getAttribute('data-name');
    if (n && S.root.querySelectorAll('[data-name="' + CSS.escape(n) + '"]').length === 1) return 'n:' + n;
    return 'p:' + pathOf(el);
  }
  function elOf(k) {
    if (!k) return null;
    if (k.startsWith('d:')) return S.root.querySelector('[data-kit-dup="' + CSS.escape(k.slice(2)) + '"]');
    if (k.startsWith('n:')) return S.root.querySelector('[data-name="' + CSS.escape(k.slice(2)) + '"]:not([data-kit-dup])');
    let e = S.root;
    for (const i of k.slice(2).split('.')) { if (i === '') continue; e = e && e.children[+i]; }
    return e && e !== S.root ? e : null;
  }
  function nameOf(el) {
    if (!el) return '';
    const n = el.getAttribute('data-name'); if (n) return n;
    const al = el.getAttribute('aria-label');
    const tag = el.tagName.toLowerCase(), role = el.getAttribute('role');
    const txt = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
    const short = txt.length > 24 ? txt.slice(0, 23) + '…' : txt;
    const near = () => { const p = el.parentElement && el.parentElement.closest('[data-name]'); return p && S.root.contains(p) ? p.getAttribute('data-name') : 'screen'; };
    if (tag === 'button' || role === 'button' || role === 'tab') return 'Button: ' + (al || short || 'icon');
    if (tag === 'a') return 'Link: ' + (al || short || 'link');
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return 'Text box' + (el.placeholder ? ': ' + el.placeholder : '');
    if (/^h[1-6]$/.test(tag)) return 'Heading: ' + (short || 'empty');
    if (tag === 'img') return 'Image' + (el.alt ? ': ' + el.alt : '');
    if (tag === 'svg') return al ? 'Icon: ' + al : 'Icon in ' + near();
    if (el instanceof SVGElement) return tag === 'text' ? 'Chart text: ' + short : 'Shape in ' + near();
    if (tag === 'li' || role === 'listitem') return 'Row: ' + (short || 'empty');
    if (tag === 'ul' || tag === 'ol') return 'List in ' + near();
    const own = [...el.childNodes].some(c => c.nodeType === 3 && c.textContent.trim());
    if (own && short) return 'Text: ' + short;
    return 'Box in ' + near();
  }
  const scr = () => S.el.screen;
  function sRect() { return scr().getBoundingClientRect(); }
  function sc() { const r = sRect(); return (r.width / (scr().offsetWidth || 1)) || 1; }
  function rectOf(el) { const a = el.getBoundingClientRect(), b = sRect(), s = sc(); return { x: (a.left - b.left) / s, y: (a.top - b.top) / s, w: a.width / s, h: a.height / s }; }
  function pt(cx, cy) { const b = sRect(), s = sc(); return { x: (cx - b.left) / s, y: (cy - b.top) / s }; }
  function bounds(list) {
    const rs = list.map(o => (o.nodeType ? rectOf(o) : o));
    const x = Math.min(...rs.map(r => r.x)), y = Math.min(...rs.map(r => r.y));
    return { x, y, w: Math.max(...rs.map(r => r.x + r.w)) - x, h: Math.max(...rs.map(r => r.y + r.h)) - y };
  }
  function contentBox(el) {
    const r = rectOf(el), cs = getComputedStyle(el), n = p => parseFloat(cs[p]) || 0;
    const l = n('borderLeftWidth') + n('paddingLeft'), t = n('borderTopWidth') + n('paddingTop');
    return { x: r.x + l, y: r.y + t, w: r.w - l - n('borderRightWidth') - n('paddingRight'), h: r.h - t - n('borderBottomWidth') - n('paddingBottom') };
  }
  function scrollable(el) {
    let e = el;
    while (e && e !== scr()) {
      if (e.nodeType === 1) { const cs = getComputedStyle(e); if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX) && (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1)) return e; }
      e = e.parentElement;
    }
    return null;
  }
  const liveSel = () => { S.sel = S.sel.filter(e => e.isConnected && S.root.contains(e)); return S.sel; };

  /* ---------- the edit model ---------- */
  function E(el) { const k = keyOf(el); return S.model.edits[k] || (S.model.edits[k] = { name: nameOf(el) }); }
  function peek(el) { return S.model.edits[keyOf(el)] || null; }
  const isLocked = el => !!(peek(el) || {}).lock;
  function prune() {
    const ed = S.model.edits;
    for (const k in ed) {
      const e = ed[k];
      if (e.dx && Math.abs(e.dx) < 0.05) delete e.dx; if (e.dy && Math.abs(e.dy) < 0.05) delete e.dy;
      if (e.dx === 0) delete e.dx; if (e.dy === 0) delete e.dy;
      ['w', 'h', 'r'].forEach(f => {
        if (e[f] == null) { delete e[f]; delete e[f + '0']; }
        else if (e[f + '0'] != null && Math.abs(e[f] - e[f + '0']) < 0.5) { delete e[f]; delete e[f + '0']; }
      });
      if (e.note != null && !String(e.note).trim()) delete e.note;
      if (!e.g) delete e.g;
      if (!e.lock) delete e.lock;
      if (!e.dx && !e.dy && e.w == null && e.h == null && e.r == null && !e.note && !e.g && !e.lock && !e.dup) delete ed[k];
    }
  }
  function applyEl(el, e) {
    if (!el) return;
    if (!el.__kitOrig) { const st = el.style; el.__kitOrig = { translate: st.translate, width: st.width, height: st.height, borderRadius: st.borderRadius, boxSizing: st.boxSizing, flex: st.flex }; }
    const o = el.__kitOrig, st = el.style;
    const on = e && !S.original;
    st.translate = on && (e.dx || e.dy) ? `${e.dx || 0}px ${e.dy || 0}px` : o.translate;
    const sized = on && (e.w != null || e.h != null);
    st.boxSizing = sized ? 'border-box' : o.boxSizing;
    st.flex = sized ? '0 0 auto' : o.flex;
    st.width = on && e.w != null ? e.w + 'px' : o.width;
    st.height = on && e.h != null ? e.h + 'px' : o.height;
    st.borderRadius = on && e.r != null ? e.r + 'px' : o.borderRadius;
  }
  function makeClone(src, id, name) {
    const c = src.cloneNode(true);
    c.removeAttribute('id'); c.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    c.querySelectorAll('[data-name],[data-kit-dup]').forEach(n => { n.removeAttribute('data-name'); n.removeAttribute('data-kit-dup'); });
    c.setAttribute('data-name', name); c.dataset.kitDup = id; c.setAttribute('aria-hidden', 'true'); c.classList.add('kit-copy');
    const o = src.__kitOrig || {}, st = c.style;
    st.translate = o.translate || ''; st.position = 'absolute'; st.left = src.offsetLeft + 'px'; st.top = src.offsetTop + 'px';
    st.width = src.offsetWidth + 'px'; st.height = src.offsetHeight + 'px'; st.margin = '0'; st.boxSizing = 'border-box'; st.zIndex = '1';
    src.after(c); return c;
  }
  function syncDups() {
    // Copies made with Option-drag live in the model, so undo, versions and reloads bring them back or take them away.
    const want = new Set();
    for (const k in S.model.edits) {
      const e = S.model.edits[k]; if (!e.dup) continue;
      const id = k.slice(2); want.add(id);
      const src = elOf(e.dup.of); if (!(src instanceof HTMLElement)) continue;
      const have = S.root.querySelector('[data-kit-dup="' + CSS.escape(id) + '"]');
      // Re-seat existing copies on their original each time, so a reload or a layout change can't leave them adrift.
      if (have) { have.style.left = src.offsetLeft + 'px'; have.style.top = src.offsetTop + 'px'; continue; }
      makeClone(src, id, e.name);
    }
    S.root.querySelectorAll('[data-kit-dup]').forEach(c => { if (!want.has(c.dataset.kitDup)) { S.touched.delete(c); c.remove(); } });
  }
  function applyAll() {
    syncDups();
    const seen = new Set();
    for (const k in S.model.edits) { const el = elOf(k); if (el) { seen.add(el); S.touched.add(el); applyEl(el, S.model.edits[k]); } }
    S.touched.forEach(el => { if (!seen.has(el)) { applyEl(el, null); if (!el.isConnected) S.touched.delete(el); } });
  }
  function members(el) {
    const e = peek(el);
    if (!e || !e.g) return [el];
    const out = [];
    for (const k in S.model.edits) if (S.model.edits[k].g === e.g) { const m = elOf(k); if (m) out.push(m); }
    return out.length ? out : [el];
  }
  function units() {
    const m = new Map();
    liveSel().forEach(o => { const e = peek(o); const k = e && e.g ? 'g' + e.g : o; if (!m.has(k)) m.set(k, []); m.get(k).push(o); });
    return [...m.values()];
  }
  function changeList() {
    const out = [];
    for (const k in S.model.edits) {
      const e = S.model.edits[k];
      if (!e.dx && !e.dy && e.w == null && e.h == null && e.r == null && !e.note && !e.dup) continue;
      const el = elOf(k);
      out.push({ k, e, el, r: el ? rectOf(el) : { x: 0, y: 1e9 } });
    }
    return out.sort((a, b) => (a.r.y - b.r.y) || (a.r.x - b.r.x));
  }
  function groupsList() {
    const m = new Map();
    for (const k in S.model.edits) { const e = S.model.edits[k]; if (e.g) { if (!m.has(e.g)) m.set(e.g, []); m.get(e.g).push(e.name); } }
    return [...m.values()].filter(g => g.length > 1);
  }
  function changesText() {
    const list = changeList(), gs = groupsList();
    if (!list.length && !gs.length) return '';
    const lines = headerLines().concat(['']);
    list.forEach((c, i) => {
      const e = c.e, parts = [], mv = [];
      if (e.dup) {
        const se = S.model.edits[e.dup.of] || {}, ox = (e.dx || 0) - (se.dx || 0), oy = (e.dy || 0) - (se.dy || 0), om = [];
        if (ox) om.push((ox > 0 ? 'right ' : 'left ') + fmt(Math.abs(ox))); if (oy) om.push((oy > 0 ? 'down ' : 'up ') + fmt(Math.abs(oy)));
        parts.push(`add a copy of ${e.dup.ofName}, ` + (om.length ? 'placed ' + om.join(', ') + ' from it' : 'on top of it'));
      } else {
        if (e.dx) mv.push((e.dx > 0 ? 'right ' : 'left ') + fmt(Math.abs(e.dx)));
        if (e.dy) mv.push((e.dy > 0 ? 'down ' : 'up ') + fmt(Math.abs(e.dy)));
      }
      if (mv.length) parts.push('move ' + mv.join(', '));
      if (e.w != null) parts.push(`width ${fmt(e.w0)} → ${fmt(e.w)}`);
      if (e.h != null) parts.push(`height ${fmt(e.h0)} → ${fmt(e.h)}`);
      if (e.r != null) parts.push(`corners ${fmt(e.r0)} → ${fmt(e.r)}`);
      let line = `${i + 1}. ${e.name}` + (parts.length ? ': ' + parts.join('; ') : '');
      if (e.note) line += (parts.length ? '\n   ' : ' · ') + 'Note: ' + e.note.trim();
      lines.push(line);
    });
    if (gs.length) { lines.push(''); gs.forEach(g => lines.push('Grouped: ' + g.join(', '))); }
    return lines.join('\n');
  }

  function headerLines() {
    // The shared header (SHARED.md, note format v1): pasted changes and stored notes say the same things.
    const d = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const o = S.opts, scrn = o.title || o.screen ? `${o.title || o.screen}${o.title && o.screen ? ' (' + o.screen + ')' : ''}` : '';
    const ver = (o.version ? o.version + ', ' : '') + (S.viewing >= 0 ? `version “${S.versions[S.viewing].name}”` : 'Draft');
    const bits = ['Source: prototype', o.app ? 'App: ' + o.app : '', scrn ? 'Screen: ' + scrn : '', 'Prototype: ' + o.id, 'Version: ' + ver, 'Kit ' + VERSION].filter(Boolean);
    return [`Prototype changes · note format v1 · ${d}`, bits.join(' · '), `Measured in ${DEV[S.device].label} points.`];
  }

  /* ---------- undo and saving ---------- */
  const snapM = () => ({ m: JSON.stringify(S.model), sel: liveSel().map(keyOf), key: S.key ? keyOf(S.key) : null });
  function saveVersions() { if (!store) return; try { store.setItem(S.lsKey + ':versions', JSON.stringify(S.versions)); } catch (e) { S.err = "Couldn't keep the versions on this device"; } }
  function save(fromStore) {
    if (S.viewing >= 0) return;
    if (!fromStore) SYNC.t = Math.max(Date.now(), SYNC.t + 1);
    if (store) try { store.setItem(S.lsKey, JSON.stringify(S.model)); store.setItem(S.lsKey + ':t', String(SYNC.t)); } catch (e) { S.err = "Couldn't keep your changes on this device"; }
    if (!fromStore) pushSoon();
  }
  function load() {
    if (!store) return;
    try {
      const raw = store.getItem(S.lsKey); if (!raw) return;
      const m = JSON.parse(raw); if (!m || typeof m !== 'object' || !m.edits || typeof m.edits !== 'object') return;
      const ok = cleanEdits(m.edits);
      S.model = { v: 1, edits: ok };
      S.nextGroup = 1 + Math.max(0, ...Object.values(ok).map(e => e.g || 0));
    } catch (e) { /* unreadable saved changes are ignored; the prototype opens clean */ }
    try {
      const v = JSON.parse(store.getItem(S.lsKey + ':versions') || '[]');
      if (Array.isArray(v)) S.versions = v.filter(x => x && typeof x.name === 'string' && x.model && x.model.edits && typeof x.model.edits === 'object').slice(0, 30).map(x => ({ name: x.name.slice(0, 24), model: { v: 1, edits: cleanEdits(x.model.edits) } }));
    } catch (e) { S.versions = []; }
  }
  function cleanEdits(edits) {
    const ok = {};
    for (const k in edits) {
      const e = edits[k]; if (!e || typeof e !== 'object' || !/^[npd]:/.test(k)) continue;
      const c = { name: String(e.name || 'Box').slice(0, 80) };
      ['dx', 'dy', 'w', 'h', 'r', 'w0', 'h0', 'r0', 'g'].forEach(f => { if (Number.isFinite(e[f])) c[f] = e[f]; });
      if (typeof e.note === 'string') c.note = e.note.slice(0, 500);
      if (e.lock === true) c.lock = true;
      if (k.startsWith('d:') && e.dup && typeof e.dup.of === 'string') c.dup = { of: e.dup.of.slice(0, 300), ofName: String(e.dup.ofName || 'a part').slice(0, 80) };
      if (k.startsWith('d:') && !c.dup) continue;
      ok[k] = c;
    }
    return ok;
  }
  function commit(name, fn) {
    const before = snapM();
    fn(); prune(); applyAll();
    if (before.m !== JSON.stringify(S.model)) { S.undo.push({ name, st: before }); if (S.undo.length > 300) S.undo.shift(); S.redo = []; save(); }
    render();
  }
  function restore(st) { S.model = JSON.parse(st.m); S.sel = st.sel.map(elOf).filter(Boolean); S.key = st.key ? elOf(st.key) : null; applyAll(); save(); }
  function undo() { S.err = ''; if (S.viewing >= 0) { S.err = 'Go back to Draft to undo'; return render(); } if (!S.undo.length) { S.status = 'Nothing to undo'; return render(); } const u = S.undo.pop(); S.redo.push({ name: u.name, st: snapM() }); restore(u.st); S.status = 'Undid ' + u.name.toLowerCase(); render(); }
  function redo() { S.err = ''; if (S.viewing >= 0) { S.err = 'Go back to Draft to redo'; return render(); } if (!S.redo.length) { S.status = 'Nothing to redo'; return render(); } const u = S.redo.pop(); S.undo.push({ name: u.name, st: snapM() }); restore(u.st); S.status = 'Redid ' + u.name.toLowerCase(); render(); }

  /* ---------- notes in the shared format (SHARED.md, note format v1) ---------- */
  const TYPED = el => !el || el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName);
  function elPath(el) {
    const out = []; let e = el;
    while (e && e !== S.root && out.length < 6) {
      const c = [...(e.classList || [])].filter(x => !x.startsWith('kit-')).slice(0, 2);
      out.unshift(e.tagName.toLowerCase() + (c.length ? '.' + c.join('.') : '')); e = e.parentElement;
    }
    return out.join(' > ');
  }
  function elDetail(el) {
    if (!el) return null;
    const cs = getComputedStyle(el), txt = TYPED(el) ? '' : (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    return { tag: el.tagName.toLowerCase(), cls: [...el.classList].filter(x => !x.startsWith('kit-')).join(' '), text: txt, path: elPath(el),
      style: { font: cs.fontSize + ' ' + cs.fontWeight, lh: cs.lineHeight, color: cs.color, bg: cs.backgroundColor, pad: cs.padding, radius: cs.borderTopLeftRadius } };
  }
  function hashOf(t) { let x = 5381; for (let i = 0; i < t.length; i++) x = ((x * 33) ^ t.charCodeAt(i)) >>> 0; return x.toString(36); }
  const noteId = k => 'p-' + k.replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 40) + '-' + hashOf(k);
  function editsOf(e) {
    const o = {};
    if (e.dx || e.dy) o.move = { dx: e.dx || 0, dy: e.dy || 0 };
    if (e.w != null) o.width = [e.w0, e.w]; if (e.h != null) o.height = [e.h0, e.h]; if (e.r != null) o.corners = [e.r0, e.r];
    if (e.dup) o.copyOf = e.dup.ofName;
    return o;
  }
  function noteRecords() {
    // One record per part with a note or a change, in the draft as it is on screen now.
    const W = scr().offsetWidth || 1, H = scr().offsetHeight || 1, out = new Map();
    for (const k in S.model.edits) {
      const e = S.model.edits[k], ed = editsOf(e);
      if (!e.note && !Object.keys(ed).length) continue;
      const el = elOf(k), r = el ? rectOf(el) : { x: 0, y: 0, w: 0, h: 0 }, f = v => Math.round(v * 10) / 10;
      out.set(noteId(k), {
        v: 1, source: 'prototype', app: S.opts.app || '', screen: S.opts.screen || '', screenTitle: S.opts.title || '',
        part: el && el.getAttribute('data-name') && !el.dataset.kitDup ? el.getAttribute('data-name') : null, name: e.name, key: k,
        text: (e.note || '').trim(), kind: '', status: 'open',
        box: { x: +(r.x / W).toFixed(4), y: +(r.y / H).toFixed(4), w: +(r.w / W).toFixed(4), h: +(r.h / H).toFixed(4) },
        px: { x: f(r.x), y: f(r.y), w: f(r.w), h: f(r.h) }, device: S.device,
        element: elDetail(el), edits: ed,
        from: { prototype: S.opts.id, version: S.opts.version || '', kit: VERSION }
      });
    }
    return out;
  }
  const sigOf = r => JSON.stringify([r.text, r.edits, r.part, r.name]);

  /* ---------- the page's own store on claude.ai, so Claude can read the notes ---------- */
  const SYNC = { db: null, state: 'local', t: 0, by: Math.random().toString(36).slice(2, 10), timer: 0, ready: false, notes: new Map(), notesIn: false, busy: false, again: false };
  function pushSoon(ms) { if (!SYNC.db || !SYNC.ready) return; clearTimeout(SYNC.timer); SYNC.timer = setTimeout(push, ms == null ? 500 : ms); }
  async function push() {
    if (S.viewing >= 0) return; // notes describe the draft; they catch up on the way back to Draft
    if (!SYNC.notesIn) return pushSoon(300);
    if (SYNC.busy) { SYNC.again = true; return; }
    SYNC.busy = true;
    const db = SYNC.db, now = new Date().toISOString();
    try {
      await db.doc('kit/draft').set({ v: 1, model: { v: 1, edits: S.model.edits }, t: SYNC.t, by: SYNC.by, updated: now, kit: VERSION, prototype: S.opts.id });
      const want = noteRecords(); let n = Math.max(0, ...[...SYNC.notes.values()].map(x => x.n || 0));
      for (const [id, r] of want) {
        const old = SYNC.notes.get(id);
        r.n = old && old.n ? old.n : ++n;
        r.created = old && old.created || now;
        // Claude or Ivan may have set a status; keep it, unless the note or change itself has changed since.
        if (old && old.status) r.status = sigOf(old) === sigOf(r) || !['fixed', 'dismissed'].includes(old.status) ? old.status : 'open';
        const same = old && JSON.stringify(Object.assign({}, old, { updated: 0 })) === JSON.stringify(Object.assign({}, r, { updated: 0 }));
        if (same) continue;
        r.updated = now;
        await db.collection('notes').doc(id).set(r); SYNC.notes.set(id, r);
      }
      for (const [id, old] of [...SYNC.notes]) if (old.source === 'prototype' && !want.has(id)) { await db.collection('notes').doc(id).delete(); SYNC.notes.delete(id); }
      SYNC.state = 'ok';
    } catch (e) { SYNC.state = 'error'; SYNC.code = e && e.code; }
    SYNC.busy = false; if (SYNC.shown !== SYNC.state) renderPanel();
    if (SYNC.again) { SYNC.again = false; pushSoon(0); }
  }
  function adopt(v, live) {
    const m = { v: 1, edits: cleanEdits((v.model && v.model.edits) || {}) };
    SYNC.t = Math.max(SYNC.t, v.t || 0);
    const cur = S.viewing >= 0 ? S.draftModel : S.model;
    if (JSON.stringify(m.edits) === JSON.stringify(cur.edits)) return;
    if (S.viewing >= 0) S.draftModel = m;
    else {
      if (live) { S.undo.push({ name: 'Changes from another device', st: snapM() }); S.redo = []; S.status = 'Updated with changes made on another device'; }
      S.model = m; S.sel = S.sel.filter(el => el.isConnected); applyAll();
    }
    S.nextGroup = 1 + Math.max(0, ...Object.values(m.edits).map(e => e.g || 0));
    if (store) try { store.setItem(S.lsKey, JSON.stringify(m)); store.setItem(S.lsKey + ':t', String(SYNC.t)); } catch (e) { }
    render();
  }
  async function connectStore() {
    let db = null;
    try { if (typeof claude !== 'undefined' && claude && claude.use) db = await claude.use('db'); } catch (e) { }
    if (!db) { SYNC.state = 'local'; renderPanel(); return; }
    SYNC.db = db; SYNC.state = 'loading'; renderPanel();
    let first = true;
    try {
      db.collection('notes').onSnapshot(snap => { SYNC.notes = new Map(snap.docs.map(d => [d.id, d.data()])); SYNC.notesIn = true; }, () => { });
      db.doc('kit/draft').onSnapshot(d => {
        const v = d.exists ? d.data() : null;
        if (first) {
          first = false; SYNC.ready = true; SYNC.state = 'ok';
          // Whichever is newer wins: what this device has, or what the page keeps.
          if (v && v.model && (v.t || 0) > SYNC.t) adopt(v, false);
          pushSoon(0);
          renderPanel(); return;
        }
        if (v && v.model && v.by !== SYNC.by && (v.t || 0) > SYNC.t && !S.ptr) adopt(v, true);
      }, e => { SYNC.state = 'error'; SYNC.code = e && e.code; renderPanel(); });
    } catch (e) { SYNC.state = 'error'; renderPanel(); }
  }
  function storeLine() {
    const t = { local: 'Notes and changes are kept on this device', loading: 'Connecting to this page’s store…', ok: 'Notes and changes are kept on this page, so Claude can read them', error: 'Couldn’t reach this page’s store' + (SYNC.code ? ' (' + SYNC.code + ')' : '') + '. Kept on this device for now' }[SYNC.state];
    SYNC.shown = SYNC.state;
    return h('div', { class: 'kit-store is-' + SYNC.state, role: 'status' }, t);
  }

  /* ---------- the real app, from the Atlas, over or beside the prototype ---------- */
  function realSrc() { return S.real[S.device] || ''; }
  function setReal(src) {
    S.real = !src ? {} : typeof src === 'string' ? { iphone: src } : Object.assign({}, src);
    S.el.realImg.removeAttribute('src'); S.el.realSide.querySelector('img').removeAttribute('src');
    if (!Object.keys(S.real).filter(k => DEV[k] && S.real[k]).length) S.realMode = 0;
    renderPanel(); applyReal();
  }
  function applyReal() {
    const src = realSrc(), mode = src ? (S.phone && S.realMode === 2 ? 1 : S.realMode) : 0;
    const over = S.el.realImg, side = S.el.realSide, simg = side.querySelector('img');
    if (mode && over.getAttribute('src') !== src) { over.src = src; simg.src = src; }
    over.style.display = mode === 1 && !S.original ? 'block' : 'none';
    over.style.opacity = String([0.3, 0.5, 0.8][S.realStrength]);
    side.style.display = mode === 2 ? 'block' : 'none';
    document.body.classList.toggle('kit-beside', mode === 2);
  }

  /* ---------- controls panel ---------- */
  function groups() {
    const devs = ['iphone', 'ipad'].concat(S.opts.mac ? ['mac'] : []);
    const g = [
      { name: 'Device', options: devs.map(d => DEV[d].label), get: () => devs.indexOf(S.device), set: i => setDevice(devs[i]) },
      { name: 'Look', options: ['Light', 'Dark'], get: () => S.look, set: i => { S.look = i; applyLook(); render(); } },
      { name: 'Motion', options: ['Normal', 'Slow', 'Reduce'], get: () => S.motion, set: i => { S.motion = i; applyMotion(); } },
      { name: 'View', options: ['Normal', 'Skeleton'], get: () => (S.skel ? 1 : 0), set: i => setSkel(i === 1) }
    ];
    if (S.versions.length) g.push({ name: 'Version', options: ['Draft'].concat(S.versions.map(v => v.name)), get: () => S.viewing + 1, set: i => setViewing(i - 1) });
    if (S.versions.length) g.push({ name: 'Onion skin', options: ['Off', 'Before', 'Both'], get: () => S.onion, set: i => { S.onion = i; savePrefs(); render(); } });
    if (S.versions.length && S.onion) g.push({ name: 'Layers', options: ['1', '2'], get: () => S.onionDepth - 1, set: i => { S.onionDepth = i + 1; savePrefs(); render(); } });
    if (Object.keys(S.real).some(k => DEV[k] && S.real[k])) {
      const opts = S.phone ? ['Off', 'Over'] : ['Off', 'Over', 'Beside'];
      g.push({ name: 'Real app', options: opts, get: () => Math.min(S.realMode, opts.length - 1), set: i => { S.realMode = i; layout(); applyReal(); render(); } });
      if (S.realMode === 1 || (S.phone && S.realMode)) g.push({ name: 'Strength', options: ['30%', '50%', '80%'], get: () => S.realStrength, set: i => { S.realStrength = i; applyReal(); } });
    }
    S.opts.controls.forEach(c => g.push({ name: c.name, own: true, options: c.options, get: () => S.custom[c.name], set: i => { S.custom[c.name] = i; try { c.onChange && c.onChange(i, c.options[i]); } catch (e) { console.error(e); } if (S.skel) markText(); applyAll(); render(); } }));
    return g;
  }
  function renderPanel() {
    const p = S.el.panel; p.textContent = '';
    const shape = S.phone ? 'tab' : S.launcher;
    p.append(h('div', { class: 'kit-ph' },
      h('div', null, h('div', { class: 'kit-pt' }, 'Prototype controls'), h('div', { class: 'kit-ps' }, S.opts.app ? `not part of ${S.opts.app}` : 'not part of the app')),
      inspBtn('kit-ins-p'),
      h('button', { type: 'button', class: 'kit-min is-' + shape, 'aria-label': 'Minimise prototype controls', 'data-tip': 'Minimise|Folds the controls away. Tap the launcher to bring them back|', onclick: () => setOpen(false) }, icon('min'))));
    const gs = groups();
    gs.forEach((g, gi) => {
      if (g.own && gi > 0 && !gs[gi - 1].own) p.append(h('div', { class: 'kit-sep' }));
      const cur = g.get();
      p.append(h('div', { class: 'kit-grp' + (g.own ? ' own' : '') },
        h('div', { class: 'kit-gl' }, g.name),
        h('div', { class: 'kit-seg', role: 'group', 'aria-label': g.name },
          g.options.map((o, i) => h('button', { type: 'button', class: i === cur ? 'on' : '', 'aria-pressed': String(i === cur), onclick: () => { g.set(i); renderPanel(); fire(); } }, o)))));
      if (g.name === 'Layers') {
        const nb = onionNeighbours(), key = h('div', { class: 'kit-onion-key' });
        const sw = (col, li) => h('i', { style: `background:${col};opacity:${li ? .4 : .85}` });
        nb.before.forEach((f, li) => key.append(h('span', null, sw(ONION.before, li), (li ? 'Before that: ' : 'Before: ') + f.name)));
        nb.after.forEach((f, li) => key.append(h('span', null, sw(ONION.after, li), (li ? 'After that: ' : 'After: ') + f.name)));
        if (!nb.before.length && !nb.after.length) key.append(h('span', null, 'Nothing to compare on this side'));
        p.append(key);
      }
      if (g.name === 'Real app' && S.realMode && !realSrc()) p.append(h('div', { class: 'kit-onion-key' }, h('span', null, `No real ${DEV[S.device].label} screenshot for this prototype`)));
    });
    p.append(storeLine());
  }
  function renderLauncher() {
    const shape = S.phone ? 'tab' : S.launcher, l = S.el.launcher;
    l.className = 'kit-launcher is-' + shape;
    l.textContent = '';
    l.append(icon(shape === 'tab' ? 'chev' : 'sliders'));
    if (shape === 'capsule') l.append(h('span', null, 'Controls'));
    S.el.panel.classList.toggle('shut', !S.open);
    S.el.panel.setAttribute('aria-hidden', String(!S.open));
    renderDock();
  }
  function setOpen(v) { S.open = v; renderLauncher(); renderPanel(); layout(); if (v) { const b = S.el.panel.querySelector('button'); b && b.focus({ preventScroll: true }); } else S.el.launcher.focus({ preventScroll: true }); }
  function fire() { window.dispatchEvent(new CustomEvent('kit:change', { detail: api.get() })); }
  function applyLook() { scr().classList.toggle('dark', S.look === 1); scr().style.colorScheme = S.look ? 'dark' : 'light'; buildTokenMap(); }
  function applyMotion() { scr().style.setProperty('--k', S.motion === 1 ? '4' : '1'); scr().classList.toggle('motion-reduced', S.motion === 2); }
  function setDevice(d) { S.device = d; ['iphone', 'ipad', 'mac'].forEach(x => scr().classList.toggle('is-' + x, x === d)); layout(); applyAll(); renderPanel(); render(); }
  function setSkel(v) { S.skel = !!v; scr().classList.toggle('kit-skel', S.skel); if (S.skel) markText(); render(); }
  function setInspect(v) {
    S.inspect = !!v; document.body.classList.toggle('kit-edit', S.inspect);
    if (!S.inspect) { S.hover = null; S.ptr = null; S.guides = []; tipHide(true); }
    savePrefs();
    renderDock(); renderPanel(); layout(); render(); fire();
  }
  function renderDock() {
    const shape = S.phone ? 'tab' : S.launcher;
    S.el.dock.className = 'kit-dock is-' + shape + (S.open ? ' hid' : '');
    const b = S.el.inspBtn; b.className = 'kit-ins is-' + shape + (S.inspect ? ' on' : ''); b.setAttribute('aria-pressed', String(S.inspect)); b.textContent = '';
    b.append(icon('insp')); if (shape !== 'tab') b.append(h('span', null, 'Inspect'));
  }
  function inspBtn(cls) {
    return h('button', { type: 'button', class: cls + (S.inspect ? ' on' : ''), 'aria-pressed': String(S.inspect), 'aria-label': 'Inspect', onclick: () => setInspect(!S.inspect), 'data-tip': 'Inspect|' + (S.inspect ? 'On: taps pick parts to inspect and adjust. Turn off to use the prototype normally' : 'Off: the prototype works normally. Turn on to inspect and adjust parts') + '|I' }, icon('insp'));
  }
  function markText() { S.root.querySelectorAll('*').forEach(el => { if ([...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) el.classList.add('kit-txt'); }); }

  /* ---------- layout ---------- */
  function layout() {
    const d = DEV[S.device], wide = window.innerWidth >= 900;
    S.phone = window.innerWidth <= 600 && S.device === 'iphone';
    document.body.classList.toggle('kit-phone', S.phone);
    document.body.classList.toggle('kit-narrow', !wide && !S.phone);
    const sc_ = scr(), dv = S.el.device, bx = S.el.box;
    if (S.phone) {
      const W = window.innerWidth, H = window.innerHeight;
      sc_.style.width = W + 'px'; sc_.style.height = H + 'px'; sc_.style.borderRadius = '0';
      dv.style.borderWidth = '0'; dv.style.borderRadius = '0'; dv.style.transform = 'none';
      bx.style.width = W + 'px'; bx.style.height = H + 'px'; S.scale = 1;
    } else {
      const b = d.b;
      sc_.style.width = d.w + 'px'; sc_.style.height = d.h + 'px'; sc_.style.borderRadius = Math.max(0, d.r - b) + 'px';
      dv.style.borderWidth = b + 'px'; dv.style.borderRadius = d.r + 'px';
      const side = (S.open && wide ? 278 : 0) + (S.inspect && wide ? 316 : 0);
      const beside = S.realMode === 2 && realSrc();
      const availW = Math.max(220, (window.innerWidth - 24 - side - 56 - (beside ? 24 : 0)) / (beside ? 2 : 1));
      const availH = Math.max(320, window.innerHeight - 24 - 26);
      const s = Math.max(0.2, Math.min(1, availW / (d.w + 2 * b), availH / (d.h + 2 * b)));
      S.scale = s; dv.style.transform = `scale(${s})`;
      bx.style.width = (d.w + 2 * b) * s + 'px'; bx.style.height = (d.h + 2 * b) * s + 'px';
      const rs = S.el.realSide;
      rs.style.left = ((d.w + 2 * b) * s + 24) + 'px'; rs.style.width = (d.w + 2 * b) * s + 'px'; rs.style.height = (d.h + 2 * b) * s + 'px';
      rs.style.setProperty('--b', b * s + 'px'); rs.style.setProperty('--ir', Math.max(0, d.r - b) * s + 'px'); rs.style.borderRadius = d.r * s + 'px';
      if (beside) bx.style.width = (2 * (d.w + 2 * b) * s + 24) + 'px';
    }
    if (S.el.realImg) applyReal();
    positionRulers(); renderLauncher(); drawRulers(); drawOv();
  }
  function positionRulers() {
    const rt = S.el.rt, rl = S.el.rl;
    if (S.phone) {
      const W = window.innerWidth, H = window.innerHeight;
      Object.assign(rt.style, { left: '0px', top: '0px', width: W + 'px', height: '16px' }); rt.setAttribute('width', W); rt.setAttribute('height', 16);
      Object.assign(rl.style, { left: '0px', top: '0px', width: '30px', height: H + 'px' }); rl.setAttribute('width', 30); rl.setAttribute('height', H);
      return;
    }
    const d = DEV[S.device], s = S.scale, off = d.b * s;
    Object.assign(rt.style, { left: (48 + off) + 'px', top: '2px', width: d.w * s + 'px', height: '18px' }); rt.setAttribute('width', d.w * s); rt.setAttribute('height', 18);
    Object.assign(rl.style, { left: '18px', top: (22 + off) + 'px', width: '28px', height: d.h * s + 'px' }); rl.setAttribute('width', 28); rl.setAttribute('height', d.h * s);
  }

  /* ---------- rulers ---------- */
  function drawRulers() {
    const rt = S.el.rt, rl = S.el.rl; rt.textContent = ''; rl.textContent = '';
    const s = S.scale, W = scr().offsetWidth, H = scr().offsetHeight;
    const TH = S.phone ? 16 : 18, LW = S.phone ? 30 : 28;
    const tick = 'stroke:var(--k-tick);stroke-width:.7', lab = 'font-size:11px;fill:var(--k-fg2)';
    for (let v = 0; v <= W; v += 10) {
      const x = v * s, L = v % 100 ? (v % 50 ? 3 : 6) : 9;
      rt.append(sv('line', { x1: x, x2: x, y1: TH, y2: TH - L, style: tick }));
      if (v % 100 === 0 && v && v < W - 12) rt.append(sv('text', { x, y: 9, 'text-anchor': 'middle', style: lab }, v));
    }
    for (let v = 0; v <= H; v += 10) {
      const y = v * s, L = v % 100 ? (v % 50 ? 3 : 6) : 9;
      rl.append(sv('line', { y1: y, y2: y, x1: LW, x2: LW - L, style: tick }));
      if (v % 100 === 0 && v && v < H - 8) rl.append(sv('text', { x: LW - 11, y: y + 4, 'text-anchor': 'end', style: lab }, v));
    }
    const sel = S.inspect ? liveSel() : [];
    if (sel.length) {
      const b = bounds(sel), acc = 'fill:var(--k-acc)';
      rt.append(sv('rect', { x: b.x * s, y: 0, width: Math.max(0, b.w * s), height: TH, style: 'fill:var(--k-acc);opacity:.16' }));
      rl.append(sv('rect', { x: 0, y: b.y * s, width: LW, height: Math.max(0, b.h * s), style: 'fill:var(--k-acc);opacity:.16' }));
      [[b.x, 'end', -2], [b.x + b.w, 'start', 2]].forEach(([v, a, o]) => { rt.append(sv('line', { x1: v * s, x2: v * s, y1: 0, y2: TH, style: 'stroke:var(--k-acc)' })); if (!S.phone) rt.append(sv('text', { x: v * s + o, y: -3, 'text-anchor': a, style: 'font-size:11px;' + acc }, fmt(v))); });
      [b.y, b.y + b.h].forEach(v => { rl.append(sv('line', { y1: v * s, y2: v * s, x1: 0, x2: LW, style: 'stroke:var(--k-acc)' })); if (!S.phone) rl.append(sv('text', { x: -3, y: v * s + 4, 'text-anchor': 'end', style: 'font-size:11px;' + acc }, fmt(v))); });
    }
    if (S.cursor && !S.ptr) {
      const c = S.cursor, st = 'font-size:11px;font-weight:600;fill:var(--k-fg)';
      rt.append(sv('line', { x1: c.x * s, x2: c.x * s, y1: 0, y2: TH, style: 'stroke:var(--k-fg)' }));
      rl.append(sv('line', { y1: c.y * s, y2: c.y * s, x1: 0, x2: LW, style: 'stroke:var(--k-fg)' }));
      if (!S.phone) { rt.append(sv('text', { x: c.x * s, y: -3, 'text-anchor': 'middle', style: st }, c.x)); rl.append(sv('text', { x: -3, y: c.y * s + 4, 'text-anchor': 'end', style: st }, c.y)); }
    }
  }

  /* ---------- onion skin ---------- */
  const ONION = { before: '#ff453a', after: '#30d158' };
  function onionNeighbours() {
    // Versions in order, then Draft, like frames on a timeline. Up to two layers each side.
    const draft = S.viewing < 0 ? S.model : S.draftModel;
    const seq = S.versions.map(v => ({ name: v.name, model: v.model })).concat([{ name: 'Draft', model: draft }]);
    const i = S.viewing < 0 ? seq.length - 1 : S.viewing, d = S.onionDepth;
    const before = [], after = [];
    if (S.onion >= 1) for (let n = 1; n <= d; n++) if (i - n >= 0) before.push(seq[i - n]);
    if (S.onion >= 2) for (let n = 1; n <= d; n++) if (i + n < seq.length) after.push(seq[i + n]);
    return { before, after };
  }
  function geomIn(k, el, r, model) {
    const cur = S.model.edits[k] || {}, oth = (model.edits || {})[k] || {};
    const bx = r.x - (cur.dx || 0), by = r.y - (cur.dy || 0);
    const bw = cur.w != null && cur.w0 != null ? cur.w0 : r.w, bh = cur.h != null && cur.h0 != null ? cur.h0 : r.h;
    return { x: bx + (oth.dx || 0), y: by + (oth.dy || 0), w: oth.w != null ? oth.w : bw, h: oth.h != null ? oth.h : bh };
  }
  const sameRect = (a, b) => Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.w - b.w) < 0.5 && Math.abs(a.h - b.h) < 0.5;
  function ghostSide(ov, frames, col, u) {
    if (!frames.length) return 0;
    const fade = [1, 0.45];
    const keys = new Set(Object.keys(S.model.edits));
    frames.forEach(f => Object.keys((f.model && f.model.edits) || {}).forEach(k => keys.add(k)));
    const labelled = frames.map(() => false); let n = 0;
    keys.forEach(k => {
      const el = elOf(k); if (!el || !el.isConnected) return;
      const r = rectOf(el), rad0 = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
      let prev = r, prevCentre = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
      frames.forEach((f, li) => {
        const g = geomIn(k, el, r, f.model), a = fade[li];
        const c = { x: g.x + g.w / 2, y: g.y + g.h / 2 };
        if (!sameRect(g, r) && !(li > 0 && sameRect(g, prev))) {
          const rad = Math.min(rad0, g.w / 2, g.h / 2);
          ov.append(sv('rect', { class: 'kit-ghost kit-ghost-' + (li + 1), x: g.x, y: g.y, width: Math.max(0, g.w), height: Math.max(0, g.h), rx: rad, fill: col, 'fill-opacity': .045 * a, stroke: col, 'stroke-opacity': .85 * a, 'stroke-width': 1.2 * u, 'stroke-dasharray': li ? `${2 * u} ${3 * u}` : `${4 * u} ${3 * u}` }));
          n++;
          if (!labelled[li]) {
            labelled[li] = true; const t = f.name.length > 18 ? f.name.slice(0, 17) + '…' : f.name, w = (t.length * 6.3 + 10) * u;
            ov.append(sv('rect', { x: g.x, y: g.y - 16 * u, width: w, height: 15 * u, rx: 4 * u, fill: col, opacity: .9 * a }));
            ov.append(sv('text', { x: g.x + 5 * u, y: g.y - 5 * u, opacity: a < 1 ? .85 : 1, style: `font-size:${11 * u}px;fill:#fff;font-family:-apple-system,system-ui,sans-serif` }, t));
          }
        }
        if (Math.hypot(c.x - prevCentre.x, c.y - prevCentre.y) > 3) {
          ov.append(sv('line', { x1: c.x, y1: c.y, x2: prevCentre.x, y2: prevCentre.y, stroke: col, 'stroke-opacity': .7 * a, 'stroke-width': 1.2 * u }));
          ov.append(sv('circle', { cx: c.x, cy: c.y, r: 2.5 * u, fill: col, 'fill-opacity': a }));
        }
        prev = g; prevCentre = c;
      });
    });
    return n;
  }
  const GUIDE = '#00a8e8';
  function drawUserGuides(ov, W, H, u) {
    S.userGuides.forEach((g, i) => {
      if (S.gd && S.gd.idx === i) return;
      ov.append(g.a === 'x' ? sv('line', { class: 'kit-uguide', x1: g.v, x2: g.v, y1: 0, y2: H, stroke: GUIDE, 'stroke-width': u }) : sv('line', { class: 'kit-uguide', x1: 0, x2: W, y1: g.v, y2: g.v, stroke: GUIDE, 'stroke-width': u }));
    });
    const d = S.gd;
    if (d && d.v != null) {
      const col = d.inside ? GUIDE : '#8e8e93';
      ov.append(d.axis === 'x' ? sv('line', { x1: d.v, x2: d.v, y1: 0, y2: H, stroke: col, 'stroke-width': 1.5 * u, 'stroke-dasharray': d.inside ? '' : `${3 * u} ${3 * u}` }) : sv('line', { x1: 0, x2: W, y1: d.v, y2: d.v, stroke: col, 'stroke-width': 1.5 * u, 'stroke-dasharray': d.inside ? '' : `${3 * u} ${3 * u}` }));
      const txt = d.inside ? (d.axis === 'x' ? 'x ' : 'y ') + d.v : 'Let go to remove';
      d.axis === 'x' ? darkTag(ov, Math.min(W - 70 * u, Math.max(4 * u, d.v + 6 * u)), 24 * u, txt, u) : darkTag(ov, 8 * u, Math.min(H - 20 * u, Math.max(18 * u, d.v - 6 * u)), txt, u);
    }
  }
  function darkTag(ov, x, y, txt, u, cls) {
    const w = (txt.length * 6.6 + 12) * u, g = sv('g', cls ? { class: cls } : {});
    x = Math.max(2 * u, Math.min(x, scr().offsetWidth - w - 2 * u));
    g.append(sv('rect', { x, y: y - 12 * u, width: w, height: 17 * u, rx: 5 * u, fill: '#1c1c1e', opacity: .9 }));
    g.append(sv('text', { x: x + 6 * u, y: y + 0.5 * u, style: `font-size:${11 * u}px;font-weight:600;fill:#fff;font-family:-apple-system,system-ui,sans-serif` }, txt));
    ov.append(g);
  }
  function guideAt(p) { const thr = 5 / (S.scale || 1); let best = -1, bd = thr; S.userGuides.forEach((g, i) => { const d = Math.abs((g.a === 'x' ? p.x : p.y) - g.v); if (d <= bd) { bd = d; best = i; } }); return best; }
  function saveGuides() { if (store) try { store.setItem(S.lsKey + ':guides', JSON.stringify(S.userGuides)); } catch (e) { } }
  function beginGuide(axis, idx, pointerId) {
    S.gd = { axis, idx, id: pointerId, v: idx >= 0 ? S.userGuides[idx].v : null, inside: idx >= 0 }; tipHide(true);
    const W = scr().offsetWidth, H = scr().offsetHeight;
    const mv = e => { if (e.pointerId !== S.gd.id) return; const p = pt(e.clientX, e.clientY); const v = axis === 'x' ? p.x : p.y; S.gd.v = Math.round(v); S.gd.inside = v >= 0 && v <= (axis === 'x' ? W : H); schedule(); };
    const up = e => {
      if (!S.gd || e.pointerId !== S.gd.id) return;
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      const d = S.gd; S.gd = null;
      if (d.v != null && d.inside) { if (d.idx >= 0) S.userGuides[d.idx].v = d.v; else S.userGuides.push({ a: axis, v: d.v }); S.status = (axis === 'x' ? 'Guide at x ' : 'Guide at y ') + d.v; }
      else if (d.idx >= 0) { S.userGuides.splice(d.idx, 1); S.status = 'Guide removed'; }
      saveGuides(); render();
    };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }
  function bindGuides() {
    // Drag out of the top ruler for a level guide, out of the left ruler for an upright one.
    const start = axis => ev => { if (!S.inspect || ev.button > 0) return; ev.preventDefault(); beginGuide(axis, -1, ev.pointerId); };
    S.el.rt.setAttribute('data-tip', 'Top ruler|Drag down onto the phone for a level guide. Drag a guide back here to remove it|');
    S.el.rl.setAttribute('data-tip', 'Left ruler|Drag across onto the phone for an upright guide. Drag a guide back here to remove it|');
    S.el.rt.addEventListener('pointerdown', start('y'));
    S.el.rl.addEventListener('pointerdown', start('x'));
  }
  function drawOnion(ov, u) {
    if (S.original || S.tweening || !S.onion || !S.versions.length) return;
    const nb = onionNeighbours();
    ghostSide(ov, nb.before, ONION.before, u); ghostSide(ov, nb.after, ONION.after, u);
  }
  function tween(fn) {
    // Parts glide from where they were to where they are now, then the ghosts appear.
    if (S.motion === 2) return fn();
    const k = S.motion === 1 ? 4 : 1, ms = 420 * k;
    S.tweening = true; scr().classList.add('kit-tween'); void scr().offsetWidth;
    fn();
    clearTimeout(S.tweenT); S.tweenT = setTimeout(() => { scr().classList.remove('kit-tween'); S.tweening = false; schedule(); }, ms + 40);
  }
  function savePrefs() { if (store) try { store.setItem('kit:prefs', JSON.stringify({ inspect: S.inspect, onion: S.onion, onionDepth: S.onionDepth })); } catch (e) { } }

  /* ---------- overlay on the screen ---------- */
  function drawOv() {
    const ov = S.el.ov; ov.textContent = '';
    const W = scr().offsetWidth, H = scr().offsetHeight, u = 1 / (S.scale || 1);
    ov.setAttribute('width', W); ov.setAttribute('height', H); ov.setAttribute('viewBox', `0 0 ${W} ${H}`);
    drawOnion(ov, u);
    if (S.tweening) return;
    if (S.inspect) drawUserGuides(ov, W, H, u);
    if (!S.inspect) { if (!S.original) changeList().forEach((c, i) => { if (c.e.note && c.el && c.el.isConnected) { const r = inkRect(c.el); bubble(ov, r.x + r.w + 6 * u, r.y + 2 * u, i + 1, u); } }); return; }
    const sel = liveSel();
    if (S.hover && !sel.includes(S.hover) && S.hover.isConnected) {
      const r = rectOf(S.hover);
      ov.append(sv('rect', { x: r.x, y: r.y, width: Math.max(0, r.w), height: Math.max(0, r.h), fill: 'rgba(0,122,255,.08)', stroke: BLUE, 'stroke-width': u }));
      nameTag(ov, r, nameOf(S.hover), u, false);
    }
    if (sel.length === 1 && !S.skel && !S.ptr) boxModel(ov, sel[0]);
    const multi = units().length > 1, keyM = multi && S.key ? members(S.key) : [];
    for (const k in S.model.edits) { if (!S.model.edits[k].lock) continue; const el = elOf(k); if (el && el.isConnected) { const r = rectOf(el); ov.append(sv('rect', { x: r.x, y: r.y, width: Math.max(0, r.w), height: Math.max(0, r.h), fill: 'none', style: 'stroke:var(--fg2)', 'stroke-width': 1.2 * u, 'stroke-dasharray': `${1.5 * u} ${2.5 * u}` })); padlock(ov, r.x + 3 * u, r.y + 3 * u, u); } }
    sel.forEach(e => {
      const r = rectOf(e), isKey = keyM.includes(e);
      if (multi && !isKey) ov.append(sv('rect', { x: r.x, y: r.y, width: Math.max(0, r.w), height: Math.max(0, r.h), fill: 'rgba(0,122,255,.10)' }));
      ov.append(sv('rect', { x: r.x, y: r.y, width: Math.max(0, r.w), height: Math.max(0, r.h), fill: 'none', style: isKey ? 'stroke:var(--fg)' : 'stroke:' + BLUE, 'stroke-width': (isKey ? 2.5 : 1.5) * u }));
    });
    if (multi && keyM.length) { const kb = bounds(keyM); keyTag(ov, kb, u); }
    if (units().length > 1) { const b = bounds(sel); ov.append(sv('rect', { x: b.x - 3 * u, y: b.y - 3 * u, width: b.w + 6 * u, height: b.h + 6 * u, fill: 'none', stroke: BLUE, 'stroke-width': u, 'stroke-dasharray': `${4 * u} ${3 * u}` })); }
    if (sel.length === 1 && !S.ptr) distances(ov, sel[0], u);
    if (sel.length === 1 && !S.original && S.viewing < 0 && !isLocked(sel[0])) handles(ov, rectOf(sel[0]), u);
    if (sel.length) { const sb = bounds(sel); S.guides.forEach(g => guide(ov, g, sb, W, H, u)); }
    const P0 = S.ptr;
    if (P0 && P0.moved && (P0.mode === 'move' || P0.mode === 'resize') && S.cursor) {
      let txt;
      if (P0.mode === 'move') txt = `${signed(P0.mx || 0)}, ${signed(P0.my || 0)}`;
      else { const e = peek(P0.el) || {}, r = rectOf(P0.el); txt = `${fmt(e.w != null ? e.w : r.w)} × ${fmt(e.h != null ? e.h : r.h)}`; }
      darkTag(ov, S.cursor.x + 14 * u, S.cursor.y + 18 * u, txt, u, 'kit-live');
    }
    if (!S.original) changeList().forEach((c, i) => { if (c.el && c.el.isConnected) { if (c.e.note) { const r = inkRect(c.el); bubble(ov, r.x + r.w + 6 * u, r.y + 2 * u, i + 1, u); } else { const r = rectOf(c.el); pin(ov, r.x + r.w - 2 * u, r.y + 2 * u, i + 1, u); } } });
    if (sel.length === 1) nameTag(ov, rectOf(sel[0]), nameOf(sel[0]) + (isLocked(sel[0]) ? ' · locked' : ''), u, true);
  }
  function nameTag(ov, r, txt, u, strong) {
    const t = txt.length > 30 ? txt.slice(0, 29) + '…' : txt, fs = 11 * u, w = (t.length * 6.3 + 12) * u, hh = 17 * u;
    let x = Math.max(2 * u, Math.min(r.x, scr().offsetWidth - w - 2 * u)), y = r.y - hh - 3 * u; if (y < 2 * u) y = r.y + r.h + 3 * u;
    ov.append(sv('rect', { x, y, width: w, height: hh, rx: 5 * u, fill: strong ? BLUE : '#1c1c1e', opacity: strong ? 1 : .85 }));
    ov.append(sv('text', { x: x + 6 * u, y: y + 12 * u, style: `font-size:${fs}px;fill:#fff;font-family:-apple-system,system-ui,sans-serif` }, t));
  }
  function keyTag(ov, r, u) {
    const t = 'Key object', w = (t.length * 6.3 + 12) * u, hh = 17 * u;
    let x = Math.max(2 * u, Math.min(r.x, scr().offsetWidth - w - 2 * u)), y = r.y - hh - 3 * u; if (y < 2 * u) y = r.y + r.h + 3 * u;
    ov.append(sv('rect', { x, y, width: w, height: hh, rx: 5 * u, style: 'fill:var(--fg)' }));
    ov.append(sv('text', { x: x + 6 * u, y: y + 12 * u, style: `font-size:${11 * u}px;fill:var(--bg);font-family:-apple-system,system-ui,sans-serif` }, t));
  }
  function padlock(ov, x, y, u) {
    const g = sv('g', { transform: `translate(${x} ${y}) scale(${u})` });
    g.append(sv('rect', { x: 0, y: 0, width: 16, height: 16, rx: 4, style: 'fill:var(--fg)', opacity: .85 }));
    g.append(sv('path', { d: 'M5.5 7V5.6a2.5 2.5 0 015 0V7', fill: 'none', style: 'stroke:var(--bg)', 'stroke-width': 1.4 }));
    g.append(sv('rect', { x: 4.2, y: 7, width: 7.6, height: 5.6, rx: 1.2, style: 'fill:var(--bg)' }));
    ov.append(g);
  }
  function ring(ov, o, i, fill) {
    if (o.w <= 0 || o.h <= 0) return;
    const d = `M${o.x} ${o.y}h${o.w}v${o.h}h${-o.w}Z M${i.x} ${i.y}v${Math.max(0, i.h)}h${Math.max(0, i.w)}v${-Math.max(0, i.h)}Z`;
    ov.append(sv('path', { d, fill, 'fill-rule': 'evenodd' }));
  }
  function boxModel(ov, el) {
    const r = rectOf(el), cs = getComputedStyle(el), n = p => parseFloat(cs[p]) || 0;
    const m = { t: Math.max(0, n('marginTop')), r: Math.max(0, n('marginRight')), b: Math.max(0, n('marginBottom')), l: Math.max(0, n('marginLeft')) };
    const bw = { t: n('borderTopWidth'), r: n('borderRightWidth'), b: n('borderBottomWidth'), l: n('borderLeftWidth') };
    const p = { t: n('paddingTop'), r: n('paddingRight'), b: n('paddingBottom'), l: n('paddingLeft') };
    const outer = { x: r.x - m.l, y: r.y - m.t, w: r.w + m.l + m.r, h: r.h + m.t + m.b };
    const pad = { x: r.x + bw.l, y: r.y + bw.t, w: r.w - bw.l - bw.r, h: r.h - bw.t - bw.b };
    const con = { x: pad.x + p.l, y: pad.y + p.t, w: pad.w - p.l - p.r, h: pad.h - p.t - p.b };
    ring(ov, outer, r, 'rgba(239,159,39,.32)');
    ring(ov, pad, con, 'rgba(99,153,34,.34)');
    if (con.w > 0 && con.h > 0) ov.append(sv('rect', { x: con.x, y: con.y, width: con.w, height: con.h, fill: 'rgba(55,138,221,.26)' }));
  }
  function measure(ov, x1, y1, x2, y2, val, u) {
    if (val < 0.5) return;
    ov.append(sv('line', { x1, y1, x2, y2, stroke: RED, 'stroke-width': u, 'stroke-dasharray': `${3 * u} ${2 * u}` }));
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, t = fmt(val), w = (t.length * 6.5 + 8) * u;
    ov.append(sv('rect', { x: mx - w / 2, y: my - 7.5 * u, width: w, height: 15 * u, rx: 4 * u, fill: RED }));
    ov.append(sv('text', { x: mx, y: my + 4 * u, 'text-anchor': 'middle', style: `font-size:${11 * u}px;fill:#fff;font-family:-apple-system,system-ui,sans-serif` }, t));
  }
  function distances(ov, el, u) {
    const p = el.parentElement; if (!p || !S.root.contains(p) && p !== S.root) return;
    const r = rectOf(el), pc = contentBox(p), cy = r.y + r.h / 2, cx = r.x + r.w / 2;
    measure(ov, pc.x, cy, r.x, cy, r.x - pc.x, u);
    measure(ov, r.x + r.w, cy, pc.x + pc.w, cy, pc.x + pc.w - r.x - r.w, u);
    let prev = el.previousElementSibling;
    while (prev && (prev.offsetParent === null && getComputedStyle(prev).position !== 'fixed' || prev.getBoundingClientRect().height === 0)) prev = prev.previousElementSibling;
    const top = prev ? rectOf(prev).y + rectOf(prev).h : pc.y;
    if (top <= r.y) measure(ov, cx, top, cx, r.y, r.y - top, u);
  }
  function handlePts(r) { const xs = [r.x, r.x + r.w / 2, r.x + r.w], ys = [r.y, r.y + r.h / 2, r.y + r.h], out = []; ys.forEach((y, yi) => xs.forEach((x, xi) => { if (xi === 1 && yi === 1) return; out.push({ x, y, l: xi === 0, r: xi === 2, t: yi === 0, b: yi === 2 }); })); return out; }
  function handles(ov, r, u) { handlePts(r).forEach(p => ov.append(sv('rect', { x: p.x - 3.5 * u, y: p.y - 3.5 * u, width: 7 * u, height: 7 * u, rx: 1.5 * u, fill: '#fff', stroke: BLUE, 'stroke-width': u }))); }
  function handleAt(r, p) { const thr = (S.phone ? 16 : 9) / (S.scale || 1); let best = null, bd = thr; handlePts(r).forEach(hp => { const d = Math.hypot(hp.x - p.x, hp.y - p.y); if (d <= bd) { bd = d; best = hp; } }); return best; }
  function tagPill(ov, x, y, txt, u) {
    const w = (txt.length * 6.3 + 10) * u;
    ov.append(sv('rect', { x: x - w / 2, y: y - 8 * u, width: w, height: 16 * u, rx: 4 * u, fill: PINK }));
    ov.append(sv('text', { x, y: y + 4 * u, 'text-anchor': 'middle', style: `font-size:${11 * u}px;fill:#fff;font-family:-apple-system,system-ui,sans-serif` }, txt));
  }
  function guide(ov, g, sb, W, H, u) {
    if (g.a === 'note') { tagPill(ov, Math.min(W - 44 * u, Math.max(44 * u, sb.x + sb.w / 2)), Math.min(H - 12 * u, sb.y + sb.h + 14 * u), g.t, u); return; }
    if (g.a === 'x') { ov.append(sv('line', { x1: g.v, x2: g.v, y1: 0, y2: H, stroke: PINK, 'stroke-width': u })); tagPill(ov, Math.min(W - 40 * u, Math.max(40 * u, g.v)), Math.max(12 * u, sb.y - 14 * u), g.t, u); }
    else if (g.a === 'y') { ov.append(sv('line', { x1: 0, x2: W, y1: g.v, y2: g.v, stroke: PINK, 'stroke-width': u })); tagPill(ov, Math.min(W - 44 * u, sb.x + sb.w + 40 * u), g.v, g.t, u); }
    else { const cx = sb.x + sb.w / 2; ov.append(sv('line', { x1: cx, x2: cx, y1: g.v1, y2: g.v2, stroke: PINK, 'stroke-width': 1.5 * u })); tagPill(ov, cx + 30 * u, (g.v1 + g.v2) / 2, g.t, u); }
  }
  function pin(ov, x, y, n, u) {
    ov.append(sv('circle', { cx: x, cy: y, r: 8 * u, fill: '#1c1c1e', stroke: '#fff', 'stroke-width': 1.5 * u }));
    ov.append(sv('text', { x, y: y + 3.8 * u, 'text-anchor': 'middle', style: `font-size:${11 * u}px;font-weight:600;fill:#fff;font-family:-apple-system,system-ui,sans-serif` }, n));
  }
  function inkRect(el) {
    // Where the part's content actually sits (the end of a heading's text, not the edge of its full-width box).
    const r = rectOf(el);
    try { const rg = document.createRange(); rg.selectNodeContents(el); const a = rg.getBoundingClientRect(), b = sRect(), s = sc(); if (a.width > 4 && a.height > 4) { const c = { x: (a.left - b.left) / s, y: (a.top - b.top) / s, w: a.width / s, h: a.height / s }; if (c.w < r.w - 1) return c; } } catch (e) { }
    return r;
  }
  function bubble(ov, x, y, n, u) {
    const g = sv('g', { class: 'kit-bubble', transform: `translate(${x - 11 * u} ${y - 10 * u}) scale(${u})` });
    g.append(sv('path', { d: 'M5 0h12a5 5 0 015 5v6a5 5 0 01-5 5H9l-5 4v-4.3A5 5 0 010 11V5a5 5 0 015-5z', fill: '#ffd60a', stroke: '#fff', 'stroke-width': 1.5 }));
    g.append(sv('text', { x: 11, y: 11.6, 'text-anchor': 'middle', style: 'font-size:11px;font-weight:700;fill:#1c1c1e;font-family:-apple-system,system-ui,sans-serif' }, n));
    ov.append(g);
  }
  function schedule() { if (S.raf) return; S.raf = requestAnimationFrame(() => { S.raf = 0; drawRulers(); drawOv(); }); }

  /* ---------- picking and pointer handling ---------- */
  function hit(cx, cy) {
    const L = S.el.layer; L.style.pointerEvents = 'none';
    const e = document.elementFromPoint(cx, cy);
    L.style.pointerEvents = '';
    return e && S.root.contains(e) && e !== S.root ? e : null;
  }
  function pick(e, deep) { if (!e) return null; if (deep) return e; const n = e.closest('[data-name]'); return n && n !== S.root && S.root.contains(n) ? n : e; }
  function targets(sel) {
    const set = new Set(S.root.querySelectorAll('[data-name]'));
    sel.forEach(e => { const p = e.parentElement; if (p) [...p.children].forEach(c => set.add(c)); });
    const W = scr().offsetWidth, H = scr().offsetHeight, m = S.opts.margin;
    const tx = [[0, 'screen edge'], [W, 'screen edge'], [W / 2, 'screen centre'], [m, 'margin ' + m], [W - m, 'margin ' + m]];
    const ty = [[H / 2, 'screen centre']], others = [];
    S.userGuides.forEach(g => (g.a === 'x' ? tx : ty).push([g.v, 'guide']));
    set.forEach(e => {
      if (e === S.root || sel.some(s => s === e || s.contains(e) || e.contains(s))) return;
      const r = rectOf(e); if (r.w < 1 || r.h < 1 || r.y > H || r.y + r.h < 0) return;
      others.push(r);
      tx.push([r.x, 'left edge'], [r.x + r.w, 'right edge'], [r.x + r.w / 2, 'centre']);
      ty.push([r.y, 'top edge'], [r.y + r.h, 'bottom edge'], [r.y + r.h / 2, 'centre']);
    });
    const par = sel[0] && sel[0].parentElement;
    if (par && par !== S.root && S.root.contains(par)) { const c = contentBox(par); tx.push([c.x, 'parent edge'], [c.x + c.w, 'parent edge'], [c.x + c.w / 2, 'parent centre']); ty.push([c.y, 'parent top'], [c.y + c.h, 'parent bottom']); }
    return { tx, ty, others };
  }
  function nearest(list, vals) { const thr = (S.phone ? 10 : 6) / (S.scale || 1); let best = null; vals.forEach(off => list.forEach(([t, l]) => { const d = t - off; if (Math.abs(d) <= thr && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, t, l }; })); return best; }
  function snapBox(P, nx, ny, w, h) {
    S.guides = []; let x = nx, y = ny, sx = false, sy = false;
    const bx = nearest(P.T.tx, [nx, nx + w / 2, nx + w]);
    if (bx) { x = nx + bx.d; sx = true; S.guides.push({ a: 'x', v: bx.t, t: bx.l }); }
    const thr = (S.phone ? 10 : 6) / (S.scale || 1);
    let by = nearest(P.T.ty, [ny, ny + h / 2, ny + h]), gapG = null;
    const ov = P.T.others.filter(r => r.x < nx + w && r.x + r.w > nx);
    const above = ov.filter(r => r.y + r.h <= ny + thr).sort((a, b) => (b.y + b.h) - (a.y + a.h))[0];
    const below = ov.filter(r => r.y >= ny + h - thr).sort((a, b) => a.y - b.y)[0];
    S.opts.gaps.forEach(g => {
      if (above) { const d = above.y + above.h + g - ny; if (Math.abs(d) <= thr && (!by || Math.abs(d) < Math.abs(by.d))) { by = { d }; gapG = { a: 'g', v1: above.y + above.h, v2: above.y + above.h + g, t: g + ' gap' }; } }
      if (below) { const d = below.y - g - h - ny; if (Math.abs(d) <= thr && (!by || Math.abs(d) < Math.abs(by.d))) { by = { d }; gapG = { a: 'g', v1: below.y - g, v2: below.y, t: g + ' gap' }; } }
    });
    if (by) { y = ny + by.d; sy = true; S.guides.push(gapG && by.t == null ? gapG : { a: 'y', v: by.t, t: by.l }); }
    return { x, y, sx, sy };
  }
  function snapEdge(P, axis, v, free) {
    if (free) return v;
    const b = nearest(axis === 'x' ? P.T.tx : P.T.ty, [v]);
    if (!b) return Math.round(v);
    S.guides.push({ a: axis, v: b.t, t: b.l }); return b.t;
  }
  function beginDrag(P) {
    const sel = liveSel();
    P.before = snapM(); P.T = targets(sel); S.hover = null;
    if (P.mode === 'move') {
      const mv = sel.filter(el => !isLocked(el)); P.skipped = sel.length - mv.length;
      if (!mv.length) { P.mode = 'still'; P.why = LOCKED; return; }
      P.bb = bounds(mv); P.starts = mv.map(el => { const e = peek(el) || {}; return [el, e.dx || 0, e.dy || 0]; });
    }
    else { const el = sel[0], e = E(el), r = rectOf(el); P.el = el; P.r0 = r; P.dx0 = e.dx || 0; P.dy0 = e.dy || 0; if (e.w0 == null) e.w0 = Math.round(r.w * 10) / 10; if (e.h0 == null) e.h0 = Math.round(r.h * 10) / 10; P.w0 = r.w; P.h0 = r.h; }
  }
  function doMove(P, p, free, straight) {
    let dx = p.x - P.p0.x, dy = p.y - P.p0.y, axis = null;
    if (straight) { if (Math.abs(dx) >= Math.abs(dy)) { dy = 0; axis = 'h'; } else { dx = 0; axis = 'v'; } }
    let q = { x: P.bb.x + r1(dx), y: P.bb.y + r1(dy) };
    if (!free) { const s = snapBox(P, P.bb.x + dx, P.bb.y + dy, P.bb.w, P.bb.h); q = { x: s.sx ? s.x : P.bb.x + r1(dx), y: s.sy ? s.y : P.bb.y + r1(dy) }; } else S.guides = [];
    if (axis === 'h') { q.y = P.bb.y; S.guides = S.guides.filter(g => g.a === 'x'); S.guides.push({ a: 'note', t: 'Across only' }); }
    if (axis === 'v') { q.x = P.bb.x; S.guides = S.guides.filter(g => g.a === 'y' || g.a === 'g'); S.guides.push({ a: 'note', t: 'Down only' }); }
    const mx = q.x - P.bb.x, my = q.y - P.bb.y; P.mx = mx; P.my = my;
    P.starts.forEach(([el, x0, y0]) => { const e = E(el); e.dx = Math.round((x0 + mx) * 100) / 100; e.dy = Math.round((y0 + my) * 100) / 100; applyEl(el, e); S.touched.add(el); });
  }
  function doResize(P, p, free) {
    const r0 = P.r0, hd = P.hd, dx = p.x - P.p0.x, dy = p.y - P.p0.y; S.guides = [];
    let L = r0.x, R = r0.x + r0.w, T = r0.y, B = r0.y + r0.h;
    if (hd.l) L = Math.min(snapEdge(P, 'x', r0.x + dx, free), R - 4);
    if (hd.r) R = Math.max(snapEdge(P, 'x', R + dx, free), L + 4);
    if (hd.t) T = Math.min(snapEdge(P, 'y', r0.y + dy, free), B - 4);
    if (hd.b) B = Math.max(snapEdge(P, 'y', B + dy, free), T + 4);
    const el = P.el, e = E(el);
    if (hd.l || hd.r) e.w = Math.round((R - L) * 10) / 10;
    if (hd.t || hd.b) e.h = Math.round((B - T) * 10) / 10;
    applyEl(el, e); S.touched.add(el);
    const a = rectOf(el);
    if (hd.l || hd.r) e.dx = Math.round(((e.dx || 0) + (L - a.x)) * 100) / 100;
    if (hd.t || hd.b) e.dy = Math.round(((e.dy || 0) + (T - a.y)) * 100) / 100;
    applyEl(el, e);
  }
  function nextDupId() { return String(1 + Math.max(0, ...Object.keys(S.model.edits).filter(k => k.startsWith('d:')).map(k => parseInt(k.slice(2), 10) || 0))); }
  function copyName(src) {
    const base = nameOf(src).replace(/ copy( \d+)?$/, ''); let name = base + ' copy', n = 2;
    while (S.root.querySelector('[data-name="' + CSS.escape(name) + '"]')) name = base + ' copy ' + (n++);
    return name;
  }
  function makeCopies(srcs) {
    const made = [];
    srcs.forEach(src => {
      if (!(src instanceof HTMLElement)) return;
      const id = nextDupId(), se = peek(src) || {};
      S.model.edits['d:' + id] = { name: copyName(src), dup: { of: keyOf(src), ofName: nameOf(src) }, dx: se.dx || 0, dy: se.dy || 0 };
      made.push(id);
    });
    if (!made.length) return [];
    syncDups();
    const clones = made.map(id => elOf('d:' + id)).filter(Boolean);
    clones.forEach(c => { applyEl(c, S.model.edits[keyOf(c)]); S.touched.add(c); });
    return clones;
  }
  function startDup(P) {
    const clones = makeCopies(P.starts.map(s => s[0]));
    if (!clones.length) { S.status = "That part can't be copied"; return; }
    S.sel = clones; S.key = clones[0]; P.duped = true;
    P.starts = clones.map(c => { const e = peek(c) || {}; return [c, e.dx || 0, e.dy || 0]; });
    P.T = targets(clones);
  }
  function removeCopies() {
    S.err = ''; S.status = ''; const sel = liveSel(); if (!sel.length) return;
    if (S.viewing >= 0) { S.err = RO; return render(); }
    const copies = sel.filter(el => keyOf(el).startsWith('d:'));
    if (!copies.length) { S.err = 'Only copies you made can be deleted here. Add a note to ask for a part to be removed'; return render(); }
    commit(copies.length > 1 ? 'Delete copies' : 'Delete copy', () => { copies.forEach(c => { delete S.model.edits[keyOf(c)]; }); S.sel = []; S.key = null; });
  }
  function addToSel(mem) {
    let sel = liveSel().filter(s => !mem.some(m => m.contains(s) || s.contains(m)));
    S.sel = sel.concat(mem.filter(m => !sel.includes(m)));
  }
  function tapSelect(P) {
    S.err = ''; S.status = '';
    const t = P.target;
    if (!t) { if (!S.multi && !P.shift) { S.sel = []; S.key = null; } return; }
    const now = Date.now(), dbl = S.lastTap && S.lastTap.el === t && now - S.lastTap.t < 380;
    S.lastTap = dbl ? null : { el: t, t: now };
    if (dbl && isLocked(t)) return unlockByDouble(t);
    const mem = P.deep ? [t] : members(t), sel = liveSel();
    if (P.shift || S.multi) {
      const all = mem.every(m => sel.includes(m));
      if (all) S.sel = sel.filter(x => !mem.includes(x)); else addToSel(mem);
      if (!S.key || !S.sel.includes(S.key)) S.key = S.sel[0] || null;
      return;
    }
    if (sel.includes(t) && units().length > 1) { if (S.key !== t) S.status = nameOf(t) + ' is now the key object'; S.key = t; return; }
    S.sel = mem; S.key = t;
  }
  function bindLayer() {
    const L = S.el.layer;
    L.addEventListener('pointerdown', ev => {
      if (ev.button > 0) return; ev.preventDefault();
      try { L.setPointerCapture(ev.pointerId); } catch (e) { }
      const p0 = pt(ev.clientX, ev.clientY), gi = guideAt(p0);
      // A guide is grabbed unless the press lands on a part that's already picked (or its handle): picked parts win, so a guide never blocks moving them.
      const onSel = gi >= 0 && (() => { const s = liveSel(), r0 = hit(ev.clientX, ev.clientY); return (s.length === 1 && handleAt(rectOf(s[0]), p0)) || (r0 && s.some(x => x === r0 || x.contains(r0))); })();
      if (gi >= 0 && !onSel) { beginGuide(S.userGuides[gi].a, gi, ev.pointerId); return; }
      const p = p0, raw = hit(ev.clientX, ev.clientY), deep = ev.metaKey || ev.ctrlKey, target = pick(raw, deep), sel = liveSel();
      const hd = sel.length === 1 && !S.original && S.viewing < 0 && !isLocked(sel[0]) ? handleAt(rectOf(sel[0]), p) : null;
      let inSel = target && sel.some(s => s === target || s.contains(target)), pickedNow = false;
      // With a mouse, pressing on anything picks it straight away so it can be dragged (as in Illustrator).
      // With a finger, dragging something not yet picked scrolls the page instead.
      if (!inSel && !hd && target && ev.pointerType === 'mouse' && !ev.shiftKey && !S.multi && !S.original) { S.sel = deep ? [target] : members(target); S.key = target; S.err = ''; S.status = ''; inSel = true; pickedNow = true; }
      const P = { id: ev.pointerId, sx: ev.clientX, sy: ev.clientY, p0: p, target, deep, shift: ev.shiftKey, moved: false, hd, pickedNow };
      P.mode = hd ? 'resize' : (inSel ? (S.original || S.viewing >= 0 ? 'still' : 'move') : 'pan');
      P.scrollEl = scrollable(raw); P.st0 = P.scrollEl ? P.scrollEl.scrollTop : 0;
      S.ptr = P; tipHide(true); if (P.mode === 'move' || P.mode === 'resize') beginDrag(P);
    });
    L.addEventListener('pointermove', ev => {
      const p = pt(ev.clientX, ev.clientY); S.cursor = { x: r1(p.x), y: r1(p.y) };
      const P = S.ptr;
      if (!P) { if (ev.pointerType === 'mouse' && S.inspect) { const hv = pick(hit(ev.clientX, ev.clientY), ev.metaKey || ev.ctrlKey); if (hv !== S.hover) { S.hover = !S.skel ? hv : null; boxTip(hv); } } schedule(); return; }
      if (ev.pointerId !== P.id) return;
      if (!P.moved && Math.hypot(ev.clientX - P.sx, ev.clientY - P.sy) < 4) return;
      if (!P.moved && P.mode === 'move' && ev.altKey) startDup(P);
      P.moved = true;
      if (P.mode === 'still') { const msg = P.why || (S.viewing >= 0 ? RO : 'Turn off Show original to make changes'); if (S.err !== msg) { S.err = msg; renderInsp(); } return; }
      if (P.mode === 'pan') { if (P.scrollEl) P.scrollEl.scrollTop = P.st0 - (ev.clientY - P.sy) / (S.scale || 1); schedule(); return; }
      const free = ev.metaKey || ev.ctrlKey || !S.snap;
      if (P.mode === 'move') doMove(P, p, free, ev.shiftKey); else doResize(P, p, free);
      schedule(); renderLive();
    });
    const end = (ev, cancel) => {
      const P = S.ptr; if (!P || ev.pointerId !== P.id) return;
      S.ptr = null; S.guides = [];
      if (P.moved && (P.mode === 'move' || P.mode === 'resize')) {
        prune(); applyAll();
        if (P.skipped) S.status = `${P.skipped} locked ${P.skipped > 1 ? 'parts' : 'part'} stayed put`;
        if (P.before.m !== JSON.stringify(S.model)) { S.undo.push({ name: P.duped ? 'Duplicate' : P.mode === 'move' ? 'Move' : 'Resize', st: P.before }); S.redo = []; save(); }
        if (P.mode === 'move' && (P.mx || P.my)) S.lastTx = { dup: !!P.duped, dx: P.mx, dy: P.my };
        return render();
      }
      if (P.mode === 'resize' && !P.moved) prune();
      if (!P.moved && !cancel) { if (P.pickedNow) S.lastTap = { el: P.target, t: Date.now() }; else tapSelect(P); }
      render();
    };
    L.addEventListener('pointerup', ev => end(ev, false));
    L.addEventListener('pointercancel', ev => end(ev, true));
    L.addEventListener('wheel', ev => { const el = scrollable(hit(ev.clientX, ev.clientY)); if (el) { el.scrollTop += ev.deltaY; el.scrollLeft += ev.deltaX; ev.preventDefault(); schedule(); } }, { passive: false });
    L.addEventListener('pointerleave', () => { if (!S.ptr) { S.cursor = null; S.hover = null; tipHide(false); schedule(); } });
    scr().addEventListener('pointermove', ev => { if (!S.inspect) { const p = pt(ev.clientX, ev.clientY); S.cursor = { x: r1(p.x), y: r1(p.y) }; schedule(); } }, { passive: true });
    scr().addEventListener('pointerleave', () => { if (!S.inspect) { S.cursor = null; schedule(); } });
    scr().addEventListener('scroll', schedule, true);
  }

  /* ---------- arranging ---------- */
  function nudge(dx, dy) {
    const all = liveSel(); if (!all.length) return;
    if (S.viewing >= 0) { S.err = RO; return render(); }
    if (S.original) { S.err = 'Turn off Show original to make changes'; return render(); }
    const sel = all.filter(el => !isLocked(el)); if (!sel.length) { S.err = LOCKED; return render(); }
    const now = Date.now(), chain = S.undo.length && S.undo[S.undo.length - 1].name === 'Nudge' && now - S.lastNudge < 1000 && !S.redo.length;
    S.lastNudge = now;
    const f = () => sel.forEach(el => { const e = E(el); e.dx = (e.dx || 0) + dx; e.dy = (e.dy || 0) + dy; });
    if (chain && S.lastTx && !S.lastTx.dup) { S.lastTx.dx += dx; S.lastTx.dy += dy; } else S.lastTx = { dup: false, dx, dy };
    if (chain) { f(); prune(); applyAll(); save(); render(); } else commit('Nudge', f);
  }
  const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n));
  function txWords(t) { const w = []; if (t.dx) w.push((t.dx > 0 ? 'right ' : 'left ') + fmt(Math.abs(t.dx))); if (t.dy) w.push((t.dy > 0 ? 'down ' : 'up ') + fmt(Math.abs(t.dy))); return w.join(', '); }
  function transformAgain() {
    S.err = ''; S.status = ''; const tx = S.lastTx;
    if (!tx || (!tx.dx && !tx.dy)) { S.status = 'Nothing to repeat yet. Move something, or Option-drag a copy, first'; return render(); }
    if (!needSel()) return;
    const sel = liveSel().filter(el => !isLocked(el)); if (!sel.length) { S.err = LOCKED; return render(); }
    commit(tx.dup ? 'Copy again' : 'Move again', () => {
      let els = sel;
      if (tx.dup) { const c = makeCopies(sel); if (!c.length) return; els = c; S.sel = c; S.key = c[0]; }
      els.forEach(el => { const e = E(el); e.dx = Math.round(((e.dx || 0) + tx.dx) * 100) / 100; e.dy = Math.round(((e.dy || 0) + tx.dy) * 100) / 100; });
    });
    S.status = (tx.dup ? 'Another copy, ' : 'Moved again, ') + txWords(tx); render();
  }
  function needSel(min) { const n = liveSel().length; if (!n) { S.err = 'Tap something on the screen first'; render(); return false; } if (S.viewing >= 0) { S.err = RO; render(); return false; } if (S.original) { S.err = 'Turn off Show original to make changes'; render(); return false; } return true; }
  function align(k) {
    S.err = ''; S.status = ''; if (!needSel()) return;
    const us = units(); let mode = S.alignTo, t;
    if (us.length === 1 && (mode === 'selection' || mode === 'key')) { mode = 'parent'; S.status = 'Only one picked, so it lined up with its parent'; }
    if (mode === 'key') { if (!S.key) S.key = liveSel()[0]; t = bounds(members(S.key)); }
    else if (mode === 'screen') { const W = scr().offsetWidth, m = S.opts.margin; t = { x: m, y: 0, w: W - 2 * m, h: scr().offsetHeight }; }
    else if (mode === 'parent') { const p = liveSel()[0].parentElement; t = p && p !== S.root ? contentBox(p) : { x: 0, y: 0, w: scr().offsetWidth, h: scr().offsetHeight }; }
    else t = bounds(liveSel());
    const lockedU = us.filter(u => u.some(isLocked) && !(mode === 'key' && u.includes(S.key))).length;
    const st = mode === 'key' && us.length > 1 ? `Lined up with ${nameOf(S.key)}` : S.status;
    commit(AN[k], () => us.forEach(u => {
      if (mode === 'key' && u.includes(S.key)) return;
      if (u.some(isLocked)) return;
      const ub = bounds(u); let dx = 0, dy = 0;
      if (k === 'l') dx = t.x - ub.x; if (k === 'c') dx = t.x + t.w / 2 - (ub.x + ub.w / 2); if (k === 'r') dx = t.x + t.w - (ub.x + ub.w);
      if (k === 't') dy = t.y - ub.y; if (k === 'm') dy = t.y + t.h / 2 - (ub.y + ub.h / 2); if (k === 'b') dy = t.y + t.h - (ub.y + ub.h);
      u.forEach(el => { const e = E(el); e.dx = Math.round(((e.dx || 0) + dx) * 100) / 100; e.dy = Math.round(((e.dy || 0) + dy) * 100) / 100; });
    }));
    S.status = lockedU ? `${st ? st + '. ' : ''}${lockedU} locked ${lockedU > 1 ? 'parts' : 'part'} stayed put` : st; render();
  }
  function distribute(ax) {
    S.err = ''; S.status = ''; if (!needSel()) return;
    const us = units(), raw = (S.gapVal || '').trim(); let gap = null;
    if (raw) { const v = parseNum(raw); if (!v || v.rel) { S.err = 'Gap must be a number, like 16. Leave it empty for even gaps'; return render(); } gap = v.n; }
    if (gap === null && us.length < 3) { S.err = 'Pick three or more to space them evenly, or type a gap'; return render(); }
    if (us.length < 2) { S.err = 'Pick two or more to space out'; return render(); }
    const P = ax === 'x' ? ['x', 'w', 'dx'] : ['y', 'h', 'dy'];
    const items = us.map(u => ({ u, b: bounds(u) })).sort((a, b) => a.b[P[0]] - b.b[P[0]]);
    if (gap === null) { const f = items[0].b, l = items[items.length - 1].b; gap = (l[P[0]] + l[P[1]] - f[P[0]] - items.reduce((a, i) => a + i.b[P[1]], 0)) / (items.length - 1); }
    commit('Space out', () => { let pos = items[0].b[P[0]]; items.forEach(i => { const d = pos - i.b[P[0]]; if (!i.u.some(isLocked)) i.u.forEach(el => { const e = E(el); e[P[2]] = Math.round(((e[P[2]] || 0) + d) * 100) / 100; }); pos += i.b[P[1]] + gap; }); });
    const lk = items.filter(i => i.u.some(isLocked)).length;
    S.status = 'Gaps of ' + fmt(gap) + (lk ? `. ${lk} locked ${lk > 1 ? 'parts' : 'part'} stayed put, so some gaps may differ` : ''); render();
  }
  function group() {
    S.err = ''; if (!needSel()) return; const us = units();
    if (us.length < 2) { S.err = 'Pick two or more to group'; return render(); }
    const g = S.nextGroup++; commit('Group', () => { liveSel().forEach(el => { E(el).g = g; }); S.key = null; });
  }
  function ungroup() {
    S.err = ''; if (!needSel()) return; const sel = liveSel();
    if (!sel.some(el => (peek(el) || {}).g)) { S.err = "That isn't a group"; return render(); }
    commit('Ungroup', () => { sel.forEach(el => { const e = peek(el); if (e) delete e.g; }); S.key = null; });
  }
  function parseNum(raw) { const m = String(raw).trim().replace(/[−–]/g, '-').match(/^([+-])?\s*(\d+(?:\.\d+)?)$/); return m ? { rel: m[1] || '', n: parseFloat(m[2]) } : null; }
  function radiusOf(el) { const cs = getComputedStyle(el), v = cs.borderTopLeftRadius; if (v.includes('%')) { const r = rectOf(el); return parseFloat(v) / 100 * Math.min(r.w, r.h); } return Math.min(parseFloat(v) || 0, Math.min(rectOf(el).w, rectOf(el).h) / 2); }
  function applyField(f, raw) {
    S.err = ''; S.status = ''; if (!needSel()) return;
    const v = parseNum(raw); if (!v) { S.err = 'Enter a number, like 24, +8 or −8'; return render(); }
    const val = cur => v.rel === '+' ? cur + v.n : v.rel === '-' ? cur - v.n : v.n;
    const sel = liveSel().filter(el => !isLocked(el));
    if (!sel.length) { S.err = LOCKED; return render(); }
    if (f === 'x' || f === 'y') {
      const b = bounds(sel), d = val(b[f]) - b[f], prop = f === 'x' ? 'dx' : 'dy';
      if (d) S.lastTx = { dup: false, dx: f === 'x' ? d : 0, dy: f === 'y' ? d : 0 };
      commit(f === 'x' ? 'Move across' : 'Move down', () => sel.forEach(el => { const e = E(el); e[prop] = Math.round(((e[prop] || 0) + d) * 100) / 100; }));
    } else if (f === 'w' || f === 'h') {
      const el = sel[0], r = rectOf(el);
      commit('Resize', () => {
        const e = E(el); if (e[f + '0'] == null) e[f + '0'] = Math.round(r[f] * 10) / 10;
        e[f] = Math.max(1, val(r[f])); applyEl(el, e); S.touched.add(el);
        const a = rectOf(el); if (f === 'w') e.dx = Math.round(((e.dx || 0) + r.x - a.x) * 100) / 100; else e.dy = Math.round(((e.dy || 0) + r.y - a.y) * 100) / 100;
      });
    } else if (f === 'r') {
      const el = sel[0], cur = radiusOf(el);
      commit('Corners', () => { const e = E(el); if (e.r0 == null) e.r0 = Math.round(cur * 10) / 10; e.r = Math.max(0, val(cur)); });
    }
  }
  function copyChanges() {
    S.err = ''; const t = changesText();
    if (!t) { S.status = 'No changes yet'; return render(); }
    S.showText = true; S.copied = null; render();
    const done = ok => { S.copied = ok; render(); };
    try { navigator.clipboard.writeText(t).then(() => done(true), () => done(false)); } catch (e) { done(false); }
  }

  /* ---------- details for the inspector ---------- */
  function buildTokenMap() {
    S.tok = new Map(); const names = [];
    const walk = rules => { for (const r of rules) { if (r.style) for (let i = 0; i < r.style.length; i++) { const p = r.style[i]; if (p.startsWith('--') && !p.startsWith('--k') && !names.includes(p)) names.push(p); } if (r.cssRules) walk(r.cssRules); } };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch (e) { } }
    const wrap = h('span', { style: 'position:absolute;visibility:hidden;color:rgb(1, 2, 3)' }), probe = h('i');
    wrap.append(probe); scr().append(wrap);
    names.forEach(n => { probe.style.color = ''; probe.style.color = `var(${n})`; const c = getComputedStyle(probe).color; if (c && c !== 'rgb(1, 2, 3)' && !S.tok.has(c)) S.tok.set(c, n); });
    wrap.remove();
  }
  function rgba(c) { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
  function lum(c) { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
  function bgOf(el) { let e = el; while (e && e !== scr().parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c && c.a >= 0.5) return { c, el: e }; e = e.parentElement; } return { c: S.look ? { r: 0, g: 0, b: 0, a: 1 } : { r: 242, g: 242, b: 247, a: 1 }, el: null }; }
  function info(el) {
    const cs = getComputedStyle(el), out = {};
    const fs = parseFloat(cs.fontSize), fw = parseInt(cs.fontWeight, 10) || 400;
    const hasText = (el.textContent || '').trim().length > 0;
    if (hasText) { let name = STY[Math.round(fs)]; if (Math.round(fs) === 17 && fw >= 600) name = 'Headline'; const wn = fw >= 700 ? 'Bold' : fw >= 600 ? 'Semibold' : fw >= 500 ? 'Medium' : 'Regular'; out.text = { label: `${name || fmt(fs) + ' pt'} · ${wn}`, ok: !!name }; }
    const col = cs.color, c = rgba(col), bg = bgOf(el);
    if (hasText && c) {
      const fg = { r: c.r * c.a + bg.c.r * (1 - c.a), g: c.g * c.a + bg.c.g * (1 - c.a), b: c.b * c.a + bg.c.b * (1 - c.a) };
      const L1 = lum(fg), L2 = lum(bg.c), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const large = fs >= 24 || (fs >= 18.66 && fw >= 700);
      out.color = { tok: S.tok.get(col) || col.replace(/\s/g, ''), swatch: col, ratio, ok: ratio >= (large ? 3 : 4.5) };
    }
    const bgc = cs.backgroundColor; const bc = rgba(bgc);
    if (bc && bc.a > 0) out.bg = { tok: S.tok.get(bgc) || bgc.replace(/\s/g, ''), swatch: bgc };
    const tag = el.tagName.toLowerCase(), role = el.getAttribute('role');
    const interactive = /^(button|a|input|select|textarea)$/.test(tag) || /^(button|tab|link|switch|checkbox)$/.test(role || '') || el.hasAttribute('onclick');
    const roleName = role === 'tab' ? 'tab' : (tag === 'button' || role === 'button') ? 'button' : tag === 'a' ? 'link' : /^h[1-6]$/.test(tag) || role === 'heading' ? 'heading' : /^(input|textarea)$/.test(tag) ? 'text field' : (tag === 'img' || tag === 'svg') ? 'image' : '';
    const label = (el.getAttribute('aria-label') || (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ')).slice(0, 60);
    const state = el.getAttribute('aria-selected') === 'true' || el.getAttribute('aria-pressed') === 'true' || el.getAttribute('aria-current') ? 'selected' : '';
    if (label || roleName) out.vo = '"' + [label || '(no label)', roleName, state].filter(Boolean).join(', ') + '"';
    if (interactive) { const r = rectOf(el); out.tap = { label: `${fmt(r.w)} × ${fmt(r.h)}`, ok: r.w >= 43.5 && r.h >= 43.5 }; }
    const n = p => fmt(parseFloat(cs[p]) || 0);
    out.box = { m: `${n('marginTop')} ${n('marginRight')} ${n('marginBottom')} ${n('marginLeft')}`, p: `${n('paddingTop')} ${n('paddingRight')} ${n('paddingBottom')} ${n('paddingLeft')}` };
    return out;
  }

  /* ---------- inspector ---------- */
  function renderLive() {
    const sel = liveSel(), f = S.el.insp.querySelector('.kit-fields'); if (!f || !sel.length) return;
    const b = bounds(sel), vals = { x: b.x, y: b.y, w: b.w, h: b.h };
    f.querySelectorAll('input').forEach(i => { if (vals[i.dataset.kf] != null && document.activeElement !== i) i.value = fmt(vals[i.dataset.kf]); });
  }
  function render() {
    if (TIP.cur && !TIP.cur.isConnected) tipHide(true);
    renderInsp(); drawRulers(); drawOv();
  }
  function renderInsp() {
    const I = S.el.insp, act = document.activeElement, keep = act && I.contains(act) && act.dataset && act.dataset.kf ? { kf: act.dataset.kf, v: act.value, a: act.selectionStart, b: act.selectionEnd } : null;
    I.textContent = '';
    if (!S.inspect) return;
    I.classList.toggle('shut', S.phone && S.inspShut);
    I.append(h('button', { type: 'button', class: 'kit-ihd', 'aria-expanded': String(!S.inspShut), onclick: () => { S.inspShut = !S.inspShut; render(); } }, 'Inspector', h('span', { class: 'kit-hint' }, S.inspShut ? 'Show' : 'Hide')));
    const top = (stack, word, fn, ic) => { const last = stack.length ? stack[stack.length - 1].name : ''; return h('button', { type: 'button', class: 'kit-ib' + (stack.length ? '' : ' no'), onclick: fn, 'data-tip': `${last ? word + ' ' + last : word}|${last ? (word === 'Undo' ? 'Takes back the last step' : 'Puts the step back') : 'Nothing to ' + word.toLowerCase() + ' yet'}|${word === 'Undo' ? '⌘Z' : '⇧⌘Z'}` }, icon(ic), last ? `${word} ${last}` : word); };
    I.append(h('div', { class: 'kit-ih' }, top(S.undo, 'Undo', undo, 'undo'), top(S.redo, 'Redo', redo, 'redo')));
    if (S.viewing >= 0) I.append(h('div', { class: 'kit-ver' }, h('div', null, 'Viewing ', h('b', null, `“${S.versions[S.viewing].name}”`), ' · read-only'), h('div', { class: 'kit-ih', style: 'margin-top:6px' },
      h('button', { type: 'button', class: 'kit-ib pri', onclick: makeDraft, 'data-tip': 'Make this the draft|Copies this version into the draft. Undo puts the old draft back|' }, 'Make this the draft'),
      h('button', { type: 'button', class: 'kit-ib', onclick: () => setViewing(-1), 'data-tip': 'Back to draft|Carry on editing where you left off|' }, 'Back to draft'))));
    const sel = liveSel(), us = units();
    const secSel = h('div', { class: 'kit-sec' });
    if (!sel.length) secSel.append(h('div', { class: 'kit-hint' }, 'Tap anything on the screen to inspect it. Tap outside the phone to deselect. Shift-click, or turn on Select several, to pick more: the first one you pick is the key object the others line up to. ⌘-click picks the smallest part.'));
    else {
      const el = sel[0];
      if (sel.length === 1) {
        const crumbs = []; let e = el;
        while (e && e !== S.root) { if (e === el || e.hasAttribute('data-name')) crumbs.unshift(e); e = e.parentElement; }
        const cr = h('div', { class: 'kit-crumbs' });
        crumbs.forEach((c, i) => { if (i) cr.append(h('span', null, '›')); cr.append(h('button', { type: 'button', class: c === el ? 'cur' : '', onclick: () => { S.sel = [c]; S.key = null; render(); } }, nameOf(c))); });
        if (el.firstElementChild) { cr.append(h('span', null, '›')); cr.append(h('button', { type: 'button', onclick: () => { S.sel = [el.firstElementChild]; render(); } }, 'inside')); }
        secSel.append(cr);
      }
      const title = us.length === 1 ? (us[0].length > 1 ? `Group of ${us[0].length}` : nameOf(el)) : `${us.length} picked`;
      secSel.append(h('div', { class: 'kit-name' }, title, S.key && us.length > 1 ? h('span', { class: 'kit-hint' }, ` · key object: ${nameOf(S.key)}`) : ''));
      const nLocked = sel.filter(isLocked).length;
      if (nLocked) secSel.append(h('div', { class: 'kit-hint', style: 'margin:-4px 0 8px' }, (sel.length === 1 ? 'Locked' : `${nLocked} of ${sel.length} locked`) + ' · double-click to unlock'));
      const b = bounds(sel), single = sel.length === 1;
      const field = (k, lab, v) => h('label', null, lab, h('input', { type: 'text', inputmode: 'decimal', 'data-kf': k, value: fmt(v), 'aria-label': lab, onchange: ev => applyField(k, ev.target.value), onkeydown: ev => { if (ev.key === 'Enter') { ev.preventDefault(); ev.target.blur(); } } }));
      const fields = h('div', { class: 'kit-fields' }, field('x', 'Left', b.x), field('y', 'Top', b.y));
      if (single) fields.append(field('w', 'Width', b.w), field('h', 'Height', b.h), field('r', 'Corners', radiusOf(el)));
      secSel.append(fields);
      const pe = single ? peek(el) : null;
      const moved = sel.reduce((a, s) => { const e = peek(s); return a || (e && (e.dx || e.dy)); }, false);
      if (us.length === 1 && single && (peek(el) || {}).dup) { const e = peek(el), se = S.model.edits[e.dup.of] || {}, ox = (e.dx || 0) - (se.dx || 0), oy = (e.dy || 0) - (se.dy || 0), mv = []; if (ox) mv.push((ox > 0 ? 'right ' : 'left ') + fmt(Math.abs(ox))); if (oy) mv.push((oy > 0 ? 'down ' : 'up ') + fmt(Math.abs(oy))); secSel.append(h('div', { class: 'kit-hint', style: 'margin-top:6px;color:var(--k-acc)' }, `A copy of ${e.dup.ofName}` + (mv.length ? `, ${mv.join(', ')} from it` : ', on top of it') + '. Delete removes it.')); }
      else if (moved && us.length === 1) { const e = peek(el) || {}; const mv = []; if (e.dx) mv.push((e.dx > 0 ? 'right ' : 'left ') + fmt(Math.abs(e.dx))); if (e.dy) mv.push((e.dy > 0 ? 'down ' : 'up ') + fmt(Math.abs(e.dy))); if (mv.length) secSel.append(h('div', { class: 'kit-hint', style: 'margin-top:6px;color:var(--k-acc)' }, 'Moved ' + mv.join(', '))); }
      if (single) {
        const inf = info(el), rows = h('div', { style: 'margin-top:8px' });
        rows.append(h('div', { class: 'kit-boxd', 'aria-label': 'Box sizes' }, 'margin ' + inf.box.m, h('div', { class: 'p' }, 'padding ' + inf.box.p, h('div', { class: 'c' }, `${fmt(b.w)} × ${fmt(b.h)}`))));
        const row = (k, ...v) => h('div', { class: 'kit-row' }, h('span', { class: 'k' }, k), h('span', { class: 'v' }, ...v));
        const tick = ok => h('span', { class: ok ? 'kit-ok' : 'kit-bad', 'aria-label': ok ? 'passes' : 'check this' }, ok ? ' ✓' : ' ✕');
        const sw = c => h('span', { style: `display:inline-block;width:11px;height:11px;border-radius:3px;vertical-align:-1px;margin-right:5px;border:1px solid var(--k-line);background:${c}` });
        if (inf.text) rows.append(row('Text', inf.text.label, tick(inf.text.ok), inf.text.ok ? '' : h('span', { class: 'kit-hint' }, " not on Apple's scale")));
        if (inf.color) rows.append(row('Colour', sw(inf.color.swatch), inf.color.tok, h('span', { class: 'kit-hint' }, ` · ${inf.color.ratio.toFixed(1)}:1`), tick(inf.color.ok)));
        if (inf.bg) rows.append(row('Fill', sw(inf.bg.swatch), inf.bg.tok));
        if (inf.vo) rows.append(row('VoiceOver', inf.vo, h('span', { class: 'kit-hint' }, ' (roughly)')));
        if (inf.tap) rows.append(row('Tap area', inf.tap.label, tick(inf.tap.ok), inf.tap.ok ? '' : h('span', { class: 'kit-hint' }, ' under 44')));
        secSel.append(rows);
        secSel.append(h('div', { class: 'kit-sh', style: 'margin-top:10px' }, 'Note'));
        secSel.append(h('textarea', { class: 'kit-note', 'data-kf': 'note', placeholder: 'Something to change that isn’t a move, like “make this bolder”', 'aria-label': 'Note for ' + nameOf(el), onchange: ev => { if (S.viewing >= 0) { S.err = RO; return render(); } if (S.original) { S.err = 'Turn off Show original to make changes'; return render(); } const v = ev.target.value.slice(0, 500); commit('Note', () => { E(el).note = v; }); } }, pe && pe.note ? pe.note : ''));
      }
    }
    I.append(secSel);

    const ar = h('div', { class: 'kit-sec' }, h('div', { class: 'kit-sh' }, 'Arrange'));
    const ADESC = { l: 'left edge', c: 'centre, side to side', r: 'right edge', t: 'top', m: 'middle, top to bottom', b: 'bottom' };
    const tgtWord = { key: 'the key object', selection: 'the outer edge of everything picked', parent: 'the parent', screen: 'the screen margins' }[S.alignTo];
    const abtn = k => h('button', { type: 'button', class: 'kit-ic', 'aria-label': AN[k], 'data-tip': `${AN[k]}|Lines up with ${tgtWord}'s ${ADESC[k]}|`, onclick: () => align(k) }, icon(k));
    ar.append(h('div', { class: 'kit-ih' }, ['l', 'c', 'r', 't', 'm', 'b'].map(abtn)));
    ar.append(h('div', { class: 'kit-ih', style: 'margin-top:6px' },
      h('button', { type: 'button', class: 'kit-ic', 'aria-label': 'Space out across', 'data-tip': 'Space out across|Even gaps side to side, or the gap you type|', onclick: () => distribute('x') }, icon('dx')),
      h('button', { type: 'button', class: 'kit-ic', 'aria-label': 'Space out down', 'data-tip': 'Space out down|Even gaps top to bottom, or the gap you type|', onclick: () => distribute('y') }, icon('dy')),
      h('label', { class: 'kit-gap' }, 'Gap', h('input', { type: 'text', inputmode: 'decimal', placeholder: 'even', 'data-kf': 'gap', value: S.gapVal || '', oninput: ev => { S.gapVal = ev.target.value; S.err = ''; } }))));
    ar.append(h('div', { class: 'kit-gl' }, 'Line up with'));
    ar.append(h('div', { class: 'kit-seg', role: 'group', 'aria-label': 'Line up with' }, [['key', 'Key object'], ['selection', 'Selection'], ['parent', 'Parent'], ['screen', 'Screen']].map(([v, l]) => h('button', { type: 'button', class: S.alignTo === v ? 'on' : '', 'aria-pressed': String(S.alignTo === v), onclick: () => { S.alignTo = v; S.err = ''; render(); } }, l))));
    const oneGroup = us.length === 1 && us[0].length > 1;
    ar.append(h('div', { class: 'kit-ih', style: 'margin-top:8px' },
      h('button', { type: 'button', class: 'kit-ib' + (S.lastTx ? '' : ' no'), onclick: transformAgain, 'data-tip': S.lastTx ? `Repeat|${S.lastTx.dup ? 'Makes another copy' : 'Moves the picked parts again'}, ${txWords(S.lastTx)}|⌘D` : 'Repeat|Repeats your last move or copy. Move something, or Option-drag a copy, first|⌘D' }, S.lastTx ? `Repeat ${S.lastTx.dup ? 'copy' : 'move'}` : 'Repeat'),
      S.userGuides.length ? h('button', { type: 'button', class: 'kit-ib', onclick: () => { S.userGuides = []; saveGuides(); S.status = 'Guides cleared'; render(); }, 'data-tip': 'Clear guides|Removes every guide. Dragging one back onto its ruler removes just that one|' }, `Clear guides · ${S.userGuides.length}`) : ''));
    ar.append(h('div', { class: 'kit-ih', style: 'margin-top:8px' },
      h('button', { type: 'button', class: 'kit-ib' + (S.multi ? ' on' : ''), 'aria-pressed': String(S.multi), onclick: () => { S.multi = !S.multi; render(); }, 'data-tip': 'Select several|Taps add or remove boxes instead of starting again. The first one is the key object|Shift-click' }, 'Select several'),
      h('button', { type: 'button', class: 'kit-ib', onclick: () => oneGroup ? ungroup() : group(), 'data-tip': oneGroup ? 'Ungroup|The boxes move on their own again|⇧⌘G' : 'Group|Picked boxes move and line up as one|⌘G' }, oneGroup ? 'Ungroup' : 'Group'),
      (() => { const allL = sel.length && sel.every(isLocked); return h('button', { type: 'button', class: 'kit-ib', onclick: toggleLock, 'data-tip': allL ? 'Unlock|Lets the picked boxes move again. Double-clicking a locked box does the same|⇧⌘L' : "Lock|Picked boxes can't be moved, nudged or aligned. Double-click one to unlock it|⇧⌘L" }, allL ? 'Unlock' : 'Lock'); })(),
      h('button', { type: 'button', class: 'kit-ib' + (S.snap ? ' on' : ''), 'aria-pressed': String(S.snap), onclick: () => { S.snap = !S.snap; render(); }, 'data-tip': 'Smart snapping|Dragged boxes click into line with edges, centres, margins and 16-point gaps. Hold ⌘ to drag freely|' }, 'Smart snapping')));
    I.append(ar);

    const list = changeList(), ch = h('div', { class: 'kit-sec' }, h('div', { class: 'kit-sh' }, `Changes · ${list.length}`));
    ch.append(h('div', { class: 'kit-ih' },
      h('button', { type: 'button', class: 'kit-ib pri', onclick: copyChanges, 'data-tip': 'Copy changes|A numbered list to paste into the chat, so every change is made in one go|' }, S.copied === true ? 'Copied' : 'Copy changes'),
      h('button', { type: 'button', class: 'kit-ib' + (S.original ? ' on' : ''), 'aria-pressed': String(S.original), onclick: () => { S.original = !S.original; applyAll(); render(); }, 'data-tip': 'Show original|Before and after: hides your changes until you turn it off|' }, 'Show original'),
      S.viewing < 0 ? h('button', { type: 'button', class: 'kit-ib', onclick: () => { S.saving = true; S.err = ''; render(); const i = S.el.insp.querySelector('[data-kf="vname"]'); i && i.focus(); }, 'data-tip': 'Save as version|Keeps this set of changes under a name, so you can flick back to it|' }, 'Save as version') : '',
      S.viewing < 0 ? h('button', { type: 'button', class: 'kit-ib', onclick: () => { if (!Object.keys(S.model.edits).length) { S.status = 'No changes yet'; return render(); } commit('Clear changes', () => { S.model.edits = {}; }); }, 'data-tip': 'Clear|Removes every change from the draft. Undo brings them back|' }, 'Clear') : ''));
    if (S.saving && S.viewing < 0) {
      const inp = h('input', { type: 'text', 'data-kf': 'vname', placeholder: 'Name it, like Tighter rows', 'aria-label': 'Version name', maxlength: '24', onkeydown: ev => { if (ev.key === 'Enter') { ev.preventDefault(); saveVersion(ev.target.value); } if (ev.key === 'Escape') { S.saving = false; render(); } }, oninput: () => { if (S.err) { S.err = ''; const m = S.el.insp.querySelector('.kit-msg'); if (m) m.textContent = ''; } } });
      ch.append(h('div', { class: 'kit-vform' }, inp, h('button', { type: 'button', class: 'kit-ib pri', onclick: () => saveVersion(inp.value) }, 'Save'), h('button', { type: 'button', class: 'kit-ib', onclick: () => { S.saving = false; render(); } }, 'Cancel')));
    }
    if (S.versions.length) ch.append(h('div', { class: 'kit-hint', style: 'margin-top:6px' }, `${S.versions.length} saved ${S.versions.length > 1 ? 'versions' : 'version'}. Flick between them under Version in the controls.`));
    if (S.original) ch.append(h('div', { class: 'kit-hint', style: 'margin-top:6px' }, 'Showing the original. Your changes are kept; turn this off to see them again.'));
    if (S.showText) {
      const t = changesText();
      if (t) {
        const ta = h('textarea', { class: 'kit-txtout', readonly: true, 'aria-label': 'Changes to paste into the chat', onfocus: ev => ev.target.select() }, t);
        ch.append(ta);
        ch.append(h('div', { class: 'kit-hint' }, S.copied === false ? 'Copying is blocked here. Tap the box, select all, then copy.' : 'Paste this into the chat.'));
      }
    }
    I.append(ch);

    const named = [...S.root.querySelectorAll('[data-name]')];
    const nums = new Map(); list.forEach((c, i) => c.el && nums.set(c.el, i + 1));
    const det = h('details', { class: 'kit-sec' }, h('summary', { class: 'kit-sh', style: 'cursor:pointer' }, `Outline · ${named.length}`));
    const ul = h('ul', { class: 'kit-out' });
    named.forEach(n => {
      let depth = 0, p = n.parentElement; while (p && p !== S.root) { if (p.hasAttribute('data-name')) depth++; p = p.parentElement; }
      ul.append(h('li', null, h('button', { type: 'button', class: sel.includes(n) ? 'cur' : '', style: `padding-left:${4 + depth * 12}px`, onclick: () => { S.sel = members(n); S.key = null; render(); } }, nums.has(n) ? h('span', { class: 'kit-pin' }, nums.get(n)) : '', n.getAttribute('data-name'))));
    });
    det.append(ul); if (S.outlineOpen) det.open = true;
    det.addEventListener('toggle', () => { S.outlineOpen = det.open; });
    I.append(det);
    I.append(h('div', { class: 'kit-msg ' + (S.err ? 'err' : 'st'), role: 'status', 'aria-live': 'polite' }, S.err || S.status));
    I.append(h('div', { class: 'kit-hint', style: 'margin-top:4px' }, 'Click outside the phone, or press Esc or ⇧⌘A, to deselect. Arrows nudge by 1, Shift + arrows by 10. Shift while dragging moves straight across or down; Option drags a copy; ⌘ skips snapping; ⌘D repeats. Delete removes a copy. Drag from a ruler for a guide. Rest the pointer on a button for a tip. ' + (SYNC.state === 'ok' ? 'Changes and notes are kept on this page, where Claude can read them; versions stay on this device.' : 'Changes and versions are kept on this device.')));
    if (keep) { const n = I.querySelector(`[data-kf="${keep.kf}"]`); if (n) { n.value = keep.v; n.focus({ preventScroll: true }); try { n.setSelectionRange(keep.a, keep.b); } catch (e) { } } }
  }

  /* ---------- versions and locking ---------- */
  function setViewing(i) {
    if (i === S.viewing || i >= S.versions.length) return;
    if (S.viewing < 0 && i >= 0) S.draftModel = S.model;
    S.model = i >= 0 ? JSON.parse(JSON.stringify(S.versions[i].model)) : S.draftModel;
    if (i < 0) S.draftModel = null;
    S.viewing = i; S.sel = []; S.key = null; S.err = ''; S.saving = false; S.showText = false; S.copied = null;
    S.status = i >= 0 ? `Viewing “${S.versions[i].name}”. It can't be changed.` : '';
    tween(applyAll); renderPanel(); render(); fire();
    if (i < 0) pushSoon();
  }
  function saveVersion(name) {
    S.err = ''; const n = String(name || '').trim();
    if (S.viewing >= 0) { S.err = 'Go back to Draft to save a version'; return render(); }
    if (!n) { S.err = 'Give the version a name first'; return render(); }
    if (S.versions.some(v => v.name.toLowerCase() === n.toLowerCase())) { S.err = 'There is already a version with that name'; return render(); }
    if (S.versions.length >= 30) { S.err = 'That’s 30 versions, the most the kit keeps'; return render(); }
    S.versions.push({ name: n.slice(0, 24), model: JSON.parse(JSON.stringify(S.model)) });
    saveVersions(); S.saving = false; S.status = `Saved “${n.slice(0, 24)}”. Keep editing the draft, or pick it under Version to look back.`;
    renderPanel(); render(); fire(); return true;
  }
  function makeDraft() {
    if (S.viewing < 0) return; const v = S.versions[S.viewing];
    setViewing(-1);
    tween(() => commit('Restore version', () => { S.model.edits = JSON.parse(JSON.stringify(v.model.edits)); }));
    S.status = `The draft now matches “${v.name}”. Undo puts it back.`; render();
  }
  function toggleLock() {
    S.err = ''; S.status = ''; if (!needSel()) return;
    const sel = liveSel(), all = sel.every(isLocked);
    commit(all ? 'Unlock' : 'Lock', () => sel.forEach(el => { if (all) { const e = peek(el); if (e) delete e.lock; } else E(el).lock = true; }));
    S.status = all ? 'Unlocked' : 'Locked. You can still pick and inspect it, but not move it.'; render();
  }
  function unlockByDouble(t) {
    if (S.viewing >= 0) { S.err = RO; return; }
    const mem = members(t);
    commit('Unlock', () => mem.forEach(m => { const e = peek(m); if (e) delete e.lock; }));
    S.status = 'Unlocked ' + nameOf(t);
  }

  /* ---------- hover tips (mouse and trackpad only) ---------- */
  const TIP = { el: null, timer: 0, warm: 0, cur: null };
  function tipEl() { if (!TIP.el) { TIP.el = h('div', { class: 'kit-tip', role: 'tooltip' }); document.body.append(TIP.el); } return TIP.el; }
  function tipShow(target, parts, rect) {
    const el = tipEl(); el.textContent = '';
    el.append(h('b', null, parts[0]));
    if (parts[2]) el.append(h('span', { class: 'kit-tip-k' }, parts[2]));
    if (parts[1]) el.append(h('span', { class: 'kit-tip-d' }, parts[1]));
    el.style.left = '0px'; el.style.top = '0px'; el.classList.add('on');
    const tw = el.offsetWidth, th = el.offsetHeight;
    let x = rect.left + rect.width / 2 - tw / 2; x = Math.max(6, Math.min(x, window.innerWidth - tw - 6));
    let y = rect.bottom + 6; if (y + th > window.innerHeight - 6) y = Math.max(6, rect.top - th - 6);
    el.style.left = x + 'px'; el.style.top = y + 'px'; TIP.cur = target;
  }
  function tipSchedule(target, parts, rect) {
    clearTimeout(TIP.timer);
    const warm = TIP.cur || Date.now() < TIP.warm;
    TIP.timer = setTimeout(() => { if (target.isConnected && (target.matches(':hover') || target === S.hover || (S.root.contains(target) && S.el.layer.matches(':hover')))) tipShow(target, parts(), rect()); }, warm ? 0 : 600);
  }
  function tipHide(hard) { clearTimeout(TIP.timer); if (TIP.el) TIP.el.classList.remove('on'); if (TIP.cur && !hard) TIP.warm = Date.now() + 1200; if (hard) TIP.warm = 0; TIP.cur = null; }
  function bindTips() {
    document.addEventListener('pointerover', ev => {
      if (ev.pointerType !== 'mouse') return;
      const t = ev.target.closest && ev.target.closest('[data-tip]');
      if (!t || t === TIP.cur) return;
      tipSchedule(t, () => t.getAttribute('data-tip').split('|'), () => t.getBoundingClientRect());
    });
    document.addEventListener('pointerout', ev => {
      const t = ev.target.closest && ev.target.closest('[data-tip]');
      if (t && !(ev.relatedTarget && t.contains(ev.relatedTarget))) tipHide(false);
    });
    document.addEventListener('pointerdown', () => tipHide(true), true);
    document.addEventListener('pointermove', ev => { if (ev.pointerType !== 'mouse' || !TIP.cur) return; const c = TIP.cur; const over = S.root.contains(c) ? S.hover === c || (S.skel && S.el.layer.matches(':hover') && pick(hit(ev.clientX, ev.clientY), false) === c) : (c.isConnected && c.matches(':hover')); if (!over) tipHide(false); }, { passive: true });
    window.addEventListener('scroll', () => tipHide(true), true);
  }
  function boxTip(el) {
    if (!el) return tipHide(false);
    tipSchedule(el, () => {
      const r = rectOf(el), bits = [`${fmt(r.w)} × ${fmt(r.h)}`];
      const multi = units().length > 1;
      if (multi && S.key && members(S.key).includes(el)) bits.push('key object: the others line up to this');
      else if (multi && liveSel().includes(el)) bits.push('will move when you align');
      if (isLocked(el)) bits.push('locked, double-click to unlock');
      const e = peek(el); if (e && e.note) bits.push('note: ' + e.note.slice(0, 40));
      return [nameOf(el), bits.join(' · '), ''];
    }, () => el.getBoundingClientRect());
  }

  function deselect() { if (!liveSel().length && !S.hover) return; S.sel = []; S.key = null; S.hover = null; S.err = ''; S.status = ''; tipHide(true); render(); }
  function bindOutside() {
    // A click on the empty background or the phone's bezel clears the selection; the panel, inspector and dock keep it.
    document.addEventListener('pointerdown', ev => {
      if (!S.inspect || ev.button > 0) return;
      const t = ev.target;
      if (!t || !t.closest || S.el.screen.contains(t)) return;
      if (t.closest('.kit-panel, .kit-insp, .kit-dock, .kit-tip')) return;
      if (t.closest('.kit-stage') || t === document.body || t === document.documentElement) deselect();
    });
  }

  /* ---------- keyboard ---------- */
  function bindKeys() {
    document.addEventListener('keydown', ev => {
      const tg = ev.target, typing = tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable);
      const mod = ev.metaKey || ev.ctrlKey, k = (ev.key || '').toLowerCase();
      if (!typing && !mod && !ev.altKey && k === 'i') { ev.preventDefault(); return setInspect(!S.inspect); }
      if (!S.inspect) return;
      if (mod && k === 'z' && !typing) { ev.preventDefault(); return ev.shiftKey ? redo() : undo(); }
      if (typing) return;
      if (mod && ev.shiftKey && k === 'l') { ev.preventDefault(); return toggleLock(); }
      if (mod && !ev.shiftKey && k === 'd') { ev.preventDefault(); return transformAgain(); }
      if (mod && k === 'g') { ev.preventDefault(); return ev.shiftKey ? ungroup() : group(); }
      if (ev.key === 'Escape' || (mod && ev.shiftKey && k === 'a')) { ev.preventDefault(); return deselect(); }
      if ((ev.key === 'Backspace' || ev.key === 'Delete') && liveSel().length) { ev.preventDefault(); return removeCopies(); }
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
      if (!d || !liveSel().length) return;
      ev.preventDefault(); const n = ev.shiftKey ? 10 : 1; nudge(d[0] * n, d[1] * n);
    });
  }

  /* ---------- start ---------- */
  function start(opts) {
    S.opts = Object.assign({ app: '', id: location.pathname + location.search, root: '#app', controls: [], mac: false, launcher: 'circle', gaps: [16], margin: 16, title: '', screen: '', version: '', real: null, store: true }, opts || {});
    const root = typeof S.opts.root === 'string' ? document.querySelector(S.opts.root) : S.opts.root;
    if (!root) throw new Error('Kit: root not found');
    S.root = root; S.launcher = S.opts.launcher; S.lsKey = 'kit:' + S.opts.id;
    S.opts.controls.forEach(c => { S.custom[c.name] = c.value || 0; });
    document.body.classList.add('kit');
    const el = S.el;
    el.launcher = h('button', { type: 'button', 'aria-label': 'Open prototype controls', 'data-tip': 'Prototype controls|Device, look, motion, view and this prototype’s own states|', onclick: () => setOpen(true) });
    el.panel = h('div', { class: 'kit-panel', role: 'region', 'aria-label': 'Prototype controls' });
    el.inspBtn = h('button', { type: 'button', 'aria-label': 'Inspect', onclick: () => setInspect(!S.inspect), 'data-tip': 'Inspect|Taps pick parts to inspect and adjust. Turn off to use the prototype normally|I' });
    el.dock = h('div', { class: 'kit-dock' }, el.launcher, el.inspBtn);
    el.rt = sv('svg', { class: 'kit-ruler', 'aria-hidden': 'true' }); el.rl = sv('svg', { class: 'kit-ruler', 'aria-hidden': 'true' });
    el.screen = h('div', { class: 'kit-screen is-iphone' });
    el.layer = h('div', { class: 'kit-layer', 'aria-hidden': 'true' });
    el.ov = sv('svg', { class: 'kit-ov', 'aria-hidden': 'true' });
    el.realImg = h('img', { class: 'kit-real', alt: '', 'aria-hidden': 'true', draggable: 'false' });
    el.realSide = h('div', { class: 'kit-real-side', 'aria-label': 'The real app' }, h('div', null, h('img', { alt: 'The real app, from the Atlas', draggable: 'false' })), h('span', null, 'Real app'));
    el.device = h('div', { class: 'kit-device' }, el.screen);
    el.box = h('div', { class: 'kit-box' }, el.device, el.realSide);
    el.insp = h('aside', { class: 'kit-insp', 'aria-label': 'Inspector' });
    root.classList.add('kit-root');
    el.screen.append(root, el.realImg, el.ov, el.layer);
    const canvas = h('div', { class: 'kit-canvas' }, el.rt, el.rl, el.box);
    document.body.append(h('div', { class: 'kit-stage' }, el.dock, el.panel, canvas, el.insp));
    S.open = !(window.innerWidth <= 600);
    try { const g = JSON.parse((store && store.getItem('kit:' + S.opts.id + ':guides')) || '[]'); if (Array.isArray(g)) S.userGuides = g.filter(x => x && (x.a === 'x' || x.a === 'y') && Number.isFinite(x.v)).slice(0, 40); } catch (e) { }
    load(); try { SYNC.t = +((store && store.getItem(S.lsKey + ':t')) || 0) || 0; } catch (e) { }
    if (S.opts.real) S.real = typeof S.opts.real === 'string' ? { iphone: S.opts.real } : Object.assign({}, S.opts.real);
    try { const pr = store && JSON.parse(store.getItem('kit:prefs') || '{}'); if (pr && typeof pr.inspect === 'boolean') S.inspect = pr.inspect; if (pr && [0, 1, 2].includes(pr.onion)) S.onion = pr.onion; if (pr && [1, 2].includes(pr.onionDepth)) S.onionDepth = pr.onionDepth; } catch (e) { }
    document.body.classList.toggle('kit-edit', S.inspect);
    applyLook(); applyMotion(); bindLayer(); bindKeys(); bindTips(); bindOutside(); bindGuides();
    renderPanel(); layout(); applyAll(); render();
    if (S.opts.store !== false) connectStore();
    try { document.fonts && document.fonts.ready.then(() => { applyAll(); schedule(); }); } catch (e) { }
    let rz = 0; window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { layout(); renderPanel(); render(); }); });
    let mt = 0; new MutationObserver(() => { clearTimeout(mt); mt = setTimeout(() => { if (S.skel) markText(); applyAll(); schedule(); }, 30); }).observe(root, { childList: true, subtree: true });
    return api;
  }

  const api = {
    version: VERSION,
    notes: () => [...noteRecords().entries()].map(([id, r]) => Object.assign({ id }, r)),
    store: () => ({ state: SYNC.state, code: SYNC.code || null, notes: [...SYNC.notes.keys()], t: SYNC.t }),
    real(src, mode) { if (src !== undefined) setReal(src); if (mode != null) { S.realMode = mode; layout(); applyReal(); renderPanel(); render(); } return { mode: S.realMode, src: realSrc() }; },
    push: () => { clearTimeout(SYNC.timer); return push(); },
    start,
    get: () => ({ device: S.device, look: S.look, motion: S.motion, inspect: S.inspect, skeleton: S.skel, custom: Object.assign({}, S.custom) }),
    set(name, i) { const g = groups().find(x => x.name === name); if (!g) throw new Error('Kit: no control called ' + name); g.set(i); renderPanel(); fire(); },
    groups: () => groups().map(g => ({ name: g.name, options: g.options.slice() })),
    select(q) { const list = (Array.isArray(q) ? q : [q]).map(x => typeof x === 'string' ? S.root.querySelector('[data-name="' + CSS.escape(x) + '"]') : x).filter(Boolean); S.sel = list; S.key = null; render(); return list.length; },
    open: v => setOpen(v !== false),
    setLauncher(shape) { S.launcher = shape; renderLauncher(); renderPanel(); },
    changesText, undo, redo, align, distribute, group, ungroup, nudge, field: applyField,
    setAlignTo(v) { S.alignTo = v; render(); },
    inspect: v => setInspect(v !== false), deselect, removeCopies, again: transformAgain, clearGuides() { S.userGuides = []; saveGuides(); render(); }, onion(i, depth) { S.onion = i; if (depth) S.onionDepth = depth; savePrefs(); renderPanel(); render(); }, note(text) { const sel = liveSel(); if (sel.length !== 1) return false; commit('Note', () => { E(sel[0]).note = String(text); }); return true; },
    lock: toggleLock, saveVersion, view: setViewing, makeDraft, versions: () => S.versions.map(v => v.name),
    tap(name, shift) { const el = S.root.querySelector('[data-name="' + CSS.escape(name) + '"]'); if (!el) return false; tapSelect({ target: el, shift: !!shift, deep: false }); render(); return true; },
    setGap(v) { S.gapVal = String(v); },
    clear() { commit('Clear changes', () => { S.model.edits = {}; }); },
    original(v) { S.original = !!v; applyAll(); applyReal(); render(); },
    refresh() { applyAll(); render(); },
    k: () => (S.motion === 1 ? 4 : 1),
    reduced: () => S.motion === 2,
    state: () => ({ guides: S.userGuides.map(g => g.a + ' ' + g.v), lastTx: S.lastTx, onion: S.onion, tweening: S.tweening, key: S.key ? nameOf(S.key) : null, viewing: S.viewing, edits: JSON.parse(JSON.stringify(S.model.edits)), undo: S.undo.map(u => u.name), redo: S.redo.map(u => u.name), sel: liveSel().map(nameOf), scale: S.scale, phone: S.phone, open: S.open })
  };
  window.Kit = api;
})();
