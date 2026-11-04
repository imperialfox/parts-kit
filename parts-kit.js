/* Parts kit 1.1.0 · one set of Liquid Glass parts for any app or prototype. MIT licence.
   Numbers from sdegenaar/liquid_glass_widgets (MIT), measured against iOS where marked.

   Use: load parts-kit.css and this file, then your settings file:  Parts.settings({ app: 'My app', … })
   Parts are plain HTML with pk- classes, so screens drawn as HTML text work: the kit listens on the document and finds
   the part under the finger. Overlays (sheets, menus, alerts, toasts) are made by calls: Parts.sheet({…}), Parts.menu(…).
   Every part sends pk: events (pk:change, pk:hold, pk:reorder, pk:close …) that bubble, so the app can listen once.
   An app can differ from the kit for the whole app (a timing in its stylesheet, a spring in springs: {…}) or for one
   element (a timing or --spring-… in its style); Parts.differences() lists every difference.
   README.md lists every part, setting and call. */
(function () {
  'use strict';
  if (window.Parts && window.Parts.version) return;
  const VERSION = '1.1.0';
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
  const BOOL = 'boolean', NUM = 'number', STR = 'string', LIST = 'list', ANY = 'any', SPRINGMAP = 'springs';
  const SCHEMA = {
    app: STR,
    motion: ['kit', 'app'],
    springs: SPRINGMAP,
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
    springs: {},
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
      if (want === SPRINGMAP) return springLines(v, p, no, out, bad);
      if (Array.isArray(want)) {
        if (!want.includes(v)) no(p + " should be one of '" + want.join("', '") + "'");
      } else if (want === LIST) {
        if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) no(p + ' should be a list of names');
      } else if (typeof want === 'object') validate(v, want, p, out, bad);
      else if (typeof v !== want) no(p + ' should be a ' + want);
    });
  }
  // springs: { press: { z: 0.8, f: 3.6 } } changes one of the kit's named springs for this app; null puts it back
  const SPRING_Z = [0.05, 1], SPRING_F = [0.1, 20];
  function springLines(v, p, no, out, bad) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return no(p + ' should be an object of springs, like { press: { z: 0.8, f: 3.6 } }');
    Object.keys(v).forEach((name) => {
      const q = p + '.' + name, x = v[name];
      const bad1 = (m) => {
        out.push(m);
        bad.add(q);
      };
      if (!SPRINGS[name]) return bad1('Unknown spring: ' + q + " (the kit's springs: " + Object.keys(SPRINGS).join(', ') + ')');
      if (x === null) return;
      if (!x || typeof x !== 'object' || Array.isArray(x) || Object.keys(x).some((k) => k !== 'z' && k !== 'f'))
        return bad1(q + ' should be { z, f } (or null for the kit\'s own)');
      const inRange = (n, r) => typeof n === 'number' && isFinite(n) && n >= r[0] && n <= r[1];
      if (!inRange(x.z, SPRING_Z) || !inRange(x.f, SPRING_F))
        bad1(q + ' should have z from ' + SPRING_Z.join(' to ') + ' and f from ' + SPRING_F.join(' to ') + ' Hz');
    });
  }
  // keeps every good line; a bad one leaves the setting as it was
  function merge(into, from, schema, path, bad) {
    Object.keys(from).forEach((k) => {
      const p = path ? path + '.' + k : k;
      const want = schema[k];
      if (want === undefined || bad.has(p)) return;
      if (want === SPRINGMAP) {
        Object.keys(from[k]).forEach((name) => {
          if (bad.has(p + '.' + name)) return;
          if (from[k][name] === null) delete into[k][name];
          else into[k][name] = { z: from[k][name].z, f: from[k][name].f };
        });
        return;
      }
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
    motion.use(S.springs);
    motion.publish();
    localizeAll();
  }

  /* ============================================================================================================
     MOTION · the spring core. Springs are a damping ratio ζ and a frequency in Hz, sampled into CSS linear() and
     published as --ease-<name> / --dur-<name>. Speed: 1 normal, 4 slow, 0 off. Reduce Motion puts .motion-reduced
     on <html>. motion: 'app' uses the app's own MOTION instead (its springs, speed and Reduce Motion), and the
     kit only adds the springs the app doesn't have (it needs the app's motion object on window, as window.MOTION).
     springs: {…} in the settings changes a named spring for the whole app: in the CSS and in the code alike.
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
  // the springs in use: the kit's, with the app's springs: {…} lines on top
  const E = {};
  const C = {};
  function use(over) {
    Object.keys(SPRINGS).forEach((k) => {
      const s = (over && over[k]) || SPRINGS[k];
      if (C[k] && E[k] && E[k].z === s.z && E[k].f === s.f) return;
      E[k] = { z: s.z, f: s.f };
      C[k] = curve(s.z, s.f);
    });
  }
  use(null);

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
    // the springs the kit and the app both have must be the same (the kit's check uses this); the kit's side
    // includes the app's springs: {…} lines
    function compare(other) {
      const o = other || (window.MOTION && window.MOTION.SPRINGS) || {};
      const diff = [];
      Object.keys(o).forEach((k) => {
        if (!E[k]) return;
        const a = E[k], b = o[k];
        if (Math.abs(a.z - b.z) > 1e-6 || Math.abs(a.f - b.f) > 1e-6) diff.push(k);
      });
      return diff;
    }
    // which spring an element uses for a named one: its own --spring-<name> (in its style or a parent's), or the
    // spring whose curve its --ease-<name> carries (the stylesheet form), else the same name
    function springOf(k, el) {
      if (!el || !el.isConnected || !C[k]) return k;
      const cs = getComputedStyle(el);
      const n = cs.getPropertyValue('--spring-' + k).trim();
      if (n && C[n]) return n;
      const e = cs.getPropertyValue('--ease-' + k).trim();
      const h = getComputedStyle(html);
      if (!e || e === h.getPropertyValue('--ease-' + k).trim()) return k;
      return Object.keys(C).find((x) => h.getPropertyValue('--ease-' + x).trim() === e) || k;
    }
    return {
      SPRINGS,
      springs: () => clone(E),
      use,
      springOf,
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
      // how long a spring runs now, in ms (0 when motion is off or reduced); give the element to follow its own spring
      spring: (k, el) => {
        const n = springOf(k, el);
        return on() && C[n] ? Math.round(C[n].ms * sp()) : 0;
      },
      ease: (k, el) => {
        const n = springOf(k, el);
        return C[n] ? C[n].ease : 'ease';
      },
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
  // a named value from the stylesheet, read from the element first, then its parents, then the page (the same
  // order the CSS follows); with no element, or one not on the page yet, it's read where the parts live
  const tok = (name, el) => getComputedStyle(el && el.isConnected ? el : rootEl()).getPropertyValue(name).trim();
  const tokMs = (name, el) => {
    const v = tok(name, el);
    const m = /^(-?[\d.]+)(ms|s)$/.exec(v);
    return m ? +m[1] * (m[2] === 's' ? 1000 : 1) : 0;
  };
  // a fixed timing (--dur-…) at the current speed; under Reduce Motion pass fade=true for the short fade instead
  const dur = (name, el) => Math.round(tokMs(name, el) * motion.speed());
  const ease = (name, el) => tok(name, el) || 'ease';
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
  // an overlay the kit makes: its name, and any style the app gives it (o.style, e.g. '--dur-rise: 600ms')
  function named(el, o, plain) {
    el.dataset.name = nm(o, plain);
    if (o && typeof o.style === 'string' && o.style) {
      el.style.cssText += ';' + o.style;
      localize(el);
    }
  }

  /* ============================================================================================================
     ONE ELEMENT · an element can carry its own timing in its style (--dur-rise: 600ms), which the CSS and the code
     both follow, or its own spring for a named one (--spring-sheet: gentle). For a spring the kit fills in that
     element's --ease-sheet and --dur-sheet from the chosen spring, so the CSS follows it at every speed.
     ============================================================================================================ */
  function localize(el) {
    const st = el.style, want = {};
    for (let i = 0; i < st.length; i++) if (st[i].startsWith('--spring-')) want[st[i].slice(9)] = st.getPropertyValue(st[i]).trim();
    const had = el._pkSprings || {};
    Object.keys(had).forEach((k) => {
      if (want[k]) return;
      st.removeProperty('--ease-' + k);
      st.removeProperty('--dur-' + k);
    });
    const now = {};
    Object.keys(want).forEach((k) => {
      const n = want[k];
      if (!C[k] || !C[n]) {
        const m = 'Unknown spring in a style: --spring-' + k + ': ' + n + (el.dataset.name ? ' (' + el.dataset.name + ')' : '');
        if (!problems.includes(m)) {
          problems.push(m);
          if (window.console) console.error('Parts kit: ' + m);
        }
        return;
      }
      now[k] = n;
      const e = 'var(--ease-' + n + ')', d = 'var(--dur-' + n + ')';
      if (st.getPropertyValue('--ease-' + k) !== e) st.setProperty('--ease-' + k, e);
      if (st.getPropertyValue('--dur-' + k) !== d) st.setProperty('--dur-' + k, d);
    });
    if (Object.keys(now).length || el._pkSprings) el._pkSprings = now;
  }
  const localizeAll = () => $$('[style*="--spring-"]').forEach(localize);
  if (window.MutationObserver) {
    new MutationObserver((list) => {
      list.forEach((r) => {
        if (r.type === 'attributes') {
          const t = r.target;
          if (t._pkSprings || (t.getAttribute('style') || '').includes('--spring-')) localize(t);
        } else
          r.addedNodes.forEach((n) => {
            if (n.nodeType !== 1) return;
            if ((n.getAttribute('style') || '').includes('--spring-')) localize(n);
            $$('[style*="--spring-"]', n).forEach(localize);
          });
      });
    }).observe(html, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
  }

  /* ============================================================================================================
     DIFFERENCES · Parts.differences() lists every spring, timing and setting where the app differs from the kit:
     the whole app (settings, springs: {…}, timings in its stylesheet) and single elements on the current screen.
     Each line has a key (e.g. 'spring press', 'timing --dur-close', 'element New song › --dur-rise'), so an app's
     own test can keep a list with a decision ID per line and fail on any difference that isn't on it.
     ============================================================================================================ */
  // the kit's own timings, read from its defaults block (the rule that sets --pk-speed)
  let kitTimes = null;
  function kitTimings() {
    if (kitTimes) return kitTimes;
    const out = {};
    const walk = (rules) => {
      for (const r of rules) {
        if (r.cssRules && !r.selectorText) walk(r.cssRules);
        else if (r.selectorText === ':where(:root)' && r.style.getPropertyValue('--pk-speed'))
          for (let i = 0; i < r.style.length; i++) {
            const n = r.style[i];
            if (/^--(dur|ease)-/.test(n) && !C[n.replace(/^--(dur|ease)-/, '')]) out[n] = r.style.getPropertyValue(n).trim();
          }
      }
    };
    for (const sh of Array.from(doc.styleSheets)) {
      try {
        walk(sh.cssRules);
      } catch (e) {
        /* another site's stylesheet: not the kit's */
      }
    }
    if (Object.keys(out).length) kitTimes = out;
    return out;
  }
  const sameTime = (a, b) => {
    const ms = (v) => {
      const m = /^(-?[\d.]+)(ms|s)$/.exec(v);
      return m ? +m[1] * (m[2] === 's' ? 1000 : 1) : null;
    };
    const x = ms(a), y = ms(b);
    if (x != null && y != null) return Math.abs(x - y) < 0.01;
    return a.replace(/\s+/g, '') === b.replace(/\s+/g, '');
  };
  const label = (el) =>
    el.dataset.name || (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.classList.length ? '.' + Array.from(el.classList).join('.') : ''));
  const show = (v) => (typeof v === 'string' ? v : JSON.stringify(v));
  function differences(o) {
    o = o || {};
    const out = [];
    const add = (kind, name, app, kit, el) => {
      const key = (kind === 'element' ? 'element ' + label(el) + ' › ' : kind + ' ') + name;
      const d = { key, kind, name, app, kit, text: key + ': ' + show(app) + (kind === 'element' ? ' (around it: ' : ' (kit: ') + show(kit) + ')' };
      if (el) d.el = el;
      out.push(d);
    };
    // settings
    const walk = (schema, cur, def, path) =>
      Object.keys(schema).forEach((k) => {
        const p = path ? path + '.' + k : k;
        if (!path && (k === 'app' || k === 'root' || k === 'own' || k === 'springs')) return;
        const want = schema[k];
        if (want && typeof want === 'object' && !Array.isArray(want)) return walk(want, cur[k], def[k], p);
        if (JSON.stringify(cur[k]) !== JSON.stringify(def[k])) add('setting', p, clone(cur[k]), clone(def[k]));
      });
    walk(SCHEMA, S, DEFAULTS, '');
    // springs for the whole app
    Object.keys(S.springs).forEach((k) => add('spring', k, clone(S.springs[k]), clone(SPRINGS[k])));
    // timings for the whole app (the app's stylesheet)
    const kit = kitTimings();
    const hs = getComputedStyle(html);
    Object.keys(kit).forEach((n) => {
      const v = hs.getPropertyValue(n).trim();
      if (v && !sameTime(v, kit[n])) add('timing', n, v, kit[n]);
    });
    // single elements on the current screen: a timing or spring that differs from its parent's
    localizeAll();
    const R = o.root ? (typeof o.root === 'string' ? doc.querySelector(o.root) : o.root) : rootEl();
    if (R) {
      const names = Object.keys(kit);
      const springs = Object.keys(C);
      const cs = new Map();
      const style = (el) => {
        if (!cs.has(el)) cs.set(el, getComputedStyle(el));
        return cs.get(el);
      };
      const els = [R].concat($$('*', R)).filter((el) => el !== html && el.parentElement);
      els.forEach((el) => {
        const a = style(el), b = style(el.parentElement);
        names.forEach((n) => {
          const x = a.getPropertyValue(n).trim(), y = b.getPropertyValue(n).trim();
          if (x !== y && !sameTime(x, y)) add('element', n, x, y, el);
        });
        springs.forEach((k) => {
          const x = a.getPropertyValue('--ease-' + k).trim(), y = b.getPropertyValue('--ease-' + k).trim();
          if (x === y && a.getPropertyValue('--spring-' + k) === b.getPropertyValue('--spring-' + k)) return;
          const mine = motion.springOf(k, el), theirs = motion.springOf(k, el.parentElement);
          if (mine !== theirs) add('element', 'spring ' + k, mine, theirs, el);
        });
      });
    }
    return out;
  }
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
    after(() => d.remove(), ms != null ? ms : dur('--dur-fade', d));
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
    el.classList.toggle('pk-glinting', glint);
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
        after(() => k.classList.remove('pk-squish'), dur('--dur-squish', k));
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
    }, motion.spring('nav', page));
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
      const T = dur('--dur-morph', btn);
      if (!old) return;
      if (!motion.on() || !T) {
        if (motion.reduced() && T) {
          old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur('--dur-reduced', btn), fill: 'forwards' }).onfinish = () => old.remove();
          nu.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur('--dur-reduced', btn) });
        } else old.remove();
        return;
      }
      old.animate([{ opacity: 1, filter: 'blur(0px)' }, { opacity: 0, filter: 'blur(6px)' }], { duration: T * 0.42, easing: 'linear', fill: 'forwards' }).onfinish = () => old.remove();
      nu.animate([{ opacity: 0, filter: 'blur(3.5px)' }, { opacity: 0, filter: 'blur(3.5px)', offset: 0.25 }, { opacity: 1, filter: 'blur(0px)' }], { duration: T * 0.84, easing: ease('--ease-out', btn) });
      btn.animate([{ scale: '1' }, { scale: '1.22', offset: 0.6 }, { scale: '0.98', offset: 0.85 }, { scale: '1' }], { duration: T, easing: ease('--ease-out', btn), composite: 'add' });
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
    const T = dur('--dur-appear', el);
    if (!force && !motion.on()) return Promise.resolve();
    if (!T) return Promise.resolve();
    if (motion.reduced()) return el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur('--dur-reduced', el) }).finished.catch(() => {});
    const inner = el.querySelector('svg, .pk-ico, span');
    if (inner) inner.animate([{ opacity: 0, filter: 'blur(8px)' }, { opacity: 0, filter: 'blur(8px)', offset: 0.35 }, { opacity: 1, filter: 'blur(0px)' }], { duration: T, easing: 'linear' });
    return el.animate([{ scale: String(from), opacity: 0 }, { scale: '1', opacity: 1, offset: 0.92 }, { scale: '1', opacity: 1 }], { duration: T, easing: 'linear' }).finished.catch(() => {});
  }
  function leaveAs(el) {
    const T = dur('--dur-leave', el);
    const done = () => el.remove();
    if (!T) {
      done();
      return Promise.resolve();
    }
    if (motion.reduced()) {
      const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur('--dur-reduced', el), fill: 'forwards' });
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
    if (motion.on()) b.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur('--dur-fade', b) });
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
      after(() => sw.classList.remove('pk-swell'), dur('--dur-switch', sw));
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
    }, motion.spring('gentle', front) || 1);
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

  /* ============================================================================================================
     OVERLAYS
     ============================================================================================================ */
  const closeBtn = (o, extra) =>
    '<button class="pk-btn pk-circle pk-sm ' + (extra || 'pk-clear') + ' pk-press pk-sheet-close" data-name="' + nm({ name: o && o.closeName }, 'Close button') + '" aria-label="Close">' + icon('x', 18) + '</button>';
  const content = (x) => (x == null ? '' : typeof x === 'string' ? x : '');
  const place = (el, x) => {
    if (x && x.nodeType === 1) el.append(x);
  };

  /* (41, 42) Parts.sheet({ title, html | node, key, name, style, closeName, onClose }) → { el, body, close(), grow(),
     to(stop) }. key is the sheet's name in the settings: sheet.withStops gives it the 45% and full stops,
     sheet.growsToFull lets grow() raise it to full screen, sheet.fullScreen opens it as a cover instead. */
  function sheet(o) {
    o = o || {};
    if (allowed(S.sheet.fullScreen, o.key)) return cover(o);
    const H = screenH();
    const withStops = allowed(S.sheet.withStops, o.key);
    const canGrow = allowed(S.sheet.growsToFull, o.key);
    const el = doc.createElement('div');
    el.className = 'pk-sheet pk-glass' + (S.sheet.glass === 'strong' ? ' pk-strong' : '');
    named(el, o, 'Sheet');
    el.setAttribute('role', 'dialog');
    el.innerHTML =
      '<i class="pk-sheet-solid"></i><div class="pk-sheet-head"><i class="pk-grabber" data-name="Grabber"></i><div class="pk-sheet-title">' +
      esc(o.title || '') + '</div>' + closeBtn(o) + '</div><div class="pk-sheet-body">' + content(o.html) + '</div>';
    const body = el.querySelector('.pk-sheet-body');
    place(body, o.html);
    const dim = dimLayer('', () => ctl.close());
    layer().append(el);
    // the stops, as visible heights
    const margin = 8;
    let stops;
    if (withStops) stops = [Math.round(H * N.medium), H - N.topInset];
    else {
      el.style.height = 'auto';
      el.style.maxHeight = H - N.topInset + 'px';
      el.style.setProperty('--pk-y', '0px');
      el.style.visibility = 'hidden';
      const h = Math.min(H - N.topInset, el.offsetHeight);
      el.style.visibility = '';
      el.style.maxHeight = '';
      stops = [h];
    }
    const full = H;
    let grown = false;
    const tall = () => (canGrow ? full : stops[stops.length - 1]);
    el.style.height = tall() + 'px';
    let cur = stops[0];
    const big = (h) => withStops && h >= H - N.topInset - 1;
    function setAt(h, how) {
      // how: 'snap' (spring), 'drag' (follows the finger), 'leave'
      el.classList.toggle('pk-dragging', how === 'drag');
      const m = big(h) || h >= full - 1 ? 0 : margin;
      el.style.setProperty('--pk-m', m + 'px');
      el.style.setProperty('--pk-y', (tall() - h + (m ? 0 : 0)).toFixed(1) + 'px');
      el.classList.toggle('pk-solid-now', big(h) || h >= full - 1);
    }
    const ctl = track({
      el,
      body,
      key: o.key,
      get stop() {
        return cur >= full - 1 ? 'full' : withStops && cur === stops[1] ? 'large' : withStops ? 'medium' : 'fit';
      },
      to(name) {
        const h = name === 'full' ? (canGrow ? full : stops[stops.length - 1]) : name === 'large' && withStops ? stops[1] : stops[0];
        cur = h;
        if (h >= full - 1) grown = true;
        setAt(h, 'snap');
      },
      grow() {
        if (!canGrow) return false;
        grown = true;
        cur = full;
        setAt(full, 'snap');
        emit(el, 'grow');
        return true;
      },
      close(why) {
        if (ctl.closed) return;
        ctl.closed = true;
        untrack(ctl);
        el.classList.add('pk-leaving');
        el.classList.remove('pk-dragging');
        if (motion.reduced()) el.style.opacity = '0';
        else el.style.setProperty('--pk-y', tall() + margin + 20 + 'px');
        dropDim(dim, dur('--dur-leave', el));
        after(() => el.remove(), motion.reduced() ? dur('--dur-reduced', el) : dur('--dur-leave', el));
        emit(el, 'close', { why: why || 'close' });
        if (o.onClose) o.onClose(why || 'close');
      },
    });
    el.querySelector('.pk-sheet-close').addEventListener('click', () => ctl.close('button'));
    // in: from below the screen to the first stop
    el.style.setProperty('--pk-m', margin + 'px');
    if (motion.reduced()) {
      el.style.opacity = '0';
      setAt(cur, 'snap');
      void el.offsetWidth;
      el.style.transition = 'opacity ' + dur('--dur-reduced', el) + 'ms';
      el.style.opacity = '1';
      after(() => (el.style.transition = ''), dur('--dur-reduced', el));
    } else {
      el.style.setProperty('--pk-y', tall() + margin + 'px');
      void el.offsetWidth;
      setAt(cur, 'snap');
    }
    // the content tells the sheet when it's scrolled to the top (so a pull down there moves the sheet)
    const atTop = () => body.classList.toggle('pk-at-top', body.scrollTop <= 0);
    body.addEventListener('scroll', atTop, { passive: true });
    atTop();
    // dragging: from the header always; from the content when it's at the top
    let d = null;
    el.addEventListener('pointerdown', (ev) => {
      if (ev.button > 0 || ctl.closed) return;
      if (ev.target.closest('button, a, input, textarea, select, [data-own-gesture], .pk-switch, .pk-slider, .pk-seg, .pk-swipe-front, .pk-grip')) return;
      const inBody = body.contains(ev.target);
      if (inBody && body.scrollTop > 0) return;
      d = { y: ev.clientY, id: ev.pointerId, base: cur, inBody, tr: tracker(), on: false, lastY: ev.clientY, gy: ev.clientY };
    });
    el.addEventListener('pointermove', (ev) => {
      if (!d || ev.pointerId !== d.id) return;
      const s = sc(), dy = (ev.clientY - d.y) / s;
      const step = (ev.clientY - d.lastY) / s;
      d.lastY = ev.clientY;
      const top = tall();
      // pulling up inside content that has more to show: scroll the content instead
      if (d.inBody && !d.on && cur >= stops[stops.length - 1] - 1 && (step < 0 || body.scrollTop > 0) && body.scrollHeight > body.clientHeight + 1) {
        body.scrollTop -= step;
        return;
      }
      if (!d.on) {
        if (Math.abs(dy) < 4) return;
        d.on = true;
        try {
          el.setPointerCapture(ev.pointerId);
        } catch (e) {}
      }
      let h = d.base - dy;
      if (h > top) h = top + (h - top) * 0.08;
      d.h = h;
      d.tr.add(-h);
      const lowest = stops[0];
      if (S.sheet.dragShrink && h < lowest && !motion.reduced()) {
        // (D14's alternative) shrink while dragged down: 1 − 0.64 × travel ÷ height, 1:1 to 0.48, then resisting to 0.33
        const t = (lowest - h) / el.offsetHeight;
        const k = N.shrink;
        const sAt = t <= k.linear ? 1 - k.k * t : k.floor + (1 - k.k * k.linear - k.floor) * Math.exp(-(t - k.linear) * 3);
        el.style.transformOrigin = '50% ' + (((d.gy - el.getBoundingClientRect().top) / s) | 0) + 'px';
        el.style.setProperty('--pk-shrink', sAt.toFixed(4));
      }
      setAt(h, 'drag');
    });
    function up(ev) {
      if (!d || ev.pointerId !== d.id) return;
      const was = d;
      d = null;
      if (!was.on || was.h == null) return;
      el.style.removeProperty('--pk-shrink');
      const v = was.tr.v(); // pt/s, positive = downward
      const h = was.h;
      const all = [0].concat(stops, grown && canGrow ? [full] : []);
      const i = Math.max(0, all.indexOf(was.base));
      let target;
      if (Math.abs(v) > N.flick) target = all[Math.max(0, Math.min(all.length - 1, i + (v > 0 ? -1 : 1)))];
      else {
        const dir = h < was.base ? -1 : 1, nx = all[Math.max(0, Math.min(all.length - 1, i + dir))];
        target = nx !== was.base && Math.abs(h - was.base) >= N.snapAt * Math.abs(nx - was.base) ? nx : was.base;
      }
      if (target === 0) ctl.close('drag');
      else {
        cur = target;
        setAt(target, 'snap');
        emit(el, 'stop', { stop: ctl.stop });
      }
    }
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    emit(el, 'open', { key: o.key });
    return ctl;
  }

  /* (43) Parts.cover({ title, html | node, name, style, onClose }) → { el, body, close() } */
  function cover(o) {
    o = o || {};
    const el = doc.createElement('div');
    el.className = 'pk-cover';
    named(el, o, 'Full-screen cover');
    el.setAttribute('role', 'dialog');
    el.innerHTML =
      '<div class="pk-bar-slot pk-right">' + closeBtn(o, 'pk-glass').replace('pk-sm ', '') + '</div><div class="pk-cover-body">' +
      (o.title ? '<h1 class="pk-large-title">' + esc(o.title) + '</h1>' : '') + content(o.html) + '</div>';
    const body = el.querySelector('.pk-cover-body');
    place(body, o.html);
    layer().append(el);
    void el.offsetWidth;
    el.classList.add('pk-on');
    const ctl = track({
      el,
      body,
      key: o.key,
      stop: 'full',
      grow: () => false,
      to() {},
      close(why) {
        if (ctl.closed) return;
        ctl.closed = true;
        untrack(ctl);
        el.classList.add('pk-leaving');
        el.classList.remove('pk-on');
        after(() => el.remove(), motion.reduced() ? dur('--dur-reduced', el) : dur('--dur-leave', el));
        emit(el, 'close', { why: why || 'close' });
        if (o.onClose) o.onClose(why || 'close');
      },
    });
    el.querySelector('.pk-sheet-close').addEventListener('click', () => ctl.close('button'));
    emit(el, 'open', { key: o.key });
    return ctl;
  }

  /* (16, 44) growing out of a button: place a panel next to its anchor and morph it out of the anchor */
  function morphFrom(anchor, panel, where) {
    layer().append(panel);
    const b = rel(anchor), pw = panel.offsetWidth, ph = panel.offsetHeight, W = screenW(), Hh = screenH();
    where = where || (b.x + b.w / 2 > (W * 2) / 3 ? 'right' : b.x + b.w / 2 < W / 3 ? 'left' : 'center');
    let x = where === 'right' ? b.x + b.w - pw : where === 'center' ? b.x + b.w / 2 - pw / 2 : b.x;
    x = Math.max(12, Math.min(W - pw - 12, x));
    let y = b.y + b.h + 8;
    if (y + ph > Hh - 24) y = Math.max(12, b.y - ph - 8);
    panel.style.left = x + 'px';
    panel.style.top = y + 'px';
    panel.style.setProperty('--pk-ox', (b.x + b.w / 2 - x).toFixed(1) + 'px');
    panel.style.setProperty('--pk-oy', (y > b.y ? 0 : ph) + 'px');
    panel.style.setProperty('--pk-s0x', Math.min(1, b.w / pw).toFixed(3));
    panel.style.setProperty('--pk-s0y', Math.min(1, b.h / ph).toFixed(3));
    void panel.offsetWidth;
    panel.classList.add('pk-on');
  }
  function unmorph(panel) {
    panel.classList.remove('pk-on');
    panel.classList.add('pk-leaving');
    after(() => panel.remove(), Math.max(motion.spring('menu-close', panel) * 0.6, dur('--dur-close', panel), motion.reduced() ? dur('--dur-reduced', panel) : 0));
  }

  /* menus: items are { label, icon (svg text), red, disabled, value, sub: [items] } or '-' for a gap */
  function menuRows(items, subsOn) {
    return items
      .map((it, i) => {
        if (it === '-') return '<div class="pk-menu-sep"></div>';
        if (it.sub && !subsOn)
          return '<div class="pk-menu-label">' + esc(it.label) + '</div>' + menuRows(it.sub, false) + (i < items.length - 1 && items[i + 1] !== '-' ? '<div class="pk-menu-sep"></div>' : '');
        return (
          '<button class="pk-menu-item' + (it.red ? ' pk-red' : '') + '" data-i="' + i + '"' + (it.disabled ? ' disabled' : '') + ' data-name="Menu row: ' + esc(it.label) + '"><span>' +
          esc(it.label) + '</span>' + (it.sub ? icon('chevR', 18) : it.icon || '') + '</button>'
        );
      })
      .join('');
  }
  function flatItems(items, subsOn) {
    // the item objects in the same order as their rows, for picking
    const out = [];
    items.forEach((it) => {
      if (it === '-') return;
      if (it.sub && !subsOn) out.push(...flatItems(it.sub, false));
      else out.push(it);
    });
    return out;
  }
  function buildMenu(items, o, subsOn) {
    const m = doc.createElement('div');
    m.className = 'pk-menu pk-morph';
    named(m, o, 'Menu');
    m.setAttribute('role', 'menu');
    m.innerHTML = menuRows(items, subsOn);
    // number the rows in order so a flattened submenu still picks the right item
    const list = flatItems(items, subsOn);
    $$('.pk-menu-item', m).forEach((b, i) => (b.dataset.i = i));
    m._items = list;
    return m;
  }
  /* Parts.menu(anchor, items, { key, name, style, place: 'left' | 'center' | 'right', onPick(item) }) → { el, close() }
     (16) a pull-down menu growing out of its button. (45, pinned) items with sub open a submenu where
     menu.submenus names the menu's key; elsewhere they're shown inline under a small label. */
  function menu(anchor, items, o) {
    o = o || {};
    const subsOn = allowed(S.menu.submenus, o.key);
    const m = buildMenu(items, o, subsOn);
    let sub = null;
    const dim = dimLayer('pk-clear-dim', () => ctl.close());
    morphFrom(anchor, m, o.place);
    const ctl = track({
      el: m,
      close() {
        if (ctl.closed) return;
        ctl.closed = true;
        untrack(ctl);
        unmorph(m);
        if (sub) {
          const sb = sub;
          sb.classList.remove('pk-on');
          after(() => sb.remove(), dur('--dur-fade', sb));
        }
        dropDim(dim, 0);
        emit(anchor, 'close');
      },
    });
    function pick(it, row) {
      if (it.sub && subsOn) return openSub(it, row);
      ctl.close();
      emit(anchor, 'pick', { item: it, value: it.value != null ? it.value : it.label });
      if (o.onPick) o.onPick(it);
    }
    function openSub(it) {
      const sb = buildMenu([{ label: it.label, back: true }].concat(it.sub), { name: 'Submenu' }, false);
      sb.classList.remove('pk-morph');
      sb.classList.add('pk-submenu');
      sb.firstChild.innerHTML = icon('chevL', 18) + '<span style="font-weight:600">' + esc(it.label) + '</span>';
      layer().append(sb);
      const r = rel(m);
      sb.style.left = r.x + 10 + 'px';
      sb.style.top = r.y + 26 + 'px';
      m.classList.add('pk-recede');
      void sb.offsetWidth;
      sb.classList.add('pk-on');
      sub = sb;
      sb.addEventListener('click', (ev) => {
        const b = ev.target.closest('.pk-menu-item');
        if (!b) return;
        const x = sb._items[+b.dataset.i];
        if (x.back) {
          m.classList.remove('pk-recede');
          sb.classList.remove('pk-on');
          after(() => sb.remove(), dur('--dur-recede', sb));
          sub = null;
          return;
        }
        pick(Object.assign({ parent: it.label }, x));
      });
      emit(anchor, 'submenu', { item: it });
    }
    m.addEventListener('click', (ev) => {
      const b = ev.target.closest('.pk-menu-item');
      if (b && !b.disabled) pick(m._items[+b.dataset.i], b);
    });
    emit(anchor, 'open');
    return ctl;
  }

  /* (44) Parts.popover(anchor, html | node, { name, style }) → { el, close() }: grows out of its button; tap outside closes */
  function popover(anchor, html, o) {
    o = o || {};
    const p = doc.createElement('div');
    p.className = 'pk-popover pk-morph';
    named(p, o, 'Popover');
    p.innerHTML = content(html);
    place(p, html);
    const dim = dimLayer('pk-clear-dim', () => ctl.close());
    morphFrom(anchor, p, o.place || 'center');
    const ctl = track({
      el: p,
      close() {
        if (ctl.closed) return;
        ctl.closed = true;
        untrack(ctl);
        unmorph(p);
        dropDim(dim, 0);
      },
    });
    return ctl;
  }

  /* (46) long-press: hold a .pk-hold. It lifts from timing.lift (200 ms) and at timing.hold (700 ms) sends pk:hold;
     call ev.detail.open(items, { onPick, name }) in your listener to show its menu. Moving more than 10 pt or letting
     go early cancels; right-click opens it at once. */
  let hold = null;
  function contextMenu(row, items, o) {
    o = o || {};
    row.classList.remove('pk-lifting');
    const b = rel(row);
    const clone = row.cloneNode(true);
    clone.removeAttribute('id');
    $$('[id]', clone).forEach((x) => x.removeAttribute('id'));
    clone.classList.remove('pk-hold', 'pk-lifting', 'pk-pressed');
    clone.classList.add('pk-lift-clone');
    clone.dataset.name = 'Lifted row';
    clone.style.cssText += ';left:' + b.x + 'px;top:' + b.y + 'px;width:' + b.w + 'px;height:' + b.h + 'px;background:' + (getComputedStyle(row).backgroundColor === 'rgba(0, 0, 0, 0)' ? 'var(--surface)' : getComputedStyle(row).backgroundColor);
    const dim = dimLayer('pk-soft', () => ctl.close());
    layer().append(clone);
    const m = buildMenu(items, o, allowed(S.menu.submenus, o.key));
    layer().append(m);
    const W = screenW(), mh = m.offsetHeight, mw = m.offsetWidth;
    let y = b.y + b.h * N.liftScale + 8;
    if (y + mh > screenH() - 24) y = Math.max(12, b.y - mh - 8);
    const x = Math.max(12, Math.min(W - mw - 12, b.x + 8));
    m.style.left = x + 'px';
    m.style.top = y + 'px';
    m.style.setProperty('--pk-ox', '30px');
    m.style.setProperty('--pk-oy', (y > b.y ? 0 : mh) + 'px');
    m.style.setProperty('--pk-s0x', '0.3');
    m.style.setProperty('--pk-s0y', '0.3');
    void m.offsetWidth;
    m.classList.add('pk-on');
    const ctl = track({
      el: m,
      close() {
        if (ctl.closed) return;
        ctl.closed = true;
        untrack(ctl);
        unmorph(m);
        clone.style.opacity = '0';
        after(() => clone.remove(), dur('--dur-close', m));
        dropDim(dim, dur('--dur-close', m));
        emit(row, 'close');
      },
    });
    m.addEventListener('click', (ev) => {
      const bt = ev.target.closest('.pk-menu-item');
      if (!bt || bt.disabled) return;
      const it = m._items[+bt.dataset.i];
      ctl.close();
      emit(row, 'pick', { item: it, value: it.value != null ? it.value : it.label });
      if (o.onPick) o.onPick(it);
    });
    return ctl;
  }
  function fireHold(row, instant) {
    let opened = null;
    const ev = emit(row, 'hold', {
      instant: !!instant,
      open: (items, o) => (opened = contextMenu(row, items, o)),
    });
    if (!opened) row.classList.remove('pk-lifting');
    return ev;
  }
  const cancelHold = () => {
    if (!hold) return;
    clearTimeout(hold.t1);
    clearTimeout(hold.t2);
    hold.row.classList.remove('pk-lifting');
    hold = null;
  };
  doc.addEventListener('pointerdown', (ev) => {
    if (ev.button > 0) return;
    const row = ev.target.closest && ev.target.closest('.pk-hold');
    if (!row || ownedBy(ev.target, row)) return;
    cancelHold();
    const h = { row, x: ev.clientX, y: ev.clientY, id: ev.pointerId };
    h.t1 = later(() => {
      if (hold === h && !motion.reduced()) row.classList.add('pk-lifting');
    }, S.timing.lift);
    h.t2 = later(() => {
      if (hold !== h) return;
      hold = null;
      fireHold(row, false);
      row._pkHeld = performance.now();
    }, S.timing.hold);
    hold = h;
  });
  doc.addEventListener('pointermove', (ev) => {
    if (!hold || ev.pointerId !== hold.id) return;
    const s = scaleOf(hold.row);
    if (Math.hypot((ev.clientX - hold.x) / s, (ev.clientY - hold.y) / s) > N.holdMove) cancelHold();
  });
  doc.addEventListener('pointerup', cancelHold);
  doc.addEventListener('pointercancel', cancelHold);
  doc.addEventListener('contextmenu', (ev) => {
    const row = ev.target.closest && ev.target.closest('.pk-hold');
    if (!row) return;
    ev.preventDefault();
    cancelHold();
    fireHold(row, true);
  });
  // a tap that ends a hold isn't a click
  doc.addEventListener('click', (ev) => {
    const row = ev.target.closest && ev.target.closest('.pk-hold');
    if (row && row._pkHeld && performance.now() - row._pkHeld < 600) {
      ev.stopPropagation();
      ev.preventDefault();
    }
  }, true);

  /* (47) Parts.choices({ title, actions: [{ label, red, value }], cancel, key, name, style }) → Promise of the picked action's
     value (its label if no value), or null for Cancel. An action sheet (choices 'actionSheet', D07) or a sheet. */
  function choices(o) {
    o = o || {};
    const acts = o.actions || [];
    return new Promise((resolve) => {
      const done = (v) => resolve(v);
      if (S.choices === 'sheet') {
        let picked = null;
        const sh = sheet({
          key: o.key,
          name: o.name || 'Choices',
          style: o.style,
          title: o.title || '',
          html: '<div class="pk-list">' + acts.map((a, i) => '<button class="pk-row pk-tap" data-i="' + i + '" style="' + (a.red ? 'color:var(--danger)' : 'color:var(--accent)') + '"><span class="pk-row-text">' + esc(a.label) + '</span></button>').join('') + '</div>',
          onClose: () => done(picked),
        });
        sh.body.addEventListener('click', (ev) => {
          const b = ev.target.closest('[data-i]');
          if (!b) return;
          const a = acts[+b.dataset.i];
          picked = a.value != null ? a.value : a.label;
          sh.close('pick');
        });
        return;
      }
      const el = doc.createElement('div');
      el.className = 'pk-actions';
      named(el, o, 'Action sheet');
      el.setAttribute('role', 'dialog');
      el.innerHTML =
        '<div class="pk-actions-group pk-glass pk-strong">' + (o.title ? '<div class="pk-actions-title">' + esc(o.title) + '</div>' : '') +
        acts.map((a, i) => '<button class="pk-action' + (a.red ? ' pk-red' : '') + '" data-i="' + i + '" data-name="Action: ' + esc(a.label) + '">' + esc(a.label) + '</button>').join('') +
        '</div><div class="pk-actions-group pk-glass pk-strong"><button class="pk-action pk-cancel" data-i="-1" data-name="Cancel">' + esc(o.cancel || 'Cancel') + '</button></div>';
      const dim = dimLayer('pk-soft', () => ctl.close(null));
      layer().append(el);
      void el.offsetWidth;
      el.classList.add('pk-on');
      const ctl = track({
        el,
        close(v) {
          if (ctl.closed) return;
          ctl.closed = true;
          untrack(ctl);
          el.classList.add('pk-leaving');
          el.classList.remove('pk-on');
          dropDim(dim, dur('--dur-rise', el));
          after(() => el.remove(), motion.reduced() ? dur('--dur-reduced', el) : dur('--dur-rise', el));
          done(v === undefined ? null : v);
        },
      });
      el.addEventListener('click', (ev) => {
        const b = ev.target.closest('.pk-action');
        if (!b) return;
        const i = +b.dataset.i;
        ctl.close(i < 0 ? null : acts[i].value != null ? acts[i].value : acts[i].label);
      });
    });
  }

  /* (48) Parts.confirm({ title, message, action: 'Delete', red: true, cancel: 'Cancel', name, style }) → Promise<boolean>.
     An alert (confirm 'alert', D08: the app's own, never window.confirm) or a sheet. */
  function confirmBox(o) {
    o = o || {};
    const red = o.red !== false;
    return new Promise((resolve) => {
      if (S.confirm === 'sheet') {
        let yes = false;
        const sh = sheet({
          key: o.key,
          name: o.name || 'Confirmation',
          style: o.style,
          title: o.title || '',
          html:
            (o.message ? '<p class="pk-alert-text" style="text-align:center">' + esc(o.message) + '</p>' : '') +
            '<div style="display:flex;flex-direction:column;gap:10px"><button class="pk-alert-btn ' + (red ? 'pk-red' : 'pk-blue') + '" data-a="yes">' + esc(o.action || 'OK') + '</button><button class="pk-alert-btn" data-a="no">' + esc(o.cancel || 'Cancel') + '</button></div>',
          onClose: () => resolve(yes),
        });
        sh.body.addEventListener('click', (ev) => {
          const b = ev.target.closest('[data-a]');
          if (!b) return;
          yes = b.dataset.a === 'yes';
          sh.close(yes ? 'yes' : 'no');
        });
        return;
      }
      const g = doc.createElement('div');
      g.className = 'pk-alert pk-glass pk-strong';
      named(g, o, 'Alert');
      g.setAttribute('role', 'alertdialog');
      g.innerHTML =
        '<p class="pk-alert-title">' + esc(o.title || '') + '</p>' + (o.message ? '<p class="pk-alert-text">' + esc(o.message) + '</p>' : '') +
        '<div class="pk-alert-btns"><button class="pk-alert-btn" data-a="no" data-name="Cancel">' + esc(o.cancel || 'Cancel') + '</button><button class="pk-alert-btn ' + (red ? 'pk-red' : 'pk-blue') + '" data-a="yes" data-name="Action: ' + esc(o.action || 'OK') + '">' + esc(o.action || 'OK') + '</button></div>';
      const dim = dimLayer('pk-soft');
      layer().append(g);
      void g.offsetWidth;
      g.classList.add('pk-on');
      const ctl = track({
        el: g,
        close(yes) {
          if (ctl.closed) return;
          ctl.closed = true;
          untrack(ctl);
          g.classList.add('pk-leaving');
          g.classList.remove('pk-on');
          dropDim(dim, dur('--dur-leave', g));
          after(() => g.remove(), motion.reduced() ? dur('--dur-reduced', g) : dur('--dur-leave', g));
          resolve(!!yes);
        },
      });
      g.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-a]');
        if (b) ctl.close(b.dataset.a === 'yes');
      });
    });
  }

  /* (49) Parts.toast(text, { undo: fn, undoLabel, ms, name, style }) → { el, close() }: one at a time; a new one replaces it */
  let toastNow = null;
  function toast(text, o) {
    o = o || {};
    if (toastNow) toastNow.close();
    const t = doc.createElement('div');
    t.className = 'pk-toast pk-glass';
    named(t, o, 'Toast');
    t.setAttribute('role', 'status');
    t.innerHTML = '<span>' + esc(text) + '</span>' + (o.undo ? '<button class="pk-toast-undo" data-name="Undo">' + esc(o.undoLabel || 'Undo') + '</button>' : '');
    layer().append(t);
    void t.offsetWidth;
    t.classList.add('pk-on');
    const ctl = {
      el: t,
      close() {
        if (ctl.closed) return;
        ctl.closed = true;
        clearTimeout(ctl.timer);
        if (toastNow === ctl) toastNow = null;
        t.classList.add('pk-leaving');
        t.classList.remove('pk-on');
        after(() => t.remove(), motion.reduced() ? dur('--dur-reduced', t) : dur('--dur-toast-out', t));
      },
    };
    ctl.timer = later(ctl.close, o.ms || S.timing.toast);
    const u = t.querySelector('.pk-toast-undo');
    if (u)
      u.addEventListener('click', () => {
        ctl.close();
        o.undo();
      });
    toastNow = ctl;
    return ctl;
  }

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
    differences,
    sheet,
    cover,
    menu,
    popover,
    contextMenu,
    choices,
    confirm: confirmBox,
    toast,
    closeAll: () => open.slice().reverse().forEach((o) => o.close()),
    get open() {
      return open.length;
    },
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
