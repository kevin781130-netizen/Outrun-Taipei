# Isolated Quaternius P3 Chromium acceptance (Windows PowerShell).
param([switch]$SkipInstall)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location $root
try {
  $expected='art/quaternius-downtown-buildings-p1'
  $branch=(& git branch --show-current).Trim()
  if($LASTEXITCODE -ne 0 -or $branch -ne $expected) { throw "Refusing to execute outside $expected. Current: $branch" }
  $sha=(& git rev-parse HEAD).Trim()
  if($LASTEXITCODE -ne 0) { throw 'Git commit not available' }
  Write-Host "Quaternius ART-ONLY QA; branch=$branch; commit=$sha"
  if(!$SkipInstall){
    & npm ci --no-audit --no-fund
    if($LASTEXITCODE -ne 0){ throw 'npm ci failed' }
    & npx playwright install chromium
    if($LASTEXITCODE -ne 0){ throw 'Chromium installation failed' }
  }
  & node tests/quaternius-preview.cjs
  if($LASTEXITCODE -ne 0){ throw 'Quaternius assets static audit failed' }
  & node tests/quaternius-assembly.cjs
  if($LASTEXITCODE -ne 0){ throw 'Facade composition static audit failed' }
  & node tests/quaternius-lod.cjs
  if($LASTEXITCODE -ne 0){ throw 'P6 LOD static audit failed' }
  & node tests/quaternius-taipei-streetfront.cjs
  if($LASTEXITCODE -ne 0){ throw 'P7 Taipei facade static audit failed' }
  & node tests/quaternius-streetblock.cjs
  if($LASTEXITCODE -ne 0){ throw 'P8 deterministic streetblock audit failed' }
  & node tests/quaternius-sign-atlas.cjs
  if($LASTEXITCODE -ne 0){ throw 'P9 shared-sign-atlas regression failed' }
  Remove-Item Env:\CHROMIUM_PATH -ErrorAction SilentlyContinue
  & node tests/quaternius-render-acceptance.cjs
  $renderExit=$LASTEXITCODE
  & node tools/summarize-quaternius-qa.cjs
  $summaryExit=$LASTEXITCODE
  & node tests/quaternius-taipei-browser.cjs
  $taipeiRenderExit=$LASTEXITCODE
  & node tests/quaternius-streetblock-browser.cjs
  $streetblockExit=$LASTEXITCODE
  Write-Host 'Raw evidence: test-results/quaternius-p3/report.json'
  Write-Host 'Visual review: test-results/quaternius-p3/review-index.md'
  Write-Host 'Screenshots: test-results/quaternius-p3/*.png'
  Write-Host 'Taipei facade QA: test-results/quaternius-p7/report.json and 24 PNGs'
  Write-Host 'P8 multi-building QA: test-results/quaternius-p8/report.json and 8 PNGs'
  if($renderExit -ne 0 -or $summaryExit -ne 0 -or $taipeiRenderExit -ne 0 -or $streetblockExit -ne 0){throw 'Browser QA failed/incomplete; check P3, P7 and P8 evidence folders.'}
  Write-Host 'Automated browser checks passed. Human screenshot review and real GPU benchmarks are not complete.'
}
finally {Pop-Location}
