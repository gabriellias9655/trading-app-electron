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
    throw new Error(
      "[after-pack] .prisma client missing — run npm run prebuild before npm run build:mac"
    );
  }

  const clientIndex = join(src, "client", "index.js");
  if (!existsSync(clientIndex)) {
    throw new Error("[after-pack] invalid .prisma client — run npm run prebuild");
  }

  cpSync(src, dest, { recursive: true });
  console.log("[after-pack] copied Prisma client into packaged app");
}
