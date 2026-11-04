"""The parts kit's own check. Run it before every release.

Usage: python tools/check.py [shots-folder]        (needs Python and Playwright: pip install playwright)

1. Static: the value rule (tools/values.py), the two dark blocks identical, no personal data or app names in what an
   app loads or in the demo, the pinned prototype kit unchanged, the release checksums right.
2. Settings: unknown or wrong settings are refused; the Vocal Sessions sample loads with none; an app's MOTION is
   followed and its springs match the kit's.
3. The demo page (bundled, as published) at 402 × 874 and 820 × 1180, in light and dark, with Reduce transparency,
   Reduce Motion and motion off: screenshots, and no errors, sideways scroll, "NaN", "undefined" or "null".
4. Every behaviour, and every setting both ways (BEHAVIOURS below).
Prints each problem and exits 1 if there are any.
"""
import hashlib
import http.server
import functools
import json
import pathlib
import re
import subprocess
import sys
import threading

KIT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(KIT / "tools"))
import values  # noqa: E402

from playwright.sync_api import sync_playwright  # noqa: E402

BAD = re.compile(r"\bNaN\b|\bundefined\b|\bnull\b")
# nothing personal and no app's names, colours or screens in the kit or its demo
PRIVATE = re.compile(r"vocal|suki|ivanc|ivan\b|imperialfox|sgNew|sgKey|VS-\d|North Designer|@[a-z0-9-]+\.(com|co\.uk)|coral", re.I)
RUNTIME = ["parts-kit.css", "parts-kit.js"]
problems = []


def fail(msg):
    problems.append(msg)
    print("  ✗ " + msg)


def ok(cond, msg):
    if not cond:
        fail(msg)
    return cond


# ------------------------------------------------------------------------------------------------ 1. static
def static():
    print("Static")
    css = (KIT / "parts-kit.css").read_text(encoding="utf-8")
    bad, named = values.strays(css)
    ok(values.guard(), "the value rule's guard catches raw values")
    for b in bad:
        fail(f"value rule · line {b[4]}: raw {b[0]} {b[3]} in {b[1]} {{ {b[2]} }}")
    print(f"  named uses: corners {named['corner']}, presses {named['press']}, easings {named['ease']}, durations {named['duration']}")
    m1 = re.search(r":where\(:root:not\(\.pk-light\)\) \{(.*?)\n  \}", css, re.S)
    m2 = re.search(r":where\(\.pk-dark\) \{(.*?)\n\}", css, re.S)
    norm = lambda s: [l.strip() for l in s.strip().splitlines() if l.strip()]
    ok(m1 and m2 and norm(m1.group(1)) == norm(m2.group(1)), "the dark block and .pk-dark are identical")
    light = re.search(r":where\(:root, \.pk-light\) \{(.*?)\n\}", css, re.S)
    names = lambda s: set(re.findall(r"(--[a-z0-9-]+):", s))
    ok(light and m1 and names(m1.group(1)) <= names(light.group(1)), "every dark value also has a light default")
    for f in RUNTIME + ["demo/index.html"]:
        text = (KIT / f).read_text(encoding="utf-8")
        for m in PRIVATE.finditer(text):
            fail(f"{f}: '{m.group(0)}' (no personal data or app names in the kit)")
    ver = (KIT / "demo/vendor/prototype-kit/VERSION.md").read_text(encoding="utf-8")
    for f in ["kit.css", "kit.js"]:
        h = hashlib.sha256((KIT / "demo/vendor/prototype-kit" / f).read_bytes()).hexdigest()
        ok(h in ver, f"the pinned prototype kit's {f} is unchanged")
    sums = KIT / "SHA256SUMS.txt"
    if sums.exists():
        for line in sums.read_text().splitlines():
            h, name = line.split()
            ok(hashlib.sha256((KIT / name).read_bytes()).hexdigest() == h, f"SHA256SUMS.txt matches {name}")
    jsv = re.search(r"const VERSION = '([\d.]+)'", (KIT / "parts-kit.js").read_text())
    cssv = re.search(r"Parts kit ([\d.]+)", css)
    ok(jsv and cssv and jsv.group(1) == cssv.group(1), "parts-kit.css and parts-kit.js carry the same version")


def serve(folder):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(folder)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


# ------------------------------------------------------------------------------------------------ 2. settings
def settings_checks(browser, base):
    print("Settings")
    page = browser.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(base + "tools/plain.html")
    page.wait_for_function("window.Parts")
    sample = (KIT / "samples/vocal-sessions.settings.js").read_text(encoding="utf-8")
    page.evaluate("window.MOTION = undefined")
    got = page.evaluate("(src) => { const before = Parts.problems.length; new Function(src)(); return Parts.problems.slice(before); }", sample)
    ok(got == [], f"the Vocal Sessions sample loads with no unknown settings ({got})")
    r = page.evaluate("""() => {
      const a = Parts.settings({ tabBar: { foldd: true } }), b = Parts.settings({ choices: 'popup' }), c = Parts.settings({ sheet: { withStops: 'x' } }),
            d = Parts.settings({ timing: { hold: '700' } }), e = Parts.settings({ wat: 1 });
      return { a, b, c, d, e, fold: Parts.current.tabBar.fold, choices: Parts.current.choices };
    }""")
    ok(r["a"] == ["Unknown setting: tabBar.foldd"], f"a typo in a setting is refused ({r['a']})")
    ok(len(r["b"]) == 1 and len(r["c"]) == 1 and len(r["d"]) == 1 and r["e"] == ["Unknown setting: wat"], "wrong values are refused")
    ok(r["choices"] == "actionSheet", "a refused value leaves the setting as it was")
    # every setting in the README exists, and every setting is in the README
    readme = (KIT / "README.md").read_text(encoding="utf-8") if (KIT / "README.md").exists() else ""
    schema = page.evaluate("""() => { const out = []; const walk = (o, p) => Object.keys(o).forEach(k => { const v = o[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, p + k + '.'); else out.push(p + k); }); walk(Parts.SCHEMA, ''); return out; }""")
    for s in schema:
        ok(f"`{s}`" in readme, f"README describes the setting {s}")
    # an app's own MOTION: followed, and the shared springs match
    r = page.evaluate("""() => {
      const springs = { gentle: { z: 0.82, f: 1.9 }, nav: { z: 0.86, f: 2.2 }, ripple: { z: 0.6, f: 2.4 }, press: { z: 0.75, f: 4 }, release: { z: 0.55, f: 3.6 } };
      let speed = 1, red = false;
      window.MOTION = { SPRINGS: springs, speed: () => speed, reduced: () => red, on: () => speed > 0 && !red,
        publish() { document.documentElement.style.setProperty('--dur-gentle', '999ms'); }, setSpeed(n) { speed = n; this.publish(); } };
      Parts.settings({ motion: 'app' }); MOTION.setSpeed(1);
      const st = document.documentElement.style;
      const a = { diff: Parts.motion.compare(), gentle: st.getPropertyValue('--dur-gentle'), snap: st.getPropertyValue('--dur-snap'), speed: st.getPropertyValue('--pk-speed') };
      MOTION.setSpeed(4);
      a.speed4 = st.getPropertyValue('--pk-speed'); a.snap4 = st.getPropertyValue('--dur-snap');
      a.bad = Parts.motion.compare({ gentle: { z: 0.8, f: 1.9 } });
      Parts.settings({ motion: 'kit' }); window.MOTION = undefined; Parts.motion.setSpeed(1);
      return a;
    }""")
    ok(r["diff"] == [], f"the kit's springs match the app's MOTION ({r['diff']})")
    ok(r["gentle"] == "999ms", "with motion: 'app' the app's own springs are left to the app")
    ok(r["speed"] == "1" and r["speed4"] == "4" and int(r["snap4"][:-2]) > int(r["snap"][:-2]) * 3, f"the kit follows the app's speed ({r})")
    ok(r["bad"] == ["gentle"], "a spring that differs from the app's is found")
    ok(not errs, f"no errors on the plain page ({errs[:1]})")
    page.close()


# ------------------------------------------------------------------------------------------------ 3. the demo page
DEVICES = {"iphone": ({"width": 402, "height": 874}, True, 0), "ipad": ({"width": 1300, "height": 1300}, False, 1)}


def open_demo(browser, url, device="iphone"):
    vp, mobile, dev = DEVICES[device]
    ctx = browser.new_context(viewport=vp, device_scale_factor=1 if device == "ipad" else 2, has_touch=mobile, is_mobile=mobile)
    page = ctx.new_page()
    page.errors = []
    page.on("pageerror", lambda e: page.errors.append(str(e)))
    page.on("console", lambda m: page.errors.append(m.text) if m.type == "error" else None)
    page.goto(url)
    page.wait_for_function("window.Kit && window.Parts && document.querySelector('#wrap .gal-part, #wrap .gal-sub')")
    page.evaluate("localStorage.clear()")
    page.reload()
    page.wait_for_function("window.Kit && window.Parts && document.querySelector('#wrap .gal-sub')")
    page.evaluate(f"Kit.set('Device', {dev})")
    page.wait_for_timeout(150)
    return page


def screen_state(page, label):
    r = page.evaluate("""() => {
      const pg = document.querySelector('#pg'), app = document.querySelector('#app');
      return { side: pg.scrollWidth > pg.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1, text: app.innerText };
    }""")
    ok(not r["side"], f"{label}: no sideways scroll")
    m = BAD.search(r["text"])
    ok(not m, f"{label}: no '{m.group(0) if m else ''}' on screen")
    if page.errors:
        fail(f"{label}: error: {page.errors[-1]}")
        page.errors.clear()


def looks(browser, url, shots):
    print("Looks")
    for device in DEVICES:
        page = open_demo(browser, url, device)
        el = page.locator(".kit-screen")
        for look in (0, 1):
            for mode in ("normal", "rt", "reduced", "off"):
                page.evaluate(f"Kit.set('Look', {look})")
                page.evaluate("Kit.set('Reduce transparency', %d)" % (1 if mode == "rt" else 0))
                page.evaluate("Kit.set('Motion', %d)" % (2 if mode == "reduced" else 0))
                page.evaluate("Parts.motion.setSpeed(%d)" % (0 if mode == "off" else 1))
                page.evaluate("document.querySelector('#pg').scrollTop = 0")
                page.wait_for_timeout(120)
                label = f"{device} · {'dark' if look else 'light'} · {mode}"
                screen_state(page, label)
                name = f"{device}-{'dark' if look else 'light'}-{mode}"
                el.screenshot(path=str(shots / f"{name}.png"))
                if mode == "normal" or (device == "iphone" and mode == "rt"):
                    # every section, scrolled into view
                    secs = page.evaluate("[...document.querySelectorAll('.gal-sh')].map(h => h.id)")
                    for sid in secs:
                        page.evaluate(f"(() => {{ const pg = document.querySelector('#pg'); pg.scrollTop = document.getElementById('{sid}').offsetTop - 100; }})()")
                        page.wait_for_timeout(80)
                        screen_state(page, f"{label} · {sid}")
                        el.screenshot(path=str(shots / f"{name}-{sid}.png"))
        page.context.close()


# ------------------------------------------------------------------------------------------------ 4. behaviours
BEHAVIOURS = []


def behaviour(fn):
    BEHAVIOURS.append(fn)
    return fn


def center(page, sel):
    b = page.locator(sel).first.bounding_box()
    return b["x"] + b["width"] / 2, b["y"] + b["height"] / 2


def scroll_to(page, sel):
    page.evaluate(f"""(() => {{ const el = document.querySelector({json.dumps(sel)}), pg = document.querySelector('#pg');
      let y = 0, n = el; while (n && n !== pg) {{ y += n.offsetTop; n = n.offsetParent; }} pg.scrollTop = Math.max(0, y - 200); }})()""")
    page.wait_for_timeout(60)


def drag(page, x0, y0, x1, y1, steps=10, hold=0, release=True):
    page.mouse.move(x0, y0)
    page.mouse.down()
    if hold:
        page.wait_for_timeout(hold)
    for i in range(1, steps + 1):
        page.mouse.move(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps)
        page.wait_for_timeout(8)
    if release:
        page.mouse.up()


@behaviour
def foundations(page):
    # the glass press on a 44 pt circle: ×1.39 (17 pt along its longest side)
    r = page.evaluate("""() => {
      const b = document.createElement('button'); b.className = 'pk-btn pk-circle pk-glass pk-press'; b.style.cssText = 'position:absolute;left:100px;top:300px';
      document.querySelector('#app').append(b); b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 9, button: 0 }));
      const ps = b.style.getPropertyValue('--pk-ps'), on = b.classList.contains('pk-pressed');
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 9 })); const off = !b.classList.contains('pk-pressed'); b.remove();
      return { ps, on, off };
    }""")
    ok(abs(float(r["ps"]) - 1.3864) < 0.001 and r["on"] and r["off"], f"press: a 44 pt glass circle grows ×1.39 and lets go ({r})")
    r = page.evaluate("""() => { const st = document.documentElement.style; return { e: st.getPropertyValue('--ease-sheet').startsWith('linear('), d: parseInt(st.getPropertyValue('--dur-sheet')), sp: st.getPropertyValue('--pk-speed') }; }""")
    ok(r["e"] and r["d"] > 300 and r["sp"] == "1", f"motion: the springs are published as --ease-/--dur- ({r})")


@behaviour
def bars_and_buttons(page):
    page.evaluate("Parts.motion.setSpeed(0)")
    # glass press on the gallery's own 44 pt circle
    scroll_to(page, "#p12")
    x, y = center(page, "#p12 .pk-circle")
    page.mouse.move(x, y); page.mouse.down(); page.wait_for_timeout(30)
    ps = page.evaluate("getComputedStyle(document.querySelector('#p12 .pk-circle')).scale")
    page.mouse.up()
    ok(ps.startswith("1.38"), f"12: a 44 pt glass circle grows ×1.39 (scale {ps})")
    # 4: tab tap and tab drag
    scroll_to(page, "#p4")
    tabs = page.locator("#p4 .pk-tab")
    x, y = center(page, "#p4 .pk-tab:nth-of-type(3)")
    page.mouse.click(x, y)
    ok(page.evaluate("document.querySelectorAll('#p4 .pk-tab')[2].classList.contains('on')"), "4: tapping a tab picks it")
    x0, y0 = center(page, "#p4 .pk-tab:nth-of-type(3)"); x1, _ = center(page, "#p4 .pk-tab:nth-of-type(1)")
    drag(page, x0, y0, x1, y0, steps=12)
    ok(page.evaluate("document.querySelectorAll('#p4 .pk-tab')[0].classList.contains('on')"), "4: dragging along the bar moves the pick")
    # 6: search opens and closes
    scroll_to(page, "#p6")
    page.click("#p6 .pk-search-circle")
    ok(page.evaluate("document.querySelector('#p6 .pk-dock').classList.contains('pk-searching')"), "6: the search circle opens the field")
    page.click("#p6 .pk-search-close")
    ok(not page.evaluate("document.querySelector('#p6 .pk-dock').classList.contains('pk-searching')"), "6: ✕ closes the field")
    # 6: search gap both ways (D02)
    g8 = page.evaluate("getComputedStyle(document.querySelector('#dock')).columnGap")
    page.evaluate("Kit.set('Search gap (D02)', 1)")
    g12 = page.evaluate("getComputedStyle(document.querySelector('#dock')).columnGap")
    page.evaluate("Kit.set('Search gap (D02)', 0)")
    ok(g8 == "8px" and g12 == "12px", f"D02: tabBar.searchGap 8 and 12 ({g8}, {g12})")
    # 5: folding both ways (D01)
    page.evaluate("document.querySelector('#pg').scrollTop = 0")
    page.evaluate("(() => { const pg = document.querySelector('#pg'); for (let y = 0; y <= 300; y += 30) { pg.scrollTop = y; pg.dispatchEvent(new Event('scroll')); } })()")
    page.wait_for_timeout(50)
    off = page.evaluate("document.querySelector('#dock').classList.contains('pk-folded')")
    page.evaluate("Kit.set('Tab bar folds (D01)', 1)")
    page.evaluate("(() => { const pg = document.querySelector('#pg'); for (let y = 300; y <= 600; y += 30) { pg.scrollTop = y; pg.dispatchEvent(new Event('scroll')); } })()")
    page.wait_for_timeout(50)
    on = page.evaluate("document.querySelector('#dock').classList.contains('pk-folded')")
    page.evaluate("(() => { const pg = document.querySelector('#pg'); for (let y = 600; y >= 540; y -= 15) { pg.scrollTop = y; pg.dispatchEvent(new Event('scroll')); } })()")
    page.wait_for_timeout(50)
    back = page.evaluate("document.querySelector('#dock').classList.contains('pk-folded')")
    page.evaluate("Kit.set('Tab bar folds (D01)', 0)")
    ok(not off and on and not back, f"D01: the tab bar folds only with tabBar.fold on, and opens on scrolling up ({off}, {on}, {back})")
    # 2: the top bar's soft edge after 36 pt
    page.evaluate("document.querySelector('#pg').scrollTop = 0; document.querySelector('#pg').dispatchEvent(new Event('scroll'))")
    a = page.evaluate("document.querySelector('#topbar').classList.contains('pk-scrolled')")
    page.evaluate("document.querySelector('#pg').scrollTop = 80; document.querySelector('#pg').dispatchEvent(new Event('scroll'))")
    b = page.evaluate("document.querySelector('#topbar').classList.contains('pk-scrolled')")
    ok(not a and b, "2: the soft edge and small title appear after 36 pt of scrolling")
    # 10: pushed page, then swipe back
    scroll_to(page, "#pushOpen")
    page.click("#pushOpen")
    ok(page.evaluate("document.querySelector('#push').classList.contains('pk-on') && document.querySelector('#pg').classList.contains('pk-pushed-under')"), "10: a pushed page slides in over the page")
    drag(page, 80, 500, 330, 505, steps=12)
    page.wait_for_timeout(60)
    ok(not page.evaluate("document.querySelector('#push').classList.contains('pk-on')"), "10: swiping right from the middle of the page goes back")
    page.click("#pushOpen"); page.wait_for_timeout(30); page.click("#pushBack")
    ok(not page.evaluate("document.querySelector('#push').classList.contains('pk-on')"), "10: Back goes back")
    # 11: top bar buttons changing, at normal speed
    page.evaluate("Parts.motion.setSpeed(1)")
    scroll_to(page, "#p11")
    page.click("#mbGo"); page.wait_for_timeout(500)
    r = page.evaluate("({ l: document.querySelectorAll('#mbL .pk-btn').length, icons: document.querySelectorAll('#mbR .pk-ico').length })")
    page.click("#mbGo"); page.wait_for_timeout(500)
    r2 = page.evaluate("({ l: document.querySelectorAll('#mbL .pk-btn').length, icons: document.querySelectorAll('#mbR .pk-ico').length })")
    ok(r == {"l": 1, "icons": 1} and r2 == {"l": 0, "icons": 1}, f"11: Back appears and leaves, and the icon swaps cleanly ({r}, {r2})")
    page.evaluate("Parts.motion.setSpeed(0)")
    # 15, 17, 18
    scroll_to(page, "#p15")
    page.click("#p15 .pk-btn:nth-of-type(2)")
    ok(page.evaluate("document.querySelectorAll('#p15 .pk-btn')[1].getAttribute('aria-pressed')") == "true", "15: a button on a bar toggles")
    scroll_to(page, "#p17")
    page.click("#p17 [data-pk-edit]")
    ok(page.evaluate("document.querySelector('#editList').classList.contains('pk-editing') && document.querySelector('#p17 [data-pk-edit]').textContent === 'Done'"), "17: Edit turns into Done and shows the delete circles")
    scroll_to(page, "#p18")
    page.click("#p18 .pk-chip:nth-of-type(1)")
    ok(page.evaluate("document.querySelector('#p18 .pk-chip').classList.contains('on')"), "18: a chip picks")


@behaviour
def controls_and_inputs(page):
    page.evaluate("Parts.motion.setSpeed(0)")
    scroll_to(page, "#p21")
    on = lambda i: page.evaluate(f"document.querySelectorAll('#p21 .pk-switch')[{i}].classList.contains('on')")
    page.click("#p21 .pk-switch >> nth=1")
    ok(on(1), "21: tapping a switch turns it on")
    page.click("#p21 .pk-switch-row >> nth=1", position={"x": 60, "y": 20})
    ok(not on(1), "21: tapping its row turns it off")
    b = page.locator("#p21 .pk-switch").nth(1).bounding_box()
    # a slow drag past halfway
    drag(page, b["x"] + 14, b["y"] + 14, b["x"] + 50, b["y"] + 14, steps=20)
    ok(on(1), "21: dragging the knob past halfway turns it on")
    # a short fast flick back (not past halfway) still decides
    page.mouse.move(b["x"] + 48, b["y"] + 14); page.mouse.down(); page.mouse.move(b["x"] + 44, b["y"] + 14); page.mouse.move(b["x"] + 38, b["y"] + 14); page.mouse.up()
    ok(not on(1), "21: a quick flick decides the switch")
    # 22 slider
    scroll_to(page, "#p22")
    b = page.locator("#vol").bounding_box()
    page.mouse.move(b["x"] + b["width"] * 0.2, b["y"] + 17); page.mouse.down()
    held = page.evaluate("getComputedStyle(document.querySelector('#vol .pk-slider-thumb')).scale")
    page.mouse.move(b["x"] + b["width"] * 0.75, b["y"] + 17); page.mouse.up()
    v = float(page.evaluate("document.querySelector('#vol').dataset.value"))
    ok(abs(v - 75) < 2 and page.inner_text("#slv") == str(round(v)), f"22: the slider follows the finger ({v})")
    ok(held == "1.35", f"22: the knob grows ×1.35 while held ({held})")
    # 23 segmented: tap, drag, and the squish setting
    scroll_to(page, "#p23")
    seg = "#segDWM"
    page.click(f"{seg} button >> nth=2")
    ok(page.evaluate(f"document.querySelectorAll('{seg} button')[2].classList.contains('on')"), "23: tapping a segment picks it")
    x0, y0 = center(page, f"{seg} button >> nth=2"); x1, _ = center(page, f"{seg} button >> nth=0")
    page.mouse.move(x0, y0); page.mouse.down()
    live = page.evaluate(f"document.querySelector('{seg} .pk-seg-ind').classList.contains('pk-live')")
    for i in range(1, 11):
        page.mouse.move(x0 + (x1 - x0) * i / 10, y0); page.wait_for_timeout(8)
    page.mouse.up()
    ok(live and page.evaluate(f"document.querySelectorAll('{seg} button')[0].classList.contains('on')"), "23: the knob swells to glass and can be dragged")
    page.evaluate("Kit.set('Segmented (D04)', 1)"); page.evaluate("Parts.motion.setSpeed(1)")
    page.mouse.move(x0, y0); page.mouse.down()
    live2 = page.evaluate(f"document.querySelector('{seg} .pk-seg-ind').classList.contains('pk-live')")
    page.mouse.up()
    sq = page.evaluate(f"document.querySelector('{seg} .pk-seg-ind').classList.contains('pk-squish')")
    page.evaluate("Kit.set('Segmented (D04)', 0)"); page.evaluate("Parts.motion.setSpeed(0)")
    ok(not live2 and sq, f"D04: with segmented.style 'squish' a tap squishes and nothing swells ({live2}, {sq})")
    # 24 stepper, 25 progress
    scroll_to(page, "#p24")
    page.click("#sets [data-step='1']"); page.click("#sets [data-step='1']"); page.click("#sets [data-step='-1']")
    ok(page.inner_text("#p24 [data-pk-value-of]") == "4", "24: the stepper counts")
    scroll_to(page, "#p25"); page.click("#runBtn")
    ok(page.evaluate("getComputedStyle(document.querySelector('#pb i')).width") != "0px", "25: the progress bar shows its value")
    # 26 search stretch: at most about 7 pt lengthwise and 2 pt across
    scroll_to(page, "#p26")
    b = page.locator("#p26 .pk-search").bounding_box()
    page.mouse.move(b["x"] + 30, b["y"] + 22); page.mouse.down()
    for i in range(1, 16):
        page.mouse.move(b["x"] + 30 + i * 20, b["y"] + 22 + i * 4); page.wait_for_timeout(5)
    r = page.evaluate("(() => { const f = document.querySelector('#p26 .pk-search'), r = f.getBoundingClientRect(); return { w: r.width - f.offsetWidth, h: r.height - f.offsetHeight }; })()")
    page.mouse.up()
    page.wait_for_timeout(30)
    back = page.evaluate("document.querySelector('#p26 .pk-search').style.scale")
    ok(4 < r["w"] <= 7.05 and 0.5 < r["h"] <= 2.05 and back == "", f"26: the search field stretches about 7 pt and 2 pt, then springs back ({r})")
    # 27 clear button, 29 grows
    scroll_to(page, "#p27")
    page.fill("#p27 input", "Hello")
    ok(page.evaluate("document.querySelector('#p27 .pk-field').classList.contains('pk-has')"), "27: the clear button shows once there's text")
    page.click("#p27 .pk-field-clear")
    ok(page.input_value("#p27 input") == "", "27: the clear button clears it")
    scroll_to(page, "#p29")
    h0 = page.evaluate("document.querySelector('#p29 textarea').offsetHeight")
    page.fill("#p29 textarea", "line\n" * 8)
    h1 = page.evaluate("document.querySelector('#p29 textarea').offsetHeight")
    ok(h1 > h0, f"29: the text area grows as you type ({h0} → {h1})")


@behaviour
def lists(page):
    page.evaluate("Parts.motion.setSpeed(0)")
    scroll_to(page, "#p35")
    x, y = center(page, "#p35 .pk-row")
    page.mouse.move(x, y); page.mouse.down()
    r = page.evaluate("(() => { const s = getComputedStyle(document.querySelector('#p35 .pk-row')); return { bg: s.backgroundColor, sc: s.scale }; })()")
    page.mouse.up()
    page.evaluate("Kit.set('Row press (D06)', 1)")
    page.mouse.move(x, y); page.mouse.down()
    r2 = page.evaluate("(() => { const s = getComputedStyle(document.querySelector('#p35 .pk-row')); return { bg: s.backgroundColor, sc: s.scale }; })()")
    page.mouse.up()
    page.evaluate("Kit.set('Row press (D06)', 0)")
    ok(r["sc"] in ("none", "1") and r["bg"] == "rgb(209, 209, 214)", f"35/D06: a pressed row highlights and doesn't shrink ({r})")
    ok(r2["sc"] == "0.98" and r2["bg"] == "rgb(255, 255, 255)", f"35/D06: with row.press 'shrink' it shrinks to 0.98 instead ({r2})")
    # 39 swipe a row open, then tap elsewhere to close it
    scroll_to(page, "#p39")
    b = page.locator("#p39 .pk-swipe-front").nth(1).bounding_box()
    drag(page, b["x"] + b["width"] - 20, b["y"] + 25, b["x"] + b["width"] - 200, b["y"] + 27, steps=12)
    sx = page.evaluate("document.querySelectorAll('#p39 .pk-swipe-front')[1].style.getPropertyValue('--pk-sx')")
    ok(sx == "-176px" and page.evaluate("document.querySelectorAll('#p39 .pk-swipe')[1].classList.contains('pk-show')"), f"39: swiping left opens Flag and Delete ({sx})")
    page.mouse.click(b["x"] + 40, b["y"] - 80)
    page.wait_for_timeout(50)
    ok(page.evaluate("document.querySelectorAll('#p39 .pk-swipe-front')[1].style.getPropertyValue('--pk-sx')") == "0px", "39: tapping elsewhere closes it")
    # 40 reorder: drag Warm up below Cool down
    scroll_to(page, "#p40")
    g = page.locator("#reo .pk-grip").nth(0).bounding_box()
    h = page.locator("#reo .pk-row").nth(0).bounding_box()["height"]
    drag(page, g["x"] + 10, g["y"] + 10, g["x"] + 10, g["y"] + 10 + h * 2.1, steps=14)
    order = page.evaluate("[...document.querySelectorAll('#reo .pk-row-text')].map(x => x.textContent)")
    ok(order == ["Main set", "Cool down", "Warm up", "Stretch"], f"40: holding the handle and dragging reorders ({order})")


def visible(page, sel=".pk-sheet"):
    return page.evaluate(f"(() => {{ const a = document.querySelector('#app').getBoundingClientRect(), s = document.querySelector('{sel}:not(.pk-leaving)'); if (!s) return -1; return a.bottom - s.getBoundingClientRect().top; }})()")


def gone(page, sel):
    page.wait_for_timeout(450)
    return page.evaluate(f"document.querySelectorAll('{sel}').length") == 0


@behaviour
def overlays(page):
    page.evaluate("Parts.motion.setSpeed(0)")
    H = page.evaluate("document.querySelector('#app').offsetHeight")
    # 41: a sheet fitting its content; drag down past 40% to close
    scroll_to(page, "#p41"); page.click("#o-sheet")
    v = visible(page)
    ok(80 < v < H * 0.6, f"41: the sheet opens at its content's height ({v})")
    ok(page.evaluate("document.querySelector('.pk-sheet').classList.contains('pk-strong')"), "41/D15: sheets use the strong glass")
    top = page.locator(".pk-sheet").bounding_box()["y"]
    drag(page, 200, top + 20, 200, top + 20 + v * 0.6, steps=30)
    ok(gone(page, ".pk-sheet"), "41: dragging a sheet down past 40% closes it")
    # a short quick flick closes it too
    page.click("#o-sheet"); top = page.locator(".pk-sheet").bounding_box()["y"]
    page.mouse.move(200, top + 20); page.mouse.down(); page.mouse.move(200, top + 30); page.mouse.move(200, top + 55); page.mouse.up()
    ok(gone(page, ".pk-sheet"), "41: a quick flick down closes the sheet")
    # pull down from the content
    page.click("#o-sheet"); b = page.locator(".pk-sheet .pk-sheet-body .pk-row").nth(1).bounding_box()
    drag(page, 200, b["y"] + 10, 200, b["y"] + 260, steps=30)
    ok(gone(page, ".pk-sheet"), "41/D17: pulling down from the content (at its top) closes the sheet")
    # D14 both ways: dragging shrinks only with sheet.dragShrink
    page.evaluate("Kit.set('Sheet drag (D14)', 1)")
    page.click("#o-sheet"); top = page.locator(".pk-sheet").bounding_box()["y"]
    drag(page, 200, top + 20, 200, top + 140, steps=20, release=False)
    sh = page.evaluate("document.querySelector('.pk-sheet').style.getPropertyValue('--pk-shrink')")
    page.mouse.up(); page.wait_for_timeout(400)
    page.evaluate("Kit.set('Sheet drag (D14)', 0)")
    page.click("#o-sheet"); top = page.locator(".pk-sheet").bounding_box()["y"]
    drag(page, 200, top + 20, 200, top + 140, steps=20, release=False)
    sh0 = page.evaluate("document.querySelector('.pk-sheet').style.getPropertyValue('--pk-shrink')")
    page.mouse.up(); page.wait_for_timeout(400)
    ok(sh and float(sh) < 0.95 and sh0 == "", f"D14: the sheet shrinks while dragged only with sheet.dragShrink ({sh}, {sh0!r})")
    page.evaluate("Parts.closeAll()"); page.wait_for_timeout(400)
    # D15 both ways
    page.evaluate("Kit.set('Sheet glass (D15)', 1)"); page.click("#o-sheet")
    reg = not page.evaluate("document.querySelector('.pk-sheet').classList.contains('pk-strong')")
    page.evaluate("Parts.closeAll()"); page.evaluate("Kit.set('Sheet glass (D15)', 0)"); page.wait_for_timeout(400)
    ok(reg, "D15: with sheet.glass 'regular' the sheet uses the regular glass")
    # 42: stops at 45% and full; content scrolls at full, then pulls the sheet down from its top
    scroll_to(page, "#p42"); page.click("#o-stops")
    v = visible(page)
    ok(abs(v - (H * 0.45 + 8)) < 6, f"42/D09: a sheet with stops opens at 45% ({v} of {H})")
    top = page.locator(".pk-sheet").bounding_box()["y"]
    drag(page, 200, top + 20, 200, top - 250, steps=25)
    v2 = visible(page)
    ok(abs(v2 - (H - 90)) < 3 and page.evaluate("document.querySelector('.pk-sheet').classList.contains('pk-solid-now')"), f"42: dragging up reaches the full stop and turns solid ({v2})")
    body = page.locator(".pk-sheet-body").bounding_box()
    drag(page, 200, body["y"] + 300, 200, body["y"] + 100, steps=15)
    st = page.evaluate("document.querySelector('.pk-sheet-body').scrollTop")
    ok(st > 100 and abs(visible(page) - (H - 90)) < 3, f"42: at full, dragging up the content scrolls it ({st})")
    page.evaluate("document.querySelector('.pk-sheet-body').scrollTop = 0; document.querySelector('.pk-sheet-body').dispatchEvent(new Event('scroll'))")
    drag(page, 200, body["y"] + 100, 200, body["y"] + 300, steps=25)
    v3 = visible(page)
    ok(abs(v3 - (H * 0.45 + 8)) < 6, f"42: pulling down from the top of the content goes back to 45% ({v3})")
    top = page.locator(".pk-sheet").bounding_box()["y"]
    page.mouse.move(200, top + 20); page.mouse.down(); page.mouse.move(200, top + 12); page.mouse.move(200, top - 20); page.mouse.up()
    ok(abs(visible(page) - (H - 90)) < 3, "42: a quick flick up jumps to the next stop")
    page.evaluate("Parts.closeAll()"); page.wait_for_timeout(400)
    # 42/D10: growing to full
    page.click("#o-grows"); page.click("#growBtn")
    vg = visible(page)
    ok(abs(vg - H) < 2, f"42/D10: a sheet in growsToFull grows to full screen ({vg})")
    page.evaluate("Parts.closeAll()"); page.wait_for_timeout(400)
    # 43: a sheet in fullScreen opens as a cover
    scroll_to(page, "#p43"); page.click("#o-cover")
    ok(page.evaluate("!!document.querySelector('.pk-cover.pk-on') && document.querySelector('.pk-cover').getBoundingClientRect().top === document.querySelector('#app').getBoundingClientRect().top"), "43/D10: a sheet in fullScreen opens as a full-screen cover")
    page.click(".pk-cover .pk-sheet-close")
    ok(gone(page, ".pk-cover"), "43: ✕ closes the cover")
    # 16: pull-down menu grows from its button and closes on a pick
    scroll_to(page, "#p16"); page.click("#pullBtn")
    r = page.evaluate("(() => { const m = document.querySelector('.pk-menu'); if (!m) return null; const s = getComputedStyle(m); return { r: s.borderTopLeftRadius, items: m.querySelectorAll('.pk-menu-item').length }; })()")
    ok(r and r["r"] == "20px" and r["items"] == 4, f"16/D16: a pull-down menu opens, corners 20 ({r})")
    page.click(".pk-menu .pk-menu-item >> nth=1")
    ok(gone(page, ".pk-menu") and page.evaluate("!!document.querySelector('.pk-toast')"), "16: picking closes the menu")
    # 44 popover
    scroll_to(page, "#p44"); page.click("#o-pop")
    ok(page.evaluate("!!document.querySelector('.pk-popover.pk-on')"), "44: the popover grows out of its button")
    page.mouse.click(30, 300)
    ok(gone(page, ".pk-popover"), "44: tapping outside closes it")
    # 46: long-press timing — no menu before 700 ms
    page.evaluate("Parts.motion.setSpeed(1)")
    scroll_to(page, "#p46")
    x, y = center(page, "#ctxList .pk-hold >> nth=1")
    page.mouse.move(x, y); page.mouse.down(); page.wait_for_timeout(330)
    lifted = page.evaluate("document.querySelectorAll('#ctxList .pk-hold')[1].classList.contains('pk-lifting')")
    page.wait_for_timeout(280)
    early = page.evaluate("!!document.querySelector('.pk-menu')")
    page.wait_for_timeout(250)
    late = page.evaluate("!!document.querySelector('.pk-menu')")
    page.mouse.up()
    ok(lifted, "46: the held row lifts from 200 ms")
    ok(not early and late, f"46: no menu before 700 ms, then the menu ({early}, {late})")
    ok(page.evaluate("!!document.querySelector('.pk-lift-clone') && getComputedStyle(document.querySelector('.pk-dim.pk-soft')).backgroundColor") == "rgba(0, 0, 0, 0.2)", "46: the row stays above a 20% dim with no blur")
    page.mouse.click(30, 120)
    ok(gone(page, ".pk-menu"), "46: tapping outside closes it")
    page.mouse.move(x, y); page.mouse.down(); page.wait_for_timeout(300); page.mouse.move(x + 30, y); page.wait_for_timeout(600)
    ok(not page.evaluate("!!document.querySelector('.pk-menu')"), "46: moving more than 10 pt cancels")
    page.mouse.up()
    page.evaluate("Parts.motion.setSpeed(0)")
    # 47: action sheet, and D07 as a sheet
    scroll_to(page, "#p47"); page.click("#o-as")
    ok(page.evaluate("document.querySelectorAll('.pk-actions .pk-action').length") == 4, "47/D07: choices open as an action sheet with Cancel apart")
    page.click(".pk-action >> nth=0")
    ok(gone(page, ".pk-actions") and "Duplicate" in page.inner_text(".pk-toast"), "47: picking an action closes it and returns the action")
    page.evaluate("Kit.set('Choices (D07)', 1)"); page.click("#o-as")
    ok(page.evaluate("!!document.querySelector('.pk-sheet') && !document.querySelector('.pk-actions')"), "D07: with choices 'sheet' they open as a sheet")
    page.evaluate("Parts.closeAll()"); page.evaluate("Kit.set('Choices (D07)', 0)"); page.wait_for_timeout(400)
    # 48: alert, and D08 as a sheet
    scroll_to(page, "#p48"); page.click("#o-dlg")
    ok(page.evaluate("!!document.querySelector('.pk-alert.pk-on') && getComputedStyle(document.querySelector('.pk-alert .pk-red')).backgroundColor !== ''"), "48/D08: confirmations open as an alert with a red action")
    page.click(".pk-alert [data-a='yes']")
    ok(gone(page, ".pk-alert") and "Deleted" in page.inner_text(".pk-toast"), "48: the red action confirms")
    page.evaluate("Kit.set('Confirm (D08)', 1)"); page.click("#o-dlg")
    ok(page.evaluate("!!document.querySelector('.pk-sheet [data-a=yes]') && !document.querySelector('.pk-alert')"), "D08: with confirm 'sheet' it opens as a sheet")
    page.evaluate("Parts.closeAll()"); page.evaluate("Kit.set('Confirm (D08)', 0)"); page.wait_for_timeout(400)
    # 49: toast timing (3 s), at normal speed
    page.evaluate("Parts.motion.setSpeed(1)")
    scroll_to(page, "#p49"); page.click("#o-toast")
    page.wait_for_timeout(600)
    shown = page.evaluate("(() => { const t = document.querySelector('.pk-toast'); return !!t && t.getBoundingClientRect().top > document.querySelector('#app').getBoundingClientRect().top; })()")
    page.wait_for_timeout(2100)
    still = page.evaluate("document.querySelectorAll('.pk-toast:not(.pk-leaving)').length")
    page.wait_for_timeout(900)
    after3 = page.evaluate("document.querySelectorAll('.pk-toast').length")
    ok(shown and still == 1 and after3 == 0, f"49: the toast drops in, stays 3 s, then leaves ({shown}, {still}, {after3})")


@behaviour
def pinned(page):
    page.evaluate("Parts.motion.setSpeed(1)")
    # 45 submenus (D11): on for this menu in the gallery
    scroll_to(page, "#p45"); page.click("#o-sub"); page.wait_for_timeout(300)
    page.click(".pk-menu .pk-menu-item >> nth=0"); page.wait_for_timeout(400)
    r = page.evaluate("({ sub: !!document.querySelector('.pk-submenu.pk-on'), recede: getComputedStyle(document.querySelector('.pk-menu.pk-recede') || document.body).scale })")
    ok(r["sub"] and r["recede"] == "0.971", f"45/D11: a submenu opens over its menu, which recedes to 0.971 ({r})")
    page.click(".pk-submenu .pk-menu-item >> nth=3"); page.wait_for_timeout(450)
    ok(page.evaluate("!document.querySelector('.pk-menu') && document.querySelector('.pk-toast').textContent.includes('Sort by: Size')"), "45: picking in the submenu closes both and returns the item")
    # 50 glass appearing and leaving (D12)
    scroll_to(page, "#p50"); page.click("#mzBtn"); page.wait_for_timeout(60)
    anim = page.evaluate("(() => { const g = document.querySelector('#mzslot .pk-btn'); return g ? g.getAnimations().length : -1; })()")
    page.wait_for_timeout(450)
    gone1 = page.evaluate("document.querySelectorAll('#mzslot .pk-btn').length")
    page.click("#mzBtn"); page.wait_for_timeout(60)
    anim2 = page.evaluate("document.querySelector('#mzslot .pk-btn').getAnimations().length")
    ok(anim > 0 and gone1 == 0 and anim2 > 0, f"50/D12: named glass leaves and appears with its animation ({anim}, {gone1}, {anim2})")
    # 52 finger glint and drag (D13)
    scroll_to(page, "#p52"); page.wait_for_timeout(400)
    x, y = center(page, "#pad")
    page.mouse.move(x, y); page.mouse.down(); page.wait_for_timeout(200); page.mouse.move(x + 40, y + 10); page.wait_for_timeout(200)
    r = page.evaluate("(() => { const p = document.querySelector('#pad'), g = p.querySelector('.pk-glint'); return { g: g ? getComputedStyle(g).opacity : null, tx: parseFloat(p.style.getPropertyValue('--pk-tx')) || 0 }; })()")
    page.mouse.up()
    ok(r["g"] == "1" and 0 < r["tx"] <= 4, f"52/D13: a glint follows the finger and the button leans a few points ({r})")
    # all three off: submenus inline, appearing at once, no glint
    page.evaluate("Kit.set('Pinned parts (D11–D13)', 1)"); page.wait_for_timeout(500)
    scroll_to(page, "#p45"); page.click("#o-sub"); page.wait_for_timeout(300)
    r = page.evaluate("({ labels: document.querySelectorAll('.pk-menu .pk-menu-label').length, items: document.querySelectorAll('.pk-menu .pk-menu-item').length })")
    page.evaluate("Parts.closeAll()"); page.wait_for_timeout(400)
    ok(r == {"labels": 2, "items": 7}, f"D11 off: submenu items show inline under their labels ({r})")
    scroll_to(page, "#p50"); page.click("#mzBtn"); page.wait_for_timeout(40)
    off_gone = page.evaluate("document.querySelectorAll('#mzslot .pk-btn').length")
    page.click("#mzBtn"); page.wait_for_timeout(40)
    off_anim = page.evaluate("document.querySelector('#mzslot .pk-btn').getAnimations().filter(a => a.playState === 'running').length")
    ok(off_gone == 0 and off_anim == 0, f"D12 off: glass appears and leaves at once ({off_gone}, {off_anim})")
    scroll_to(page, "#p52"); x, y = center(page, "#pad")
    page.mouse.move(x, y); page.mouse.down(); page.mouse.move(x + 40, y + 10); page.wait_for_timeout(100)
    r = page.evaluate("(() => { const p = document.querySelector('#pad'), g = p.querySelector('.pk-glint'); return { g: g ? getComputedStyle(g).opacity : '0', tx: p.style.getPropertyValue('--pk-tx') }; })()")
    page.mouse.up()
    ok(r["g"] == "0" and r["tx"] == "", f"D13 off: no glint and no lean ({r})")


def main():
    shots = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else KIT / "shots").resolve()
    shots.mkdir(parents=True, exist_ok=True)
    static()
    subprocess.run([sys.executable, str(KIT / "tools/bundle.py")], check=True, stdout=subprocess.DEVNULL)
    srv = serve(KIT)
    base = f"http://127.0.0.1:{srv.server_address[1]}/"
    url = base + "dist/parts-gallery.html"
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        settings_checks(browser, base)
        looks(browser, url, shots)
        print("Behaviours")
        for fn in BEHAVIOURS:
            page = open_demo(browser, url, "iphone")
            try:
                fn(page)
            except Exception as e:  # a broken behaviour is a problem, not a crash
                fail(f"{fn.__name__}: {type(e).__name__}: {str(e).splitlines()[0][:200]}")
            if page.errors:
                fail(f"{fn.__name__}: error: {page.errors[-1]}")
            page.context.close()
        browser.close()
    print(f"\n{len(problems)} problem(s)" if problems else "\nAll checks passed")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
