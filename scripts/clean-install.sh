#!/usr/bin/env sh
# Reinstall deps when node_modules/electron is locked or corrupted (macOS / Linux).
set -e
cd "$(dirname "$0")/.."

echo "Stopping Electron processes…"
pkill -f "[E]lectron" 2>/dev/null || true
pkill -f "YieldlyX" 2>/dev/null || true
sleep 1

echo "Removing node_modules and lockfile…"
rm -rf node_modules package-lock.json

echo "Installing…"
npm install

echo "Done. Run: npm start"
