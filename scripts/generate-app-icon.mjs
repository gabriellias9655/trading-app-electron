#!/usr/bin/env node
/**
 * Build build/icon.png for electron-builder from renderer/assets/yieldlyx-logo.png.
 */
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "renderer", "assets", "yieldlyx-logo.png");
const outDir = join(root, "build");
const outPng = join(outDir, "icon.png");

if (!existsSync(src)) {
  console.error("[generate-app-icon] Missing:", src);
  process.exit(1);
}

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error(
    "[generate-app-icon] Install sharp first: npm install --save-dev sharp"
  );
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

await sharp(src)
  .resize(1024, 1024, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 1 },
  })
  .png()
  .toFile(outPng);

console.log("[generate-app-icon] Wrote", outPng);
