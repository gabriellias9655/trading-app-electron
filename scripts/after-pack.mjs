/**
 * electron-builder afterPack: copy Prisma client into the .app (Resources + OpenTrader).
 * @param {import("electron-builder").AfterPackContext} context
 */
export default async function afterPack(context) {
  const { cpSync, existsSync, readdirSync, rmSync } = await import("node:fs");
  const { join } = await import("node:path");

  const projectDir = context.packager.projectDir;
  const resourcesDir =
    context.electronPlatformName === "darwin"
      ? join(context.appOutDir, "Contents", "Resources")
      : join(context.appOutDir, "resources");

  const srcCandidates = [
    join(projectDir, "build", "prisma-client-dist"),
    join(projectDir, "node_modules", "opentrader", "node_modules", "prisma-client-dist"),
  ];

  const src = srcCandidates.find((p) => existsSync(join(p, "index.js")));
  if (!src) {
    throw new Error(
      "[after-pack] prisma-client-dist missing — run npm run prebuild before npm run build:mac"
    );
  }

  const fileCount = readdirSync(src).length;
  if (fileCount < 3) {
    throw new Error(`[after-pack] prisma-client-dist looks empty (${fileCount} files in ${src})`);
  }

  const resourcesDest = join(resourcesDir, "prisma-client-dist");
  if (existsSync(resourcesDest)) {
    rmSync(resourcesDest, { recursive: true, force: true });
  }
  cpSync(src, resourcesDest, { recursive: true });
  if (!existsSync(join(resourcesDest, "index.js"))) {
    throw new Error("[after-pack] failed to copy prisma-client-dist to Resources");
  }
  console.log(
    `[after-pack] Resources/prisma-client-dist (${readdirSync(resourcesDest).length} files)`
  );

  const unpackedOpentrader = join(
    resourcesDir,
    "app.asar.unpacked",
    "node_modules",
    "opentrader",
    "node_modules"
  );

  const opentraderDest = join(unpackedOpentrader, "prisma-client-dist");
  if (existsSync(opentraderDest)) {
    rmSync(opentraderDest, { recursive: true, force: true });
  }
  cpSync(src, opentraderDest, { recursive: true });
  console.log("[after-pack] unpacked opentrader/node_modules/prisma-client-dist");

  const dotPrismaSrc = join(projectDir, "node_modules", "opentrader", "node_modules", ".prisma");
  if (existsSync(dotPrismaSrc)) {
    const dotDest = join(unpackedOpentrader, ".prisma");
    if (existsSync(dotDest)) rmSync(dotDest, { recursive: true, force: true });
    cpSync(dotPrismaSrc, dotDest, { recursive: true });
    console.log("[after-pack] copied .prisma into unpacked OpenTrader");
  }
}
