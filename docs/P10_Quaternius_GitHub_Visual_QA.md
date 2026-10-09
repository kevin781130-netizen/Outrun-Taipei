# P10 — Real Chromium attempt via isolated GitHub Actions

**Only branch:** `art/quaternius-downtown-buildings-p1`; not a merge or production deployment.
**Scope:** independent Quaternius CC0 material / Taipei facade / streetblock browser QA.

## P10 change

The new `.github/workflows/quaternius-art-qa.yml` triggers on **pushes to this exact art branch only**. The workflow explicitly checks that the branch diff contains only preview, third-party art, tests, documentation, and QA tooling. It uses **read-only contents permissions**; no branch writes, PR, production deployment or main updates.

It executes `npm ci`, all existing isolated P2–P9 art static checks, Playwright Chromium with Traditional Chinese fonts, then:

1. P3 base glTF model screenshots, missing materials/loader/runtime checks, headless timing metrics;
2. P7 single-building Chinese streetfront screenshots;
3. P8/P9 five-shop streetblock screenshots (3/5/7 configuration smoke tests, day/night, full/LOD, desktop/mobile sizes);
4. P10 evidence manifest with screenshot SHA-256 checksums, draw-call and frame-pacing near/far comparisons.

The reports and PNGs are retained by the **`quaternius-art-visual-qa-<commit>`** GitHub Actions artifact for 14 days. `tools/quaternius-p10-report.cjs` can also be run locally; its reports are only based on **existing run results**, and explicitly say INCOMPLETE when missing.

## First GitHub-hosted execution — definitive observed result

- **Attempt:** [GitHub Actions run #37959555331](https://github.com/kevin781130-netizen/Outrun-Taipei/actions/runs/37959555331)
- **Trigger:** `push`, branch `art/quaternius-downtown-buildings-p1`.
- **Commit checked:** `b1874c43e6bea9e687541b6ba2694d80791e07ea`.
- **Execution status:** `completed / failure`; recorded at 2026-10-09 16:30 UTC.
- **Job:** `art-browser-qa`, id `113918611735`.
- **Infrastructure observation:** `runner_id: 0`, no named runner, **zero step summaries**; job lifetime about four seconds.
- **Artifacts:** **0**.
- **Conclusion:** failed **before** any npm, node, Playwright or WebGL step could run. This is **not evidence of failing renderer code**, nor a successful or failed visual acceptance. Actual screenshot/FPS outcome remains **NOT TESTED**.
- **Next prerequisite:** inspect the run banner and repository/organization Actions, runner and billing/usage configuration to find why no runner was assigned. The precise root cause is **not established** by the available metadata. Do not infer that it was necessarily billing.
- **Fallback:** use `tools/run-quaternius-qa.ps1` on an appropriately configured Windows checkout and manually inspect the screenshot artifacts.

## Strict verification language

- **GitHub Actions job queued**: NOT a test pass.
- **Job failed before steps run**: environment/runner blocked, NOT renderer success/failure.
- **Browser job completed**: automatic evidence, but **manual image inspection still required**.
- **Native GPU FPS / published game appearance**: NOT tested by software headless Chromium; testing still needed.
- If workflow runs are disabled for repo/org or fail to allocate a runner, use Windows QA runner `tools/run-quaternius-qa.ps1` on a normal development PC and import `test-results/quaternius-*` evidence.

Check branch Actions (not deployment): `https://github.com/kevin781130-netizen/Outrun-Taipei/actions/workflows/quaternius-art-qa.yml`

After the run is actually completed, **record run id, job conclusion, step summaries, and artifact availability** before claiming anything succeeded.

## Source protection

- No `main` changes.
- No `index.html`, `src/`, road, route, landmark, gameplay, physics, collision or score file changes.
- No runtime asset insertion or modifications to existing Quaternius meshes.
- No production-game deployment; the preview remains separate.
- The CC0 license and Three.js MIT notice remain in the existing preview docs.

Wait for explicit user confirmation before proceeding to production use.
