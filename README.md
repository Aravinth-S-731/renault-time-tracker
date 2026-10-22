# Workday

A mobile-first, eight-hour net-work tracker. Vanilla HTML, CSS and JavaScript; no build, packages, accounts, analytics or backend.

The app fits the current viewport without page scrolling. Bottom tabs switch between Timer, Sessions and Daybook; longer records use pagination rather than scrolling. The layout respects iPhone safe areas and the dynamic browser viewport.

## Use

- Start day starts a work session.
- Out pauses work and opens a numbered break.
- In saves the break and resumes work.
- End day closes either kind of session and shows the saved summary.
- Select any day in Daybook to review its work and break sessions.
- Export downloads a JSON backup; Import replaces local records after confirmation.

Work and breaks are calculated from timestamps, including after closing the page or crossing midnight. The eight-hour target excludes breaks. Estimated finish assumes no further breaks; it moves forward while on break. Device clock changes affect elapsed time, so use automatic date/time settings.

## GitHub Pages

Put the contents of this folder at the root of a GitHub repository. In Settings > Pages, choose Deploy from a branch, select your branch and `/ (root)`, then save. Open the published HTTPS URL. Alternatively, publish the containing repository and visit `/workday/` under its Pages URL. All application paths are relative and work under a repository subpath. No build step or server-side code is required.

On iPhone, open the published URL in Safari, then Share > Add to Home Screen. This is a Home Screen web app, not a native iOS widget or Live Activity. iOS may suspend it when hidden; the timer reconstructs elapsed time when reopened. Offline access works after a successful online visit and service worker installation. First installation requires internet. Home Screen icon support varies by iOS version.

Records use localStorage and are specific to this browser and origin. They do not sync to GitHub, iCloud or other devices. Safari and an installed Home Screen app may have separate storage. Private browsing, clearing site data, storage eviction, or changing domains can remove or isolate records. Export regular backups. No background notifications or automatic end-of-day action is promised.

## Local Preview And Tests

Open index.html directly for an online-independent preview (service worker installation requires localhost or HTTPS). For HTTP testing, run a static server from the parent directory, for example `py -m http.server 8080`, then open `http://localhost:8080/workday/`.

With Node.js installed, run `node --test workday/tracker.test.cjs` from the parent directory.

The inline interface icons use Lucide icon shapes (ISC license): https://lucide.dev/license. The Workday app mark is custom.