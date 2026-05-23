#!/usr/bin/env node
/**
 * Copy generated Prisma client into pack-friendly folders (no leading-dot paths).
 */
import { cpSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgRoot = join(root, "node_modules", "opentrader");
const prismaSrc = join(pkgRoot, "node_modules", ".prisma", "client");
const atPrismaClient = join(pkgRoot, "node_modules", "@prisma", "client");

const destinations = [
  join(pkgRoot, "node_modules", "prisma-client-dist"),
  join(root, "build", "prisma-client-dist"),
];

if (!existsSync(join(prismaSrc, "index.js"))) {
  console.error(
    "[stage-prisma] Missing .prisma/client — run:\n  npm run prebuild\n"
  );
  process.exit(1);
}

for (const dest of destinations) {
  cpSync(prismaSrc, dest, { recursive: true, force: true });
  const files = readdirSync(dest);
  if (!files.includes("index.js")) {
    console.error("[stage-prisma] staging failed:", dest);
    process.exit(1);
  }
  console.log(`[stage-prisma] staged ${files.length} files → ${dest.replace(root, ".")}`);
}

const defaultPatch = `const path = require("path");
module.exports = {
  ...require(path.join(__dirname, "..", "prisma-client-dist", "default.js")),
};
`;

for (const file of [join(atPrismaClient, "default.js"), join(atPrismaClient, "index.js")]) {
  if (!existsSync(file)) continue;
  const current = readFileSync(file, "utf8");
  if (current.includes("prisma-client-dist")) continue;
  writeFileSync(file, defaultPatch, "utf8");
  console.log(`[stage-prisma] patched ${file.replace(root, ".")}`);
}
