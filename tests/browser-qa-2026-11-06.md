# Browser QA — 2026-11-06 (JST)

## Scope and provenance

Public app: https://shimizutom1981-ship-it.github.io/THA-Combined-Anteversion-Calculator/

Baseline main: `971c3791a0c9000ddb6bbeb7625baaabefc7c4e3`, index blob `6b38a456a7c5fb549798a55164b9e25cb7a3781f`. This includes a later aspect-ratio fix, not just PRs #1 and #2. No patient images or identifiers were used.

- **Live public site, desktop cloud Chrome:** real file-chooser upload, pointer placement/drag, controls, simulator and PSTI inputs.
- **390 × 844 CSS-pixel iframe:** public site layout was inspected. Cross-origin iframe file-chooser automation timed out, so measurement interactions were performed on a local preview copy of the revised source with only an appended synthetic-image preload script. Production measurement functions/event handlers were not replaced. Pointer placement and drag remained browser UI actions. The iframe's classic scrollbar leaves 375px document client width.
- This is **not a physical phone**, mobile OS, touch emulation, WebKit/Safari or Android Chrome test. Mouse pointer events do not verify finger/pinch behavior.
- Source and baseline were fetched through GitHub, browser values through visible UI/DOM. A transient screenshot captured an intermediate drag frame; only settled captures are retained as final evidence where available.

## Synthetic geometry

Image: [synthetic.png](evidence/synthetic.png), 800 × 600 px; 20px grid.

| Point | x | y |
|---|---:|---:|
| H1 |80|100|
| H2 |680|100|
| A |200|350|
| B |440|170|
| C |365|320|
| LT_A |120|460|
| LT_B |600|490|
| S1 |520|360|
| S2 |680|360|

Major axis = 300px; perpendicular semiminor = 75px. RI = atan(180/240) = 36.8699°, RA = asin(150/300) = 30°. Length difference = 30px. 160px calibration at 32mm gives 0.2mm/px and 6mm.

For tilted reference H2=(680,220): beta=atan(0.2)=11.3099°, RI=48.1798°, RA=30°. Length difference perpendicular to the reference is (30−0.2×480)/sqrt(1.04)×0.2 = −12.9437mm.

## Results

| Check | Before (public desktop) | After (preview, 390px frame) |
|---|---|---|
| Five points | RI 36.9°, RA 30.0° | Same |
| Uncalibrated/calibrated length | 30.0px → 6.0mm, 0.2000mm/px | 6.0mm, 0.2000mm/px |
| Known length 32 → 64mm | 6.0 → 12.0mm, 0.4000mm/px | covered by numerical regression |
| H2 moved to (680,220) | beta +11.3°, RI 48.2°, RA 30.0° | same, LLD −12.9mm |
| H2 returned to original | normal valid values | RI 36.9°, RA 30.0°, LLD 6.0mm |
| Undo last extra point | calibration removed; 30.0px | no change to this handler; baseline exercised |
| Replace removed calibration point | 6.0mm restored | no change to this handler; baseline exercised |
| Clear extra points | RI/RA retained, LLD cleared | no change to this handler; baseline exercised |
| Reset all, remeasure | clears values and restores expected result | same |
| Reference endpoints overlap | **FAIL: RI 36.9° still displayed while beta is --** | **PASS: RI/RA/beta --; explicit warning** |
| Display zoom | — | 1.0x → 1.3x → 1.0x; results unchanged |
| Simulator defaults 15/10/40 | RA 22.93°, RI 38.53° | same |
| Simulator ΔPT=0 | RA 26.80°, RI 40.00° | automated regression also passes |
| Simulator left/right | projection inclination +40° / −40°, numbers unchanged | automated regression also passes |
| Simulator RI=0 | invalid, values cleared, projection hidden | automated regression also passes |
| PSTI single 20→30 | ΔPSTI +10, ΔPT +6.20° | same |
| PSTI triple 20/22/24→30/32/34 | means 22/32; ΔPT +6.20° | numerical regression passes |
| PSTI missing/negative | result suppressed; missing/error message | numerical regression passes |

Initial screenshot-coordinate-only clicks gave RI 36.8°/RA 29.7°; after targeting the known markers using observed canvas bounds, values were 36.9°/30.0°. This illustrates placement sensitivity, not clinical accuracy.

## Loupe and narrow-layout observations

- Main canvas: 345 × 258.75 CSS px, exact 4:3 aspect ratio of source.
- Loupe: 120 × 120 CSS px, y=349..469; image starts at y=478. **No overlap**, 9px separation. document scrollWidth=clientWidth=375 (no horizontal overflow).
- Loupe follows selected/moved H2, C and calibration points. The 20px image grid is visibly enlarged roughly threefold. Existing rendering formula uses 3× display scale; this session did not perform pixel-exact image-difference validation of the magnification factor.
- `.loupe-panel` computed `pointer-events:none`. This and separation support non-interception of pointer input, but do **not** prove hardware touch behavior.
- Guidance text can wrap differently as measurement steps change, shifting the canvas vertically. Re-read its bounds after every step when automating. This was accounted for during testing, not patched.

## Bug fix and reproducibility

Reproduction: load image, place five points, drag H2 exactly onto H1. `atan2(0,0)` previously supplied a meaningless reference direction and left a plausible RI visible.

The fix suppresses RI/RA and explains the problem when H1–H2 is under **2 internal-image pixels**. The same minimum is applied to obliquity/length geometry so outputs agree. This is a numerical degeneracy guard, **not a clinically validated minimum landmark separation**. RA is intentionally withheld with the invalid five-point measurement until the reference is corrected.

Commands:

```sh
node tests/measurement.test.cjs /path/to/baseline-index.html
node tests/measurement.test.cjs
node tests/midpoint.test.cjs
node tests/browser-fixture.cjs /absolute/temporary/output
```

Baseline measurement test fails with `36.9 !== --`; revised test passes known geometry, calibration, obliquity, separations 0/0.5/1.9px and valid recovery, plus PSTI regression. Existing midpoint suite passes syntax, **210 independent 3D round-trips**, validation and left/right projection. These are Node tests, not browser or clinical evidence.

Serve the fixture through a supported local preview server. Open `mobile.html` for the 390px iframe or `index.html` for desktop. The helper preloads only the synthetic image via the existing file-input change handler; all landmarks must be placed through the UI. It does not modify repository index.html. No generated fixture HTML is committed.

## Evidence

- [Public desktop, invalid reference before fix](evidence/before-degenerate.png)
- [390px preview, invalid reference after fix](evidence/after-degenerate-mobile.png)
- [390px preview, valid nine-point measurement](evidence/mobile-nine-points.png)

## Explicitly unverified

Physical Android/iPhone touch, finger occlusion, two-finger pinch/pan, orientation changes on hardware, device camera/EXIF handling, mobile file picker, Safari/WebKit and Firefox; clinical X-rays, observer repeatability, CT/PACS agreement, projection errors and clinical measurement accuracy. PSTI JSON/CSV export/import was outside this calculation regression. No assertion of clinical suitability follows from these synthetic results.

## Work record

2026-11-06 20:20 JST / ChatGPT Codex / Public-browser synthetic QA, 390px preview pointer QA, reference-degeneracy fix, before/after tests and evidence / Remaining: PR review/merge, public post-merge check, physical touch-device and clinical validation.
