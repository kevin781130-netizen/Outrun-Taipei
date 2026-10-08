# V56.1 DRIFT-00 — Replay qualification (draft)

Compared three versions from GitHub: V54 backup \`backup/main-pre-v55-20261008\`, V55 backup \`backup/main-pre-v56-20261009\`, and the V56.1 draft. Their \`DRIFT51\` handling rules, \`stepBrakeDrift\` and \`stepArcadeMotion\` regions are **byte-identical** (FNV-1a: 106f1ac2, 51090577, 511b772f respectively). This guards source continuity, not real control feel.

\`npm run test:drift-replay\` runs the *real game* \`update(1/60)\` through the existing Skia/VM harness, fixed input and pseudorandom seed. Seven cases: straight right/left initiation, right/left curve, countersteer, lift-and-recover, nitro while drifting. Each records full frame-by-frame physics and visual-yaw input to \`test-results/v56-drift-replay.json\`. Synthetic curves are test-only; no route or physics tuning is committed.

Use \`DRIFT_BASELINE_INDEX=/absolute/path/to/old/index.html npm run test:drift-replay\` to additionally require full physical trajectory parity with a V55/V54 runtime. The report explicitly says whether a historical runtime was actually compared.

**Verification:** test syntax checked only, Node/Skia execution pending a compatible runtime. CI workflow has previously failed before recording any steps; do not misreport that as passing regression. **Visual verification not performed.** No real GPU footage, no Main merge, no public deployment.
