# Copilot instructions — TimeSphere (oi-sandbox)

Purpose
- Help an AI coding agent make safe, small, and correct changes to the TimeSphere demo.

Big picture
- Single-page client application (no bundler): `index.html` loads a plain `app.js` and `styles.css`.
- All runtime state and rendering live in `app.js`: the `cities` array + `activeCityNames` set are the primary data model.

Key files
- `index.html` — root DOM structure and element ids (`globe`, `globeMap`, `markerLayer`, `terminator`, `cityList`, `defaultSelect`, `utcClock`, `addCityForm`).
- `app.js` — core logic: timezone calculations, marker placement, pointer-driven globe rotation, and UI wiring.
- `styles.css` — visual layout; positioning of `.marker` and `.city-card` is controlled here.

Important patterns & conventions (do not break these)
- DOM-by-id orchestration: prefer using the existing element ids rather than re-querying/creating new roots.
- Timezone math: `getTimeZoneOffsetMinutes(date, timeZone)` uses `Intl.DateTimeFormat.formatToParts` — reuse this approach for consistent offsets.
- Rendering pipeline: `render()` -> updates UTC clock, map position, terminator, markers, and city list in that order. Keep changes coordinated across these functions.
- Globe coordinates: `calculateMarkerPosition(city, radius)` uses lat/lon → 3D vector; a city with `z < 0` is on the globe's far side and should get `marker--back` styling.
- Add-city fallback: `addCity()` tries to find an existing timezone entry; if missing it computes a longitude from timezone offset and places the city on the equator (lat = 0).
- Pointer interactions: rotation state is held in module-level `rotation` and local drag variables (`dragging`, `dragStartX`, `dragStartRotation`). Use the existing handlers (`handleRotationStart/Move/End`) to preserve behavior.

Dev & debug workflow
- No npm/webpack/build step — open `index.html` directly in a browser for quick checks.
- Prefer a local static server for consistent behavior (CORS and asset load). From the `oi-sandbox` folder:

  - `npx http-server . -c-1 -p 8080`
  - or `python -m http.server 8080`

- Use browser DevTools: inspect `window` for globals, set breakpoints inside `render()`, and watch `rotation` and `cities`.

When changing code
- If you update DOM ids or structure, update `index.html` and every reference in `app.js` in the same PR.
- If changing time logic, update both `getTimeZoneOffsetMinutes()` usage sites and `updateMarkers()` / `updateTerminator()` to keep visuals and deltas consistent.
- Keep changes small and runnable in the browser — run the static server and manually verify the globe rotation, marker placement, and city add/remove flows.

Tests / CI
- No automated tests or CI configuration detected. Add lightweight browser-based tests or a headless script if you add complex logic.

Where to look for examples
- See `app.js` for concrete usage patterns: `addCity()` (how new cities are created), `updateMarkers()` (marker HTML + delta label), and `createSelectOptions()` (how default select list is composed).

If anything here is unclear or you'd like different guidance (e.g., full test scaffold, build system, or CI), tell me which area to expand.
