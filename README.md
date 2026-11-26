# Peninsula Princess Ferry Timer (PWA)

A Windows-friendly, installable web app for judging whether you can reach the next **Summerville ↔ Millidgeville** Peninsula Princess sailing. It uses your browser's GPS, refreshes the calculation every five seconds, and shows how far ahead or behind you are after allowing time to join the loading queue.

## Quick start on Windows

1. Extract the ZIP.
2. Double-click **START-WINDOWS.bat**.
3. Edge or Chrome will open `http://localhost:8080`.
4. Allow location access when prompted. GPS starts automatically; **Start GPS timer** remains available as a manual fallback.
5. In Edge or Chrome, use the install icon in the address bar to install it as an app.

Keep the PowerShell window open while using this local copy. Opening `index.html` directly is not enough: browsers require `localhost` or HTTPS for GPS and PWA installation. If the included server is blocked, install Python and run `py -m http.server 8080` from this folder.

## Put it on an iPhone

An iPhone must open the app from an **HTTPS** address. The simplest routes from Windows are:

### GitHub Pages

1. Create a GitHub repository and upload the *contents* of this folder.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, then `main` and `/ (root)`.
4. Open the published HTTPS address in Safari on the iPhone.
5. Tap **Share → Add to Home Screen**.

### Netlify Drop

Sign in at `https://app.netlify.com/drop`, drag this extracted folder onto the page, then open the resulting HTTPS address in Safari and add it to the Home Screen.

On iOS, keep the app visible while driving; continuous background GPS is restricted for web apps.

## What the app does

- Includes only **Summerville → Millidgeville** and **Millidgeville → Summerville**.
- Uses the supplied timetable dated **8 July 2021**.
- Keeps every regular Summerville-Millidgeville departure and reassigns every former Kennebecasis Island run to the main crossing at the same time for fall operation.
- Includes 37 weekday, 36 Saturday/statutory-holiday, and 32 Sunday departures in each direction after the fall additions.
- Automatically picks the nearer departure landing, with a manual direction override.
- Uses New Brunswick time (`America/Moncton`) even if the device is set to another zone.
- Detects core New Brunswick public holidays and uses the Saturday/holiday schedule; a manual schedule override is available.
- Starts GPS automatically when the app opens, then requests a fresh position and recalculates the display every five seconds.
- Keeps **Start GPS timer** visible at all times as a manual fallback.
- Uses online road routing when available. If it cannot reach the router, it switches to a configurable straight-line fallback estimate.
- Accounts for a configurable loading buffer (one minute by default).
- Identifies the next sailing as on track or unlikely and suggests the next catchable sailing.
- Caches the app shell for offline use.
- Requests a screen wake lock where the browser supports it.

## Important accuracy notes

- The online router uses an OpenStreetMap-based driving profile. It is a useful road ETA, not live traffic and not a legal guarantee that every segment exactly matches the posted speed limit.
- The fallback multiplies straight-line distance by 1.22 and divides it by the chosen fallback speed. It is deliberately labelled as an estimate.
- GPS accuracy, queues, construction, traffic, road conditions, weather, ferry capacity and service interruptions are outside the timer's knowledge. Check the official service and call 511 when conditions are doubtful.
- Confirm the two landing pins before relying on the app. They are set to OpenStreetMap ferry-terminal positions:
  - Summerville: `45.33346, -66.09654`
  - Millidgeville: `45.32039, -66.08181`

## Privacy

Location stays in the browser. For online road routing, the current coordinates and selected landing are sent to the public OSRM service (`router.project-osrm.org`). Nothing in this project stores or transmits a travel history.

## Files

- `index.html` — app screen
- `styles.css` — responsive visual design
- `app.js` — GPS, routing, countdown and settings
- `schedule.mjs` — timetable, holiday and timezone logic
- `manifest.webmanifest` — install metadata
- `sw.js` — offline cache
- `START-WINDOWS.bat` / `start-windows.ps1` — no-build Windows launcher
- `tests/schedule.test.mjs` — Node-based timetable tests
- `docs/peninsula_princess_schedule.pdf` — supplied source timetable

## Test the timetable logic

If Node.js is installed:

```powershell
node tests/schedule.test.mjs
```

No build process or package installation is required. A wonderfully unfashionable amount of machinery: none.

## Schedule source

New Brunswick Department of Transportation and Infrastructure, *Peninsula Princess Schedule*, published 8 July 2021:

`https://www.gnb.ca/en/topic/driving-transportation/bridges-ferries/ferries/peninsula-princess-schedule.html`
