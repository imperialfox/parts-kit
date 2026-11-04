"""The value rule: every corner, press, curve and duration in parts-kit.css below the defaults block is a named value.

Corners above 6 px must be var(--r-…) (capsules 999px and circles 50% are fine). A press (scale or transform on a
pressed or :active part) must be var(--press…) or the kit's measured var(--pk-ps). Every transition and animation easing
is var(--ease-…) and every duration var(--dur-…) (inside calc() is fine). Same reading as an app's tests/test_values.py.

Usage: python tools/values.py            (prints the counts, exits 1 on a stray)
"""
import pathlib
import re
import sys

KIT = pathlib.Path(__file__).resolve().parent.parent
CSS = KIT / "parts-kit.css"
END = "/* END OF DEFAULTS */"
AT_SKIP = ("@media", "@supports", "@container", "@layer", "@property", "@keyframes")


def declarations(css):
    """(selector, line, property, value) for every declaration; comments skipped; @media keeps its selector."""
    src = re.sub(r"/\*.*?\*/", lambda m: re.sub(r"[^\n]", " ", m.group(0)), css, flags=re.S)
    out, stack = [], []
    start, paren = 0, 0
    for i, c in enumerate(src):
        if c == "(":
            paren += 1
        elif c == ")":
            paren -= 1
        elif paren == 0 and c in "{};":
            chunk = src[start:i]
            if c == "{":
                stack.append(" ".join(chunk.split()))
            else:
                if ":" in chunk:
                    k = chunk.index(":")
                    p = chunk[:k].strip().lower()
                    if re.fullmatch(r"-?[a-z][a-z-]*", p):
                        lead = len(chunk) - len(chunk.lstrip())
                        line = src.count("\n", 0, start + lead) + 1
                        sel = " › ".join(s for s in stack if not s.startswith(AT_SKIP))
                        inkf = any(s.startswith("@keyframes") for s in stack)
                        out.append((sel, line, p, " ".join(chunk[k + 1:].split()), inkf))
                if c == "}" and stack:
                    stack.pop()
            start = i + 1
    return out


def split_top(v, sep):
    out, depth, cur = [], 0, ""
    for c in v:
        depth += c == "("
        depth -= c == ")"
        if depth == 0 and (c == sep if sep != " " else c.isspace()):
            if cur.strip():
                out.append(cur.strip())
            cur = ""
        else:
            cur += c
    if cur.strip():
        out.append(cur.strip())
    return out


TIME = re.compile(r"^(-?\d*\.?\d+)(ms|s)$")
KEYWORD_EASE = {"ease", "ease-in", "ease-out", "ease-in-out", "linear", "step-start", "step-end"}


def is_ease(t):
    return t in KEYWORD_EASE or t.startswith(("cubic-bezier(", "steps(", "linear("))


def strays(css):
    """Every value that isn't named: (kind, selector, property, token, line). Also returns counts of named uses."""
    body = css.split(END, 1)[1] if END in css else css
    offset = css[: css.index(END)].count("\n") if END in css else 0
    bad, named = [], {"corner": 0, "press": 0, "ease": 0, "duration": 0}
    for sel, line, p, v, inkf in declarations(body):
        line += offset
        if p.startswith("--"):
            # a part may only point a variable at a named value, never invent a timing or corner
            if re.search(r"\b\d*\.?\d+m?s\b|cubic-bezier\(", v) and not sel.startswith(":where(:root"):
                bad.append(("value", sel, p, v, line))
            continue
        v = re.sub(r"\s*!important$", "", v)
        if "radius" in p:
            for tok in split_top(v.replace("/", " "), " "):
                if tok.startswith("var(--r-") or tok == "inherit":
                    named["corner"] += 1
                    continue
                m = re.fullmatch(r"(\d*\.?\d+)px", tok)
                if tok in ("0", "999px", "50%", "initial") or (m and float(m.group(1)) <= 6):
                    continue
                bad.append(("corner", sel, p, tok, line))
        if (":active" in sel or "pk-pressed" in sel) and p in ("transform", "scale"):
            ok = re.fullmatch(r"(var\(--press[a-z-]*\)|var\(--pk-ps[^)]*\)|none)", v.strip())
            if ok:
                named["press"] += 1
            else:
                bad.append(("press", sel, p, v, line))
        if p.startswith(("transition", "animation")):
            if p.endswith(("-delay", "-name", "-property", "-fill-mode", "-iteration-count", "-direction", "-play-state", "-behavior")):
                continue
            for seg in split_top(v, ","):
                toks = split_top(seg, " ")
                if p.endswith("-timing-function"):
                    durs, eases = [], toks
                elif p.endswith("-duration"):
                    durs, eases = toks, []
                else:
                    durs = [t for t in toks if TIME.match(t) or t.startswith(("var(--dur-", "calc("))][:1]
                    eases = [t for t in toks if is_ease(t) or t.startswith("var(--ease-")]
                for d in durs:
                    if TIME.match(d) and float(TIME.match(d).group(1)) == 0:
                        continue
                    if "var(--dur-" in d:
                        named["duration"] += 1
                    else:
                        bad.append(("duration", sel, p, d, line))
                for t in eases:
                    if t.startswith("var(--ease-"):
                        named["ease"] += 1
                    else:
                        bad.append(("ease", sel, p, t, line))
    return bad, named


def guard():
    """The rule itself works: raw values added to a copy are caught."""
    css = CSS.read_text(encoding="utf-8")
    probe = css + "\n.x{border-radius:12px;transition:opacity .3s ease}\n.x.pk-pressed{scale:.9}\n"
    bad, _ = strays(probe)
    kinds = {b[0] for b in bad if b[1] == ".x" or b[1] == ".x.pk-pressed"}
    return {"corner", "duration", "ease", "press"} <= kinds


def main():
    css = CSS.read_text(encoding="utf-8")
    bad, named = strays(css)
    print(f"named uses: corners {named['corner']}, presses {named['press']}, easings {named['ease']}, durations {named['duration']}")
    if not guard():
        print("FAIL: the value rule's own guard didn't catch a raw corner, press, curve and duration")
        return 1
    for b in bad:
        print(f"FAIL line {b[4]}: {b[0]} {b[3]} in {b[1]} {{ {b[2]} }}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
