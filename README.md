# Parts kit

![version](https://img.shields.io/badge/version-1.4.0-007aff)

**Current version:** 1.4.0 · 11 Nov 2026 · [changelog](CHANGELOG.md)

One set of Liquid Glass parts (sheets, menus, alerts, switches, the tab bar and the rest), built once, that any web app or prototype loads with a small settings file of its own. The parts look and move like iOS 26/27, using numbers measured against real iPhones where they exist. It belongs to no app, so any app can use it.

- **Two files:** `parts-kit.css` and `parts-kit.js`. No framework and no build step.
- **One settings file per app:** each design decision is one line, so changing one is a one-line edit.
- **Named values:** every corner, press, curve and duration has a name; your app's own value with the same name wins.
- **The kit leads the motion, and an app can differ on purpose:** for the whole app or one element, with every difference listed by `Parts.differences()` (see [Differences from the kit](#differences-from-the-kit)).
- **Its own demo:** the Parts gallery (`demo/index.html`), every part with its number, both ways of every setting in the controls panel.

Numbers come from [sdegenaar/liquid_glass_widgets](https://github.com/sdegenaar/liquid_glass_widgets) (MIT), whose authors measured many of them against native iOS. "Measured" below means theirs were timed against a real iPhone; "by eye" means their tuning.

## Add it to an app

1. Copy `parts-kit.css` and `parts-kit.js` into the app, unchanged (see [Pinning a version](#pinning-a-version)).
2. Load the stylesheet before the app's own, and the script before the app's settings file:

```html
<link rel="stylesheet" href="css/parts-kit.css">
<link rel="stylesheet" href="css/app.css">
…
<script src="js/parts-kit.js"></script>
<script src="js/parts.settings.js"></script>
```

3. Write the settings file: one line per decision, with its decision ID in a comment (see [Settings](#settings) and `samples/`).
4. Write parts as plain HTML with their `pk-` classes, or open them with a call (`Parts.sheet({…})`). The kit listens on the page, so screens drawn as HTML text need no setup call.
5. Give every part a plain `data-name` ("Save button"). Parts the kit makes take a plain name too ("Sheet", "Close button"); pass `name` (and `closeName`) to use your own register's name instead.

**A prototype** made with the prototype kit adds the same two files and the app's settings file, so it looks and moves exactly like the app.

## Pinning a version

- Copy the two runtime files **unmodified** into the app (flat, e.g. `css/parts-kit.css` and `js/parts-kit.js`, so an offline cache that saves `css/` and `js/` covers them).
- Beside them, in a folder of their own (e.g. `tools/parts-kit/`), keep this `README.md`, `CHANGELOG.md`, `LICENSE.txt` and `SHA256SUMS.txt`, so the app's tests can check the copy is untouched (`sha256sum -c`).
- Note the version in the app's maintenance notes.
- **Never edit the kit inside an app.** Change it here, release a new version, copy the release in.

## Settings

`Parts.settings({…})` checks every line. An unknown setting or a wrong value is refused (and printed as an error), and the setting stays as it was; the call returns the problems, and `Parts.problems` keeps them all, so an app's tests can fail on a typo. It can be called again later; only the lines given change.

| Setting | Values (default first) | What it does |
|---|---|---|
| `app` | text | The app's name (for notes only). |
| `motion` | `'kit'`, `'app'` | `'kit'`: the kit runs the motion (springs, speed, Reduce Motion). `'app'` uses the app's own motion object instead, and **needs it on `window` as `window.MOTION`** (a `const MOTION` in a script isn't on `window`, so the kit can't see it); the kit then adds only the springs the app lacks. |
| `springs` | `{}` | The app's own numbers for any of the kit's named springs, one line each with its decision ID: `press: { z: 0.8, f: 3.6 }, // D19`. `z` is the damping ratio (0.05 to 1), `f` the frequency in Hz (0.1 to 20). The CSS and the code both use it everywhere that spring is used. An unknown name or a bad number is refused. `null` gives a spring back to the kit's. |
| `root` | `null` (the page), a selector or element | Where overlays go. Set it when the app lives inside one element. |
| `tabBar.fold` | `false`, `true` | The tab bar folds into a pill after 20 pt of scrolling down and opens after 12 pt up. |
| `tabBar.searchGap` | `8` | Points between the tab bar and its search circle. |
| `tabBar.bubble.on` | `true`, `false` | The Liquid Glass bubble on the tab bar (see [Liquid Glass bubble](#liquid-glass-bubble)). `false` gives back 1.3's highlight exactly. `tabBar: { bubble: false }` is short for `{ on: false }`. |
| `tabBar.bubble.anchor` | `'follow'`, `'fixed'`, `'touch'`, `'end'` | Where the bar stretches from: following the finger, a fixed point (`--pk-bubble-anchor-x`), where the finger landed, or the end away from the drag. |
| `tabBar.bubble.invert` | `true`, `false` | The following anchor sits across the bar from the finger and moves the other way. |
| `tabBar.bubble.icons` | `'row'`, `'each'` | Dragging up stretches the whole row of icons from the anchor, or each icon from its own centre. |
| `tabBar.bubble.mirror` | `true`, `false` | The bubble's width changes by the same amount as its height, the other way (`false` uses `--pk-bubble-width-max` and `-min`). |
| `segmented.style` | `'gallery'`, `'squish'` | Gallery: the knob slides on a 350 ms spring, swells to glass and can be dragged. Squish: slides on a curve and squishes; no drag. |
| `row.press` | `'highlight'`, `'shrink'` | A pressed row highlights (iOS) or shrinks to `--press-row`. |
| `choices` | `'actionSheet'`, `'sheet'` | How `Parts.choices()` shows. |
| `confirm` | `'alert'`, `'sheet'` | How `Parts.confirm()` shows. |
| `sheet.withStops` | `[]` | Sheet names (their `key`) that get the 45% and full stops. |
| `sheet.growsToFull` | `[]` | Sheet names whose `grow()` raises them to full screen. |
| `sheet.fullScreen` | `[]` | Sheet names that open as a full-screen cover. |
| `sheet.dragShrink` | `false`, `true` | Sheets shrink while dragged down (iOS zoom sheets) instead of only following the finger. |
| `sheet.glass` | `'strong'`, `'regular'` | The sheets' glass. |
| `menu.submenus` | `[]` | Menu names (their `key`) that open submenus. Elsewhere a submenu's items show inline under a small label. |
| `glass.appear` | `[]` | Names (`key`) that `Parts.appear()` and `Parts.leave()` animate. Elsewhere they appear and go at once. |
| `press.glint` | `[]` | Button names (`data-glint`) that get the finger glint and lean toward a dragging finger. |
| `timing.hold` | `700` | Milliseconds to hold before a long-press menu (measured). |
| `timing.lift` | `200` | Milliseconds before a held row starts to lift (measured). |
| `timing.toast` | `3000` | Milliseconds a toast stays, unless the call sets its own. |
| `own` | anything | The app's own settings, kept and passed back untouched (`Parts.own()`). |

A list may hold `'*'` to mean everywhere. Settings for look values (corners and the like) aren't here: those are named values in the app's stylesheet (below).

Example (`samples/vocal-sessions.settings.js` is a full one):

```js
Parts.settings({
  app: 'My app',
  motion: 'kit',                                   // D18 the kit runs the motion
  springs: { press: { z: 0.8, f: 3.6 } },          // D19 a softer press, for this app only
  tabBar: { fold: false, searchGap: 8 },           // D01, D02
  sheet: { withStops: ['newItem'], growsToFull: ['newItem'] }, // D09, D10
  menu: { submenus: [] },                          // D11, pinned: built, not used yet
  own: { datePicker: 'calendar' },                 // the app's own, passed through
});
```

## Named values

Every value the parts use is named in the defaults block at the top of `parts-kit.css`. The defaults have zero weight (`:where()`), so the app's own value of the same name always wins. Set a value in both looks if it differs in dark mode.

- **Colours:** `--bg`, `--surface`, `--fg`, `--fg2`, `--fg3`, `--sep`, `--fill` (also the input well), `--accent`, `--on-accent`, `--danger`, `--good`.
- **Glass** (iOS 27 `.regular`, measured): `--glass`, `--glass-rt` (Reduce transparency), `--glass-blur`, `--glass-sat`, `--glass-float`, `--glass-line`, `--glass-line-end`, `--glass-rim`, `--glass-strong` (sheets), `--lift-max` (a pressed button lighting up), `--tint` (prominent buttons).
- **Corners:** `--r-small` 10, `--r-medium` 14, `--r-card` 20 (also menus), `--r-large` 26, `--r-sheet` 46 (the screen's own corners), `--r-alert` 34, `--r-actions` 28. Capsules are `999px`, circles `50%`.
- **Press:** `--press` 0.93 (solid buttons), `--press-row` 0.98, `--pk-knob-grow` 1.35, `--pk-lift-scale` 1.04, `--pk-recede` 0.971.
- **Shadows (the named set of three):** `--shadow-lifted` (a lifted card or row), `--shadow-floating` (menus, popovers), `--shadow-glow`.
- **Easings:** `--ease-pop`, `--ease-knob`, `--ease-out`, `--ease-in-out`, `--ease-decel`, `--ease-accel`, `--ease-back`, `--ease-lift`, `--ease-linear`, `--ease-steps`.
- **Durations:** `--dur-quick` 120, `--dur-fade` 200, `--dur-lift-in` 150, `--dur-lift-out` 60, `--dur-switch` 380, `--dur-knob` 150, `--dur-squish` 450, `--dur-appear` 250, `--dur-leave` 350, `--dur-rise` 350, `--dur-cover` 500, `--dur-toast-in` 500, `--dur-toast-out` 350, `--dur-close` 170, `--dur-ramp` 260, `--dur-lift-row` 360, `--dur-recede` 320, `--dur-morph` 420, `--dur-reduced` 100, `--dur-glint` 500, `--dur-progress` 600, `--dur-spin` 1 s.
- **Kit-only looks** start `--pk-` (menu material `--pk-menu`, dims `--pk-dim` 54% and `--pk-dim-light` 20% / 25%, the grabber, switch and knob colours, and so on).
- **The tab bar's bubble** (1.4, tuned by eye against iOS 27): every number of the bubble is a `--pk-bubble-…` value; the full list, with what each does, is in the defaults block of `parts-kit.css`. Its colours: `--pk-bubble-tint` (the frost), `--pk-bubble-over-tint` (where it hangs past the bar), `--pk-bubble-css` (without WebGL) and `--pk-bubble-solid` (with Reduce transparency), each with a dark value.
- **Layout:** `--dockb`, `--dockl`, `--dockr` (where the tab bar sits; 21 pt on an upright iPhone), `--pk-bar-top` (where top bar buttons sit), `--pk-search-gap`, `--pk-kb-gap` (8 pt: how far an open search field sits above the iPhone keyboard; see [Keyboard](#keyboard)).

The rule: nothing below the defaults block writes its own corner, press, curve or duration. `tools/values.py` checks it, the same way an app's value test does.

## Motion

- **Springs** are a damping ratio ζ and a frequency in Hz, sampled into CSS `linear()` and published on `<html>` as `--ease-<name>` and `--dur-<name>`: `gentle`, `nav`, `ripple`, `press`, `release` (the measured glass press), `snap` (highlights settling, 350 ms), `bloom`, `settle`, `pill`, `sheet`, `menu-open`, `menu-close`, and the tab bar's bubble (1.4): `bubble-in`, `bubble-out`, `bubble-swell`, `bubble-unswell`, `bubble-follow`, `bubble-travel`, `bubble-snap`.
- **Speed:** `Parts.motion.setSpeed(n)`: 1 normal, 4 slow (for tuning), 0 off (for tests). Fixed durations are multiplied by `--pk-speed`.
- **Reduce Motion:** follows the device, or `Parts.motion.setReduced(true | false | null)`. `<html>` gets `.motion-reduced`: no movement or growth, short fades (`--dur-reduced`). Motion off adds `.motion-off`.
- **An app's own springs:** `springs: {…}` in the settings changes a named spring for the whole app (see [Differences from the kit](#differences-from-the-kit)). `Parts.motion.springs()` gives the springs in use; `Parts.motion.SPRINGS` stays the kit's own.
- **Reduce Motion and motion off always win.** An override, app-wide or on one element, never brings back movement under Reduce Motion, and speed 0 still stops everything.
- **An app with its own MOTION** sets `motion: 'app'` and puts it on `window` (`window.MOTION = MOTION`); the kit follows its speed and Reduce Motion, and `Parts.motion.compare()` lists any spring the two define differently (it should be empty). With `motion: 'app'`, the app's MOTION decides the springs it has.
- **Reduce transparency:** put `.glass-solid` on `<html>` (or any ancestor); glass uses `--glass-rt` and keeps its blur.

## Differences from the kit

The kit is the one source of motion. An app can still differ in three ways, each written down where it can be found:

1. **A timing for the whole app:** set the named value in the app's stylesheet, e.g. `:root { --dur-close: 220ms; } /* D20 menus close slower */`. It wins over the kit's (the kit's defaults have zero weight).
2. **A spring for the whole app:** a line in `springs: {…}` in the settings file (above).
3. **A timing or spring for one element only:**
   - A timing in the element's `style`, with the same names: `style="--dur-rise: 600ms"`. The kit reads timings from the element first, then its parents, then the page, the same order the CSS follows. Whatever is inside the element follows it too; its neighbours keep theirs.
   - A spring in the element's `style`: `--spring-<name>: <another spring>`, e.g. `style="--spring-sheet: gentle"`. The kit fills in that element's `--ease-sheet` and `--dur-sheet` from the chosen spring, so the CSS follows it at every speed. In a stylesheet, write those two lines yourself: `.slow-sheet { --ease-sheet: var(--ease-gentle); --dur-sheet: var(--dur-gentle); }`.
   - For overlays the kit makes, pass `style` to the call: `Parts.sheet({ key: 'newItem', style: '--dur-leave: 500ms', … })`. `Parts.cover`, `Parts.menu`, `Parts.popover`, `Parts.choices`, `Parts.confirm` and `Parts.toast` take it too. Or target the overlay's name in the stylesheet: `.pk-sheet[data-name="New item"] { --dur-leave: 500ms; }`.
   - To switch one off, take the line out of the style.

**`Parts.differences()`** lists every spring, timing and setting where the app differs from the kit: settings that aren't the kit's defaults, every line in `springs`, every named timing in the app's stylesheet, and every element on the current screen whose timing or spring differs from its parent's. Each entry has a `key` (`'setting segmented.style'`, `'spring press'`, `'timing --dur-close'`, `'element New item › --dur-leave'`, `'element New item › spring sheet'`), the app's value, the kit's value (for an element, the value around it) and a `text` line. Pass `{ root }` to look at one part of the page.

**Checking it in the app's own test:** keep a list with a decision ID on each line, and fail on any difference that isn't on the list (and any line that no longer differs), the same way the value test's known list works:

```js
const KNOWN = {
  'setting sheet.withStops': 'D09',
  'spring press': 'D19',
  'timing --dur-close': 'D20',
};
const found = Parts.differences().map((d) => d.key);
const extra = found.filter((k) => !KNOWN[k]);      // a difference nobody decided: fails
const stale = Object.keys(KNOWN).filter((k) => !found.includes(k)); // a decision that no longer differs: fails
```

Run it on each screen the app's test opens, so one-element differences are seen where they live. If a later kit version improves a spring the app overrides, the app keeps its own numbers; the list shows it on every build, so it's never by accident.

## Keyboard

New in 1.2. When the tab bar's search field (part 6) is open on an iPhone, the dock rides 8 pt above the keyboard, so the field and what's typed stay in view.

- **It follows the keyboard.** The kit reads the visible area (`visualViewport`, as it changes size or moves) and lifts the searching dock by however much the keyboard would cover it, plus `--pk-kb-gap`. There's no spring or curve of its own, so Reduce Motion and speed 0 change nothing here. A dock that the keyboard doesn't reach (one higher up the page) stays where it is.
- **It comes back down with it.** Closing the keyboard (scrolling, tapping elsewhere) brings the dock down, with search still open. After ✕ the dock stays up until the keyboard has gone, then comes down with it.
- **Opening the field** focuses it without scrolling the page.
- **Room for your list:** the lift is published as `--pk-kb` on `<html>` (`0px` with no keyboard). Give the list behind the dock that much more room at the bottom, so its last row scrolls clear of the field:

```css
.results { padding-bottom: calc(100px + var(--pk-kb)); }
```

- `pk:keyboard { lift }` fires on the dock each time the lift changes. `Parts.keyboard()` reads the visible area again now and returns the lift (for tests).
- Pinch zoom isn't a keyboard and lifts nothing. On Android the same reading works where the browser reports the visible area this way; where it resizes the page instead, nothing needs lifting.

## Liquid Glass bubble

New in 1.4, and on by default. While a finger is on the tab bar (part 4), a separate glass bubble rides on top of it and follows the finger, as on iOS 27:

- **It rises out of the picked tab,** one tab's width plus 27 pt, hanging 3.5 pt past the bar, and sinks back into the tab it lands on. A tap travels there; a drag lands on the nearest tab. The pick (`.on`, `aria-selected`, `pk:change`) changes as the finger lifts.
- **Icons under it turn the accent colour where it covers them,** so half an icon under it is half accent. They never bend or grow: only a 13 pt band at the bubble's rim bends what's under it (Fresnel rings, a mirrored slice at the rim, a little magnifying), with a rim light from the left and a frosted body.
- **The bar swells** 18.6 × 1.2 pt while touched and **stretches from an anchor** that sits across the bar from the finger, moving the other way a moment behind it (within 0.42 to 0.61 of the bar). **Dragging up** raises its top edge (3 pt at most) while the bottom barely moves, and the icons stretch half as much.
- **A fast drag squashes the bubble** flat and wide (fully at 130 pt/s); when it slows, it bounces back taller and narrower. The width mirrors the height.
- **How it's drawn:** one small WebGL canvas over the bar and 36 pt around it, shown only while the bubble is up. The tabs' icons, labels and badges are drawn once into a picture (normal and accent copies), made again only when a badge, the look, the size, the text size, the font or the pick changes, and never while the bubble is up. Each frame is one draw; nothing that moves uses `backdrop-filter`. The bar itself stays the kit's CSS glass.
- **Reduce Motion:** no jiggle, swell, stretch, rise or moving anchor. The bubble appears and travels between tabs on the short fade (`--dur-reduced`).
- **Reduce transparency** (`.glass-solid`) **or no WebGL:** the CSS bubble: the same shape on top, a copy of the tabs and an accent copy cut to the bubble, no bending; solid with Reduce transparency (`--pk-bubble-solid`). Whether WebGL works is decided once, when the page first shows a tab bar, never mid-drag.
- **Folded (part 5) or searching (part 6):** no bubble.
- **2 to 6 tabs.** Badges (part 19) are drawn into the picture in their own colours.
- **Off:** `tabBar: { bubble: false }` gives back 1.3's highlight exactly (clear glass, 12 × 8 pt swell, the icon at ×1.15), with no WebGL.

**Changing it.** Every number is a named value (`--pk-bubble-width: 30px;` in the app's stylesheet, or in one tab bar's `style`), the springs are the kit's named `bubble-…` springs (`springs: { 'bubble-travel': { z: 0.8, f: 3.2 } }`), and the switches are `tabBar.bubble` settings. `Parts.differences()` lists each one (`value --pk-bubble-width`, `element Tab bar › --pk-bubble-frost`, `setting tabBar.bubble.mirror`). The Parts gallery's part 4 has a **Tune** switch with a slider for every value, Hold bubble up, the anchor markers, a frame meter and Copy values (the changed lines, ready to paste).

**Calls.** `Parts.bubble.hold(bar, true | false)` keeps the bubble up (for tuning). `Parts.bubble.state(bar)` gives where everything is in the bar's points: `up`, `mode` (`'webgl'` or `'css'`), the bubble, the bar's swell, the anchor, the jiggle. `Parts.bubble.pixels(bar, x, y, w, h)` reads what the lens drew (for tests). `pk:bubble { up }` fires on the bar as the bubble rises and settles.

**The lens.** `Parts.lens` is one WebGL context for the whole page, shared by every part that bends light (the segmented control and switches can use it later without a second context): `ok`, `program(name, fragmentShader, uniforms)`, `texture(canvas)`, `attach(host, x, y, w, h, pixelsPerPoint)`, `draw(name, setUniforms)`, `read(x, y, w, h)`, `stats()`.

## Alerts with more than one action

New in 1.3. Pass `actions` and the alert shows each one, with Cancel last:

```js
const pick = await Parts.confirm({
  title: 'Reset all data?',
  message: 'Everything saved on this device will be deleted.',
  actions: [
    { label: 'Back up first', value: 'backup' },
    { label: 'Delete everything', red: true, value: 'delete' },
  ],
  cancel: 'Cancel', // optional
});
// pick is 'backup', 'delete', or null for Cancel (also Escape, or Parts.closeAll())
```

- Each action is `{ label, red, value }`. `red: true` makes it red; any other action is the accent colour. An action with no `value` gives back its label.
- One action plus Cancel sits side by side, as before. Three or more buttons stack, in the order given, with Cancel at the bottom, as iOS alerts do.
- With `confirm: 'sheet'` the same buttons show in a sheet, Cancel last, and give back the same values.
- Without `actions`, nothing changes from 1.2.0: `action` and `red` as before, and the answer is `true` or `false`.

## Gestures

Whatever the finger lands on gets first claim: switches, sliders, segmented controls, the tab bar, swipe rows, reorder handles, fields and anything marked `data-own-gesture` beat swiping back on a pushed page and dragging a sheet. Dragging gestures follow the finger at once and settle on springs; flicks carry their speed (a sheet: 700 pt/s; a switch: 200 px/s; swiping back: 500 pt/s).

## Parts

Numbers are the Parts gallery's. Every part sends `pk:` events that bubble (`pk:change`, `pk:hold`, `pk:pick`, `pk:reorder`, `pk:close` …), so an app can listen once.

**Glass, bars and buttons**

| # | Part | How | Notes |
|---|---|---|---|
| 1 | Glass material | `.pk-glass`, `.pk-strong`, `.pk-clear`, `.pk-tinted` | Measured. Glass on the control layer only; `.pk-clear` is glass inside glass (no second blur). |
| 2, 51 | Top bar and soft edge | `.pk-topbar` (with `.pk-edge`, `.pk-topbar-title`, `.pk-bar-slot.pk-left` / `.pk-right`) beside a `.pk-scroll` | Soft edge and small title after 36 pt. `.pk-edge-blur` (three blurs), `.pk-edge-bottom` (60 pt). |
| 3 | Large title | `.pk-large-title`, `.pk-date-line` | 34 pt bold. |
| 4–6 | Tab bar, folding, search | `.pk-dock` > `.pk-tabbar.pk-glass` (`.pk-tab-ind` + `.pk-tab`s), `.pk-tab-pill`, `.pk-search-circle`, `.pk-search-field`, `.pk-search-close` | Tap or drag; `pk:change { index }`, `pk:search { open }`. Touched, the Liquid Glass bubble rides on top (1.4, `tabBar.bubble`; see [Liquid Glass bubble](#liquid-glass-bubble)). Folding with `tabBar.fold`. An open search field rides `--pk-kb-gap` (8 pt) above the iPhone keyboard; the lift is `--pk-kb` (see [Keyboard](#keyboard)). |
| 10 | Pushed page | `.pk-push`; `Parts.push(page, { under })`, `Parts.pop(page)` | Swipe right from anywhere on it. `pk:push`, `pk:pop`. |
| 11 | Top bar buttons changing | `Parts.bar.swap(button, iconHTML)`, `Parts.bar.appear(slot, html)`, `Parts.bar.leave(slot)` | Measured: blur σ 6 out / 3.5 in, swell 22%; 250 ms in, 350 ms out. |
| 12 | Glass button | `.pk-btn.pk-glass.pk-press` + `.pk-circle` / `.pk-pill` / `.pk-cta` | Measured: grows 17 pt on its longest side (44 pt circle ×1.39), lights up. |
| 13 | Prominent button | add `.pk-tinted` | |
| 14 | Solid press | `.pk-press-solid` (`.pk-solid` for black / white) | Shrinks to `--press`. |
| 15 | Buttons on a bar | `.pk-group.pk-glass` with `.pk-press-bar` buttons (`.pk-toggles` to toggle) | They only light up. |
| 16 | Pull-down button | `Parts.menu(button, items, { key, onPick })` | Grows out of the button; one menu style, corners `--r-card`. |
| 17 | Edit button | `data-pk-edit="#list"` | Toggles `.pk-editing`; Edit becomes Done; `.pk-edit-del` circles. `pk:edit`. |
| 18 | Chips | `.pk-chips` > `.pk-chip`, `.pk-chip-add` | Tap toggles `.on` (not in `.pk-static`). |
| 19 | Badges | `.pk-badged` > button + `.pk-badge`; `.pk-tag` | |

**Controls and inputs**

| # | Part | How | Notes |
|---|---|---|---|
| 21 | Switch | `.pk-switch` (`.on`) > `.pk-switch-knob`; `.pk-switch-row` | Tap, drag or flick (200 px/s); `pk:change { on }`. `Parts.setSwitch(el, on)`. |
| 22 | Slider | `.pk-slider` (`data-min`, `data-max`, `data-step`, `data-value`) > `.pk-slider-track` > `.pk-slider-fill`, `.pk-slider-thumb` | Knob ×1.35 while held. `pk:input`, `pk:change { value }`. |
| 23 | Segmented control | `.pk-seg` > `.pk-seg-ind` + buttons | `segmented.style`. `pk:change { index }`. `Parts.select(el, i)`. |
| 24 | Stepper | `.pk-stepper.pk-glass` (`data-value`, `data-min`, `data-max`, `data-step`) with `[data-step="-1"]`, `.pk-stepper-div`, `[data-step="1"]` | Shows its value in `.pk-stepper-value` or `[data-pk-value-of="#id"]`. `pk:change { value }`. |
| 25 | Progress | `.pk-progress` > `i`; `Parts.html.spinner()`; `svg.pk-ring` with `.pk-ring-bg`, `.pk-ring-fg` (`pathLength="100"`) | Set `--pk-v` from 0 to 100. |
| 26 | Search field | `.pk-search` (input + `.pk-field-clear`) | Measured: stretches about 7 pt and 2 pt when dragged. The dock's search field too. |
| 27 | Text field | `.pk-field` (input + `.pk-field-clear`) | Solid well, 17 pt text. |
| 29 | Text area | `.pk-field.pk-area` > textarea | Grows as you type. |

**Lists** (solid, not glass)

| # | Part | How | Notes |
|---|---|---|---|
| 33 | Glass container | `.pk-container.pk-glass` | Corners 20. |
| 34 | Card | `.pk-card.pk-glass` | Corners 26; buttons inside use `.pk-clear`. |
| 35 | List row | `.pk-row` (`button`, `a` or `.pk-tap` to press) with `.pk-tile`, `.pk-row-text` (`small`), `.pk-row-value`, `.pk-chev`; `.pk-tiles` on the list | `row.press`. |
| 36 | Grouped section | `.pk-section-head`, `.pk-list`, `.pk-section-foot` | |
| 38 | Divider | `.pk-divider`, `.pk-inset` | |
| 39 | Swipe actions | `.pk-swipe` > `.pk-swipe-actions` (buttons, `.pk-red`, `.pk-orange`) + `.pk-swipe-front` | Open past 60 pt; tap elsewhere closes. `pk:swipe`. |
| 40 | Reorderable list | `.pk-reorder` with a `.pk-grip` per row | `pk:reorder { from, to }`; `preventDefault()` to move rows yourself. |

**Overlays** (each returns a controller with `el` and `close()`)

| # | Part | How | Notes |
|---|---|---|---|
| 41 | Sheet | `Parts.sheet({ title, html, key, name, closeName, onClose })` | 8 pt from the edges, corners `--r-sheet`. Drag from the top, or from the content when it's at the top; flick 700 pt/s. `.body`, `.stop`. |
| 42 | Sheet with stops, growing to full | `sheet.withStops`, `sheet.growsToFull`; `.to('large')`, `.grow()` | 45% and full (90 pt from the top), solid at full. `pk:stop`, `pk:grow`. |
| 43 | Full-screen cover | `Parts.cover({ title, html })`, or a sheet named in `sheet.fullScreen` | Rises over 500 ms; ✕ closes. |
| 44 | Popover | `Parts.popover(button, html)` | Blur ramps in over 260 ms. |
| 46 | Long-press menu | `.pk-hold`; in `pk:hold`, call `ev.detail.open(items, { onPick })` | Measured: lifts from 200 ms (×1.04), menu at 700 ms, dim 20% / 25%, closes in 170 ms. Right-click opens it at once. `Parts.contextMenu(row, items)`. |
| 47 | Action sheet | `Parts.choices({ title, actions: [{ label, red, value }] })` → Promise of the value or `null` | `choices`. |
| 48 | Alert | `Parts.confirm({ title, message, action, red })` → Promise of true / false; with `actions` (1.3), the chosen action's value or `null` (see [Alerts with more than one action](#alerts-with-more-than-one-action)) | `confirm`. Never the browser's own confirm. |
| 49 | Toast | `Parts.toast(text, { undo, ms })` | 500 ms in, 350 ms out, 3 s. One at a time. |

Menu items are `{ label, icon, red, disabled, value, sub }` or `'-'` for a gap. Escape closes the newest overlay; `Parts.closeAll()` closes them all.

**Effects (pinned: built, and switched on only where named)**

| # | Part | How | Notes |
|---|---|---|---|
| 45 | Submenus | items with `sub`, in a menu whose `key` is in `menu.submenus` | Measured: the menu recedes to 0.971, its rows fade to half. |
| 50 | Glass appearing and leaving | `Parts.appear(el, { key })`, `Parts.leave(el, { key })` | Measured: 250 ms in (from ×1.15), 350 ms out. |
| 52 | Finger glint and drag | `data-glint="name"` on a `.pk-press` button, name in `press.glint` | Glow 1.6 × the short side; leans at most 4 pt. |

**Not in the kit yet:** inline tab bar (7), toolbar (8), side bar (9), page dots (20) come later if needed. Password and form fields (28, 30), picker and date wheels (31, 32) and the disclosure group (37) aren't planned.

## Other calls

`Parts.version`, `Parts.current` (the settings in force), `Parts.differences()` (above), `Parts.keyboard()` (see [Keyboard](#keyboard)), `Parts.bubble` and `Parts.lens` (see [Liquid Glass bubble](#liquid-glass-bubble)), `Parts.problems`, `Parts.check()`, `Parts.allowed(group, key)`, `Parts.own()`, `Parts.refresh()` (place bar highlights now; the kit also does it when the page changes), `Parts.layer()`, `Parts.rel(el)`, `Parts.open` (how many overlays are open), `Parts.N` (gesture numbers), `Parts.SCHEMA`, `Parts.DEFAULTS`.

## The demo and the checks

- `demo/index.html` is the Parts gallery: every part with its number, built on the kit's own parts and shown in the pinned prototype kit's frame (`demo/vendor/prototype-kit/`, used only by the demo). The controls panel switches every setting both ways.
- `python tools/bundle.py` makes `dist/parts-gallery.html`, one file for the Claude artifact viewer.
- `python tools/check.py [shots]` (needs Playwright) runs everything: the value rule, the two dark blocks identical, no personal data or app names in the kit, the pinned copies and checksums; settings refused and accepted, the sample settings, an app's MOTION followed; spring overrides, one-element timings and springs, `Parts.differences()`, overrides under Reduce Motion and speed 0; the search field riding above a faked keyboard and dropping back; the tab bar's bubble (up only while touched, one draw a frame under 2 ms with a busy page too, half an icon half accent, landing and tap travel, the jiggle, and folded, searching, Reduce Motion, Reduce transparency, no WebGL and `tabBar.bubble` off), in light and dark at both sizes; the gallery at 402 × 874 and 820 × 1180 in light, dark, Reduce transparency, Reduce Motion and motion off (screenshots, no errors, no sideways scroll, no "NaN", "undefined" or "null"); and every behaviour and setting both ways.
- `tools/plain.html` is a plain page with no app, for checking the kit stands on its own.

## Files

- `parts-kit.css`, `parts-kit.js`: the kit. `SHA256SUMS.txt`: their checksums.
- `samples/vocal-sessions.settings.js`: a full settings file for one app (decisions D01–D18).
- `demo/`: the Parts gallery. `tools/`: check, value rule, bundle, plain page.
- `HANDOFF.md`: what was approved and built. `docs/blueprint.md`: the plan and the decisions behind it.

## Licence

MIT. See [LICENSE.txt](LICENSE.txt). The numbers and part list follow [sdegenaar/liquid_glass_widgets](https://github.com/sdegenaar/liquid_glass_widgets) (MIT), with thanks.
