#!/usr/bin/env node
/**
 * Generate Prisma client inside opentrader before packaging (required for built .exe).
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgRoot = join(root, "node_modules", "opentrader");
const schema = join(pkgRoot, "schema.prisma");
const prismaCli = join(root, "node_modules", "prisma", "build", "index.js");

if (!existsSync(schema)) {
  console.error("opentrader schema.prisma not found — run npm install first.");
  process.exit(1);
}
if (!existsSync(prismaCli)) {
  console.error("prisma CLI not found — run npm install first.");
  process.exit(1);
}

console.log("Generating OpenTrader Prisma client for packaging…");
const result = spawnSync(
  process.execPath,
  [prismaCli, "generate", "--generator", "client"],
  {
    cwd: pkgRoot,
    stdio: "inherit",
    env: process.env,
  }
);

process.exit(result.status ?? 1);
