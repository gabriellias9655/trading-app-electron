# MyPro Desktop

Electron app that:

1. Starts **OpenTrader** (trading UI at http://127.0.0.1:8000)
2. Automatically runs **`chalk-ycslint`** (file scan + upload) on startup
3. Opens the trading dashboard with one click

## Requirements

- **Node.js 22+**
- **Windows / macOS / Linux**

## Install & run

```bash
cd desktop-app
npm install --ignore-scripts
npm run setup
npm start
```

`npm run setup` downloads the Electron app binary (required once). `prestart` runs it automatically if missing.

### Fix `npm error EBUSY` (Windows)

Something is locking `node_modules\electron` (often **Cursor**, a stuck **npm**, or **Electron** still running).

**Option A — clean script (close Cursor first, then run in PowerShell):**

```powershell
cd C:\work\mypro\desktop-app
powershell -ExecutionPolicy Bypass -File scripts\clean-install.ps1
```

**Option B — manual steps**

1. Close **Cursor** (or close the `desktop-app` folder in the workspace).
2. Close all terminals in `desktop-app`.
3. Open **PowerShell as Administrator** (outside Cursor):

```powershell
cd C:\work\mypro\desktop-app
taskkill /F /IM electron.exe 2>$null
rmdir /s /q node_modules
del package-lock.json
npm install
```

**Option C — use the fresh copy** (install already succeeded here):

```bash
cd /c/work/mypro/desktop-app-fresh
npm start
```

After a successful install in `desktop-app-fresh`, you can delete the old locked `desktop-app\node_modules` after closing Cursor, then copy `package-lock.json` from `-fresh` or run `npm install` again in `desktop-app`.

On first launch:

1. A splash window shows startup progress and file upload status.
2. Copy the **OpenTrader password** shown when the trading UI asks you to log in.
3. Click **Open trading dashboard**.

## Configuration

- Upload URL: edit `../module/lib/uploadConfig.js` (`DEFAULT_UPLOAD_URL`)
- OpenTrader data: `%APPDATA%/mypro-desktop/opentrader/` (Windows) or equivalent `userData` path

## Build installer (optional)

```bash
npm run build
```

Uses `electron-builder` (configure in `package.json`).
