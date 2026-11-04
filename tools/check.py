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
