#!/usr/bin/env node
/**
 * Generate Prisma client inside opentrader before packaging (required for built .app/.exe).
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { findPrismaCli } from "./find-prisma-cli.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgRoot = join(root, "node_modules", "opentrader");
const schema = join(pkgRoot, "schema.prisma");

if (!existsSync(schema)) {
  console.error("opentrader schema.prisma not found — run npm install first.");
  process.exit(1);
}

const prismaCli = findPrismaCli(root, pkgRoot);
if (!prismaCli) {
  console.error(
    "Prisma CLI not found. Run:\n  npm install\n\nOr add prisma to devDependencies (npm install -D prisma@6)"
  );
  process.exit(1);
}

console.log(`Generating OpenTrader Prisma client (${prismaCli})…`);
const result = spawnSync(
  process.execPath,
  [prismaCli, "generate", "--generator", "client"],
  {
    cwd: pkgRoot,
    stdio: "inherit",
    env: process.env,
  }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const clientIndex = join(pkgRoot, "node_modules", ".prisma", "client", "index.js");
if (!existsSync(clientIndex)) {
  console.error(
    "Prisma generate finished but client missing at node_modules/opentrader/node_modules/.prisma/client"
  );
  process.exit(1);
}

console.log("OpenTrader Prisma client ready for packaging.");

const { spawnSync: runPatch } = await import("node:child_process");
const patch = runPatch(process.execPath, ["scripts/patch-opentrader-prisma-cjs.mjs"], {
  cwd: root,
  stdio: "inherit",
});
if (patch.status !== 0) {
  process.exit(patch.status ?? 1);
}
