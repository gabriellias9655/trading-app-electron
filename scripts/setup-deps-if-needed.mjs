#!/usr/bin/env node
/**
 * When .npmrc sets ignore-scripts=true, npm skips lifecycle scripts including this file.
 * Reinstall / setup:deps runs the real setup. This is a fallback if ignore-scripts is off.
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const prismaClient = join(
  root,
  "node_modules",
  "opentrader",
  "node_modules",
  ".prisma",
  "client",
  "index.js"
);
const electronPath = join(root, "node_modules", "electron", "path.txt");

if (existsSync(prismaClient) && existsSync(electronPath)) {
  process.exit(0);
}

console.log("[setup] Running setup:deps (missing prisma client or electron binary)…");
const r = spawnSync("npm", ["run", "setup:deps"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(r.status ?? 1);
