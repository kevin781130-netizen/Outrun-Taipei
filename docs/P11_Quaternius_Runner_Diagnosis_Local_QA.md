# P11 — Verify GitHub Runner failures; run Quaternius visual QA without Actions

**Branch:** `art/quaternius-downtown-buildings-p1`.  
**Scope:** development / shared-art QA tooling only; no `main`, game map, collision, physics, routes, landmarks or deployment edits.

## Diagnosis based on two actual GitHub Actions attempts

GitHub Actions run: https://github.com/kevin781130-netizen/Outrun-Taipei/actions/runs/37959555331

| Field | Attempt 1 | Attempt 2 (single explicit retry) |
|---|---|---|
| Workflow run id | 37959555331 | 37959555331 |
| Job id | 113918611735 | 113920385700 |
| Conclusion | failure | failure |
| Runner ID / runner name | 0 / empty | 0 / empty |
| Number of steps executed | 0 | 0 |
| Billable Linux runner time | 0 milliseconds | 0 milliseconds |
| Screenshot/report artifacts | 0 | 0 |
| Observed outcome | **Failed before any runner was assigned** | **Failed again before any runner was assigned** |

The retry was accepted by GitHub, but the new attempt also failed with no executed steps. There is **no Chromium, WebGL or material test result** from either run. The runner-allocation failure is a firm observation; **its precise root cause is not available from the exposed API**. It may relate to private repository Actions entitlement, disabled Actions, quota/billing, runner provisioning/policy or another account/platform restriction; these are *possibilities*, not confirmed causes.

### Check in the GitHub UI

1. Open the run linked above. Check the prominent workflow/job error banner, which may provide reasons that the API job summary does not.
2. On the repository Settings → Actions → General, verify Actions is allowed and permitted workflows/actions can run.
3. Check the account's Billing / Actions usage, included minutes or spending limits and any payment/billing restrictions, if applicable.
4. Check whether GitHub Actions incidents affect runner provisioning; if uncertain, contact GitHub Support with **run ID 37959555331** and **job IDs 113918611735 / 113920385700**. Avoid simply repeatedly rerunning: two attempts did not allocate a runner.

## P11 local fallback — no GitHub Actions runner required

Run on a computer with a checked-out copy of this private repository. Commands intentionally refuse to run outside **the art branch** and never run `git checkout`, `git push`, `git merge` or production builds.

**Windows PowerShell (one command for full art QA):**

```powershell
git switch art/quaternius-downtown-buildings-p1
powershell -ExecutionPolicy Bypass -File .\tools\run-quaternius-qa.ps1
```

Requirements: Node.js 22+, npm, Git, internet connection for dev dependencies and Chromium. PowerShell wrapper installs locked dev dependencies and Playwright Chromium by default.

**Windows static-only checks when Chromium is unavailable:**

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\run-quaternius-qa.ps1 -StaticOnly
```

**Cross-platform Node.js (after manually installing dependencies):**

```sh
npm ci --include=dev --no-audit --no-fund
npx playwright install chromium
node tools/quaternius-p11-local-qa.cjs --full
```

The P11 runner checks the exact art branch and commit; presence of staged CC0 assets, vendor Three.js, Node version, Playwright and Chromium. It then runs P2/P4/P6/P7/P8/P9/P11 static tests; with `--full` it runs P3/P7/P8 real Chromium screenshot suites. **Even when a browser suite fails**, it attempts the P10 manifest before final reporting, preserving the real failure reason.

Output (gitignored under `test-results/`):

- `quaternius-p11/local-qa-report.json` — local preflight, version/branch/commit, each subprocess exit code and bounded stderr/stdout excerpt;
- `quaternius-p3/`, `quaternius-p7/`, `quaternius-p8/` — existing PNGs/reports if Chromium was actually able to render;
- `quaternius-p10/manifest.json`, `acceptance.md` — evidence manifests, screenshot hashes and frame-pacing comparisons.

**Do not infer visual quality or native hardware FPS from a static test pass.** Headless Chromium uses ANGLE SwiftShader; inspect the generated screenshot PNGs manually. A screenshot from the wrong source commit is not proof of this branch's current visuals.

## Art-only source changes

- `tools/quaternius-p11-local-qa.cjs` — cross-platform independent QA runner.
- `tools/run-quaternius-qa.ps1` — simplified Windows single-command wrapper.
- `tools/quaternius-runner-classifier.mjs` — pure classifier distinguishing jobs that failed before allocation from jobs that recorded executable steps.
- `tests/quaternius-p11-classifier.cjs` — fixtures for the real two failed attempts and branch isolation checks.

No changes to the GitHub Action workflow itself are necessary for this slice: it had correctly triggered, but the hosted runner never started. No billing/Actions account settings are modified or claimed to be fixed.

**P11 stop gate:** local/browser evidence and/or account-level Actions permissions are still required before claiming any real rendering pass. Wait for user approval before gameplay integration.
