# Changelog

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
