$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $root 'analytics-config.js'

Write-Host 'Peninsula Princess Ferry Timer - analytics setup' -ForegroundColor Cyan
Write-Host 'Create a free site at https://www.goatcounter.com/signup first.'
$siteCode = Read-Host 'Enter only your GoatCounter site code (the part before .goatcounter.com)'

if ($siteCode -notmatch '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$') {
  Write-Host 'Invalid site code. Use lowercase letters, numbers, and hyphens only.' -ForegroundColor Red
  exit 1
}

$content = Get-Content -Raw $configPath
$endpoint = "https://$siteCode.goatcounter.com/count"
$content = [regex]::Replace($content, "endpoint: '[^']*'", "endpoint: '$endpoint'", 1)
Set-Content -Path $configPath -Value $content -Encoding UTF8

Write-Host "Analytics configured: $endpoint" -ForegroundColor Green
Write-Host "Dashboard: https://$siteCode.goatcounter.com" -ForegroundColor Green
Write-Host 'Redeploy the project files to GitHub Pages. No GPS coordinates or routes are sent to analytics.'
