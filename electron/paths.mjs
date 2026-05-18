import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

export function getOpentraderPackageRoot() {
  return dirname(require.resolve("opentrader/package.json"));
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

export function getOpentraderUiUrl() {
  return `http://${OPENTRADER_HOST}:${OPENTRADER_PORT}/`;
}
