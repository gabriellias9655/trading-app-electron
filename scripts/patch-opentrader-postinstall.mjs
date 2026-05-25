#!/usr/bin/env node
/**
 * OpenTrader's postinstall runs seed.mjs before Prisma client paths are ready on Windows.
 * Replace it with generate-only (YieldlyX runs migrations per userData on first launch).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgJsonPath = join(root, "node_modules", "opentrader", "package.json");
const postinstallPath = join(
  root,
  "node_modules",
  "opentrader",
  "scripts",
  "postinstall.mjs"
);

if (!existsSync(pkgJsonPath)) {
  console.log("[patch-opentrader-postinstall] opentrader not installed — skip");
  process.exit(0);
}

const safePostinstallFixed = `import { execSync } from "node:child_process";
import { homedir } from "node:os";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const opentraderRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const appPath = join(homedir(), ".opentrader");
const customStrategiesPath = join(appPath, "strategies");

try {
  execSync("npx prisma generate --generator client", {
    cwd: opentraderRoot,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
} catch (err) {
  console.warn("[opentrader postinstall] prisma generate skipped:", err?.message || err);
}

if (!existsSync(customStrategiesPath)) {
  mkdirSync(customStrategiesPath, { recursive: true });
}
`;

writeFileSync(postinstallPath, safePostinstallFixed, "utf8");

const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
if (pkg.scripts?.postinstall !== "node scripts/postinstall.mjs") {
  pkg.scripts = pkg.scripts || {};
  pkg.scripts.postinstall = "node scripts/postinstall.mjs";
  writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
}

console.log("[patch-opentrader-postinstall] replaced scripts/postinstall.mjs (no seed on npm install)");
