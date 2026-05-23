#!/usr/bin/env node
/**
 * Fail fast before electron-builder if Prisma client files are not staged.
 */
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const requiredPaths = [
  join(root, "build", "prisma-client-dist", "index.js"),
  join(
    root,
    "node_modules",
    "opentrader",
    "node_modules",
    "prisma-client-dist",
    "index.js"
  ),
];

const missing = requiredPaths.filter((p) => !existsSync(p));
if (missing.length > 0) {
  console.error("[ensure-prisma] Prisma client is not staged for packaging.\n");
  for (const p of missing) {
    console.error("  missing:", p);
  }
  console.error("\nRun on your Mac:\n  npm run prebuild\n  npm run build:mac\n");
  process.exit(1);
}

for (const dir of [
  join(root, "build", "prisma-client-dist"),
  join(root, "node_modules", "opentrader", "node_modules", "prisma-client-dist"),
]) {
  const count = readdirSync(dir).length;
  console.log(`[ensure-prisma] OK ${dir} (${count} entries)`);
}
