# Short-reference guard review — 2026-11-08

Base: main f364a6c. PR #4: f70e4e0. Main has 5 commits beyond the common ancestor; PR #4 has 1. GitHub reported open, mergeable=false. Local three-way inspection shows a trailing-whitespace conflict in index.html; mechanically fixing that would still introduce a second reference guard. Prefer a new PR from current main with this focused implementation; leave #4 unchanged until separately approved.

## Changes
- Extend the existing RI/RA invalidation path via one shared finite-coordinate / >=2 resized-image-pixel predicate. No second overlap branch.
- Apply the same predicate to leg-length/obliquity and their projection overlay.
- Keep offset geometry, independent offset landmarks, cup outer-diameter calibration and gesture handlers unchanged.
- Adapt two extraction-based tests to load the helper; add boundary regression and synthetic-image browser regression.

## Threshold rationale
2 pixels is a minimal near-coincident-input guard, not floating-point epsilon or a validated clinical accuracy cutoff. Coordinates use the resized source image (maximum dimension 1800), not CSS or zoom pixels. A 1-pixel transverse endpoint perturbation gives atan(1/L): 26.565° at L=2, 5.711° at L=10, 0.573° at L=100. Therefore >=2 does not certify accuracy. Raising the cutoff or adding an image-relative/physical threshold needs a separately specified accuracy requirement and localization uncertainty. Preserve the requested strict <2 policy now and instruct users to use separated anatomical landmarks.

## Validation
- Eight non-browser test scripts PASS, including 210 independent 3D round trips, offset transformations, cup calibration, DOM unit gating, hold/Shift gestures and PSTI.
- New regression: 32 length/orientation combinations, exact boundary, invalidation/recovery, nonfinite coordinates; known synthetic geometry RI=36.9°, RA=30.0°, length=6.0mm.
- Same new regression against unmodified main FAILS at length=0.5px (plausible angle remains displayed).
- Both browser suites require execution before merge. The existing browser suite could not start Chromium here: socket() Operation not permitted. New synthetic-image suite is prepared but NOT executed in a browser. No claim of visual QA or physical-device validation.
- User approved GitHub draft PR creation on 2026-11-08. Merging/public release requires separate approval.

## Work record
2026-11-08 / ChatGPT / Compared #4 and main; prepared shared short-reference guard and regressions; 8 non-browser suites passed / Browser synthetic-image validation, user approval, GitHub PR and separate release approval remain.

2026-11-08 / ChatGPT / User approved GitHub reflection; prepared focused draft PR from unchanged main f364a6c / Browser validation and separate merge/release approval remain.
