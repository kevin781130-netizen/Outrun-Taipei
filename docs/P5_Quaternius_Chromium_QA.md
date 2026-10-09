# P5 — Quaternius real Chromium evidence procedure

**Status:** Reproducible Windows Chromium browser QA runner is provided. **No actual model screenshot or FPS measurement was obtained from this assistant runtime.**

## Confirmed environment blocker

- Local Chromium is installed, but even a trivial local test page and a simple data URL fail with net::ERR_BLOCKED_BY_ADMINISTRATOR.
- The runtime has no external GitHub connectivity to clone the user's private branch.
- GitHub Actions previous failures show no executed job steps and do not constitute browser evidence.
- No actual model rendering, shader/material visibility, device FPS or deploy accuracy is claimed.

## Run using Windows PowerShell on a normal development PC

Checkout the private repository art branch and, from its root, run:

    git switch art/quaternius-downtown-buildings-p1
    powershell -ExecutionPolicy Bypass -File .\tools\run-quaternius-qa.ps1

Requires Node.js 22+, Git, internet access to install Playwright Chromium. The script checks that it is on the art branch and refuses to execute outside it. It does not change main, the racing runtime, roads, landmarks, physics or gameplay.

What it does:

1. Installs project dev dependencies and Playwright Chromium.
2. Checks four Quaternius glTF assets plus independent facade assembly.
3. Opens an independent preview in real headless Chromium, capturing **4 models × 3 viewports × 2 light modes = 24 screenshot PNGs**.
4. Samples frame pacing and draw calls across 12 model/viewport combinations.
5. Captures WebGL/material decoded texture readiness, logs and failure reasons.
6. Creates a Markdown index with 24 screenshot references and SHA-256 integrity hashes.

Output files (ignored by git): test-results/quaternius-p3/report.json, review-index.md and 24 PNGs.

## Qualification criteria

Only claim **automatic browser test pass** if all 12 combinations load real WebGL, required textures decode, frames are sampled, all 24 screenshots are present and no runtime error occurs. Even that does **not** mean the building appearance is visually approved; human screenshot inspection is mandatory.

Current script measures ANGLE SwiftShader software WebGL, not real mobile hardware GPU. Production game FPS, 15 Taipei routes, collisions and gameplay are outside this step.

**Branch remains isolated. No production integration without user confirmation.**
