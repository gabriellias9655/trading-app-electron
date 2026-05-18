# Fix npm EBUSY on Windows: close Cursor/Electron, remove node_modules, reinstall.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Stopping Electron processes (if any)..."
Get-Process -Name "electron" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

if (Test-Path "node_modules") {
  Write-Host "Removing node_modules (may take a minute)..."
  cmd /c "rmdir /s /q node_modules" 2>$null
  if (Test-Path "node_modules") {
    Write-Host ""
    Write-Host "Could not delete node_modules — a program still has files open."
    Write-Host "  1. Close Cursor / VS Code"
    Write-Host "  2. Close all Git Bash / terminals in desktop-app"
    Write-Host "  3. Run this script again from an external PowerShell window"
    Write-Host "  4. Or reboot, then run this script again"
    exit 1
  }
}

if (Test-Path "package-lock.json") {
  Remove-Item "package-lock.json" -Force
}

Write-Host "Running npm install (opentrader postinstall may warn on seed — often safe to ignore)..."
npm install --ignore-scripts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Downloading Electron binary..."
npm run setup
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Done. Run: npm start"
