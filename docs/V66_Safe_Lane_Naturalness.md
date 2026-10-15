# V66 — Natural lane choice under safe conditions

## Scope
Small additive change to the established opt-in V60 Cruise preview branch. Default/ranked, road coordinates, physics, score and hit detection remain untouched.

### Safe-choice fairness
A successful **center-lane departure** remembers its outward direction. The next independent center-lane overtaking event tries the *other* side **only if both are safe**. When a side is blocked, `inspectLanePath()` remains authoritative; a safe alternative is chosen or the car holds. This avoids perpetually favoring left when both lanes are equally open. The memory changes only after completing the lateral maneuver, not after an aborted pass or when merely returning from an outside lane.

### Post-pass stability
The first new hazard recheck after committing to a pass occurs in 0.16s (V61 previously allowed the 0.4s idle interval). On completion, a 2.0s minimum grace cooldown prevents immediate repeated overtaking attempts. On recycling, all V66 history and counters reset; counters are bounded. No runtime RNG, no added dependencies, no physics or collision changes.

### Validation
`tests/v66-traffic-fairness.cjs` checks safe alternation, forced fallback, all-lanes-blocked, determinism, immutability, and no gameplay RNG. Existing `tests/v60-traffic-preview.cjs` now checks real game state progress and aborts. `tests/v60-traffic-browser.cjs` repeats post-pass alternation in Chromium/WebGL. Existing 15 routes and all legacy tests remain in required CI gates.

### Limits
This does **not** alter simultaneous multi-vehicle arbitration priority or guarantee a visually natural drive in every context. Human visual review and real-device FPS are still outstanding. No commercial third-party assets/source imported.
