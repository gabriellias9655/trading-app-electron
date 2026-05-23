import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import {
  getOpentraderPackageRoot,
  getOpentraderPaths,
  getOpentraderStandalonePath,
} from "./paths.mjs";

/**
 * @param {string} pkgRoot
 */
export function prismaClientBundled(pkgRoot) {
  return (
    existsSync(join(pkgRoot, "node_modules", ".prisma", "client", "index.js")) ||
    existsSync(join(pkgRoot, "node_modules", "@prisma", "client", "index.js"))
  );
}

/**
 * Fail fast with a clear message when the .app bundle is incomplete.
 * @param {string} userDataPath
 */
export function assertPackagedBundleReady(userDataPath) {
  if (!app.isPackaged) return;

  const pkgRoot = getOpentraderPackageRoot();
  const issues = [];

  try {
    getOpentraderStandalonePath(pkgRoot);
  } catch (err) {
    issues.push(err instanceof Error ? err.message : String(err));
  }

  if (!prismaClientBundled(pkgRoot)) {
    issues.push(
      "Prisma database engine is missing from the app bundle.\n" +
        "Rebuild on this Mac: npm install && npm run build:mac"
    );
  }

  const paths = getOpentraderPaths(userDataPath);
  try {
    writeFileSync(join(paths.dataDir, ".write-test"), "ok", "utf8");
  } catch {
    issues.push(
      `Cannot write to ${paths.dataDir}\n` +
        "Install YieldlyX to Applications (do not run from the DMG)."
    );
  }

  if (issues.length === 0) return;

  const message = issues.join("\n\n");
  try {
    writeFileSync(join(paths.dataDir, "startup-error.txt"), `${message}\n`, "utf8");
  } catch {
    /* ignore */
  }
  throw new Error(message);
}
