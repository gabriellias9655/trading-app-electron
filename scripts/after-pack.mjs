/**
 * electron-builder afterPack: copy .prisma (dotfolder) into unpacked OpenTrader.
 * @param {import("electron-builder").AfterPackContext} context
 */
export default async function afterPack(context) {
  const { cpSync, existsSync } = await import("node:fs");
  const { join } = await import("node:path");

  const src = join(
    context.packager.projectDir,
    "node_modules",
    "opentrader",
    "node_modules",
    ".prisma"
  );
  const dest = join(
    context.appOutDir,
    "resources",
    "app.asar.unpacked",
    "node_modules",
    "opentrader",
    "node_modules",
    ".prisma"
  );

  if (!existsSync(src)) {
    console.warn("[after-pack] .prisma client missing — run npm run prebuild first");
    return;
  }

  cpSync(src, dest, { recursive: true });
  console.log("[after-pack] copied Prisma client into packaged app");
}
