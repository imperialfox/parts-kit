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
  };
  Object.assign(Parts, window.__pkParts || {});
  window.Parts = Parts;
  apply();
})();
