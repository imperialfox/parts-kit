"""Make the demo page one self-contained file, for the Claude artifact viewer (which can't load other files).

Usage: python tools/bundle.py [demo/index.html] [dist/parts-gallery.html]

Swaps the page's links to the pinned prototype kit and to parts-kit.css / parts-kit.js for their own text.
Nothing else in the page changes.
"""
import pathlib
import re
import sys

KIT = pathlib.Path(__file__).resolve().parent.parent


def bundle(html: str, base: pathlib.Path) -> str:
    def css(m):
        href = m.group(1)
        ident = "kit-css" if "prototype-kit" in href else "pk-css"
        return f'<style id="{ident}">\n' + (base / href).resolve().read_text(encoding="utf-8") + "\n</style>"

    def js(m):
        src = m.group(1)
        ident = "kit-js" if "prototype-kit" in src else "pk-js"
        text = (base / src).resolve().read_text(encoding="utf-8").replace("</script", "<\\/script")
        return f'<script id="{ident}">\n' + text + "\n</script>"

    html, n_css = re.subn(r'<link rel="stylesheet" href="([^"]+\.css)">', css, html)
    html, n_js = re.subn(r'<script src="([^"]+\.js)"></script>', js, html)
    if n_css != 2 or n_js != 2:
        raise SystemExit(f"Expected two stylesheets and two scripts, found {n_css} and {n_js}.")
    return html


if __name__ == "__main__":
    src = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else KIT / "demo" / "index.html"
    out = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else KIT / "dist" / "parts-gallery.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(bundle(src.read_text(encoding="utf-8"), src.parent), encoding="utf-8")
    print(f"Bundled {src.name} → {out} ({out.stat().st_size // 1024} KB)")
