# Parts kit 1.0 · Blueprint · 3 Nov 2026

*A copy of the plan as Rendered (3 Nov 2026, 22:14). The approved scope and the Build record are in `HANDOFF.md`. Names of the app this was planned with are kept where a decision needs them.*

## Goal

One set of Liquid Glass parts (sheets, menus, alerts, switches, the tab bar and the rest), built once in its own repo, that any of Ivan's apps and prototypes can use with a small settings file. Vocal Sessions comes first; Suki and new apps get the same parts for free.

**Purpose check:** prototypes look exactly like the real app, the glass work is done once instead of once per app, and every look decision is one setting that's easy to find and change. For Vocal Sessions: menus, sheets and controls behave like iOS, so the app gets in the way less while practising.

## What it is

- **Repo:** `imperialfox/parts-kit`, public, MIT, its own version, `CHANGELOG.md`, `README.md` and `HANDOFF.md`. No Q number. Credits `sdegenaar/liquid_glass_widgets` (MIT), whose numbers are the spec.
- **What an app loads:** `parts-kit.css` and `parts-kit.js`, plus the app's own settings file. No framework and no build step, so it fits an app that draws screens as HTML text and a one-file prototype alike.
- **Names it uses:** the value names Vocal Sessions has had since 3.51. The kit gives each a default; an app's own value wins.
- **Motion:** a small spring core (ζ and Hz into CSS `linear()`, the speed multiplier, `html.motion-reduced`). An app that already has its own `MOTION` tells the kit to use it (`motion: 'app'`), so there's one set of springs.
- **Part names:** every part carries a plain `data-name`, which an app can replace with its register name.
- **Its own demo page:** the Parts gallery, rebuilt on the kit's own parts, published as a new version of the same page so notes there stay.

## Parts in 1.0

Everything on the consistency audit's "First" list at once (decision 1), plus three pinned parts. Only the "Later" parts (side bar, inline tab bar, toolbar, page dots) wait.

**Foundations:** the named values plus a named shadow set of three (lifted card, floating, glow); the glass material (iOS 27 `.regular`, measured), strong glass, Reduce transparency; the press (glass grows 17 pt and lights up, solid buttons shrink to `--press`, rows highlight or shrink by setting); the spring core and the hold, flick and drag rules, with first claim for whatever the finger lands on (`data-own-gesture`).

| Group | Part | Setting | Numbers |
|---|---|---|---|
| Bars | Tab bar with search circle (4–6) | `tabBar.fold` (D01, off), `tabBar.searchGap` (D02, 8) | measured |
| Bars | Top bar buttons changing (11) | none | measured |
| Controls | Switch (21) | none | by eye: 380 ms, flick 200 px/s, drag |
| Controls | Slider (22) | the app's own speed control setting (D03) | knob ×1.35 while held |
| Controls | Segmented control (23) | `segmented.style`: `'gallery'` (D04) or `'squish'` | 350 ms spring, swell, drag |
| Inputs | Search field stretch (26) | none | measured: 7 pt and 2 pt |
| Lists | List row press (35) | `row.press`: `'highlight'` (D06) or `'shrink'` | iOS highlight |
| Overlays | Sheet (41), stops (42), growing to full | `sheet.withStops`, `sheet.growsToFull` (D09, D10), `sheet.dragShrink` (D14), `sheet.glass` (D15); corners follow the screen's (D17) | flick 700 pt/s, pull down from the content, stops 45% and full, corners 46 |
| Overlays | Full-screen cover (43) | `sheet.fullScreen` (D10) | rises over 500 ms |
| Overlays | Menus: pull-down and long-press, one style (16, 46) | `menu.submenus` (D11); corners `--r-card` (D16) | measured: hold 700 ms, lift from 200 ms to ×1.04, dim 20% / 25% with no blur, close 170 ms |
| Overlays | Action sheet (47) | `choices`: `'actionSheet'` (D07) or `'sheet'` | gallery |
| Overlays | Alert (48) | `confirm`: `'alert'` (D08) or `'sheet'` | gallery |
| Overlays | Toast (49) | none | by eye: in 500 ms, out 350 ms, 3 s |
| Effects | Submenus (45), glass appearing and leaving (50), finger glint and drag (52) | `menu.submenus`, `glass.appear`, `press.glint` (D11–D13), all empty in the app | measured |

**Also in 1.0:** glass material (1), top bar and soft edge (2, 51), large title (3), pushed page (10); glass, prominent and solid buttons (12–14), buttons on a bar (15), edit button (17), chips (18), badges (19); stepper (24), progress (25); text field (27), text area (29); glass container (33), card (34), grouped section (36), divider (38), swipe actions (39), reorderable list (40); popover (44).

**Both behaviours kept** wherever a decision has a general alternative, so switching back is one line in the settings.

## The settings file

One file per app; each line carries its decision ID in a comment. CSS values stay in the app's stylesheet under their names; the settings file holds only behaviour. The kit refuses a setting it doesn't know; `own` holds the app's own settings, passed through untouched. See `samples/`.

## How apps use it

A pinned, unmodified copy (the two runtime files flat in `css/` and `js/`, plus the docs and a checksum file in their own folder), the version noted in the app. Never edited in the app: change the kit here, release it, copy the release in. A prototype adds the same two files and the app's settings.

## Checks (`tools/check.py`)

Every part on the demo page at 402 × 874 and 820 × 1180, in light, dark, Reduce transparency, Reduce Motion and motion off; every behaviour; every setting both ways; the value rule; no personal data or app names in the kit.

## Decisions

1. What goes in 1.0: every "First" part at once (Ivan, 21:17).
2. Repo: `imperialfox/parts-kit` (made by Ivan).
3. Menu corners: the kit's `--r-card` (20) for every menu (D16).
4. Sheets: pull down from the content, a flick closes, corners follow the screen's (46) move into the kit's sheet (D17).
5. Q34's agreed numbers become the kit's defaults (default taken).
6. The prototype kit and `SHARED.md` don't change in 1.0 (default taken; on Ivan's to-do list).
7. Built in a fresh chat once Rendered, in stages.

## Risks

- Two motion systems drifting apart: `motion: 'app'` and `Parts.motion.compare()`.
- Gesture clashes: the first-touch rule and `data-own-gesture`.
- A 700 ms hold may feel slow next to 480 ms: one number (`timing.hold`).
- Blur ramps need `@property`; without it the blur simply starts full.

## After this

1. The Smart file drop wireframe can start, pulling its sheets from the kit.
2. The move of Vocal Sessions onto the kit: its own Blueprint and Render, replacing Q34. Suggested stages: pin the kit and settings; overlays; controls and bars; rows.
