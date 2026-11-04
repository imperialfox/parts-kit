/* Parts kit 1.0.0 · one set of Liquid Glass parts for any app or prototype. MIT licence.
   Numbers from sdegenaar/liquid_glass_widgets (MIT), measured against iOS where marked.

   Use: load parts-kit.css and this file, then your settings file:  Parts.settings({ app: 'My app', … })
   Parts are plain HTML with pk- classes, so screens drawn as HTML text work: the kit listens on the document and finds
   the part under the finger. Overlays (sheets, menus, alerts, toasts) are made by calls: Parts.sheet({…}), Parts.menu(…).
   Every part sends pk: events (pk:change, pk:hold, pk:reorder, pk:close …) that bubble, so the app can listen once.
   README.md lists every part, setting and call. */
(function () {
  'use strict';
  if (window.Parts && window.Parts.version) return;
  const VERSION = '1.0.0';
  const doc = document;
  const html = doc.documentElement;

  /* ============================================================================================================
     NUMBERS · gestures and geometry. Timings live in parts-kit.css as named values (--dur-…); these are the
     rest. (M) = measured against iOS by the liquid_glass_widgets authors.
     ============================================================================================================ */
  const N = {
    grow: 17, // (M) a glass button's longest side grows by 17 pt when pressed
    bloom: [12, 8], // the tab or segment highlight swells by 12 × 8 pt while pressed
    lean: 4, // (M, pinned 52) a dragged glass button leans at most a few points toward the finger
    holdMove: 10, // a long press is cancelled by moving more than 10 pt
    liftScale: 1.04, // (M) a held row grows to ×1.04
    flick: 700, // sheets: a flick faster than 700 pt/s jumps a stop or closes
    snapAt: 0.4, // sheets: otherwise it snaps once 40% of the way
    medium: 0.45, // sheets: the middle stop
    topInset: 90, // sheets: the full stop sits 90 pt below the top
    switchFlick: 200, // switch: a flick faster than 200 px/s decides it, otherwise halfway
    switchTravel: 22,
    swipeOpen: 60, // swipe actions: open past 60 pt
    stretchLong: 7, // (M, Photos) a dragged search field stretches about 7 pt lengthwise
    stretchShort: 2, // … and 2 pt the other way
    recede: 0.971, // (M) a menu behind its submenu
    shrink: { k: 0.64, linear: 0.48, floor: 0.33 }, // (M) sheet drag shrink: 1 − 0.64 × travel ÷ height
    fold: { down: 20, up: 12, extent: 40 }, // tab bar folding (tabBar.fold)
    edge: 36, // the top bar's soft edge and small title appear after 36 pt of scrolling
    back: { distance: 0.2, flick: 500 }, // swipe back: past a fifth of the width, or a flick
    tap: 6, // movement that turns a tap into a drag
  };

  /* ============================================================================================================
     SETTINGS · one line per decision in the app's settings file. Unknown settings are refused.
     ============================================================================================================ */
  const BOOL = 'boolean', NUM = 'number', STR = 'string', LIST = 'list', ANY = 'any';
  const SCHEMA = {
    app: STR,
    motion: ['kit', 'app'],
    root: ANY,
    tabBar: { fold: BOOL, searchGap: NUM },
    segmented: { style: ['gallery', 'squish'] },
    row: { press: ['highlight', 'shrink'] },
    choices: ['actionSheet', 'sheet'],
    confirm: ['alert', 'sheet'],
    sheet: { withStops: LIST, growsToFull: LIST, fullScreen: LIST, dragShrink: BOOL, glass: ['strong', 'regular'] },
    menu: { submenus: LIST },
    glass: { appear: LIST },
    press: { glint: LIST },
    timing: { hold: NUM, lift: NUM, toast: NUM },
    own: ANY,
  };
  const DEFAULTS = {
    app: '',
    motion: 'kit',
    root: null,
    tabBar: { fold: false, searchGap: 8 },
    segmented: { style: 'gallery' },
    row: { press: 'highlight' },
    choices: 'actionSheet',
    confirm: 'alert',
    sheet: { withStops: [], growsToFull: [], fullScreen: [], dragShrink: false, glass: 'strong' },
    menu: { submenus: [] },
    glass: { appear: [] },
    press: { glint: [] },
    timing: { hold: 700, lift: 200, toast: 3000 },
    own: {},
  };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let S = clone(DEFAULTS);
  const problems = [];

  function validate(obj, schema, path, out, bad) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      out.push((path || 'settings') + ' should be an object');
      bad.add(path);
      return;
    }
    Object.keys(obj).forEach((k) => {
      const p = path ? path + '.' + k : k;
      const want = schema[k];
      const v = obj[k];
      const no = (m) => {
        out.push(m);
        bad.add(p);
      };
      if (want === undefined) return no('Unknown setting: ' + p);
      if (want === ANY) return;
      if (Array.isArray(want)) {
        if (!want.includes(v)) no(p + " should be one of '" + want.join("', '") + "'");
      } else if (want === LIST) {
        if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) no(p + ' should be a list of names');
      } else if (typeof want === 'object') validate(v, want, p, out, bad);
      else if (typeof v !== want) no(p + ' should be a ' + want);
    });
  }
  // keeps every good line; a bad one leaves the setting as it was
  function merge(into, from, schema, path, bad) {
    Object.keys(from).forEach((k) => {
      const p = path ? path + '.' + k : k;
      const want = schema[k];
      if (want === undefined || bad.has(p)) return;
      if (want && typeof want === 'object' && !Array.isArray(want)) merge(into[k], from[k], want, p, bad);
      else into[k] = k === 'root' || want === ANY ? from[k] : clone(from[k]);
    });
  }
  // Parts.settings({…}): checks every line, keeps the good ones, and returns the problems (also in Parts.problems).
  // It can be called again later: only the lines given change.
  function settings(obj) {
    const out = [], bad = new Set();
    validate(obj, SCHEMA, '', out, bad);
    if (!bad.has('')) merge(S, obj, SCHEMA, '', bad);
    out.forEach((m) => {
      problems.push(m);
      if (window.console) console.error('Parts kit: ' + m);
    });
    apply();
    return out;
  }
  const allowed = (list, key) => !!list && (list.includes('*') || (key != null && list.includes(String(key))));

  // settings that the stylesheet follows: classes and values on <html>
  function apply() {
    html.classList.toggle('pk-tab-fold', !!S.tabBar.fold);
    html.classList.toggle('pk-row-shrink', S.row.press === 'shrink');
    html.classList.toggle('pk-seg-squish', S.segmented.style === 'squish');
    html.style.setProperty('--pk-search-gap', (+S.tabBar.searchGap || 0) + 'px');
    if (!S.tabBar.fold) doc.querySelectorAll('.pk-dock.pk-folded').forEach((d) => d.classList.remove('pk-folded'));
    motion.publish();
  }

  /* ============================================================================================================
     MOTION · the spring core. Springs are a damping ratio ζ and a frequency in Hz, sampled into CSS linear() and
     published as --ease-<name> / --dur-<name>. Speed: 1 normal, 4 slow, 0 off. Reduce Motion puts .motion-reduced
     on <html>. motion: 'app' uses the app's own MOTION instead (its springs, speed and Reduce Motion), and the
     kit only adds the springs the app doesn't have.
     ============================================================================================================ */
  const fromKC = (k, c) => ({ z: Math.min(1, +(c / (2 * Math.sqrt(k))).toFixed(3)), f: +(Math.sqrt(k) / (2 * Math.PI)).toFixed(3) });
  const SPRINGS = {
    gentle: { z: 0.82, f: 1.9 }, // rows, capsules, fades
    nav: { z: 0.86, f: 2.2 }, // pushed pages, swiping back
    ripple: { z: 0.6, f: 2.4 }, // peeks, small pops
    press: { z: 0.75, f: 4 }, // (M) the glass press
    release: { z: 0.55, f: 3.6 }, // (M) … and its release: one small dip, no wobble
    snap: fromKC(322.3, 30.5), // tab and segment highlight settling (350 ms, bounce 0.15)
    bloom: fromKC(438.6, 35.6), // the highlight turning to glass and back (300 ms)
    settle: { z: 1, f: 4 }, // a stretched field springing back (250 ms, no bounce)
    pill: fromKC(350, 30), // the tab bar's search circle opening into a field
    sheet: fromKC(220, 30), // sheets moving between stops
    'menu-open': { z: 0.73, f: 1.74 }, // menus and popovers growing out of their button
    'menu-close': { z: 0.74, f: 2.25 }, // … and back
  };
  const linearOK = !!(window.CSS && CSS.supports && CSS.supports('transition-timing-function', 'linear(0, 1)'));
  // the same sampling as an app MOTION.curve() (40 steps, settled at 1/500), plus critically damped springs
  function curve(z, f) {
    const w = 2 * Math.PI * f;
    const n = 40;
    const p = [];
    let T;
    if (z < 1) {
      const wd = w * Math.sqrt(1 - z * z);
      T = Math.log(500) / (z * w);
      for (let i = 0; i <= n; i++) {
        const t = (T * i) / n;
        p.push(+(1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t))).toFixed(4));
      }
    } else {
      let u = 1;
      while (Math.exp(-u) * (1 + u) > 1 / 500) u += 0.01;
      T = u / w;
      for (let i = 0; i <= n; i++) {
        const t = (T * i) / n;
        p.push(+(1 - Math.exp(-w * t) * (1 + w * t)).toFixed(4));
      }
    }
    p[n] = 1;
    return { ease: linearOK ? 'linear(' + p.join(', ') + ')' : 'cubic-bezier(.25,.9,.3,1)', ms: Math.round(T * 1000) };
  }
  const C = {};
  Object.keys(SPRINGS).forEach((k) => (C[k] = curve(SPRINGS[k].z, SPRINGS[k].f)));

  const motion = (() => {
    let speed = 1;
    let forced = null; // null follows the device; true or false forces Reduce Motion
    const mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
    const app = () => (S.motion === 'app' && window.MOTION && typeof window.MOTION.speed === 'function' ? window.MOTION : null);
    const sp = () => (app() ? +app().speed() : speed);
    const reduced = () => (app() ? !!app().reduced() : forced != null ? forced : !!(mq && mq.matches));
    const on = () => sp() > 0 && !reduced();
    let wrapped = null;
    function publish() {
      const a = app();
      if (a && wrapped !== a) {
        // follow the app's MOTION whenever it publishes (speed or Reduce Motion changed)
        wrapped = a;
        const orig = a.publish;
        if (typeof orig === 'function' && !orig.__pk) {
          a.publish = function () {
            const r = orig.apply(this, arguments);
            publish();
            return r;
          };
          a.publish.__pk = true;
        }
      }
      const theirs = a && a.SPRINGS ? a.SPRINGS : {};
      const st = html.style;
      Object.keys(C).forEach((k) => {
        if (a && theirs[k]) return;
        st.setProperty('--ease-' + k, C[k].ease);
        st.setProperty('--dur-' + k, (on() ? Math.round(C[k].ms * sp()) : 0) + 'ms');
      });
      st.setProperty('--pk-speed', String(sp()));
      if (!a) {
        html.classList.toggle('motion-off', !on());
        html.classList.toggle('motion-reduced', reduced());
      }
    }
    if (mq) {
      if (mq.addEventListener) mq.addEventListener('change', () => publish());
      else if (mq.addListener) mq.addListener(() => publish());
    }
    // the springs the kit and the app both have must be the same (the kit's check uses this)
    function compare(other) {
      const o = other || (window.MOTION && window.MOTION.SPRINGS) || {};
      const diff = [];
      Object.keys(o).forEach((k) => {
        if (!SPRINGS[k]) return;
        const a = SPRINGS[k], b = o[k];
        if (Math.abs(a.z - b.z) > 1e-6 || Math.abs(a.f - b.f) > 1e-6) diff.push(k);
      });
      return diff;
    }
    return {
      SPRINGS,
      curve,
      publish,
      compare,
      on,
      reduced,
      speed: sp,
      setSpeed(n) {
        speed = Math.max(0, Math.min(8, +n || 0));
        publish();
      },
      setReduced(v) {
        forced = v == null ? null : !!v;
        publish();
      },
      // how long a spring runs now, in ms (0 when motion is off or reduced)
      spring: (k) => (on() && C[k] ? Math.round(C[k].ms * sp()) : 0),
      ease: (k) => (C[k] ? C[k].ease : 'ease'),
    };
  })();

  /* ============================================================================================================
     HELPERS
     ============================================================================================================ */
  const $$ = (sel, r) => Array.from((r || doc).querySelectorAll(sel));
  const rootEl = () => {
    const r = S.root;
    const el = typeof r === 'string' ? doc.querySelector(r) : r && r.nodeType === 1 ? r : null;
    return el || doc.body;
  };
  const scaleOf = (el) => {
    const w = el.offsetWidth;
    return w ? el.getBoundingClientRect().width / w || 1 : 1;
  };
  const sc = () => scaleOf(rootEl());
  // a box relative to the root, in the root's own points (works inside a scaled device frame)
  function rel(el) {
    const R = rootEl(), a = R === doc.body ? { left: 0, top: 0 } : R.getBoundingClientRect(), r = el.getBoundingClientRect(), s = sc();
    return { x: (r.left - a.left) / s, y: (r.top - a.top) / s, w: r.width / s, h: r.height / s };
  }
  const screenW = () => (rootEl() === doc.body ? window.innerWidth : rootEl().offsetWidth);
  const screenH = () => (rootEl() === doc.body ? window.innerHeight : rootEl().offsetHeight);
  // a named value from the stylesheet, as read where the parts live
  const tok = (name) => getComputedStyle(rootEl()).getPropertyValue(name).trim();
  const tokMs = (name) => {
    const v = tok(name);
    const m = /^(-?[\d.]+)(ms|s)$/.exec(v);
    return m ? +m[1] * (m[2] === 's' ? 1000 : 1) : 0;
  };
  // a fixed timing (--dur-…) at the current speed; under Reduce Motion pass fade=true for the short fade instead
  const dur = (name) => Math.round(tokMs(name) * motion.speed());
  const ease = (name) => tok(name) || 'ease';
  // timers for gestures and how long things stay (a hold, a toast) run at real time when motion is off
  const later = (fn, ms) => setTimeout(fn, ms * Math.max(1, motion.speed()));
  const after = (fn, ms) => setTimeout(fn, ms + 30); // cleanup once an animation has had its time
  function emit(el, name, detail) {
    const ev = new CustomEvent('pk:' + name, { bubbles: true, cancelable: true, detail: detail || {} });
    el.dispatchEvent(ev);
    return ev;
  }
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const nm = (o, plain) => esc((o && o.name) || plain);
  // gesture priority: whatever the finger lands on gets first claim
  const OWN = '[data-own-gesture],input,textarea,select,.pk-switch,.pk-slider,.pk-seg,.pk-tabbar,.pk-swipe-front,.pk-grip,.pk-search,.pk-search-field';
  const ownedBy = (target, part) => {
    const o = target && target.closest ? target.closest(OWN) : null;
    return !!o && o !== part && (!part || part.contains(o));
  };
  // finger speed from the last few moves (px or pt per second)
  function tracker() {
    const h = [];
    return {
      add(v) {
        h.push([performance.now(), v]);
        if (h.length > 6) h.shift();
      },
      v() {
        if (h.length < 2) return 0;
        const a = h[0], b = h[h.length - 1];
        return ((b[1] - a[1]) / Math.max(1, b[0] - a[0])) * 1000;
      },
    };
  }
  function layer() {
    const R = rootEl();
    let L = R.querySelector(':scope > .pk-layer');
    if (!L) {
      L = doc.createElement('div');
      L.className = 'pk-layer';
      L.dataset.name = 'Overlays';
      R.append(L);
    }
    return L;
  }
  function dimLayer(kind, onTap) {
    const d = doc.createElement('div');
    d.className = 'pk-dim' + (kind ? ' ' + kind : '');
    d.dataset.name = 'Dim';
    layer().append(d);
    void d.offsetWidth;
    d.classList.add('pk-on');
    if (onTap) d.addEventListener('click', onTap);
    return d;
  }
  function dropDim(d, ms) {
    if (!d) return;
    if (ms != null) d.style.transitionDuration = ms + 'ms';
    d.classList.remove('pk-on');
    after(() => d.remove(), ms != null ? ms : dur('--dur-fade'));
  }
  // overlays that are open, newest last; Escape closes the newest
  const open = [];
  const track = (o) => {
    open.push(o);
    return o;
  };
  const untrack = (o) => {
    const i = open.indexOf(o);
    if (i >= 0) open.splice(i, 1);
  };
  doc.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && open.length) open[open.length - 1].close();
  });
  const ICON = {
    x: 'M6 6l12 12M18 6L6 18',
    chevL: 'M15 5l-7 7 7 7',
    chevR: 'M9 5l7 7-7 7',
    check: 'M5 12l5 5 9-10',
  };
  const icon = (n, s, w) =>
    '<svg width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2.2) +
    '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ICON[n] + '"/></svg>';

  /* ============================================================================================================
     PRESS · glass grows 17 pt and lights up; buttons on a bar only light up; solid buttons shrink to --press.
     (52, pinned) buttons named in press.glint also get the finger glint and lean toward a dragging finger.
     ============================================================================================================ */
  let pressed = null;
  const PRESSABLE = '.pk-press, .pk-press-bar, .pk-press-solid';
  function glintOf(el) {
    let clip = el.querySelector(':scope > .pk-glint-clip');
    if (!clip) {
      clip = doc.createElement('span');
      clip.className = 'pk-glint-clip';
      clip.innerHTML = '<i class="pk-glint"></i>';
      el.prepend(clip);
    }
    return clip.firstChild;
  }
  function placeGlint(el, ev) {
    const g = glintOf(el), r = el.getBoundingClientRect();
    const sx = r.width / (el.offsetWidth || 1), sy = r.height / (el.offsetHeight || 1);
    const d = 1.6 * Math.min(el.offsetWidth, el.offsetHeight);
    g.style.width = g.style.height = d + 'px';
    g.style.transform = 'translate(' + ((ev.clientX - r.left) / sx - d / 2).toFixed(1) + 'px,' + ((ev.clientY - r.top) / sy - d / 2).toFixed(1) + 'px)';
  }
  doc.addEventListener('pointerdown', (ev) => {
    if (ev.button > 0) return;
    const el = ev.target.closest && ev.target.closest(PRESSABLE);
    if (!el || el.disabled) return;
    if (el.classList.contains('pk-press')) {
      const L = Math.max(el.offsetWidth, el.offsetHeight) || 1;
      el.style.setProperty('--pk-ps', motion.reduced() ? '1' : (1 + N.grow / L).toFixed(4));
    }
    const glint = el.classList.contains('pk-press') && allowed(S.press.glint, el.dataset.glint);
    if (glint) placeGlint(el, ev);
    el.classList.add('pk-pressed');
    pressed = { el, x: ev.clientX, y: ev.clientY, id: ev.pointerId, glint };
  });
  window.addEventListener(
    'pointermove',
    (ev) => {
      if (!pressed || ev.pointerId !== pressed.id || !pressed.glint) return;
      const el = pressed.el;
      placeGlint(el, ev);
      if (motion.reduced()) return;
      const s = scaleOf(el.parentElement || el), dx = (ev.clientX - pressed.x) / s, dy = (ev.clientY - pressed.y) / s;
      const lean = (v) => Math.sign(v) * Math.min(N.lean, (Math.abs(v) * 0.1) / (1 + Math.abs(v) * 0.01));
      el.style.setProperty('--pk-tx', lean(dx).toFixed(2) + 'px');
      el.style.setProperty('--pk-ty', lean(dy).toFixed(2) + 'px');
    },
    { passive: true }
  );
  function unpress() {
    if (!pressed) return;
    const el = pressed.el;
    el.classList.remove('pk-pressed');
    if (el.classList.contains('pk-press')) el.style.setProperty('--pk-ps', '1');
    el.style.removeProperty('--pk-tx');
    el.style.removeProperty('--pk-ty');
    pressed = null;
  }
  window.addEventListener('pointerup', unpress);
  window.addEventListener('pointercancel', unpress);

  /* ============================================================================================================
     GLASS, BARS AND BUTTONS
     ============================================================================================================ */

  /* (2, 5) scrolling: the top bar's soft edge and small title, and (tabBar.fold, D01) the tab bar folding.
     A .pk-scroll finds its .pk-topbar and .pk-dock beside it (the same parent), or by data-topbar / data-dock. */
  const scrollRuns = new WeakMap();
  function partner(sc, attr, cls) {
    const id = sc.getAttribute(attr);
    if (id) return doc.querySelector(id);
    return sc.parentElement ? sc.parentElement.querySelector(':scope > ' + cls) : null;
  }
  function onScroll(sc) {
    const y = sc.scrollTop;
    const bar = partner(sc, 'data-topbar', '.pk-topbar');
    if (bar) bar.classList.toggle('pk-scrolled', y > N.edge);
    const dock = partner(sc, 'data-dock', '.pk-dock');
    if (!dock || !S.tabBar.fold || !dock.querySelector('.pk-tab-pill')) return;
    const st = scrollRuns.get(sc) || { last: y, run: 0 };
    const d = y - st.last;
    st.last = y;
    if (sc.scrollHeight - sc.clientHeight > N.fold.extent) {
      if (Math.sign(d) !== Math.sign(st.run)) st.run = 0;
      st.run += d;
      if (y <= 0) dock.classList.remove('pk-folded');
      else if (st.run > N.fold.down) dock.classList.add('pk-folded');
      else if (st.run < -N.fold.up) dock.classList.remove('pk-folded');
    }
    scrollRuns.set(sc, st);
  }
  doc.addEventListener('scroll', (ev) => {
    const sc = ev.target;
    if (sc && sc.classList && sc.classList.contains('pk-scroll')) onScroll(sc);
  }, true);

  /* (4, 23) indicator bars: the tab bar's highlight and the segmented control's knob, placed by --pk-i of --pk-n.
     Tap or drag; the highlight swells into clear glass while pressed. (23) segmented.style 'squish' (D04's
     alternative) slides and squishes on a tap instead, with no drag or swell. */
  const BARS = '.pk-tabbar, .pk-seg';
  const itemsOf = (bar) => $$(bar.classList.contains('pk-tabbar') ? ':scope > .pk-tab' : ':scope > button', bar);
  const indOf = (bar) => bar.querySelector(':scope > .pk-tab-ind, :scope > .pk-seg-ind');
  const squishy = (bar) => bar.classList.contains('pk-seg') && S.segmented.style === 'squish';
  function refreshBar(bar) {
    const its = itemsOf(bar);
    if (!its.length) return;
    let i = its.findIndex((t) => t.classList.contains('on'));
    if (i < 0) {
      i = 0;
      its[0].classList.add('on');
    }
    bar.style.setProperty('--pk-n', its.length);
    bar.style.setProperty('--pk-i', i);
    its.forEach((t, j) => t.setAttribute(bar.classList.contains('pk-tabbar') ? 'aria-selected' : 'aria-pressed', String(j === i)));
  }
  function selectBar(bar, i, quiet) {
    const its = itemsOf(bar);
    if (!its[i]) return;
    const was = its.findIndex((t) => t.classList.contains('on'));
    its.forEach((t, j) => t.classList.toggle('on', j === i));
    refreshBar(bar);
    if (squishy(bar) && was !== i && motion.on()) {
      const k = indOf(bar);
      if (k) {
        k.classList.remove('pk-squish');
        void k.offsetWidth;
        k.classList.add('pk-squish');
        after(() => k.classList.remove('pk-squish'), dur('--dur-squish'));
      }
    }
    if (!quiet && was !== i) emit(bar, 'change', { index: i, value: its[i].dataset.value || its[i].textContent.trim() });
  }
  let barDrag = null;
  const nearestItem = (bar, cx) => {
    let b = 0, bd = 1e9;
    itemsOf(bar).forEach((t, i) => {
      const d = Math.abs(t.offsetLeft + t.offsetWidth / 2 - cx);
      if (d < bd) {
        bd = d;
        b = i;
      }
    });
    return b;
  };
  const barX = (bar, ev) => (ev.clientX - bar.getBoundingClientRect().left) / scaleOf(bar);
  function liveBar(bar, on) {
    const k = indOf(bar);
    if (!k) return;
    const sw = on && !motion.reduced() && !squishy(bar);
    k.classList.toggle('pk-live', sw);
    if (sw) {
      k.style.setProperty('--pk-bx', ((k.offsetWidth + N.bloom[0]) / k.offsetWidth).toFixed(3));
      k.style.setProperty('--pk-by', ((k.offsetHeight + N.bloom[1]) / k.offsetHeight).toFixed(3));
    } else {
      k.style.removeProperty('--pk-bx');
      k.style.removeProperty('--pk-by');
    }
  }
  const under = (bar, i) => itemsOf(bar).forEach((t, j) => t.classList.toggle('pk-under', j === i && bar.classList.contains('pk-tabbar') && indOf(bar) && indOf(bar).classList.contains('pk-live')));
  doc.addEventListener('pointerdown', (ev) => {
    if (ev.button > 0) return;
    const bar = ev.target.closest && ev.target.closest(BARS);
    if (!bar || !indOf(bar)) return;
    refreshBar(bar);
    barDrag = { bar, id: ev.pointerId, x0: ev.clientX, moved: false, start: nearestItem(bar, barX(bar, ev)) };
    try {
      bar.setPointerCapture(ev.pointerId);
    } catch (e) {}
    liveBar(bar, true);
    under(bar, barDrag.start);
  });
  doc.addEventListener('pointermove', (ev) => {
    const d = barDrag;
    if (!d || ev.pointerId !== d.id || squishy(d.bar)) return;
    const bar = d.bar, s = scaleOf(bar);
    if (!d.moved && Math.abs((ev.clientX - d.x0) / s) < N.tap) return;
    d.moved = true;
    const k = indOf(bar);
    k.classList.add('pk-drag');
    const cx = barX(bar, ev), w = k.offsetWidth, pad = parseFloat(getComputedStyle(bar).paddingLeft) || 0;
    let x = cx - w / 2 - pad;
    const max = bar.clientWidth - 2 * pad - w;
    if (x < 0) x = -Math.min(0.3 * w, -x * 0.4);
    if (x > max) x = max + Math.min(0.3 * w, (x - max) * 0.4);
    k.style.setProperty('--pk-x', x.toFixed(1) + 'px');
    under(bar, nearestItem(bar, cx));
  });
  function endBar(ev) {
    const d = barDrag;
    if (!d || ev.pointerId !== d.id) return;
    barDrag = null;
    const bar = d.bar, k = indOf(bar);
    const i = d.moved ? nearestItem(bar, barX(bar, ev)) : d.start;
    k.classList.remove('pk-drag');
    selectBar(bar, ev.type === 'pointercancel' && !d.moved ? itemsOf(bar).findIndex((t) => t.classList.contains('on')) : i);
    under(bar, i);
    later(() => {
      if (barDrag && barDrag.bar === bar) return;
      liveBar(bar, false);
      under(bar, -1);
    }, 300);
  }
  doc.addEventListener('pointerup', endBar);
  doc.addEventListener('pointercancel', endBar);
  // place every bar's highlight when it appears (screens drawn as HTML text need no call)
  let refreshQueued = false;
  function refreshAll() {
    refreshQueued = false;
    $$(BARS).forEach(refreshBar);
    $$('.pk-switch').forEach((sw) => {
      sw.setAttribute('aria-checked', String(sw.classList.contains('on')));
      if (!sw.hasAttribute('role')) {
        sw.setAttribute('role', 'switch');
        if (!sw.hasAttribute('tabindex')) sw.tabIndex = 0;
      }
    });
    initSliders();
    initSteppers();
  }
  const queueRefresh = () => {
    if (!refreshQueued) {
      refreshQueued = true;
      requestAnimationFrame(refreshAll);
    }
  };
  if (window.MutationObserver) new MutationObserver(queueRefresh).observe(doc.documentElement, { childList: true, subtree: true });
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', refreshAll);
  else queueRefresh();

  /* (5, 6) the dock: the folded pill opens the bar; the search circle opens the search field; ✕ closes it */
  doc.addEventListener('click', (ev) => {
    const t = ev.target.closest && ev.target.closest('.pk-tab-pill, .pk-search-circle, .pk-search-close');
    if (!t) return;
    const dock = t.closest('.pk-dock');
    if (!dock) return;
    if (t.classList.contains('pk-tab-pill')) return dock.classList.remove('pk-folded');
    const on = t.classList.contains('pk-search-circle');
    dock.classList.toggle('pk-searching', on);
    const inp = dock.querySelector('.pk-search-field input');
    if (inp) {
      if (on) setTimeout(() => inp.focus({ preventScroll: true }), 60);
      else {
        inp.value = '';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.blur();
      }
    }
    emit(dock, 'search', { open: on });
  });

  /* (10) pushed page: Parts.push(page, {under}) slides it in; swipe right from anywhere on it, or Parts.pop(page) */
  const navDims = new WeakMap();
  function underOf(page, o) {
    const u = (o && o.under) || page.dataset.under;
    if (u) return typeof u === 'string' ? doc.querySelector(u) : u;
    return page.parentElement ? page.parentElement.querySelector(':scope > .pk-scroll') : null;
  }
  function navDim(page) {
    let d = navDims.get(page);
    if (!d || !d.isConnected) {
      d = doc.createElement('div');
      d.className = 'pk-navdim';
      page.before(d);
      navDims.set(page, d);
    }
    return d;
  }
  function push(page, o) {
    const u = underOf(page, o);
    page._pkUnder = u;
    page.classList.add('pk-shown');
    page.style.setProperty('--pk-px', '0px');
    void page.offsetWidth;
    page.classList.add('pk-on');
    if (u) {
      u.classList.remove('pk-pushed-back');
      u.classList.add('pk-pushed-under');
    }
    navDim(page).classList.add('pk-on');
    emit(page, 'push');
  }
  function pop(page) {
    const u = page._pkUnder;
    page.classList.remove('pk-on');
    page.style.setProperty('--pk-px', '0px');
    if (u) {
      u.classList.remove('pk-pushed-under');
      u.classList.add('pk-pushed-back');
      u.style.removeProperty('translate');
    }
    navDim(page).classList.remove('pk-on');
    after(() => {
      if (page.classList.contains('pk-on')) return;
      page.classList.remove('pk-shown');
      if (u) u.classList.remove('pk-pushed-back');
    }, motion.spring('nav'));
    emit(page, 'pop');
  }
  let backDrag = null;
  doc.addEventListener('pointerdown', (ev) => {
    if (ev.button > 0) return;
    const page = ev.target.closest && ev.target.closest('.pk-push.pk-on');
    if (!page || ownedBy(ev.target, page) || ev.target.closest('button, a, .pk-hold')) return;
    backDrag = { page, x: ev.clientX, y: ev.clientY, id: ev.pointerId, on: false, tr: tracker() };
  });
  doc.addEventListener('pointermove', (ev) => {
    const d = backDrag;
    if (!d || ev.pointerId !== d.id) return;
    const page = d.page, s = scaleOf(page), dx = (ev.clientX - d.x) / s, dy = (ev.clientY - d.y) / s;
    if (!d.on) {
      if (dx > 8 && Math.abs(dx) > Math.abs(dy)) {
        d.on = true;
        try {
          page.setPointerCapture(ev.pointerId);
        } catch (e) {}
        page.classList.add('pk-tracking');
        if (page._pkUnder) page._pkUnder.classList.add('pk-tracking');
      } else if (Math.abs(dy) > 10) {
        backDrag = null;
        return;
      } else return;
    }
    const W = page.offsetWidth, p = Math.max(0, dx);
    page.style.setProperty('--pk-px', p + 'px');
    if (page._pkUnder && !motion.reduced()) page._pkUnder.style.translate = (-33 + (33 * p) / W).toFixed(2) + '% 0';
    navDim(page).style.opacity = String(1 - p / W);
    d.tr.add(dx);
  });
  function endBack(ev) {
    const d = backDrag;
    if (!d || ev.pointerId !== d.id) return;
    backDrag = null;
    if (!d.on) return;
    const page = d.page;
    page.classList.remove('pk-tracking');
    if (page._pkUnder) {
      page._pkUnder.classList.remove('pk-tracking');
      page._pkUnder.style.removeProperty('translate');
    }
    navDim(page).style.opacity = '';
    const dx = parseFloat(page.style.getPropertyValue('--pk-px')) || 0;
    if (dx > page.offsetWidth * N.back.distance || d.tr.v() > N.back.flick) pop(page);
    else page.style.setProperty('--pk-px', '0px');
  }
  doc.addEventListener('pointerup', endBack);
  doc.addEventListener('pointercancel', endBack);

  /* (11) top bar buttons changing between pages (measured): Parts.bar.swap(button, iconHTML) blurs the old icon out
     (σ 6) and the new one in (σ 3.5) while the circle swells up to 22%; Parts.bar.appear(slot, html) and
     Parts.bar.leave(slot) add or take away a button (250 ms in, 350 ms out). Reduce Motion: a short cross-fade. */
  const bar = {
    swap(btn, iconHTML) {
      const old = btn.querySelector(':scope > .pk-ico');
      const nu = doc.createElement('span');
      nu.className = 'pk-ico';
      nu.innerHTML = iconHTML;
      btn.append(nu);
      const T = dur('--dur-morph');
      if (!old) return;
      if (!motion.on() || !T) {
        if (motion.reduced() && T) {
          old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur('--dur-reduced'), fill: 'forwards' }).onfinish = () => old.remove();
          nu.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur('--dur-reduced') });
        } else old.remove();
        return;
      }
      old.animate([{ opacity: 1, filter: 'blur(0px)' }, { opacity: 0, filter: 'blur(6px)' }], { duration: T * 0.42, easing: 'linear', fill: 'forwards' }).onfinish = () => old.remove();
      nu.animate([{ opacity: 0, filter: 'blur(3.5px)' }, { opacity: 0, filter: 'blur(3.5px)', offset: 0.25 }, { opacity: 1, filter: 'blur(0px)' }], { duration: T * 0.84, easing: ease('--ease-out') });
      btn.animate([{ scale: '1' }, { scale: '1.22', offset: 0.6 }, { scale: '0.98', offset: 0.85 }, { scale: '1' }], { duration: T, easing: ease('--ease-out'), composite: 'add' });
    },
    appear(slot, buttonHTML) {
      slot.insertAdjacentHTML('beforeend', buttonHTML);
      const b = slot.lastElementChild;
      return appearAs(b, 1.1, true);
    },
    leave(slot, btn) {
      const b = btn || slot.lastElementChild;
      if (!b) return Promise.resolve();
      return leaveAs(b, true);
    },
  };
  // the materialize choreography (M): in over 250 ms (glass full at 92%, content sharpening from an 8 px blur over
  // the last 65%, scale from 1.15, or 1.1 inside a bar); out over 350 ms (content gone by 55%, then the empty glass)
  function appearAs(el, from, force) {
    const T = dur('--dur-appear');
    if (!force && !motion.on()) return Promise.resolve();
    if (!T) return Promise.resolve();
    if (motion.reduced()) return el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur('--dur-reduced') }).finished.catch(() => {});
    const inner = el.querySelector('svg, .pk-ico, span');
    if (inner) inner.animate([{ opacity: 0, filter: 'blur(8px)' }, { opacity: 0, filter: 'blur(8px)', offset: 0.35 }, { opacity: 1, filter: 'blur(0px)' }], { duration: T, easing: 'linear' });
    return el.animate([{ scale: String(from), opacity: 0 }, { scale: '1', opacity: 1, offset: 0.92 }, { scale: '1', opacity: 1 }], { duration: T, easing: 'linear' }).finished.catch(() => {});
  }
  function leaveAs(el) {
    const T = dur('--dur-leave');
    const done = () => el.remove();
    if (!T) {
      done();
      return Promise.resolve();
    }
    if (motion.reduced()) {
      const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur('--dur-reduced'), fill: 'forwards' });
      return a.finished.then(done, done);
    }
    const inner = el.querySelector('svg, .pk-ico, span');
    if (inner) inner.animate([{ opacity: 1, filter: 'blur(0px)' }, { opacity: 0, filter: 'blur(8px)', offset: 0.55 }, { opacity: 0, filter: 'blur(8px)' }], { duration: T, easing: 'linear', fill: 'forwards' });
    const a = el.animate([{ scale: '1', opacity: 1 }, { scale: '1.15', opacity: 0 }], { duration: T, easing: 'linear', fill: 'forwards' });
    return a.finished.then(done, done);
  }

  /* (15) buttons on a bar that toggle (.pk-group.pk-toggles): aria-pressed, and a pk:change */
  doc.addEventListener('click', (ev) => {
    const b = ev.target.closest && ev.target.closest('.pk-group.pk-toggles > .pk-btn');
    if (!b) return;
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    emit(b, 'change', { on });
  });

  /* (17) edit button: data-pk-edit="#list" (or the list it's in) toggles .pk-editing; its label becomes Done */
  doc.addEventListener('click', (ev) => {
    const b = ev.target.closest && ev.target.closest('[data-pk-edit]');
    if (!b) return;
    const sel = b.getAttribute('data-pk-edit');
    const list = (sel && doc.querySelector(sel)) || b.closest('.pk-list');
    if (!list) return;
    const on = !list.classList.contains('pk-editing');
    list.classList.toggle('pk-editing', on);
    if (!b.dataset.pkLabel) b.dataset.pkLabel = b.textContent.trim();
    b.textContent = on ? b.dataset.done || 'Done' : b.dataset.pkLabel;
    b.style.fontWeight = on ? '600' : '';
    if (motion.on()) b.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur('--dur-fade') });
    emit(list, 'edit', { on });
  });

  /* (18) chips: a tap picks or unpicks (not the "+ Your own" chip, and not in a .pk-chips.pk-static) */
  doc.addEventListener('click', (ev) => {
    const c = ev.target.closest && ev.target.closest('.pk-chip');
    if (!c || c.classList.contains('pk-chip-add') || c.closest('.pk-static')) return;
    const on = !c.classList.contains('on');
    c.classList.toggle('on', on);
    c.setAttribute('aria-pressed', String(on));
    emit(c, 'change', { on });
  });

  /* ============================================================================================================
     CONTROLS AND INPUTS
     ============================================================================================================ */

  /* (21) switch: .pk-switch (with a .pk-switch-knob inside); .on when on. Tap, or drag the knob: a flick faster than
     200 px/s decides, otherwise halfway. pk:change { on }. A .pk-switch-row toggles its switch when tapped too. */
  let swDrag = null;
  function setSwitch(sw, on, quiet) {
    const was = sw.classList.contains('on');
    sw.classList.toggle('on', on);
    sw.setAttribute('aria-checked', String(on));
    const k = sw.querySelector('.pk-switch-knob');
    if (k) k.style.removeProperty('--pk-sx');
    if (was !== on && motion.on()) {
      sw.classList.remove('pk-swell');
      void sw.offsetWidth;
      sw.classList.add('pk-swell');
      after(() => sw.classList.remove('pk-swell'), dur('--dur-switch'));
    }
    if (!quiet && was !== on) emit(sw, 'change', { on });
  }
  doc.addEventListener('pointerdown', (ev) => {
    if (ev.button > 0) return;
    const sw = ev.target.closest && ev.target.closest('.pk-switch');
    if (!sw || sw.getAttribute('aria-disabled') === 'true') return;
    swDrag = { sw, x: ev.clientX, id: ev.pointerId, on: sw.classList.contains('on'), moved: false, tr: tracker() };
    try {
      sw.setPointerCapture(ev.pointerId);
    } catch (e) {}
    sw.classList.add('pk-held');
  });
  doc.addEventListener('pointermove', (ev) => {
    const d = swDrag;
    if (!d || ev.pointerId !== d.id) return;
    const s = scaleOf(d.sw), dx = (ev.clientX - d.x) / s;
    d.tr.add(ev.clientX / s);
    if (!d.moved && Math.abs(dx) < 3) return;
    d.moved = true;
    d.sw.classList.add('pk-dragging');
    const x = Math.max(0, Math.min(N.switchTravel, (d.on ? N.switchTravel : 0) + dx));
    d.sw.querySelector('.pk-switch-knob').style.setProperty('--pk-sx', x + 'px');
  });
  function endSwitch(ev) {
    const d = swDrag;
    if (!d || ev.pointerId !== d.id) return;
    swDrag = null;
    const sw = d.sw;
    sw.classList.remove('pk-held', 'pk-dragging');
    if (ev.type === 'pointercancel' && !d.moved) return;
    let on;
    if (!d.moved) on = !d.on;
    else {
      const v = d.tr.v(), k = sw.querySelector('.pk-switch-knob');
      const x = parseFloat(k.style.getPropertyValue('--pk-sx')) || 0;
      on = Math.abs(v) > N.switchFlick ? v > 0 : x > N.switchTravel / 2;
    }
    setSwitch(sw, on);
    sw._pkJust = performance.now();
  }
  doc.addEventListener('pointerup', endSwitch);
  doc.addEventListener('pointercancel', endSwitch);
  doc.addEventListener('click', (ev) => {
    // keyboard (Space or Enter on a focused switch) and taps on a .pk-switch-row
    const sw = ev.target.closest && ev.target.closest('.pk-switch');
    if (sw) {
      if (ev.detail === 0) setSwitch(sw, !sw.classList.contains('on'));
      return;
    }
    const row = ev.target.closest && ev.target.closest('.pk-switch-row');
    const s2 = row && row.querySelector('.pk-switch');
    if (s2 && !ownedBy(ev.target, row)) setSwitch(s2, !s2.classList.contains('on'));
  });
  doc.addEventListener('keydown', (ev) => {
    const sw = ev.target.closest && ev.target.closest('.pk-switch');
    if (sw && (ev.key === ' ' || ev.key === 'Enter')) {
      ev.preventDefault();
      setSwitch(sw, !sw.classList.contains('on'));
    }
    const sl = ev.target.closest && ev.target.closest('.pk-slider');
    if (sl && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight')) {
      ev.preventDefault();
      const o = sliderOpts(sl);
      setSlider(sl, o.value + (ev.key === 'ArrowRight' ? 1 : -1) * (o.step || (o.max - o.min) / 20), true);
    }
  });

  /* (22) slider: .pk-slider with data-min, data-max, data-step, data-value (0–100 by default). The knob grows ×1.35
     while held; the fill follows the finger. pk:input while moving, pk:change on letting go. */
  function sliderOpts(sl) {
    const n = (k, d) => (sl.dataset[k] != null && sl.dataset[k] !== '' && !isNaN(+sl.dataset[k]) ? +sl.dataset[k] : d);
    return { min: n('min', 0), max: n('max', 100), step: n('step', 0), value: n('value', 50) };
  }
  function setSlider(sl, v, change) {
    const o = sliderOpts(sl);
    if (o.step) v = Math.round((v - o.min) / o.step) * o.step + o.min;
    v = Math.max(o.min, Math.min(o.max, v));
    v = +v.toFixed(4);
    sl.dataset.value = String(v);
    sl.style.setProperty('--pk-p', (((v - o.min) / (o.max - o.min || 1)) * 100).toFixed(2) + '%');
    sl.setAttribute('aria-valuenow', String(v));
    emit(sl, change ? 'change' : 'input', { value: v });
  }
  let slDrag = null;
  const slAt = (sl, ev) => {
    const r = sl.getBoundingClientRect(), o = sliderOpts(sl);
    return o.min + ((ev.clientX - r.left) / r.width) * (o.max - o.min);
  };
  doc.addEventListener('pointerdown', (ev) => {
    if (ev.button > 0) return;
    const sl = ev.target.closest && ev.target.closest('.pk-slider');
    if (!sl) return;
    slDrag = { sl, id: ev.pointerId };
    try {
      sl.setPointerCapture(ev.pointerId);
    } catch (e) {}
    sl.classList.add('pk-held');
    setSlider(sl, slAt(sl, ev));
  });
  doc.addEventListener('pointermove', (ev) => {
    if (slDrag && ev.pointerId === slDrag.id) setSlider(slDrag.sl, slAt(slDrag.sl, ev));
  });
  function endSlider(ev) {
    const d = slDrag;
    if (!d || ev.pointerId !== d.id) return;
    slDrag = null;
    d.sl.classList.remove('pk-held');
    setSlider(d.sl, +d.sl.dataset.value, true);
  }
  doc.addEventListener('pointerup', endSlider);
  doc.addEventListener('pointercancel', endSlider);
  const initSliders = () =>
    $$('.pk-slider').forEach((sl) => {
      if (sl.style.getPropertyValue('--pk-p')) return;
      const o = sliderOpts(sl);
      sl.style.setProperty('--pk-p', (((o.value - o.min) / (o.max - o.min || 1)) * 100).toFixed(2) + '%');
      if (!sl.hasAttribute('role')) {
        sl.setAttribute('role', 'slider');
        sl.setAttribute('aria-valuemin', String(o.min));
        sl.setAttribute('aria-valuemax', String(o.max));
        sl.setAttribute('aria-valuenow', String(o.value));
        if (!sl.hasAttribute('tabindex')) sl.tabIndex = 0;
      }
    });

  /* (24) stepper: .pk-stepper with data-value, data-min, data-max, data-step and two buttons with data-step="-1" / "1".
     A .pk-stepper-value inside (or [data-pk-value-of="#stepper-id"] anywhere) shows the value. pk:change { value } */
  function setStepper(st, v, quiet) {
    const n = (k, d) => (st.dataset[k] != null && st.dataset[k] !== '' && !isNaN(+st.dataset[k]) ? +st.dataset[k] : d);
    const min = n('min', -Infinity), max = n('max', Infinity);
    v = Math.max(min, Math.min(max, v));
    st.dataset.value = String(v);
    $$('[data-step]', st).forEach((b) => (b.disabled = (+b.dataset.step < 0 && v <= min) || (+b.dataset.step > 0 && v >= max)));
    const out = st.querySelector('.pk-stepper-value');
    const show = (o) => {
      if (o.textContent !== String(v)) o.textContent = String(v);
    };
    if (out) show(out);
    if (st.id) $$('[data-pk-value-of="#' + st.id + '"]').forEach(show);
    if (!quiet) emit(st, 'change', { value: v });
  }
  doc.addEventListener('click', (ev) => {
    const b = ev.target.closest && ev.target.closest('.pk-stepper [data-step]');
    if (!b) return;
    const st = b.closest('.pk-stepper');
    setStepper(st, (+st.dataset.value || 0) + (+b.dataset.step || 0) * (+st.dataset.step || 1));
  });
  const initSteppers = () => $$('.pk-stepper').forEach((st) => setStepper(st, +st.dataset.value || 0, true));

  /* (26, 27, 29) fields: the clear button shows once there's text; a .pk-area text area grows as you type */
  doc.addEventListener('input', (ev) => {
    const t = ev.target;
    const f = t.closest && t.closest('.pk-field, .pk-search, .pk-search-field');
    if (!f) return;
    f.classList.toggle('pk-has', !!t.value);
    if (t.tagName === 'TEXTAREA' && f.classList.contains('pk-area')) {
      t.style.height = 'auto';
      t.style.height = Math.max(66, t.scrollHeight) + 'px';
    }
  });
  doc.addEventListener('click', (ev) => {
    const c = ev.target.closest && ev.target.closest('.pk-field-clear');
    if (!c) return;
    ev.preventDefault();
    const f = c.parentElement, inp = f.querySelector('input, textarea');
    if (!inp) return;
    inp.value = '';
    f.classList.remove('pk-has');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.focus();
  });
  // (26) dragging a search field stretches it a little toward the finger, then it springs back
  let stretch = null;
  doc.addEventListener('pointerdown', (ev) => {
    if (ev.button > 0) return;
    const f = ev.target.closest && ev.target.closest('.pk-search, .pk-dock.pk-searching .pk-search-field');
    if (!f || (ev.target.tagName === 'INPUT' && doc.activeElement === ev.target) || ev.target.closest('.pk-field-clear')) return;
    stretch = { f, x: ev.clientX, y: ev.clientY, id: ev.pointerId };
  });
  doc.addEventListener('pointermove', (ev) => {
    const d = stretch;
    if (!d || ev.pointerId !== d.id || motion.reduced()) return;
    const s = scaleOf(d.f), dx = (ev.clientX - d.x) / s, dy = (ev.clientY - d.y) / s;
    const sat = (v, max) => Math.sign(v) * max * (1 - Math.exp(-Math.abs(v) / 30));
    const sx = sat(dx, N.stretchLong), sy = sat(dy, N.stretchShort);
    d.f.classList.add('pk-stretching');
    d.f.style.transformOrigin = (dx > 0 ? 'left' : 'right') + ' ' + (dy > 0 ? 'top' : 'bottom');
    d.f.style.scale = (1 + Math.abs(sx) / d.f.offsetWidth).toFixed(4) + ' ' + (1 + Math.abs(sy) / d.f.offsetHeight).toFixed(4);
    d.f.style.translate = (sx * 0.3).toFixed(2) + 'px ' + (sy * 0.3).toFixed(2) + 'px';
  });
  function endStretch(ev) {
    const d = stretch;
    if (!d || ev.pointerId !== d.id) return;
    stretch = null;
    d.f.classList.remove('pk-stretching');
    d.f.style.removeProperty('scale');
    d.f.style.removeProperty('translate');
  }
  doc.addEventListener('pointerup', endStretch);
  doc.addEventListener('pointercancel', endStretch);

  /* ============================================================================================================
     LISTS
     ============================================================================================================ */

  /* (35) row press: rows that do something (button, link or .pk-tap) highlight while pressed (D06), or shrink with
     row.press 'shrink'. Moving more than 10 pt (a scroll) lets go. */
  let rowPress = null;
  doc.addEventListener('pointerdown', (ev) => {
    if (ev.button > 0) return;
    const row = ev.target.closest && ev.target.closest('button.pk-row, a.pk-row, .pk-row.pk-tap');
    if (!row) return;
    const inner = ev.target.closest('button, a, input, textarea, select, .pk-switch, .pk-slider, .pk-seg, .pk-stepper, [data-own-gesture]');
    if (inner && inner !== row) return;
    rowPress = { row, x: ev.clientX, y: ev.clientY, id: ev.pointerId };
    row.classList.add('pk-pressed');
  });
  doc.addEventListener('pointermove', (ev) => {
    const d = rowPress;
    if (!d || ev.pointerId !== d.id) return;
    const s = scaleOf(d.row);
    if (Math.hypot((ev.clientX - d.x) / s, (ev.clientY - d.y) / s) > N.holdMove) {
      d.row.classList.remove('pk-pressed');
      rowPress = null;
    }
  });
  const endRow = (ev) => {
    if (rowPress && ev.pointerId === rowPress.id) {
      rowPress.row.classList.remove('pk-pressed');
      rowPress = null;
    }
  };
  doc.addEventListener('pointerup', endRow);
  doc.addEventListener('pointercancel', endRow);

  /* (39) swipe actions: .pk-swipe holds .pk-swipe-actions (buttons) and a .pk-swipe-front. Swipe the front left past
     60 pt to open; tap elsewhere or an action to close. The front's own tap is ignored right after a swipe. */
  let swOpen = null, swipe = null;
  const actionsWidth = (sw) => {
    const a = sw.querySelector('.pk-swipe-actions');
    return a ? a.offsetWidth : 0;
  };
  function closeSwipe(front) {
    if (!front) return;
    front.style.setProperty('--pk-sx', '0px');
    const row = front.parentElement;
    later(() => {
      if (swOpen !== front && !front.classList.contains('pk-dragging')) row.classList.remove('pk-show');
    }, motion.spring('gentle') || 1);
    if (swOpen === front) swOpen = null;
  }
  doc.addEventListener('pointerdown', (ev) => {
    if (ev.button > 0) return;
    const front = ev.target.closest && ev.target.closest('.pk-swipe-front');
    if (swOpen && swOpen !== front && !(ev.target.closest && ev.target.closest('.pk-swipe-actions'))) closeSwipe(swOpen);
    if (!front) return;
    swipe = { front, x: ev.clientX, y: ev.clientY, base: parseFloat(front.style.getPropertyValue('--pk-sx')) || 0, on: false, id: ev.pointerId };
  });
  doc.addEventListener('pointermove', (ev) => {
    const d = swipe;
    if (!d || ev.pointerId !== d.id) return;
    const f = d.front, s = scaleOf(f), dx = (ev.clientX - d.x) / s, dy = (ev.clientY - d.y) / s;
    if (!d.on) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        d.on = true;
        f.classList.add('pk-dragging');
        f.parentElement.classList.add('pk-show');
        try {
          f.setPointerCapture(ev.pointerId);
        } catch (e) {}
      } else return;
    }
    const W = actionsWidth(f.parentElement);
    let x = d.base + dx;
    if (x > 0) x *= 0.2;
    if (x < -W) x = -W + (x + W) * 0.3;
    f.style.setProperty('--pk-sx', x.toFixed(1) + 'px');
  });
  function endSwipe(ev) {
    const d = swipe;
    if (!d || ev.pointerId !== d.id) return;
    swipe = null;
    const f = d.front;
    if (!d.on) {
      if (swOpen === f) closeSwipe(f);
      return;
    }
    f.classList.remove('pk-dragging');
    f._pkSwiped = performance.now();
    const x = parseFloat(f.style.getPropertyValue('--pk-sx')) || 0;
    if (x < -N.swipeOpen) {
      f.style.setProperty('--pk-sx', -actionsWidth(f.parentElement) + 'px');
      swOpen = f;
      emit(f.parentElement, 'swipe', { open: true });
    } else closeSwipe(f);
  }
  doc.addEventListener('pointerup', endSwipe);
  doc.addEventListener('pointercancel', endSwipe);
  doc.addEventListener('click', (ev) => {
    const f = ev.target.closest && ev.target.closest('.pk-swipe-front');
    if (f && f._pkSwiped && performance.now() - f._pkSwiped < 400) {
      ev.stopPropagation();
      ev.preventDefault();
      return;
    }
    const act = ev.target.closest && ev.target.closest('.pk-swipe-actions > button');
    if (act) closeSwipe(act.closest('.pk-swipe').querySelector('.pk-swipe-front'));
  }, true);

  /* (40) reorderable list: in a .pk-reorder, hold a row's .pk-grip and drag. pk:reorder { from, to } fires first; call
     preventDefault() on it to move the rows yourself (for an app that redraws). */
  let reo = null;
  doc.addEventListener('pointerdown', (ev) => {
    if (ev.button > 0) return;
    const g = ev.target.closest && ev.target.closest('.pk-reorder .pk-grip');
    if (!g) return;
    ev.preventDefault();
    const list = g.closest('.pk-reorder'), r = Array.from(list.children).find((c) => c.contains(g));
    const rows = Array.from(list.children);
    reo = { list, r, y0: ev.clientY, i0: rows.indexOf(r), to: rows.indexOf(r), h: r.offsetHeight, rows, id: ev.pointerId };
    try {
      g.setPointerCapture(ev.pointerId);
    } catch (e) {}
    r.classList.add('pk-lifted');
  });
  doc.addEventListener('pointermove', (ev) => {
    const d = reo;
    if (!d || ev.pointerId !== d.id) return;
    const dy = (ev.clientY - d.y0) / scaleOf(d.list);
    d.r.style.translate = '0 ' + dy.toFixed(1) + 'px';
    d.r.style.scale = motion.reduced() ? '' : '1.02';
    const to = Math.max(0, Math.min(d.rows.length - 1, d.i0 + Math.round(dy / d.h)));
    d.to = to;
    d.rows.forEach((x, j) => {
      if (x === d.r) return;
      let sh = 0;
      if (d.i0 < to && j > d.i0 && j <= to) sh = -d.h;
      if (d.i0 > to && j < d.i0 && j >= to) sh = d.h;
      x.style.translate = sh ? '0 ' + sh + 'px' : '';
    });
  });
  function endReo(ev) {
    const d = reo;
    if (!d || ev.pointerId !== d.id) return;
    reo = null;
    d.r.classList.remove('pk-lifted');
    d.rows.forEach((x) => {
      x.style.transition = 'none';
      x.style.translate = '';
      x.style.scale = '';
    });
    if (d.to !== d.i0) {
      const e = emit(d.list, 'reorder', { from: d.i0, to: d.to, row: d.r });
      if (!e.defaultPrevented) {
        const arr = d.rows.slice();
        arr.splice(d.i0, 1);
        arr.splice(d.to, 0, d.r);
        arr.forEach((x) => d.list.append(x));
      }
    }
    void d.list.offsetWidth;
    d.rows.forEach((x) => (x.style.transition = ''));
  }
  doc.addEventListener('pointerup', endReo);
  doc.addEventListener('pointercancel', endReo);

  /* ==PARTS== (each group below adds its part) */

  /* ============================================================================================================
     THE PUBLIC CALLS
     ============================================================================================================ */
  const Parts = {
    version: VERSION,
    settings,
    get current() {
      return clone(Object.assign({}, S, { root: null }));
    },
    problems,
    check: () => problems.slice(),
    allowed: (group, key) => {
      const g = { submenus: S.menu.submenus, appear: S.glass.appear, glint: S.press.glint, withStops: S.sheet.withStops, growsToFull: S.sheet.growsToFull, fullScreen: S.sheet.fullScreen }[group];
      return allowed(g, key);
    },
    motion,
    N,
    SCHEMA,
    DEFAULTS: clone(DEFAULTS),
    own: () => S.own,
    layer,
    rel,
    refresh: refreshAll,
    html: {
      // the 8-spoke iOS spinner
      spinner: () => {
        let l = '';
        for (let i = 0; i < 8; i++)
          l += '<line x1="12" y1="3" x2="12" y2="7.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" opacity="' + (0.25 + i * 0.1).toFixed(2) + '" transform="rotate(' + i * 45 + ' 12 12)"/>';
        return '<svg class="pk-spinner" viewBox="0 0 24 24" data-name="Spinner" aria-label="Loading">' + l + '</svg>';
      },
    },
    setSwitch: (sw, on) => setSwitch(sw, !!on, true),
    setSlider: (sl, v) => setSlider(sl, v, false),
    setStepper: (st, v) => setStepper(st, v, true),
    select: (barEl, i) => selectBar(barEl, i, true),
    push,
    pop,
    bar,
    appear: (el, o) => (allowed(S.glass.appear, o && o.key) ? appearAs(el, (o && o.from) || 1.15) : Promise.resolve()),
    leave: (el, o) => (allowed(S.glass.appear, o && o.key) ? leaveAs(el) : (el.remove(), Promise.resolve())),
  };
  Object.assign(Parts, window.__pkParts || {});
  window.Parts = Parts;
  apply();
})();
