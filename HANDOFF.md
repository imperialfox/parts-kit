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
- Built in the seven stages, one commit each, then the release commit and tag `v1.0.0`.
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

**For Ivan, on your phone** (the Parts gallery)
1. Do the sheets, menus and switches feel like the old gallery's, or better?
2. Hold a row in Long-press menu (46): is 700 ms too slow?
3. Flick a sheet down, and pull Sheet with stops down from its rows once they're scrolled back to the top.
4. Try the pinned three (45 submenu, 50 glass appearing, 52 finger glint): any you now know where to use?
5. Switch the settings in the controls panel both ways (Segmented, Row press, Choices, Confirm): still happy with each decision?
