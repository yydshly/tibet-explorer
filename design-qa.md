# Original-reference style and route revision — 2026-10-15

Scope: the user's correction explicitly selects the original Moby video’s visual style **and** exploration routes. This review covers the new home, topic/map shell, chapter navigation and retained model access. It does not certify that all existing scientific, historical and cultural scenes have the source video's asset detail or storytelling quality.

## Source and comparison

- Source directory: `F:/codex_project/1009_codex_project/projects/013-xinjiang-knowledge-sandbox/process/round-33/frames/`.
- `reference-000.jpg`: regional home, title, topic shelf and parallel exploration tools.
- `reference-004.jpg`: large globe, narrow explanation area and persistent model navigation.
- `reference-045.jpg`: regional historical presentation, left explanation and bottom chapter strip.
- Implementation: `http://127.0.0.1:5173/`, captured in the Codex in-app browser.
- Desktop: 1280 × 720 CSS viewport; source and browser screenshots both 1280 × 720 pixels. The source and corresponding implementation images were opened together in the same comparison inputs, without resampling.
- Mobile resilience: 390 × 844 CSS viewport. IAB captures are 384 × 831 pixels; these are illustrative responsive checks, not a pixel-fidelity comparison to a mobile source. DOM measurements confirmed no horizontal document overflow.
- The source depicts Xinjiang and the implementation depicts Tibet. Geography, facts, source images and chapter counts intentionally differ. No original-video pixels, generated geography or invented historical images were used as product assets.

## Comparison history and fixes

1. **P1 — old product composition and forced routes.** Replaced the previous homepage with a full-region 3D map, large regional title, compact overview, topic shelf and separate gazetteer/model entries. Replaced the study shell with a 282px reading area and dominant spatial stage. The nine chapters and 36 substantive questions remain accessible. Earth-first is recommended; the interface no longer presents all 36 questions or seven cities × four facets as a mandatory sequence.
2. **P2 — home thumbnails empty and call-to-action collided with the shelf.** `home-v1.png` exposed the zero-height raster container and short-desktop spacing. Restored absolute thumbnail filling and adjusted hero spacing. `home-v2.png` verified the repair.
3. **P2 — region did not stand out; three cards repeated one image.** `home-v2.png` was compared with `reference-000.jpg`. Added an administrative membership texture derived from the existing source polygon; outside the region is desaturated and darkened without changing elevation. Added two verified NASA images with local provenance records. `home-final.png` shows distinct topic images and the highlighted region.
4. **P2 — map labels and source captions competed with the interface.** Reduced background labels, moved provenance to readable HTML disclosures, retained the DEM footprint and source limitations. Small canvases keep seven city points but prioritize the selected city and three other names. `city-final.png` and responsive captures document the revised hierarchy.
5. **P1 — topic map opened too far out.** `history-atlas-final.png` and `history-atlas-v3.png` showed the entire Asian context with Tibet too small. Removed double sidebar accounting, added actual viewport/reset tracking and prevented generic aspect scaling from overriding atlas framing. `history-reset.png` proved the regional fit. Cold loading still exposed StrictMode saving an unfinished camera transition; cache snapshots now save the transition destination and use a new version key. `history-atlas-cold-final.png`, captured after reload without resetting the camera, verifies the full regional view.
6. **P1 — returning from the gazetteer lost topic mode.** Browser traversal found that a deferred React state updater read `location.hash` after navigation. Capture the origin from the current render's hash before changing the URL. Repeated G4 topic → gazetteer → original question now retains `view=topics&journey=topic`, the 89.9°E cutline and its reading. Evidence: `topic-return.png` and browser-observed route/DOM state.

## Required fidelity surfaces

- **Typography:** large bold Chinese regional title and widely spaced condensed Latin subtitle; compact 23px topic headings, small navigation and readable paragraph rhythm. Local Chinese system fonts replace the unavailable exact source font. The full-resolution comparisons exposed the title, card and control type clearly; DOM inspection supplemented small copy, so no separately resampled type crop was needed.
- **Layout:** 3D map owns the home and topic canvas; explanation is a narrow left column; chapter/region choices remain visible at the bottom. The short-desktop overlap is fixed. On mobile the map precedes reading, and the navigation strip remains accessible.
- **Color:** charcoal/green-black surfaces, mint actions, pale labels and a white regional outline follow the source direction. Real imagery retains its identity. NASA's Lhasa image is explicitly identified as false color.
- **Image quality:** real NASA imagery, real DEM, real Natural Earth outline and The Met material. Two new NASA assets are downloaded locally with attribution, observation date, source URL, usage basis and hashes. Product content never uses the reference video's screenshots. Existing terrain resolution remains an explicit data limit.
- **Copy/content:** four home themes lead to content rather than identical directory dialogs. “全部专题” opens the directory; “地图图鉴” and “原理模型” are parallel routes. Labels now refer to bottom chapters rather than a removed right panel. The G4 bridge script and MiniMax audio were updated to offer topic choice.
- **Controls/accessibility:** actual buttons, labeled sliders, visible selected state, keyboard-operable controls, focus styles, image alternative text and modal close controls remain. An underlying 3D canvas continues to render and respond; it is not a screenshot background.

## Functional verification

- Home → Earth-first → G1–G4 introduction; narration play/pause and labels observed.
- Home topic cards open natural geography, historical whole-map context, development whole-map context and travel content separately.
- History map → Tang–Tibet alliance entry → H3 material model → same history map entry.
- Gazetteer → Nyingchi → environment facet; all seven places remain available in the bottom strip.
- Model library → G4; keyboard movement of the longitude slider changed 89.64°E to 89.90°E and updated both the 3D reading and profile from approximately 5,250m to 5,050m.
- Topic → gazetteer → original topic preserves topic navigation and process settings.
- Desktop and mobile home, city and globe layouts inspected. Full-resolution screenshot pairs were used for home, globe and historical shell comparisons.
- Browser console checked after fresh loading and traversals: no warnings/errors in the captured logs.
- Full unit suite: 39 files / 420 tests passed before the final camera regression addition. Subsequent targeted route, spatial, geographic-mask and scene tests passed (24 tests at that checkpoint).
- TypeScript and production build passed. The build retains the existing large-bundle warning; this is a performance follow-up, not a failed build.
- Sites packaging checks: 4 passed. MiniMax asset verification: 144 expected, 144 checked, 144 passed.

## Remaining scope and follow-up

- The underlying historical/material models, terrain asset detail and every individual narration camera beat have not all been rebuilt in this revision. This pass must not be described as the complete original-video effect being reproduced across every chapter.
- The selected adaptation intentionally keeps factual Tibet materials instead of borrowing richer-looking Xinjiang assets. Future material photography and finer terrain require source verification.
- Exact source font, additional thumbnail treatment and bundle splitting remain refinement opportunities.

## Final evidence

`qa/reference-style/home-final.png` and `history-atlas-cold-final.png` were compared alongside original frames 000 and 045 at 1280 × 720. The cold-loaded historical map now fills the spatial stage. Final responsive home evidence is `home-mobile-final.png`; glossary labels, topic entries and map controls remain separated. There are no remaining P0/P1/P2 findings within this interface-and-route revision. The broader scene-content fidelity limits above remain explicit, rather than being counted as completed work.

Final typecheck and production build passed after the cache fix. Browser console remained clear on the fresh history load. The temporary viewport override is reset at handoff and the preview is left on the homepage.

final result: passed
