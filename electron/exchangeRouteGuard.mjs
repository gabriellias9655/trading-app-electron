import { hasValidExchangeAccounts } from "./opentraderApi.mjs";

/** @param {string} hash */
function needsExchangeRoute(hash) {
  const path = (hash || "").replace(/^#/, "");
  if (
    !path ||
    path === "/" ||
    path === "/dashboard" ||
    path === "/dashboard/" ||
    path.startsWith("/dashboard/bot")
  ) {
    return false;
  }
  if (path.includes("/dashboard/accounts")) {
    return false;
  }
  return /strategies|bots|grid|dca|rsi-bot/i.test(path);
}

/** @param {string} hash */
function getFriendlyTabName(hash) {
  if (/strategies/i.test(hash)) return "Strategies";
  if (/bots/i.test(hash)) return "Bots";
  if (/grid/i.test(hash)) return "Grid Bot";
  if (/dca/i.test(hash)) return "DCA Bot";
  if (/rsi/i.test(hash)) return "RSI Bot";
  return "Trading";
}

/**
 * @param {import("electron").WebContents} webContents
 * @param {string} tabName
 */
async function showExchangeRequiredNotice(webContents, tabName) {
  const script = `(function() {
    if (typeof window.myproShowExchangeRequired === "function") {
      window.myproShowExchangeRequired({ tabName: ${JSON.stringify(tabName)} });
    }
    if (!window.location.hash.includes("/dashboard/accounts")) {
      window.location.hash = "/dashboard/accounts";
    }
  })();`;

  try {
    await webContents.executeJavaScript(script, true);
  } catch (err) {
    console.error("[exchangeRouteGuard] notice failed:", err);
  }
}

/**
 * Show a friendly notice and guide users to Exchange Accounts when needed.
 * @param {import("electron").WebContents} webContents
 * @param {string} origin
 * @param {() => string | undefined} getAdminPassword
 * @param {() => boolean} isShowingTrader
 */
export function setupExchangeRouteGuard(
  webContents,
  origin,
  getAdminPassword,
  isShowingTrader
) {
  /** @type {string | null} */
  let lastHandledHash = null;

  const guard = async () => {
    if (!isShowingTrader()) return;

    const url = webContents.getURL();
    if (!url.startsWith(origin)) return;

    const hash = new URL(url).hash || "";

    if (!needsExchangeRoute(hash)) {
      lastHandledHash = null;
      return;
    }

    if (hash === lastHandledHash) return;

    const password = getAdminPassword();
    if (!password) return;

    try {
      const hasAccount = await hasValidExchangeAccounts(password);
      if (!hasAccount) {
        lastHandledHash = hash;
        const tabName = getFriendlyTabName(hash);
        await showExchangeRequiredNotice(webContents, tabName);
      }
    } catch (err) {
      console.error("[exchangeRouteGuard]", err);
    }
  };

  const onFinishLoad = () => {
    guard();
  };
  const onNavigateInPage = () => {
    guard();
  };

  webContents.on("did-finish-load", onFinishLoad);
  webContents.on("did-navigate-in-page", onNavigateInPage);

  return () => {
    webContents.off("did-finish-load", onFinishLoad);
    webContents.off("did-navigate-in-page", onNavigateInPage);
  };
}
