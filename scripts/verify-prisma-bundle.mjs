#!/usr/bin/env node
/**
 * After build:mac, verify Prisma is inside the .app (run on macOS).
 * Usage: node scripts/verify-prisma-bundle.mjs [path-to-YieldlyX.app]
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

function findBuiltApp() {
  const dist = "dist";
  if (!existsSync(dist)) return join("dist", "mac-arm64", "YieldlyX.app");
  for (const name of readdirSync(dist)) {
    if (name.endsWith(".app")) return join(dist, name);
    const nested = join(dist, name, "YieldlyX.app");
    if (existsSync(nested)) return nested;
  }
  return join("dist", "mac-arm64", "YieldlyX.app");
}

const appPath = process.argv[2] || findBuiltApp();

const checks = [
  join(appPath, "Contents", "Resources", "prisma-client-dist", "index.js"),
  join(
    appPath,
    "Contents",
    "Resources",
    "app.asar.unpacked",
    "node_modules",
    "opentrader",
    "node_modules",
    "prisma-client-dist",
    "index.js"
  ),
];

let ok = true;
for (const file of checks) {
  if (existsSync(file)) {
    console.log("OK", file);
  } else {
    console.error("MISSING", file);
    ok = false;
  }
}

if (!ok) {
  console.error("\nBundle is incomplete. Run: npm run build:mac");
  process.exit(1);
}

const resourcesDir = join(appPath, "Contents", "Resources", "prisma-client-dist");
const count = readdirSync(resourcesDir).length;
console.log(`\nPrisma client is bundled correctly (${count} files in Resources/prisma-client-dist).`);
