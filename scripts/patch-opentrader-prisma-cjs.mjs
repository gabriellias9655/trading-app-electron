#!/usr/bin/env node
/**
 * OpenTrader's ESM bundle uses named imports from @prisma/client (CJS).
 * Patch to load prisma-client-dist by absolute path (never @prisma/client).
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "node_modules", "opentrader", "dist");

const ESM_IMPORT =
  "import * as client_star from '@prisma/client';\nimport { Prisma, PrismaClient } from '@prisma/client';";

const OLD_REQUIRE_PATTERNS = [
  /const requirePrisma = createRequire\(import\.meta\.url\);\nconst client_star = requirePrisma\("@prisma\/client"\);\nconst \{ Prisma, PrismaClient \} = client_star;\n/,
  /const requirePrisma = createRequire\(import\.meta\.url\);\nconst opentraderRoot = path\.join\(path\.dirname\(fileURLToPath\(import\.meta\.url\)\), "\.\."\);\nconst client_star = requirePrisma\(path\.join\(opentraderRoot, "node_modules", "prisma-client-dist", "index\.js"\)\);\nconst \{ Prisma, PrismaClient \} = client_star;\n/,
];

const CJS_REQUIRE = `const requirePrisma = createRequire(import.meta.url);
const { existsSync: existsSyncPrisma } = requirePrisma("node:fs");
const opentraderRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const prismaLoadPaths = [
  process.env.YIELDLYX_PRISMA_CLIENT,
  path.join(opentraderRoot, "node_modules", "prisma-client-dist", "index.js"),
  path.join(opentraderRoot, "..", "..", "prisma-client-dist", "index.js"),
  path.join(opentraderRoot, "node_modules", ".prisma", "client", "index.js"),
].filter(Boolean);
let client_star;
for (const prismaIndexPath of prismaLoadPaths) {
  if (existsSyncPrisma(prismaIndexPath)) {
    client_star = requirePrisma(prismaIndexPath);
    break;
  }
}
if (!client_star) {
  throw new Error("Prisma client not found. Tried: " + prismaLoadPaths.join(", "));
}
const { Prisma, PrismaClient } = client_star;
`;

const INSERT_AFTER =
  /(import \{ EventEmitter \} from 'node:events';\n)(?!const requirePrisma = createRequire)/;

const MISPLACED_REQUIRE =
  /import superjson from 'superjson';\nconst requirePrisma = createRequire\(import\.meta\.url\);\nconst \{ existsSync: existsSyncPrisma \} = requirePrisma\("node:fs"\);\nconst opentraderRoot[\s\S]*?const \{ Prisma, PrismaClient \} = client_star;\n/;

if (!existsSync(distDir)) {
  console.log("[patch-opentrader-prisma] opentrader dist missing — skip");
  process.exit(0);
}

let patched = 0;
for (const name of readdirSync(distDir)) {
  if (!name.endsWith(".mjs")) continue;
  const filePath = join(distDir, name);
  let content = readFileSync(filePath, "utf8");
  const hasPrisma =
    content.includes("@prisma/client") ||
    content.includes("prisma-client-dist") ||
    content.includes('requirePrisma("@prisma/client")') ||
    content.includes("prismaLoadPaths");

  if (!hasPrisma) continue;

  let changed = false;

  if (MISPLACED_REQUIRE.test(content)) {
    content = content.replace(
      MISPLACED_REQUIRE,
      "import superjson from 'superjson';\n"
    );
    changed = true;
  }

  if (content.includes(ESM_IMPORT)) {
    content = content.replace(ESM_IMPORT, "");
    changed = true;
  }

  for (const pattern of OLD_REQUIRE_PATTERNS) {
    if (pattern.test(content)) {
      content = content.replace(pattern, "");
      changed = true;
    }
  }

  if (!content.includes("prismaLoadPaths") && INSERT_AFTER.test(content)) {
    content = content.replace(INSERT_AFTER, `$1${CJS_REQUIRE}`);
    changed = true;
  }

  if (!changed) {
    if (content.includes("prismaLoadPaths")) patched += 1;
    continue;
  }

  writeFileSync(filePath, content, "utf8");
  patched += 1;
  console.log(`[patch-opentrader-prisma] patched ${name}`);
}

if (patched === 0) {
  const anyPrisma = readdirSync(distDir).some((name) => {
    if (!name.endsWith(".mjs")) return false;
    const text = readFileSync(join(distDir, name), "utf8");
    return text.includes("@prisma/client") && !text.includes("prismaLoadPaths");
  });
  if (anyPrisma) {
    console.warn(
      "[patch-opentrader-prisma] @prisma/client imports remain — opentrader layout may have changed"
    );
    process.exit(1);
  }
} else {
  console.log(`[patch-opentrader-prisma] done (${patched} file(s))`);
}
