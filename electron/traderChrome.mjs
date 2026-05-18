import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rendererDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../renderer");

let themeCss = null;
let themeJs = null;
let chromeJs = null;
let notifyJs = null;

function loadAssets() {
  if (!themeCss) {
    themeCss = readFileSync(path.join(rendererDir, "opentrader-theme.css"), "utf8");
  }
  if (!themeJs) {
    themeJs = readFileSync(path.join(rendererDir, "inject-theme.js"), "utf8");
  }
  if (!chromeJs) {
    chromeJs = readFileSync(path.join(rendererDir, "inject-chrome.js"), "utf8");
  }
  if (!notifyJs) {
    notifyJs = readFileSync(path.join(rendererDir, "inject-notify.js"), "utf8");
  }
}

/**
 * Inject MyPro top bar, help panel, and dashboard styling into OpenTrader.
 * @param {import("electron").WebContents} webContents
 * @param {string} origin e.g. http://127.0.0.1:8000
 */
export function setupTraderChrome(webContents, origin) {
  loadAssets();

  /** @type {string | null} */
  let cssKey = null;

  const applyChrome = async () => {
    const url = webContents.getURL();
    if (!url.startsWith(origin)) return;

    try {
      if (cssKey === null) {
        cssKey = await webContents.insertCSS(themeCss, { cssOrigin: "user" });
      }
      await webContents.executeJavaScript(themeJs, true);
      await webContents.executeJavaScript(chromeJs, true);
      await webContents.executeJavaScript(notifyJs, true);
    } catch (err) {
      console.error("[traderChrome]", err);
    }
  };

  const onFinishLoad = () => {
    applyChrome();
  };
  const onNavigateInPage = (_event, url) => {
    if (url.startsWith(origin)) applyChrome();
  };

  webContents.on("did-finish-load", onFinishLoad);
  webContents.on("did-navigate-in-page", onNavigateInPage);

  return () => {
    webContents.off("did-finish-load", onFinishLoad);
    webContents.off("did-navigate-in-page", onNavigateInPage);
    if (cssKey !== null) {
      webContents.removeInsertedCSS(cssKey).catch(() => {});
      cssKey = null;
    }
  };
}
