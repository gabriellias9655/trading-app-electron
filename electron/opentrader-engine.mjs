/**
 * Starts OpenTrader after resolving the Prisma client on disk (packaged .app safe).
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.env.YIELDLYX_OPENTRADER_ROOT;
if (!root) {
  console.error("[opentrader-engine] YIELDLYX_OPENTRADER_ROOT is not set");
  process.exit(1);
}

/** @returns {string[]} */
function prismaCandidates() {
  const list = [];
  if (process.env.YIELDLYX_PRISMA_CLIENT) {
    list.push(process.env.YIELDLYX_PRISMA_CLIENT);
  }
  list.push(
    path.join(root, "node_modules", "prisma-client-dist", "index.js"),
    path.join(root, "node_modules", ".prisma", "client", "index.js"),
    path.join(root, "..", "..", "prisma-client-dist", "index.js")
  );
  return list;
}

let prismaPath = "";
for (const candidate of prismaCandidates()) {
  if (existsSync(candidate)) {
    prismaPath = candidate;
    break;
  }
}

if (!prismaPath) {
  console.error("[opentrader-engine] Prisma client not found. Tried:");
  for (const candidate of prismaCandidates()) {
    console.error("  -", candidate);
  }
  process.exit(1);
}

process.env.YIELDLYX_PRISMA_CLIENT = prismaPath;

const standalone = path.join(root, "dist", "standalone.mjs");
if (!existsSync(standalone)) {
  console.error("[opentrader-engine] standalone.mjs missing:", standalone);
  process.exit(1);
}

await import(pathToFileURL(standalone).href);
