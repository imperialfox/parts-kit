# Changelog

## 1.4.0 · 11 Nov 2026

*The tab bar's Liquid Glass bubble*

**Tab bar (part 4)**
- Touched, a separate Liquid Glass bubble rises out of the picked tab (one tab's width plus 27 pt, 3.5 pt past the bar) and follows the finger. A tap travels to the tab; a drag lands on the nearest one. The pick, `aria-selected` and `pk:change` follow as the finger lifts.
- Icons under the bubble turn the accent colour where it covers them, so half an icon under it is half accent. They never bend or grow. Only a 13 pt band at the rim bends what's under it (Fresnel rings, a mirrored slice, a little magnifying), with a rim light and a frosted body.
- The bar swells while touched and stretches from an anchor across the bar from the finger. Dragging up raises its top edge while the bottom barely moves.
- A fast drag squashes the bubble flat and wide; it bounces back taller and narrower. The width mirrors the height.
- Drawn on one small WebGL canvas over the bar (36 pt around it), shown only while the bubble is up. The icons and labels are drawn once into a picture; each frame is one draw, and nothing that moves uses `backdrop-filter`.
- Dark: the same shape and motion, with the dark glass colours for the frost and overhang.
- Reduce Motion: no jiggle, swell, stretch, rise or moving anchor; it appears and travels on the short fade. Reduce transparency, or no WebGL: a CSS bubble with no bending (solid with Reduce transparency). No bubble while folded or searching.
- The old press under the finger (the icon at ×1.15, the 12 × 8 pt swell) is replaced while the bubble is on.

**Settings, values and calls**
- `tabBar.bubble`: `on` (default `true`), `anchor`, `invert`, `icons`, `mirror`. `tabBar: { bubble: false }` gives back 1.3.0's highlight exactly.
- Every number is a named value (`--pk-bubble-…`), plus four colours with dark values. Seven new named springs (`bubble-in`, `bubble-out`, `bubble-swell`, `bubble-unswell`, `bubble-follow`, `bubble-travel`, `bubble-snap`).
- `Parts.differences()` lists the bubble's values, app-wide (`value --pk-bubble-…`) and on one tab bar.
- `Parts.lens`: one shared WebGL context, for the segmented control and switches later. `Parts.bubble.hold()`, `.state()`, `.pixels()`; `pk:bubble { up }`.

**Also**
- The Parts gallery's part 4 shows the bubble, with a Tune switch: a slider for every value with − and +, Hold bubble up, the anchor markers, a frame meter, Copy values and Reset. The controls panel has a "Tab bar bubble" switch.
- README: the part 4 row, the settings, and a "Liquid Glass bubble" section.
- `tools/check.py`: the bubble up only while touched; one draw a frame under 2 ms, with a busy page too; half an icon half accent; landing and tap travel with the pick following; the jiggle following the drag speed with the width mirroring the height; folded, searching, Reduce Motion, Reduce transparency, no WebGL and `tabBar.bubble` off; light and dark at 402 × 874 and 820 × 1180; the bubble's values in the CSS matching the kit's numbers; its differences.

## 1.3.0 · 9 Nov 2026

*An alert can offer more than one action*

**Alert (part 48)**
- `Parts.confirm({ …, actions: [{ label, red, value }] })` shows every action. It gives back the chosen action's value (its label if it has none), or `null` for Cancel, Escape or `Parts.closeAll()`.
- Three or more buttons stack in the order given, with Cancel at the bottom, as iOS alerts do. One action plus Cancel stays side by side.
- `red: true` makes an action red; other actions use the accent colour. Each button is named (`Action: <label>`, `Cancel`).
- With `confirm: 'sheet'` the same actions show in a sheet, Cancel last, with the same answers.
- Without `actions` it behaves exactly as 1.2.0: one action, `true` or `false`.

**Also**
- README: the part 48 row and an "Alerts with more than one action" section.
- The Parts gallery's part 48 has a three-button alert (Reset all…).
- `tools/check.py`: stacking, order, sizes and names; every answer (each action, Cancel, Escape, closing, a missing value); one action side by side; the sheet version; 1.2.0 calls unchanged; and the gallery's alert in light, dark and Reduce Motion.

## 1.2.0 · 4 Nov 2026

*The search field stays in view above the iPhone keyboard*

**Keyboard**
- While the tab bar's search field (part 6) is open, the dock rides 8 pt above the iPhone keyboard (`--pk-kb-gap`, a named value an app can change), so the field and what's typed stay in view.
- It follows the visible area (`visualViewport`) as the keyboard moves: no spring of its own, so Reduce Motion and speed 0 change nothing here. A dock the keyboard doesn't reach stays put.
- Closing the keyboard brings the dock back down, with search still open. After ✕ it stays up until the keyboard has gone, then comes down with it.
- The lift is published as `--pk-kb` on `<html>`, so an app can give the list behind the dock room at the bottom. `pk:keyboard { lift }` fires when it changes; `Parts.keyboard()` reads it again now.
- Opening the field still focuses it without scrolling the page.

**Also**
- README: a Keyboard section, and the part 6 row.
- The Parts gallery's part 6 says how it behaves with the keyboard.
- `tools/check.py`: a faked keyboard lifts the dock to 8 pt above it (normally, at speed 0 and under Reduce Motion), follows a panned visible area and a smaller keyboard, drops back when it goes, waits for the keyboard after ✕, takes a changed `--pk-kb-gap`, ignores pinch zoom, lifts part 6's dock in the page only when the keyboard would cover it, and opening the field doesn't scroll the page.

## 1.1.0 · 4 Nov 2026

*The kit leads the motion, and an app can differ on purpose, with every difference listed*

**Differences from the kit**
- `springs: { name: { z, f } }` in the settings changes one of the kit's named springs for the whole app, in the CSS and the code alike. Unknown names and bad numbers are refused; `null` gives a spring back to the kit's.
- One element can carry its own timing (`style="--dur-rise: 600ms"`) or spring (`style="--spring-sheet: gentle"`). The kit's code now reads timings from the element first, then its parents, then the page, the same order the CSS follows.
- Overlay calls (`Parts.sheet`, `cover`, `menu`, `popover`, `choices`, `confirm`, `toast`) take a `style` option, so an overlay the kit makes can carry its own timing too.
- `Parts.differences()` lists every spring, timing and setting where the app differs from the kit, for the whole app and for single elements on the current screen. The README shows how an app's own test checks it against a list with a decision ID per line.
- Reduce Motion and motion off still win over every override.

**Also**
- The README says `motion: 'app'` needs the app's motion object on `window` (`window.MOTION`). `motion: 'kit'` is unchanged.
- The Vocal Sessions sample settings say `motion: 'kit', // D18` and have an empty `springs: {}` line.
- `Parts.motion.springs()` gives the springs in use; `Parts.motion.spring()` and `Parts.motion.ease()` take an element to follow its own spring.
- The Parts gallery's action sheet (47) has a demo with its own timing and a switch to turn it off.
- `tools/check.py`: spring overrides, one-element timings and springs, `Parts.differences()`, overrides under Reduce Motion and speed 0, bad overrides refused, and how quickly a sheet and a menu open.

## 1.0.0 · 4 Nov 2026

*The first release: one set of Liquid Glass parts for any app or prototype*

**Foundations**
- Named values for every corner, press, curve and duration, with defaults any app's own values override; a named set of three shadows (lifted, floating, glow).
- The glass material (iOS 27 `.regular`, measured), strong glass, clear glass for glass inside glass, and Reduce transparency.
- The press: glass grows 17 pt along its longest side and lights up; buttons on a bar only light up; solid buttons shrink to `--press`.
- A small spring core (ζ and Hz into CSS `linear()`, a speed multiplier, `html.motion-reduced`); `motion: 'app'` follows an app's own `MOTION`.
- `Parts.settings({…})`: one line per decision; unknown settings and wrong values are refused.
- First claim for whatever the finger lands on (`data-own-gesture`).

**Parts (gallery numbers)**
- Glass, bars and buttons: glass material (1), top bar and soft edge (2, 51), large title (3), tab bar with folding and search (4–6), pushed page (10), top bar buttons changing (11), glass, prominent and solid buttons (12–14), buttons on a bar (15), pull-down button (16), edit button (17), chips (18), badges (19).
- Controls and inputs: switch (21), slider (22), segmented control with the gallery and squish styles (23), stepper (24), progress (25), search field stretch (26), text field (27), text area (29).
- Lists: glass container (33), card (34), list row with highlight or shrink (35), grouped section (36), divider (38), swipe actions (39), reorderable list (40).
- Overlays: sheet (41) with stops and growing to full (42), pull-down from the content and a flick to close; full-screen cover (43); popover (44); long-press and pull-down menus in one style (16, 46); action sheet (47); alert (48); toast (49).
- Pinned (built, on only where named): submenus (45), glass appearing and leaving (50), finger glint and drag (52).

**Also**
- The Parts gallery rebuilt on the kit as its demo, with every setting switchable both ways.
- `tools/check.py`: the value rule, settings, looks at 402 × 874 and 820 × 1180 in light, dark, Reduce transparency, Reduce Motion and motion off, and every behaviour.
- A sample settings file for one app (`samples/`).
