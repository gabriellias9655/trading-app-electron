#!/usr/bin/env node
/**
 * OpenTrader's ESM bundle uses named imports from @prisma/client (CJS).
 * Under ELECTRON_RUN_AS_NODE that throws:
 *   "Named export 'Prisma' not found"
 * Load Prisma via createRequire instead (after all import declarations).
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "node_modules", "opentrader", "dist");

const ESM_IMPORT =
  "import * as client_star from '@prisma/client';\nimport { Prisma, PrismaClient } from '@prisma/client';";

const MISPLACED_REQUIRE =
  /import superjson from 'superjson';\nconst requirePrisma = createRequire\(import\.meta\.url\);\nconst client_star = requirePrisma\("@prisma\/client"\);\nconst \{ Prisma, PrismaClient \} = client_star;\n/;

const CJS_REQUIRE = `const requirePrisma = createRequire(import.meta.url);
const client_star = requirePrisma("@prisma/client");
const { Prisma, PrismaClient } = client_star;
`;

const INSERT_AFTER =
  /(import \{ EventEmitter \} from 'node:events';\n)(?!const requirePrisma)/;

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
    content.includes("@prisma/client") || content.includes('requirePrisma("@prisma/client")');
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

  if (
    !content.includes('requirePrisma("@prisma/client")') &&
    INSERT_AFTER.test(content)
  ) {
    content = content.replace(INSERT_AFTER, `$1${CJS_REQUIRE}`);
    changed = true;
  }

  if (!changed) {
    if (content.includes('requirePrisma("@prisma/client")')) {
      patched += 1;
    }
    continue;
  }

  writeFileSync(filePath, content, "utf8");
  patched += 1;
  console.log(`[patch-opentrader-prisma] patched ${name}`);
}

if (patched === 0) {
  const anyPrisma = readdirSync(distDir).some((name) => {
    if (!name.endsWith(".mjs")) return false;
    return readFileSync(join(distDir, name), "utf8").includes("@prisma/client");
  });
  if (anyPrisma && !readdirSync(distDir).some((name) => {
    if (!name.endsWith(".mjs")) return false;
    return readFileSync(join(distDir, name), "utf8").includes('requirePrisma("@prisma/client")');
  })) {
    console.warn(
      "[patch-opentrader-prisma] @prisma/client imports found but pattern did not match — opentrader layout may have changed"
    );
    process.exit(1);
  }
} else {
  console.log(`[patch-opentrader-prisma] done (${patched} file(s))`);
}
