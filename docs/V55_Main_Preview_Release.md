# V55.0 — Main Web Preview Release

- Date: 2026-10-08
- Source branch: `codex/v55-hybrid-render-foundation`
- User-directed integration into `main`.
- Rollback ref: `backup/main-pre-v55-20261008` (V54 / previous stable main).
- Public path: `https://kevin781130-netizen.github.io/GAME-TEST-LAB/outrun-taipei/`
- The public 3D WebGL preview is the default; add `?renderer=2d` for the preserved Legacy Stable Canvas car.
- Separate V55 preview remains available at `/outrun-taipei-v55/?renderer=hybrid`.
- HTML title, menu, version footer, package.json and package-lock.json: `V55.0` / `55.0.0`.
- Existing competition rules, routes, local record format and physics are unchanged; `COMPETITION.version` intentionally remains the previous competition version.
- Publish `index.html`, `assets/hybrid-renderer.js`, vendored `assets/vendor/three-r149.min.js` and its MIT license together.
- This is a browser-preview merge **not Unity cutover**, and does not remove Legacy Stable.
- Static syntax, clean-room, UI rules, bundle parity and mock-based hybrid regression checks passed before main integration. Real deployed screen comparison, mobile GPU performance, and browser screenshot visual acceptance were **not** performed in this environment. Do not claim visually verified.
- Publication to GAME-TEST-LAB may be performed manually when Actions credits are unavailable; main publish workflow has also been updated for the required assets.
