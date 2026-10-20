# Run all screen tests on Windows (PowerShell 5.1+). On Linux use the bash loop in README.md.
#   powershell -ExecutionPolicy Bypass -File .\run-all.ps1 -Label baseline              (all tests)
#   powershell -ExecutionPolicy Bypass -File .\run-all.ps1 -Label x -Tests flow-test     (some tests)
# Output: <LogDir>\<Label>.log (summary: PASS/FAIL per test + FAIL lines) and <LogDir>\<Label>.<test>.txt (full output).
# LogDir defaults to .\logs (git-ignored). Needs Node.js, "npm install -g playwright" and "npx playwright install chromium".
param([string]$Label = 'run', [string[]]$Tests, [string]$LogDir)
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = (Resolve-Path (Join-Path $here '..\..')).Path
$env:Path = "C:\Program Files\nodejs;$env:APPDATA\npm;" + $env:Path
$env:MOA_ROOT = $root.Replace('\', '/')
if (-not $env:PW_CHROME) {
  $chrome = Get-ChildItem "$env:LOCALAPPDATA\ms-playwright\chromium-*\chrome-win64\chrome.exe" -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
  if ($chrome) { $env:PW_CHROME = $chrome.FullName.Replace('\', '/') }
}
Set-Location $here
$fake = (Join-Path $here 'fake-supabase.js').Replace('\', '/')
if ($Tests) { $Tests = @($Tests | ForEach-Object { $_ -split ',' } | Where-Object { $_ }) }   # -Tests a,b,c (powershell -File passes it as one string)
if (-not $Tests) { $Tests = 'test','online-test','studio-test','share-test','shelf-test','admin-test','me-test','newbook-test','real-book-test','demo-test','sample-test','mouse-test','prefetch-test','flow-test','dialog-test','pick-test','output-test','ux-test','photo2-test','r02-test','r03-test','r04-test','r05-test','r06-test','r07-test','r08-test','r09-test','r10-test','r11-test','alt-test','save-test','recover-test','flow-order-test','approval-test' }
if (-not $LogDir) { $LogDir = Join-Path $here 'logs' }
New-Item -ItemType Directory -Force $LogDir | Out-Null
$log = Join-Path $LogDir "$Label.log"
"start $(Get-Date -Format HH:mm:ss) chrome=$env:PW_CHROME" | Out-File $log -Encoding utf8
$totalPass = 0; $totalFail = 0
foreach ($t in $Tests) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $r = @(& node "$t.mjs" $fake 2>&1 | ForEach-Object { "$_" })
  $pass = @($r | Where-Object { $_ -match '^PASS' }).Count
  $fail = @($r | Where-Object { $_ -match '^FAIL' }).Count
  $totalPass += $pass; $totalFail += $fail
  $line = "$t PASS=$pass FAIL=$fail $([int]$sw.Elapsed.TotalSeconds)s"
  Write-Host $line
  $line | Out-File $log -Append -Encoding utf8
  $r | Where-Object { $_ -match '^FAIL|PAGEERR|Error:|error:' } | Select-Object -First 20 | Out-File $log -Append -Encoding utf8
  $r | Out-File (Join-Path $LogDir "$Label.$t.txt") -Encoding utf8
}
"end $(Get-Date -Format HH:mm:ss) TOTAL PASS=$totalPass FAIL=$totalFail" | Out-File $log -Append -Encoding utf8
"ALL DONE" | Out-File $log -Append -Encoding utf8
Write-Host "TOTAL PASS=$totalPass FAIL=$totalFail -> $log"
