import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

function getElectronApp() {
  return require("electron").app;
}

/**
 * OpenTrader runs as ELECTRON_RUN_AS_NODE — it needs real disk paths, not app.asar.
 * @param {string} p
 */
function toUnpackedPath(p) {
  if (p.includes("app.asar")) {
    return p.replace(/\bapp\.asar\b/, "app.asar.unpacked");
  }
  return p;
}

/** @returns {string} */
export function getOpentraderPackageRoot() {
  const app = getElectronApp();
  if (app.isPackaged) {
    const resourcesDir = dirname(app.getAppPath());
    const unpackedRoot = join(
      resourcesDir,
      "app.asar.unpacked",
      "node_modules",
      "opentrader"
    );
    if (existsSync(join(unpackedRoot, "dist", "standalone.mjs"))) {
      return unpackedRoot;
    }
  }

  const devRoot = dirname(dirname(require.resolve("opentrader")));
  return getElectronApp().isPackaged ? toUnpackedPath(devRoot) : devRoot;
}

/** @param {string} [pkgRoot] */
export function getOpentraderStandalonePath(pkgRoot = getOpentraderPackageRoot()) {
  const script = join(pkgRoot, "dist", "standalone.mjs");
  if (existsSync(script)) return script;

  const fallback = join(toUnpackedPath(pkgRoot), "dist", "standalone.mjs");
  if (existsSync(fallback)) return fallback;

  throw new Error(`OpenTrader standalone not found (looked in ${pkgRoot})`);
}

export function getOpentraderDataDir(userDataPath) {
  return join(userDataPath, "opentrader");
}

export function getOpentraderPaths(userDataPath) {
  const dataDir = getOpentraderDataDir(userDataPath);
  return {
    dataDir,
    passFilePath: join(dataDir, "pass"),
    dbFilePath: join(dataDir, "dev.db"),
    strategiesPath: join(dataDir, "strategies"),
  };
}

export const OPENTRADER_PORT = 8000;
export const OPENTRADER_HOST = "127.0.0.1";

/** OpenTrader hash routes (see frontend route tree). */
export const OPENTRADER_ROUTES = {
  bot: "/dashboard/bot",
  accounts: "/dashboard/accounts",
  login: "/dashboard/login",
  strategies: "/dashboard/strategies",
  settings: "/dashboard/settings",
};

/** @param {string} [route] e.g. OPENTRADER_ROUTES.accounts */
export function getOpentraderUiUrl(route = OPENTRADER_ROUTES.bot) {
  const origin = `http://${OPENTRADER_HOST}:${OPENTRADER_PORT}/`;
  const path = route.startsWith("/") ? route : `/${route}`;
  return `${origin}#${path}`;
}
