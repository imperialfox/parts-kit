/* Sample settings file: Vocal Sessions (js/parts.settings.js once it moves onto the kit).
   One line per decision in its register (D01–D17); search a decision's ID to find its line.
   D16 and D17 are stylesheet values, not settings: they live in the app's css/app.css under their names
   (menus use var(--r-card), D16; --r-sheet is 46, the screen's own corners, D17). */
Parts.settings({
  app: 'Vocal Sessions',
  motion: 'app', // use the app's own MOTION springs (js/motion.js), so there's one set
  tabBar: { fold: false, searchGap: 8 }, // D01 never folds · D02 search circle 8 pt from the bar
  segmented: { style: 'gallery' }, // D04 the gallery's knob: 350 ms spring, swells to glass, draggable
  row: { press: 'highlight' }, // D06 rows highlight while pressed, no shrink
  choices: 'actionSheet', // D07 choices are action sheets
  confirm: 'alert', // D08 "Are you sure?" is an alert with Cancel and a red action
  sheet: {
    withStops: ['sgNew'], // D09 New song (VS-051) opens at the 45% stop on Add media
    growsToFull: ['sgNew'], // D10 (option A) New song grows to full when a file is picked or Manually is chosen
    fullScreen: ['sgKey'], // D10 the Marks key (VS-053) is a full-screen cover
    dragShrink: false, // D14 sheets follow the finger without shrinking
    glass: 'strong', // D15 sheets keep the strong glass
  },
  menu: { submenus: [] }, // D11 pinned: built, not used yet
  glass: { appear: [] }, // D12 pinned: built, not used yet
  press: { glint: [] }, // D13 pinned: built, not used yet
  own: {
    pattern: { speedControl: 'slider' }, // D03 the pattern player's speed control is the standard slider (the app's own part)
    datePicker: 'calendar', // D05 the practice calendar sheet stays (the app's own part)
  },
});
