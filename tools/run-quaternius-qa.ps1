# P11 protected Windows QA wrapper. Never checks out or alters a game branch.
param([switch]$SkipInstall,[switch]$StaticOnly)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location $root
try {
  $expected='art/quaternius-downtown-buildings-p1'
  $branch=(& git branch --show-current).Trim()
  if($LASTEXITCODE -ne 0 -or $branch -ne $expected){
    throw "Refusing to run outside $expected. Current: $branch"
  }
  $head=(& git rev-parse HEAD).Trim()
  if($LASTEXITCODE -ne 0){throw 'Cannot resolve Git commit'}
  Write-Host "P11 Isolated Quaternius QA | $branch | $head"
  if(!$StaticOnly -and !$SkipInstall){
    & npm ci --include=dev --no-audit --no-fund
    if($LASTEXITCODE -ne 0){throw 'npm ci failed'}
    & npx playwright install chromium
    if($LASTEXITCODE -ne 0){throw 'Playwright chromium installation failed'}
  }
  # This local runner is self-contained. No GitHub Actions hosted runner required.
  if($StaticOnly){
    & node tools/quaternius-p11-local-qa.cjs --static-only
  }else{
    Remove-Item Env:\CHROMIUM_PATH -ErrorAction SilentlyContinue
    & node tools/quaternius-p11-local-qa.cjs --full
  }
  $exit=$LASTEXITCODE
  Write-Host 'P11 combined report: test-results/quaternius-p11/local-qa-report.json'
  if(!$StaticOnly){
    Write-Host 'P3 base models: test-results/quaternius-p3/'
    Write-Host 'P7 facades: test-results/quaternius-p7/'
    Write-Host 'P8/P9 five-shop block: test-results/quaternius-p8/'
    Write-Host 'P10 evidence manifest: test-results/quaternius-p10/'
  }
  if($exit -ne 0){throw 'P11 QA incomplete/failed; inspect the P11 JSON for exact blocker.'}
  if($StaticOnly){Write-Host 'Static QA finished. No WebGL screenshot has been validated.'}
  else{Write-Host 'Automatic checks completed. Inspect all screenshots manually; production game still untested.'}
}
finally {Pop-Location}
