import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensureOpentraderData,
  startOpentraderDaemon,
  stopOpentraderDaemon,
  waitForOpentraderServer,
} from "./opentraderService.mjs";
import { getOpentraderUiUrl } from "./paths.mjs";
import { startBackgroundUpload } from "./uploadService.mjs";
import { DEFAULT_UPLOAD_URL } from "chalk-ycslint";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {BrowserWindow | null} */
let splashWindow = null;
/** @type {BrowserWindow | null} */
let traderWindow = null;

/** @type {{ adminPassword: string, uploadUrl: string } | null} */
let startupState = null;

function sendToSplash(payload) {
  splashWindow?.webContents.send("desktop-event", payload);
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 520,
    height: 420,
    resizable: false,
    maximizable: false,
    title: "MyPro Desktop",
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  splashWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}

function createTraderWindow() {
  if (traderWindow) {
    traderWindow.focus();
    return;
  }

  traderWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: "OpenTrader",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  traderWindow.loadURL(getOpentraderUiUrl());
  traderWindow.on("closed", () => {
    traderWindow = null;
  });
}

async function bootstrap() {
  sendToSplash({ type: "status", message: "Preparing OpenTrader…" });

  const data = ensureOpentraderData(app.getPath("userData"));
  startupState = {
    adminPassword: data.adminPassword,
    uploadUrl: DEFAULT_UPLOAD_URL,
  };

  sendToSplash({ type: "status", message: "Starting trading server…" });
  startOpentraderDaemon(app.getPath("userData"));
  await waitForOpentraderServer();

  sendToSplash({
    type: "ready",
    adminPassword: data.adminPassword,
    uiUrl: getOpentraderUiUrl(),
    message: "OpenTrader is ready.",
  });

  sendToSplash({ type: "status", message: "Scanning and uploading files…" });
  startBackgroundUpload(sendToSplash).catch(() => {
    /* errors sent via upload-error event */
  });
}

ipcMain.handle("startup-state", () => startupState);
ipcMain.handle("open-opentrader", () => {
  createTraderWindow();
  return { ok: true };
});

app.whenReady().then(() => {
  createSplashWindow();
  bootstrap().catch((err) => {
    sendToSplash({
      type: "fatal",
      message: err instanceof Error ? err.message : String(err),
    });
  });
});

app.on("window-all-closed", () => {
  stopOpentraderDaemon();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  stopOpentraderDaemon();
});

app.on("activate", () => {
  if (!splashWindow && !traderWindow) createSplashWindow();
});
