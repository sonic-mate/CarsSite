# Run from project root: .\wispbyte\build.ps1
# Builds standalone Next.js for wispbyte deployment

$root = Split-Path $PSScriptRoot -Parent
$frontend = "$root\frontend"
$overrides = "$PSScriptRoot\overrides"
$out = "$PSScriptRoot\dist"

Write-Host "==> Applying overrides..."
Copy-Item "$overrides\next.config.mjs" "$frontend\next.config.mjs" -Force
Copy-Item "$overrides\src\lib\api.ts" "$frontend\src\lib\api.ts" -Force
Copy-Item "$overrides\src\app\catalog\page.tsx" "$frontend\src\app\catalog\page.tsx" -Force

Write-Host "==> Building..."
Set-Location $frontend
npm run build

Write-Host "==> Packaging dist..."
if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Path $out | Out-Null

# Copy standalone output
Copy-Item "$frontend\.next\standalone\*" $out -Recurse -Force
# Copy static assets (required separately)
New-Item -ItemType Directory -Path "$out\.next\static" -Force | Out-Null
Copy-Item "$frontend\.next\static\*" "$out\.next\static" -Recurse -Force
# Copy public folder
Copy-Item "$frontend\public" "$out\public" -Recurse -Force

Write-Host ""
Write-Host "==> Done! Upload contents of wispbyte\dist\ to wispbyte."
Write-Host "    Set 'server.js' as main file."
