# Newsletter Poster Placeholder Images

Use these files as drop-in image slots for the monthly H&S poster.

## Target Sizes
- Focus images: **1600 x 1000 px** (landscape, 8:5)
- Reminders composite image: **4000 x 1800 px** (wide landscape, 20:9)

Use one of these approaches:
- Keep the same `.svg` filenames and overwrite the files with your final SVG artwork.
- Or switch to `.jpg/.png` and update the mapped paths in `/Users/davidcapener/Cursor Apps/FootAsylumKSS/components/reports/newsletter-poster-placeholder.tsx`.

## Focus Files (Used In UI)
- `focus-housekeeping-safe-access.png`
- `focus-contractor-visitor-controls.png`
- `focus-fire-door-escape-routes.png`
- `focus-work-at-height-equipment.png`
- `focus-training-refresher-completion.png`
- `focus-coshh-hazardous-substances.png`
- `focus-emergency-lighting-tests.png`
- `focus-fire-panel-fault-follow-up.png`
- `focus-generic.png`

## Focus SVG Files (Legacy)
- `focus-housekeeping-safe-access.svg`
- `focus-contractor-visitor-controls.svg`
- `focus-fire-door-escape-routes.svg`
- `focus-work-at-height-equipment.svg`
- `focus-training-refresher-completion.svg`
- `focus-coshh-hazardous-substances.svg`
- `focus-generic.svg`

## Reminders Composite Files
- `reminders-updates-composite.svg`
- `reminders-updates-composite-user.png`

## Legacy Reminder Files (Not Used By Composite Layout)
- `reminder-fire-exit-checks.svg`
- `reminder-housekeeping-refresher.svg`
- `reminder-fire-safety-order-2005.svg`
- `reminder-incident-reporting.svg`
- `reminder-generic.svg`
- `reminder-fire-exit-checks-user.png`
- `reminder-housekeeping-refresher-user.png`
- `reminder-fire-safety-order-2005-user.png`
- `reminder-incident-reporting-user.png`
- `reminder-generic-user.png`

The poster now loads `reminders-updates-composite-user.png` first and falls back to `reminders-updates-composite.svg` if you have not replaced it yet.
