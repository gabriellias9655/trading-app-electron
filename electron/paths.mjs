import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

export function getOpentraderPackageRoot() {
  // opentrader only exports "." — resolve main entry, then walk up to package root
  return dirname(dirname(require.resolve("opentrader")));
}

/** Real filesystem path to standalone.mjs (asar.unpacked when packaged). */
export function getOpentraderStandalonePath(pkgRoot = getOpentraderPackageRoot()) {
  const script = join(pkgRoot, "dist", "standalone.mjs");
  if (existsSync(script)) return script;

  if (pkgRoot.includes("app.asar")) {
    const unpacked = join(
      pkgRoot.replace("app.asar", "app.asar.unpacked"),
      "dist",
      "standalone.mjs"
    );
    if (existsSync(unpacked)) return unpacked;
  }

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

/** @param {string} [route] e.g. "/dashboard/accounts" */
export function getOpentraderUiUrl(route = "/dashboard") {
  const origin = `http://${OPENTRADER_HOST}:${OPENTRADER_PORT}/`;
  const path = route.startsWith("/") ? route : `/${route}`;
  return `${origin}#${path}`;
}
