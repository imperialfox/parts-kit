# Handoff · Parts kit 1.3 · 5 Nov 2026

> **Render:** Approved by Ivan on 5 Nov 2026, 08:04 ("I also give you render permissions", the same instruction as Vocal Sessions Q50 to Q56), for the scope in the Singing project's `claude/ui_consistency_fixes_blueprint.md` › Parts kit 1.3.0.
> **Build:** Given by Ivan in the same instruction; started on 9 Nov 2026, 09:00 ("Build 1.3.0"), in a fresh chat. Built by Claude. Released as **1.3.0** on 9 Nov 2026.
> **The rule for every kit version:** Render approves a named scope only; nothing is built, committed or released until Ivan separately says Build.

**For:** Claude · **Job:** build · **Builder:** Claude
**Repo:** `imperialfox/parts-kit`, from 1.2.0 (`2776729`) to 1.3.0. No Q number: it belongs to no app.
**Needed by:** Vocal Sessions Q56 · Settings: Reset All Alert (Reset all data becomes an alert with Back up first, Delete everything and Cancel, D23).

**Goal:** the kit's alert (part 48) can show more than one action, as iOS alerts do.

## Agreed

1. `Parts.confirm({ …, actions: [{ label, red, value }] })` resolves to the chosen action's value, or `null` for Cancel.
2. With no `actions` it behaves exactly as 1.2.0 (true or false).
3. Three or more buttons stack.
4. The Parts gallery shows a three-button alert.
5. A minor version with its changelog, checksums and this handoff.

## Out of scope

Any other part.

## Done when

- The gallery's three-button alert works in light, dark and Reduce Motion.
- 1.2.0 calls behave the same.
- `tools/check.py` passes; checksums updated.

**Effort guess:** light.

## Debrief · 9 Nov 2026

**What changed**
- `parts-kit.js`: `confirmBox` builds its buttons from a list. Without `actions` the list is the one 1.2.0 action (same markup, same `data-a="yes"` / `"no"`, same names, true or false). With `actions`, each button is `data-a="0"`, `"1"` and so on, named `Action: <label>`, and the alert answers with that action's value. Cancel, Escape and `Parts.closeAll()` answer `null`. The sheet version (`confirm: 'sheet'`) uses the same buttons and answers.
- `parts-kit.css`: `.pk-alert-btns.pk-stack` (a column) and `.pk-stack > .pk-alert-btn { flex: none }` so stacked buttons keep 48 pt. No new values; the value rule still passes.
- `demo/index.html`: part 48 has a "Reset all…" button with Back up first, Delete everything (red) and Cancel; a toast says what came back.
- README (part 48 row, "Alerts with more than one action"), CHANGELOG, SHA256SUMS, `tools/check.py`.

**How it was checked** (`python tools/check.py`)
- One full run: everything 1.2.0 checked passed. Its only failure was the new gallery text showing the word "null" on screen, which the screen check forbids; the text now says "nothing if Cancel is tapped", and the looks pass and the alert checks were run again, all passing.
- New checks (`alert_actions`): three and four buttons stack in order with Cancel last, don't overlap, line up at one width, keep 48 pt and sit inside the alert; red only where asked; each button named; each action, Cancel, Escape and closing give the right answer; an action with no value gives its label; one action plus Cancel stays side by side; the sheet version; 1.2.0 calls (true, false, Escape false, `red: false` blue); the gallery's alert in light, dark and Reduce Motion (full size, or no scaling under Reduce Motion), with screenshots looked at.

**Decided along the way** (inside the scope; each is easy to change)
1. **Colours:** `red: true` is red, any other action is the accent colour, Cancel stays plain. This follows 1.2.0, where a non-red action was already the accent colour.
2. **A missing `value` gives back the label,** the same as `Parts.choices` does.
3. **One action in `actions`** stays side by side with Cancel (two buttons), answering its value or `null`.
4. **Order when stacked:** the actions as given, top to bottom, then Cancel at the bottom, as iOS alerts do.

**What's left**
- Q56 · Settings: Reset All Alert can now pin 1.3.0.
- Parts kit 1.4.0 (the Liquid Glass tab bar bubble) is Rendered and builds on top of this; it waits for Ivan's Build.
- **One thing for Ivan:** on GitHub, open the repo › Releases › *Draft a new release*, type the tag `v1.3.0` (target `main`), title "Parts kit 1.3.0", paste the 1.3.0 part of `CHANGELOG.md`, attach `parts-kit.css`, `parts-kit.js` and `SHA256SUMS.txt`, and publish.

**For Ivan, on your phone** (the Parts gallery › 48 Alert › Reset all…)
1. Do the three stacked buttons feel right to tap, with Cancel at the bottom?
2. Tap each one: does the toast say Backing up first, Deleted everything, or Kept everything?
3. With Reduce Motion on, does it only fade?

---

# Handoff · Parts kit 1.2 · 4 Nov 2026

> **Render:** Approved by Ivan on 4 Nov 2026, 18:36 ("render", all three pieces of the Singing project's `claude/vs_motion_and_kit_bars_blueprint.md`), for piece A as written, with every *Default if unanswered* taken.
> **Build:** Ivan, 4 Nov 2026, 19:33 ("Parts kit 1.2 buid", after checking it hadn't shipped), in a fresh chat. Built by Claude.
> **The rule for every kit version:** Render approves a named scope only; nothing is built, committed or released until Ivan separately says Build.

**For:** Claude · **Job:** build · **Builder:** Claude
**Repo:** `imperialfox/parts-kit`, from 1.1.0 (`ba8e785`) to 1.2.0. No Q number: it belongs to no app.
**Plan (long notes):** the Singing project's `claude/vs_motion_and_kit_bars_blueprint.md` › A.
**Needed by:** Vocal Sessions Q45 · Interface: Kit Top Bar and Search, which pins 1.2.0.
**Why:** Ivan, 4 Nov 2026, 18:23: on the iPhone the search field must move up with the keyboard, so the field and what's typed stay in view.

**Goal:** when part 6's search field is open on an iPhone, it moves up with the keyboard.

## Agreed

1. While the dock is searching (`.pk-searching`), the kit follows the visible area (`visualViewport` resize and scroll) and lifts the dock by the keyboard's height, with an 8 pt gap above it (a named value, `--pk-kb-gap`).
2. The lift follows the keyboard as it moves: no separate spring or curve. Reduce Motion and speed 0 change nothing here.
3. Opening the field focuses it without scrolling the page (`focus({ preventScroll: true })`).
4. The kit publishes the lift as `--pk-kb` on the page, so an app can give its own list room at the bottom.
5. Closing the keyboard brings the dock back down with it; ✕ still closes search.
6. Version 1.2.0: changelog, README (part 6 row and a "Keyboard" note), this handoff with the Render, the Build and the Debrief, and the gallery's part 6 demo. Ivan makes the `v1.2.0` tag and release page if the session can't.

## Out of scope

Any other part; Vocal Sessions (Q45 pins the release); Android beyond "it still works"; the prototype kit's 1.2 (a separate plan).

## Done when

- `tools/check.py` passes, with new checks that fake a smaller visible area and see the dock lift by the right amount, then drop back when it grows. Everything 1.1 checked still passes.
- The gallery is republished on 1.2.

**Effort guess:** light to medium.

## Debrief · 4 Nov 2026

**What changed**
- `parts-kit.js`: while a dock is searching, the kit reads the visible area (`visualViewport` resize and scroll, the window's resize, and every frame for 0.7 s after the field gains or loses focus) and lifts the dock by however much the keyboard would cover it, plus `--pk-kb-gap`. It sets `.pk-kb` and `--pk-kb-lift` on that dock and `--pk-kb` on `<html>`, and sends `pk:keyboard { lift }`. `Parts.keyboard()` reads it again now. Opening the field already focused it with `preventScroll`, so that stayed as it was.
- `parts-kit.css`: `--pk-kb-gap: 8px` and `--pk-kb: 0px` in the defaults block, and one rule, `.pk-dock.pk-kb { translate: … }`, with no transition. Docks that aren't lifted get no `translate` at all, so nothing else about them changes.
- README (a Keyboard section, the part 6 row, Layout values, Other calls), CHANGELOG, SHA256SUMS, the gallery's part 6 text, `tools/check.py`.

**How it was checked** (`python tools/check.py`, all passing, one full run before the push)
- Everything 1.1 checked still passes.
- New (`keyboard_lift`, with a faked smaller visible area at 402 × 874): opening search with no keyboard moves nothing and focuses the field; a 336 pt keyboard puts the dock's bottom 8 pt above it and `--pk-kb` to the lift, at once, normally, at speed 0 and under Reduce Motion; a panned visible area gives the same place; a 291 pt keyboard moves it with it; the keyboard going brings it back with search still open; `--pk-kb-gap: 20px` gives 20 pt; pinch zoom lifts nothing; after ✕ the dock waits for the keyboard, then comes down; with no keyboard ✕ leaves nothing lifted; part 6's dock in the page stays put when the keyboard is below it and rides 8 pt above it when it would be covered; opening the field doesn't scroll the page; only the searching dock lifts.
- The new checks were tried against a broken lift and caught it.

**Decided along the way** (inside the scope; each is easy to change)
1. **The lift is measured from where the dock is,** not from a fixed keyboard height: the dock moves up by however much the keyboard (plus 8 pt) would cover it. A dock at the bottom of the screen gets the full lift; one higher up gets less or none.
2. **After ✕ the dock waits for the keyboard,** so the tab bar doesn't drop behind a keyboard that's still on its way down.
3. **A short every-frame read** after focus changes, as well as the visualViewport events, in case iOS reports the visible area in steps.
4. **`pk:keyboard` and `Parts.keyboard()`** were added so an app and its tests can follow the lift without polling the CSS value.

- The Parts gallery (artifact `174c215e-…`) republished on 1.2 as version `1793821254-9044`; its page id is unchanged, so notes keep their place.
- **Build receipt:** Parts kit 1.2 · L–M → L–M · 35 steps · 29k written · 7.3M re-read · 1 full test run (also in `BUILD_RECEIPTS.md`).

**What's left**
- Q45 · Interface: Kit Top Bar and Search can now pin 1.2.0 (after Q44).
- **One thing for Ivan:** on GitHub, open the repo › Releases › *Draft a new release*, type the tag `v1.2.0` (target `main`), title "Parts kit 1.2.0", paste the 1.2.0 part of `CHANGELOG.md`, attach `parts-kit.css`, `parts-kit.js` and `SHA256SUMS.txt`, and publish. This session couldn't make tags or releases.

**For Ivan, on your phone** (the Parts gallery)
1. Tap the search circle in the gallery's own bar at the bottom: does the field sit just above the keyboard?
2. Type: can you see what you type?
3. Scroll or tap elsewhere to close the keyboard: does the field come down with it, with no jump?
4. Open search again and tap ✕: does the bar come back down with the keyboard, not before it?
5. Scroll to part 6 and do the same: does its field stay in view?

---

# Handoff · Parts kit 1.1 · 4 Nov 2026

> **Render:** Approved by Ivan on 4 Nov 2026, 09:57 ("render - parts kit 1.1"), for the plan as written, with every *Default if unanswered* taken (decision 1 A, 2 A, 3 the default).
> **Build:** Ivan, 4 Nov 2026, 10:07 ("Parts Kit 1.1 Build"), in a fresh chat. Built by Claude; released as **1.1.0** on 4 Nov 2026. Debrief at the end.
> **The rule for every kit version:** Render approves a named scope only; nothing is built, committed or released until Ivan separately says Build.

**For:** Claude · **Job:** build · **Builder:** Claude
**Repo:** `imperialfox/parts-kit`, from 1.0.0 (`0aeca44`). No Q number: it belongs to no app.
**Plan (long notes):** the Singing project's `claude/parts_kit_1_1_blueprint.md`. Decision: D18 in `claude/parts_decisions_2026-11-02.md`.
**Needed by:** Vocal Sessions Q41 · Interface: Parts Kit Move, which pins 1.1.0.

**Goal:** the kit stays the one source of motion for every app, and an app can still differ for the whole app or one element, with every difference listed on each build.

## Agreed (defaults taken)

1. **Spring overrides:** a `springs: { name: { z, f } }` setting changes one named spring for that app, in the CSS and the code. Unknown names and bad numbers are refused.
2. **One element:** an element can carry its own named timing or spring in its `style` (for example `--dur-rise: 600ms`). The kit reads timings from the element first, then its parent, then the page (decision 1, A).
3. **`Parts.differences()`** lists every spring, timing and setting where the app differs from the kit, app-wide and for elements on the current screen. Each app checks it in its own test against a list with a D-number per line (decision 2, A).
4. **Reduce Motion and motion off still win** over any override.
5. **`motion: 'app'` stays,** and the README says it needs `window.MOTION`.
6. **The Vocal Sessions sample** says `motion: 'kit', // D18` with an empty `springs: {}` line.
7. **Version 1.1.0:** changelog, README (Settings, Motion), this handoff with the Build stamp and Debrief. Ivan makes the `v1.1.0` tag and release page if the session can't.
8. **When:** a fresh chat, before Q41's Build; it doesn't wait for Q38 or Q39 (decision 3).

## Out of scope

Any app change; new or "Later" parts; per-screen motion settings; the prototype kit, Atlas kit and `SHARED.md`.

## Done when

- 1.1.0 has spring overrides, per-element timings and `Parts.differences()`, with README, changelog and `HANDOFF.md` updated.
- `tools/check.py` passes: an override changes only its spring; an element's timing changes only that element; `differences()` lists exactly what changed; overrides do nothing under Reduce Motion and speed 0; bad overrides are refused; everything 1.0 checked still passes.
- The Vocal Sessions sample loads cleanly with `motion: 'kit'` and an empty `springs` line.
- The Parts gallery is republished on 1.1 with one demo element showing an override.

**Effort:** light to medium.

## Debrief · 4 Nov 2026

**What changed**
- `parts-kit.js`: the `springs` setting (checked line by line, `null` puts a spring back); timings read from the element first (`tok`, `dur`, `ease` take the element, and every place the kit times a part now passes it); `--spring-<name>: <spring>` on an element, filled in as that element's `--ease-` and `--dur-` so the CSS follows it at every speed; a `style` option on every overlay call; `Parts.differences()`; `Parts.motion.springs()`, and `Parts.motion.spring()` and `ease()` taking an element.
- `parts-kit.css`: only the version line. No part's CSS needed changing, because the CSS already reads timings from the element.
- `samples/vocal-sessions.settings.js`: `motion: 'kit', // D18` and an empty `springs: {}` line.
- `demo/index.html`: action sheet (47) has "Show slow actions" with its own 900 ms timing and an "Own timing" switch to turn it off.
- README (Settings, Motion, a new "Differences from the kit" section with an app test example), CHANGELOG, SHA256SUMS, `tools/check.py`.

**How it was checked** (`python tools/check.py`, all passing, one full run before the push)
- Everything 1.0 checked: the value rule, the 64 screenshots (looked at the new 47 demo at 402 × 874), every behaviour and every setting both ways.
- New: a spring override changes only that spring, in the CSS and the code, and `null` gives it back; eight kinds of bad override refused, each leaving the springs as they were; an element's own timing reaches it and what's inside it but not its neighbour; an element's own spring reaches its CSS and the code, and taking it away gives the kit's back; `Parts.differences()` exact for one element, for an app-wide mix (two settings, a spring, two stylesheet timings, one element) and empty again afterwards; at speed 0 and under Reduce Motion an overridden spring and an element's spring run for 0 ms; the demo's own differences are exactly its six setting lines; the slow action sheet rises over 0.9 s while the plain one keeps 0.35 s, the code waits for its own timing before removing it, the switch puts it back, and under Reduce Motion it only fades.
- Speed: a sheet or a menu opens in at most about 11 ms with timings read from each element; `Parts.differences()` on the whole gallery takes about 85 ms (it's for tests, not every frame).

**Decided along the way** (inside the scope; each is easy to change)
1. **A `style` option on the overlay calls.** Sheets, menus and the rest are made by the kit, so "only the New song sheet rises slower" needs a way in: `Parts.sheet({ style: '--dur-rise: 600ms' })`. Targeting the overlay's `data-name` in the stylesheet works too.
2. **An element's spring is named, not numbered:** `--spring-sheet: gentle` picks another of the kit's springs (including one the app overrides). New spring numbers go in `springs: {}` for the whole app. This keeps every spring in one list.
3. **In a stylesheet** an element's spring is written as two lines (`--ease-sheet: var(--ease-gentle); --dur-sheet: var(--dur-gentle)`); the `--spring-` shorthand is for the `style` attribute, where the kit can see it.
4. **The spring limits:** `z` from 0.05 to 1 and `f` from 0.1 to 20 Hz. Outside that a spring either never settles or snaps, so it's refused.
5. **For an element, `differences()` compares with the value around it** (its parent), so an element inside an app-wide difference only lists what it changes itself.
6. **With `motion: 'app'`**, the app's MOTION still decides the springs it has; a `springs` line for one of those shows in `differences()` but the app's numbers win. Ivan's apps use `motion: 'kit'`.

- The Parts gallery (artifact `174c215e-…`) republished on 1.1 as version `1793787566-80d8`; its page id is unchanged, so notes keep their place.
- **Build receipt:** Parts kit 1.1 · L–M → L–M · 48 steps · 53k written · 11.4M re-read · 3 full test runs (also in `BUILD_RECEIPTS.md`).

**What's left**
- Q41 · Interface: Parts Kit Move can now pin 1.1.0 (after Q38 and Q39).
- The prototype kit, the Atlas kit and `SHARED.md` are still on Ivan's to-do list.
- **One thing for Ivan:** on GitHub, open the repo › Releases › *Draft a new release*, type the tag `v1.1.0` (target `main`), title "Parts kit 1.1.0", paste the 1.1.0 part of `CHANGELOG.md`, attach `parts-kit.css`, `parts-kit.js` and `SHA256SUMS.txt`, and publish. (`v1.0.0` too, if it isn't made yet.)

**For Ivan, on your phone** (the Parts gallery › 47 Action sheet)
1. Tap Show actions, then Show slow actions: does 900 ms feel clearly slower, and still smooth?
2. Turn Own timing off and tap Show slow actions again: back to the normal speed?
3. Turn on Reduce Motion on the iPhone and open the slow one: only a fade?

---

# Handoff · Parts kit 1.0 · 3 Nov 2026

> **Render:** Approved by Ivan on 3 Nov 2026, 22:14 ("render parts kit 1.0"), for the scope below. Decisions 1–4 as he answered them (21:17); decisions 5, 6 and 7 on their *Default if unanswered* (5: Q34's numbers became the kit's defaults; 6 is on his to-do list in Vocal Sessions' `RENDER_QUEUE.md`).
> **Build:** Ivan, 3 Nov 2026, 23:48 ("build for parts kit 1.0"). Built by Claude in one chat, in the seven agreed stages; released as **1.0.0** on 4 Nov 2026. Debrief at the end.
> **The rule for every kit version:** Render approves a named scope only; nothing is built, committed or released until Ivan separately says Build.

**For:** Claude · **Job:** build · **Builder:** Claude
**Repo:** `imperialfox/parts-kit` (public). No Q number: it belongs to no app.
**Plan (long notes):** `docs/blueprint.md`. Decisions register: the Singing project's `claude/parts_decisions_2026-11-02.md` (D01–D17).

**Goal:** one set of Liquid Glass parts, built once, that any of Ivan's apps and prototypes load with a small settings file of their own.

## Agreed

1. **What it is:** MIT, own version (1.0.0), `README.md`, `CHANGELOG.md`, `HANDOFF.md`, `LICENSE.txt`. Credits `sdegenaar/liquid_glass_widgets` (MIT), whose numbers are the spec. An app loads `parts-kit.css` and `parts-kit.js` plus its own settings file. No framework, no build step.
2. **Names:** the value names from Vocal Sessions 3.51 (`--r-small`/`--r-medium`/`--r-card`/`--r-large`/`--r-sheet`, `--press`, `--ease-pop`/`--ease-knob`/`--ease-out`, `--dur-quick`/`--dur-fade`, the springs' `--ease-*`/`--dur-*`, `--glass*`, `--lift`, `--tint`), each with a kit default that an app's own value overrides. Plus a named shadow set of three (lifted card, floating, glow).
3. **Motion:** a small spring core (ζ and Hz into `linear()`, the speed multiplier, `html.motion-reduced`); `motion: 'app'` hands over to an app's own `MOTION`.
4. **Parts (decision 1: everything on the audit's "First" list, plus the pinned three):**
   - **Glass, bars, buttons:** glass material (1) with strong glass and Reduce transparency; top bar and soft edge (2, 51); large title (3); tab bar with search circle (4–6; `tabBar.fold` D01, `tabBar.searchGap` D02); pushed page (10); top bar buttons changing (11); glass, prominent and solid buttons and their presses (12–14); buttons on a bar (15); edit button (17); chips (18); badges (19).
   - **Controls and inputs:** switch (21); slider (22); segmented control (23; `segmented.style` `'gallery'` or `'squish'`, D04); stepper (24); progress (25); search field stretch (26); text field (27); text area (29).
   - **Lists:** glass container (33); card (34); list row press (35; `row.press` `'highlight'` or `'shrink'`, D06); grouped section (36); divider (38); swipe actions (39); reorderable list (40).
   - **Overlays:** sheet (41) with stops (42) and growing to full (`sheet.withStops`, `sheet.growsToFull`, `sheet.dragShrink`, `sheet.glass`: D09, D10, D14, D15), with pull-down from the content, a flick closing it and corners following the screen's, 46 (decision 4, D17); full-screen cover (43; `sheet.fullScreen`); popover (44); menu, pull-down and long-press in one style (16, 46), corners `--r-card` 20 (decision 3, D16); action sheet (47; `choices`, D07); alert (48; `confirm`, D08); toast (49).
   - **Pinned, built and shown in the demo, off in Vocal Sessions:** submenus (45), glass appearing and leaving (50), finger glint and drag (52) (`menu.submenus`, `glass.appear`, `press.glint`: D11–D13).
   - **Both behaviours kept** wherever a decision has a general alternative (tab bar folding, the squish, row shrink, choices and confirmations as sheets, drag shrink).
5. **Numbers (decision 5, default):** the measured and by-eye values in the liquid_glass_widgets values notes, with Q34's agreed numbers as the kit's defaults: hold 700 ms, lift from 200 ms to ×1.04, dim 20% / 25% with no blur, close 170 ms, one menu material (blur 22 over `#F5F5F7` at 80%, `#252528` dark), pull-downs growing from their button, top bar morph (σ 6 out, σ 3.5 in, swell 22%), toasts in 500 ms / out 350 ms / 3 s, switch 380 ms with a 200 px/s flick and drag, segmented 350 ms spring with swell and drag, search stretch 7 pt and 2 pt. The segmented squish is the alternative setting only (D04).
6. **Settings:** `Parts.settings({...})`, one line per decision with its ID in a comment; unknown settings fail the check; `own` passes an app's own settings (D03, D05) through. Include a sample settings file for Vocal Sessions with D01–D17.
7. **Part names:** a plain `data-name` on every part, replaceable by an app's register name.
8. **Demo page:** the Parts gallery rebuilt on the kit's own parts, every 1.0 part with its gallery number. After the Build, publish it as a new version of "Parts gallery · Liquid Glass" (artifact `174c215e-d9e5-4e0c-ad43-3f750db2159b`), so notes there stay.
9. **How apps pin it** (documented in the README, not done in any app): an unmodified copy of the two runtime files, docs and a checksum file beside them, the version noted in the app.
10. **Decision 6 (default):** no change to the prototype kit, the Atlas kit or `SHARED.md`. Follow the shared devices (402 × 874, 820 × 1180), text sizes and `data-name` rule.
11. **Build in stages** (decision 7): foundations; glass, bars and buttons; controls and inputs; lists; overlays; effects; demo and checks. Each stage ends with its checks passing.

## Out of scope

- Any change to Vocal Sessions or another app (the move onto the kit is its own Blueprint and Render, replacing Q34).
- Side bar, inline tab bar, toolbar, page dots; password and form fields, picker and date wheels, disclosure group.
- The prototype kit, the Atlas kit and `SHARED.md`.
- A drop target for Smart file drop.

## Done when

- `imperialfox/parts-kit` 1.0.0 is released with every part above, the README (how to add it, every part and setting, credits), changelog, licence and `HANDOFF.md` (this, with the Build stamp and Debrief).
- `tools/check.py` passes on the demo page at 402 × 874 and 820 × 1180, in light, dark, Reduce transparency, Reduce Motion and motion off: screenshots looked at, no errors, sideways scroll, "NaN", "undefined" or "null".
- The check uses every behaviour: press growth (×1.39 on a 44 pt circle), switch tap, drag and flick, segmented tap and drag, slider, tab drag, search stretch, sheet open, stops, grow to full, flick and drag to close, pull from content, cover, long-press (no menu before 700 ms), menus, action sheet, alert, toast timing, swipe and reorder rows, the pinned three; and every setting both ways.
- No raw corner, press, curve or duration in `parts-kit.css` outside its defaults block. No personal data, no app names, colours or screens.
- The Vocal Sessions sample settings load with no unknown settings, and the register's "Planned setting" column matches the real setting names.
- The Parts gallery page is republished on the kit.

## Debrief · 4 Nov 2026

**What changed**
- `imperialfox/parts-kit` **1.0.0**: `parts-kit.css` (the defaults block, then 43 parts' rules) and `parts-kit.js` (`window.Parts`: settings, the spring core, the press, every part's behaviour and the overlay calls), `README.md`, `CHANGELOG.md`, `LICENSE.txt`, `SHA256SUMS.txt`, `samples/vocal-sessions.settings.js` (D01–D17), `demo/` (the Parts gallery, with a pinned, unmodified prototype kit 1.1.0 in `demo/vendor/` for its frame and controls), `tools/` (`check.py`, `values.py`, `bundle.py`, `plain.html`), `docs/blueprint.md`.
- Built in the seven stages, one commit each, then the release commit (`c4b8ba6` on `main`). This session couldn't create git tags or GitHub releases (the connection refuses both), so the `v1.0.0` tag and release page are left for Ivan (below); the version is already in both files, the README and the changelog.
- The Parts gallery (artifact `174c215e-…`) republished as version `1793752188-a565`, on the kit. Its notes store had no notes, so nothing was left behind; its page id (`parts-gallery-v1`) is unchanged, so future notes keep their place.

**How it was checked** (`python tools/check.py`, all passing)
- Static: the value rule (17 corners, 2 presses, 104 easings and 103 durations, all named; the rule's own guard catches raw ones), the light and dark defaults, no personal data or app names in the kit or demo, the pinned prototype kit and the checksums unchanged, the two files at the same version, every setting described in the README.
- Settings: typos and wrong values refused and left as they were; the Vocal Sessions sample loads with no problems; with `motion: 'app'` a stand-in `MOTION` is followed (speed 1 → 4) and its springs match the kit's.
- Looks: 64 screenshots at 402 × 874 and 820 × 1180 (the iPad frame), light and dark × normal, Reduce transparency, Reduce Motion and motion off, every section; looked at, no errors, sideways scroll, "NaN", "undefined" or "null".
- Behaviours: everything on the Done-when list, including the 44 pt press at ×1.386, no long-press menu at 610 ms and the menu at 860 ms, the toast still there at 2.7 s and gone by 3.6 s, the search field stretching under 7 pt and 2 pt, and each setting both ways (D01, D02, D04, D06–D15, the three timings, Reduce Motion).

**Decided along the way** (inside the scope; each is easy to change)
1. **One sheet part.** A plain sheet fits its content (up to 90 pt from the top) instead of the old gallery's fixed 46%. Every sheet and cover uses `--r-sheet` 46 (D17); the old gallery had 32 and 56.
2. **Corners snapped to the value set** where the old gallery had one-offs: text fields 14 (were 12), glass container 20 (22), popover 26 (22), segmented swell 12 × 8 as Q34 agreed (the gallery had 8 × 6).
3. **New names in the value set**, each one in the defaults block: `--r-alert` 34, `--r-actions` 28, `--press-row` 0.98, `--pk-knob-grow` 1.35, `--pk-lift-scale` 1.04, `--pk-recede` 0.971, the three shadows, seven easings and twenty durations. The handoff's `--lift` is Vocal Sessions' real name `--lift-max`, so nothing is renamed.
4. **The hold, lift and toast times are settings** (`timing.hold`, `timing.lift`, `timing.toast`), so if 700 ms feels slow it's one line, not a kit release.
5. **Reduce transparency in dark** uses white at 46% (Vocal Sessions' value, alpha × 0.5 + 0.4) rather than the gallery's grey 66%.
6. **Pulling a sheet from its content** works when the content is at the top; at the full stop the first upward drag then scrolls the content by hand, without momentum. A phone check below.
7. **The demo** keeps the gallery numbers and drops the parts not in 1.0 (7, 8, 9, 20, 28, 30, 31, 32, 37; listed in its footer). Its own settings name three demo sheets (`stops`, `grows`, `cover`) and switch each pinned part on for one demo (`options`, `star`, `pad`); the controls panel turns them all off.
8. **A forced look** (`.pk-light` / `.pk-dark`) exists for demos and prototypes; apps follow the iPhone.

**What's left**
- The move of Vocal Sessions onto the kit: its own Blueprint and Render, replacing Q34 (Blueprint › After this, step 4).
- Smart file drop's wireframe can start, pulling its sheets from the kit.
- Decision 6 (the prototype kit and `SHARED.md`) is still on Ivan's to-do list.
- **One thing for Ivan:** on GitHub, open the repo › Releases › *Draft a new release*, type the tag `v1.0.0` (target `main`), title "Parts kit 1.0.0", paste the 1.0.0 part of `CHANGELOG.md`, attach `parts-kit.css`, `parts-kit.js` and `SHA256SUMS.txt`, and publish.

**For Ivan, on your phone** (the Parts gallery)
1. Do the sheets, menus and switches feel like the old gallery's, or better?
2. Hold a row in Long-press menu (46): is 700 ms too slow?
3. Flick a sheet down, and pull Sheet with stops down from its rows once they're scrolled back to the top.
4. Try the pinned three (45 submenu, 50 glass appearing, 52 finger glint): any you now know where to use?
5. Switch the settings in the controls panel both ways (Segmented, Row press, Choices, Confirm): still happy with each decision?
